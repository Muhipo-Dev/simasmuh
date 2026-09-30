'use client'

import React, { useState, useMemo, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Sparkles, Plus, Search, Calendar, Clock, MapPin, Users, 
  CheckCircle2, Download, Printer, FileSpreadsheet, 
  Trash2, Edit, Eye, Filter, UserCheck, AlertCircle, 
  QrCode, RefreshCw, Loader2, UserPlus, X, Info, Share2
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'

export interface PresensiKegiatanItem {
  id: string
  kegiatanId: string
  userId: string
  namaPeserta: string
  nipNbm?: string
  role: string
  waktuPresensi: string
  metode: 'QR_SCAN' | 'MANUAL'
  keterangan?: string
  user?: {
    id: string
    name: string
    username: string
    nipNbm?: string
    role: string
    avatarUrl?: string
  }
}

export interface KegiatanItem {
  id: string
  nomorKegiatan?: string
  namaKegiatan: string
  kategori: string
  sifatKegiatan?: string
  tanggal: string
  waktuMulai?: string
  waktuSelesai?: string
  tempat: string
  pemateri?: string
  penanggungJawab?: string
  ringkasanMateri?: string
  dokumentasiUrl?: string
  qrCodeToken: string
  status: string
  createdAt?: string
  presensis?: PresensiKegiatanItem[]
  _count?: {
    presensis: number
  }
}

export const KATEGORI_KEGIATAN_MAP: Record<string, { label: string; color: string; badge: string; ismuba?: boolean }> = {
  KAJIAN_SELASA_PAGI: {
    label: 'Kajian Selasa Pagi',
    color: 'from-emerald-600 to-teal-800',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    ismuba: true
  },
  SHOLAT_JUMAT: {
    label: 'Sholat Jumat Berjamaah',
    color: 'from-teal-600 to-cyan-800',
    badge: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
    ismuba: true
  },
  MABIT_TAQWA: {
    label: 'Malam Bina Iman & Taqwa (MABIT)',
    color: 'from-indigo-600 to-purple-800',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
    ismuba: true
  },
  BAITUL_ARQAM: {
    label: 'Baitul Arqam / Darul Arqam',
    color: 'from-green-600 to-emerald-800',
    badge: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800',
    ismuba: true
  },
  TADARUS_TAHFIDZ: {
    label: 'Tadarus & Khotmil Qur\'an',
    color: 'from-cyan-600 to-blue-800',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
    ismuba: true
  },
  PENGAJIAN_AKBAR: {
    label: 'Pengajian Akbar / Milad',
    color: 'from-purple-600 to-indigo-800',
    badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    ismuba: true
  },
  KEGIATAN_ISMUBA: {
    label: 'Kegiatan ISMUBA & Keislaman',
    color: 'from-emerald-700 to-teal-900',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700',
    ismuba: true
  },
  WORKSHOP_PELATIHAN: {
    label: 'Workshop & Pelatihan',
    color: 'from-blue-600 to-indigo-800',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    ismuba: false
  },
  UPACARA_APEL: {
    label: 'Upacara / Apel Pagi',
    color: 'from-rose-600 to-red-800',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    ismuba: false
  },
  RAPAT_KHUSUS: {
    label: 'Rapat / Koordinasi Khusus',
    color: 'from-amber-600 to-orange-800',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    ismuba: false
  },
  KEGIATAN_LAIN: {
    label: 'Agenda Sekolah Lainnya',
    color: 'from-slate-600 to-slate-800',
    badge: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    ismuba: false
  }
}

export function KegiatanSekolahManagement() {
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const currentUser = session?.user as any

  const userRoles = useMemo(() => {
    return [
      currentUser?.role,
      currentUser?.subRole,
      currentUser?.subRole2,
      currentUser?.subRole3,
      currentUser?.subRole4,
      currentUser?.subRole5
    ].filter(Boolean).map((r: string) => r.toUpperCase())
  }, [currentUser])

  const isIsmubaUser = useMemo(() => {
    return userRoles.some(r => r === 'ISMUBA' || r === 'WAKA_ISMUBA' || r.includes('ISMUBA'))
  }, [userRoles])

  const isTuOrAdmin = useMemo(() => {
    return userRoles.some(r => 
      ['SUPERADMIN', 'ADMIN_IT', 'ADMIN', 'ADMIN_TU', 'TATA_USAHA', 'BAU', 'KEPALA_SEKOLAH', 'HUMAS_SDM', 'WAKA_HUMAS_SDM', 'KEPEGAWAIAN', 'SDM'].includes(r) ||
      r.includes('TU') || r.includes('TATA_USAHA') || r.includes('BAU') || r.includes('HUMAS') || r.includes('SDM')
    )
  }, [userRoles])

  const canManageKegiatan = useMemo(() => {
    return isTuOrAdmin || isIsmubaUser
  }, [isTuOrAdmin, isIsmubaUser])

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedKategori, setSelectedKategori] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [selectedSifat, setSelectedSifat] = useState<string>('ALL')

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isManualPresensiOpen, setIsManualPresensiOpen] = useState(false)

  const [activeKegiatan, setActiveKegiatan] = useState<KegiatanItem | null>(null)
  const [selectedManualUserId, setSelectedManualUserId] = useState('')
  const [manualKeterangan, setManualKeterangan] = useState('Hadir manual dikonfirmasi panitia')

  const [formState, setFormState] = useState({
    namaKegiatan: '',
    kategori: isIsmubaUser ? 'KAJIAN_SELASA_PAGI' : 'KAJIAN_SELASA_PAGI',
    sifatKegiatan: 'TERJADWAL',
    tanggal: new Date().toISOString().split('T')[0],
    waktuMulai: '06:45',
    waktuSelesai: '07:30',
    tempat: 'Masjid Al-Manar / Aula Utama',
    pemateri: '',
    penanggungJawab: isIsmubaUser ? 'Waka ISMUBA SMA MUHIPO' : 'Tata Usaha & Humas',
    ringkasanMateri: '',
    dokumentasiUrl: '',
    status: 'DIBUKA'
  })

  // 1. Query Data Kegiatan dari Backend
  const {
    data: kegiatanList = [],
    isLoading,
    refetch
  } = useQuery<KegiatanItem[]>({
    queryKey: ['kegiatan-sekolah', selectedKategori, selectedStatus, selectedSifat],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedKategori !== 'ALL') params.set('kategori', selectedKategori)
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus)
      if (selectedSifat !== 'ALL') params.set('sifatKegiatan', selectedSifat)

      const res = await authenticatedFetch(`/api-backend/kegiatan-sekolah?${params.toString()}`)
      if (!res.ok) throw new Error('Gagal mengambil data kegiatan sekolah')
      return res.json()
    }
  })

  // Query Daftar User Guru/Pegawai untuk Input Manual
  const { data: userList = [] } = useQuery<any[]>({
    queryKey: ['users-for-kegiatan-presensi'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/users')
      if (!res.ok) return []
      const users = await res.json()
      return users.filter((u: any) => u.role === 'GURU' || u.role === 'PEGAWAI' || u.role === 'BAU' || u.role === 'KEPALA_SEKOLAH')
    },
    enabled: isManualPresensiOpen
  })

  // Query Detail Kegiatan untuk live presensi
  const { data: detailData, refetch: refetchDetail } = useQuery<KegiatanItem>({
    queryKey: ['kegiatan-detail', activeKegiatan?.id],
    queryFn: async () => {
      if (!activeKegiatan?.id) return null
      const res = await authenticatedFetch(`/api-backend/kegiatan-sekolah/${activeKegiatan.id}`)
      if (!res.ok) throw new Error('Gagal mengambil detail kegiatan')
      return res.json()
    },
    enabled: !!activeKegiatan?.id && (isDetailModalOpen || isQrModalOpen)
  })

  // 2. Mutation Tambah Kegiatan
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await authenticatedFetch('/api-backend/kegiatan-sekolah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.message || 'Gagal membuat kegiatan baru')
      }
      return res.json()
    },
    onSuccess: (newRecord) => {
      queryClient.invalidateQueries({ queryKey: ['kegiatan-sekolah'] })
      setIsAddModalOpen(false)
      resetForm()
      Swal.fire({
        icon: 'success',
        title: 'Kegiatan Dibuat',
        text: `Agenda "${newRecord.namaKegiatan}" telah terdaftar lengkap dengan QR Absensi.`,
        timer: 2000,
        showConfirmButton: false
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem', 'error')
    }
  })

  // 3. Mutation Update Kegiatan
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await authenticatedFetch(`/api-backend/kegiatan-sekolah/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.message || 'Gagal memperbarui kegiatan')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kegiatan-sekolah'] })
      queryClient.invalidateQueries({ queryKey: ['kegiatan-detail', activeKegiatan?.id] })
      setIsEditModalOpen(false)
      Swal.fire({
        icon: 'success',
        title: 'Berhasil Diperbarui',
        timer: 1500,
        showConfirmButton: false
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal Memperbarui', err.message || 'Terjadi kesalahan sistem', 'error')
    }
  })

  // 4. Mutation Refresh QR Token
  const refreshQrMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/kegiatan-sekolah/${id}/refresh-qr`, {
        method: 'POST'
      })
      if (!res.ok) throw new Error('Gagal memperbarui QR code')
      return res.json()
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['kegiatan-sekolah'] })
      queryClient.invalidateQueries({ queryKey: ['kegiatan-detail', activeKegiatan?.id] })
      setActiveKegiatan(updated)
      Swal.fire({
        icon: 'success',
        title: 'QR Code Diperbarui',
        text: 'Token kode QR baru telah berhasil digenerate.',
        timer: 1500,
        showConfirmButton: false
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal', err.message || 'Terjadi kesalahan sistem', 'error')
    }
  })

  // 5. Mutation Hapus Kegiatan
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/kegiatan-sekolah/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Gagal menghapus kegiatan')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kegiatan-sekolah'] })
      Swal.fire('Terhapus', 'Agenda kegiatan beserta riwayat presensi telah dihapus.', 'success')
    },
    onError: (err: any) => {
      Swal.fire('Gagal Menghapus', err.message || 'Terjadi kesalahan sistem', 'error')
    }
  })

  // 6. Mutation Tambah Presensi Manual
  const manualPresensiMutation = useMutation({
    mutationFn: async ({ kegiatanId, userId, keterangan }: { kegiatanId: string; userId: string; keterangan: string }) => {
      const res = await authenticatedFetch(`/api-backend/kegiatan-sekolah/${kegiatanId}/presensi/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, keterangan })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.message || 'Gagal mencatat presensi manual')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kegiatan-sekolah'] })
      refetchDetail()
      setIsManualPresensiOpen(false)
      setSelectedManualUserId('')
      Swal.fire({
        icon: 'success',
        title: 'Presensi Dicatat',
        timer: 1500,
        showConfirmButton: false
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal', err.message || 'Terjadi kesalahan sistem', 'error')
    }
  })

  // 7. Mutation Hapus Presensi Peserta
  const deletePresensiMutation = useMutation({
    mutationFn: async (presensiId: string) => {
      const res = await authenticatedFetch(`/api-backend/kegiatan-sekolah/presensi/${presensiId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Gagal menghapus data presensi')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kegiatan-sekolah'] })
      refetchDetail()
      Swal.fire('Dibatalkan', 'Presensi peserta berhasil dibatalkan.', 'success')
    }
  })

  const resetForm = () => {
    setFormState({
      namaKegiatan: '',
      kategori: isIsmubaUser ? 'KAJIAN_SELASA_PAGI' : 'KAJIAN_SELASA_PAGI',
      sifatKegiatan: 'TERJADWAL',
      tanggal: new Date().toISOString().split('T')[0],
      waktuMulai: '06:45',
      waktuSelesai: '07:30',
      tempat: 'Masjid Al-Manar / Aula Utama',
      pemateri: '',
      penanggungJawab: isIsmubaUser ? 'Waka ISMUBA SMA MUHIPO' : 'Tata Usaha & Humas',
      ringkasanMateri: '',
      dokumentasiUrl: '',
      status: 'DIBUKA'
    })
  }

  const applyPreset = (presetKey: string) => {
    const today = new Date().toISOString().split('T')[0]
    switch (presetKey) {
      case 'KAJIAN_SELASA_PAGI':
        setFormState({
          namaKegiatan: 'Kajian Rutin Selasa Pagi',
          kategori: 'KAJIAN_SELASA_PAGI',
          sifatKegiatan: 'TERJADWAL',
          tanggal: today,
          waktuMulai: '06:45',
          waktuSelesai: '07:30',
          tempat: 'Masjid Al-Manar SMA MUHIPO',
          pemateri: '',
          penanggungJawab: isIsmubaUser ? 'Waka ISMUBA SMA MUHIPO' : 'Tim ISMUBA & Humas',
          ringkasanMateri: 'Kajian ketakwaan, tafsir Al-Qur\'an, dan pembinaan karakter islami sivitas akademika SMA Muhammadiyah 1 Ponorogo.',
          dokumentasiUrl: '',
          status: 'DIBUKA'
        })
        break
      case 'SHOLAT_JUMAT':
        setFormState({
          namaKegiatan: 'Sholat Jumat Berjamaah & Khutbah',
          kategori: 'SHOLAT_JUMAT',
          sifatKegiatan: 'TERJADWAL',
          tanggal: today,
          waktuMulai: '11:30',
          waktuSelesai: '12:45',
          tempat: 'Masjid Al-Manar SMA MUHIPO',
          pemateri: 'Khotib & Imam Jumat',
          penanggungJawab: isIsmubaUser ? 'Waka ISMUBA SMA MUHIPO' : 'Tim ISMUBA',
          ringkasanMateri: 'Pelaksanaan sholat Jumat berjamaah seluruh guru, karyawan, dan siswa.',
          dokumentasiUrl: '',
          status: 'DIBUKA'
        })
        break
      case 'MABIT_TAQWA':
        setFormState({
          namaKegiatan: 'Malam Bina Iman dan Taqwa (MABIT)',
          kategori: 'MABIT_TAQWA',
          sifatKegiatan: 'TERJADWAL',
          tanggal: today,
          waktuMulai: '17:00',
          waktuSelesai: '06:00',
          tempat: 'Masjid Al-Manar & Kampus SMA MUHIPO',
          pemateri: 'Tim Instruktur ISMUBA & Pembina IPM',
          penanggungJawab: isIsmubaUser ? 'Waka ISMUBA SMA MUHIPO' : 'Tim ISMUBA & Kesiswaan',
          ringkasanMateri: 'Pembinaan aqidah, qiyamul lail, tahsin Al-Qur\'an, dan muhasabah diri.',
          dokumentasiUrl: '',
          status: 'DIBUKA'
        })
        break
      case 'BAITUL_ARQAM':
        setFormState({
          namaKegiatan: 'Baitul Arqam & Pembinaan Ideologi Kemuhammadiyahan',
          kategori: 'BAITUL_ARQAM',
          sifatKegiatan: 'TERJADWAL',
          tanggal: today,
          waktuMulai: '07:30',
          waktuSelesai: '15:30',
          tempat: 'Aula Utama SMA MUHIPO',
          pemateri: 'Pimpinan Daerah Muhammadiyah Ponorogo',
          penanggungJawab: isIsmubaUser ? 'Waka ISMUBA SMA MUHIPO' : 'Tim ISMUBA & Humas SDM',
          ringkasanMateri: 'Pendalaman Matan Keyakinan dan Cita-Cita Hidup Muhammadiyah (MKCHM) serta etos kerja berkemajuan.',
          dokumentasiUrl: '',
          status: 'DIBUKA'
        })
        break
      case 'UPACARA_APEL':
        setFormState({
          namaKegiatan: 'Upacara / Apel Pagi Hari Senin',
          kategori: 'UPACARA_APEL',
          sifatKegiatan: 'TERJADWAL',
          tanggal: today,
          waktuMulai: '06:45',
          waktuSelesai: '07:30',
          tempat: 'Halaman Utama Kampus SMA MUHIPO',
          pemateri: 'Pembina Upacara',
          penanggungJawab: 'Tata Usaha & Kesiswaan',
          ringkasanMateri: 'Amanat pembina upacara dan penguatan kedisiplinan serta tata tertib sekolah.',
          dokumentasiUrl: '',
          status: 'DIBUKA'
        })
        break
      case 'MENDESAK_QR':
        setFormState({
          namaKegiatan: 'Presensi Spontan / Koordinasi Singkat (Khusus QR)',
          kategori: 'RAPAT_KHUSUS',
          sifatKegiatan: 'MENDESAK',
          tanggal: today,
          waktuMulai: '07:00',
          waktuSelesai: '08:00',
          tempat: 'Ruang Guru / Aula Utama',
          pemateri: '-',
          penanggungJawab: currentUser?.name || 'Admin TU / Panitia',
          ringkasanMateri: 'Kegiatan spontan / mendesak untuk pendataan kehadiran langsung via QR tanpa tampil di kalender.',
          dokumentasiUrl: '',
          status: 'DIBUKA'
        })
        break
    }
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formState.namaKegiatan.trim()) {
      Swal.fire('Perhatian', 'Nama kegiatan wajib diisi!', 'warning')
      return
    }
    createMutation.mutate(formState)
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeKegiatan) return
    updateMutation.mutate({ id: activeKegiatan.id, payload: formState })
  }

  const openEditModal = (item: KegiatanItem) => {
    setActiveKegiatan(item)
    setFormState({
      namaKegiatan: item.namaKegiatan,
      kategori: item.kategori,
      sifatKegiatan: item.sifatKegiatan || 'TERJADWAL',
      tanggal: item.tanggal ? new Date(item.tanggal).toISOString().split('T')[0] : '',
      waktuMulai: item.waktuMulai || '06:45',
      waktuSelesai: item.waktuSelesai || '07:30',
      tempat: item.tempat,
      pemateri: item.pemateri || '',
      penanggungJawab: item.penanggungJawab || 'Tata Usaha & Humas',
      ringkasanMateri: item.ringkasanMateri || '',
      dokumentasiUrl: item.dokumentasiUrl || '',
      status: item.status
    })
    setIsEditModalOpen(true)
  }

  const handleDelete = (id: string, nama: string) => {
    Swal.fire({
      title: 'Hapus Kegiatan?',
      text: `Hapus agenda kegiatan "${nama}" beserta seluruh data presensi peserta?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then((res) => {
      if (res.isConfirmed) {
        deleteMutation.mutate(id)
      }
    })
  }

  // Export Excel Presensi
  const handleExportExcel = (kegiatan: KegiatanItem, presensiList: PresensiKegiatanItem[] = []) => {
    if (presensiList.length === 0) {
      Swal.fire('Info', 'Belum ada peserta yang melakukan presensi pada kegiatan ini.', 'info')
      return
    }

    const exportRows = presensiList.map((p, idx) => ({
      No: idx + 1,
      'Nama Peserta': p.namaPeserta,
      'NIP / NBM': p.nipNbm || p.user?.nipNbm || '-',
      Peran: p.role,
      'Waktu Presensi': new Date(p.waktuPresensi).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB',
      Metode: p.metode === 'QR_SCAN' ? 'Scan QR Mandiri' : 'Input Manual Panitia',
      Keterangan: p.keterangan || '-'
    }))

    const ws = XLSX.utils.json_to_sheet(exportRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Daftar Presensi')
    const fileName = `Presensi_${kegiatan.namaKegiatan.replace(/[^a-zA-Z0-9]/g, '_')}_${kegiatan.tanggal ? new Date(kegiatan.tanggal).toISOString().split('T')[0] : 'Log'}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // Print Daftar Hadir
  const handlePrint = (kegiatan: KegiatanItem, presensiList: PresensiKegiatanItem[] = []) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const katInfo = KATEGORI_KEGIATAN_MAP[kegiatan.kategori] || KATEGORI_KEGIATAN_MAP.KEGIATAN_LAIN
    const tglStr = new Date(kegiatan.tanggal).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    const rowsHtml = presensiList.map((p, idx) => `
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: bold;">${p.namaPeserta}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">${p.nipNbm || p.user?.nipNbm || '-'}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">${p.role}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">${new Date(p.waktuPresensi).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">${p.metode === 'QR_SCAN' ? 'Scan QR' : 'Manual'} (${p.keterangan || '-'})</td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daftar Hadir - ${kegiatan.namaKegiatan}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 30px; color: #0f172a; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .logo { font-size: 18px; font-weight: bold; }
          .sublogo { font-size: 12px; color: #475569; }
          .title { font-size: 16px; font-weight: bold; margin-top: 10px; text-transform: uppercase; }
          .meta-table { width: 100%; margin-bottom: 15px; font-size: 12px; }
          .meta-table td { padding: 3px 0; }
          table.data { width: 100%; border-collapse: collapse; font-size: 12px; }
          table.data th { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold; }
          .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">SMA MUHAMMADIYAH 1 PONOROGO</div>
          <div class="sublogo">SIMASMUH - SISTEM INFORMASI MANAJEMEN SEKOLAH MUHAMMADIYAH</div>
          <div class="title">DAFTAR HADIR KEHADIRAN KEGIATAN PEGAWAI</div>
        </div>

        <table class="meta-table">
          <tr>
            <td width="18%"><strong>Nama Kegiatan</strong></td>
            <td width="2%">:</td>
            <td width="45%">${kegiatan.namaKegiatan} (${katInfo.label})</td>
            <td width="15%"><strong>Hari, Tanggal</strong></td>
            <td width="2%">:</td>
            <td>${tglStr}</td>
          </tr>
          <tr>
            <td><strong>Pemateri / Narasumber</strong></td>
            <td>:</td>
            <td>${kegiatan.pemateri || '-'}</td>
            <td><strong>Waktu</strong></td>
            <td>:</td>
            <td>${kegiatan.waktuMulai || '-'} s.d ${kegiatan.waktuSelesai || '-'} WIB</td>
          </tr>
          <tr>
            <td><strong>Tempat Pelaksanaan</strong></td>
            <td>:</td>
            <td>${kegiatan.tempat}</td>
            <td><strong>Total Hadir</strong></td>
            <td>:</td>
            <td><strong>${presensiList.length} Peserta</strong></td>
          </tr>
        </table>

        <table class="data">
          <thead>
            <tr>
              <th width="5%">No</th>
              <th width="30%">Nama Lengkap Pegawai</th>
              <th width="18%">NIP / NBM</th>
              <th width="12%">Peran</th>
              <th width="15%">Waktu Presensi</th>
              <th width="20%">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="6" style="text-align: center; padding: 12px;">Belum ada data presensi peserta.</td></tr>'}
          </tbody>
        </table>

        <div style="margin-top: 40px; display: flex; justify-content: space-between; text-align: center; font-size: 12px;">
          <div style="width: 200px;">
            Mengetahui,<br/>Penanggung Jawab Kegiatan<br/><br/><br/><br/>
            <strong>${kegiatan.penanggungJawab || 'Tim Humas & SDM'}</strong>
          </div>
          <div style="width: 200px;">
            Ponorogo, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>
            Petugas Presensi / Panitia<br/><br/><br/><br/>
            <strong>${currentUser?.name || 'Panitia SIMASMUH'}</strong>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  // Print Poster / Stand Banner QR Kegiatan untuk ditempel atau dipajang di meja/ruangan
  const handlePrintQrStand = (kegiatan: KegiatanItem) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const katInfo = KATEGORI_KEGIATAN_MAP[kegiatan.kategori] || KATEGORI_KEGIATAN_MAP.KEGIATAN_LAIN
    const tglStr = new Date(kegiatan.tanggal).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    // Cetak poster ringkas: Nama Kegiatan, Tempat, Tanggal, Waktu, dan QR Code
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Presensi - ${kegiatan.namaKegiatan}</title>
        <style>
          @page { size: A4 portrait; margin: 20mm; }
          body { 
            font-family: Arial, Helvetica, sans-serif; 
            margin: 0; 
            padding: 20px;
            color: #0f172a; 
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
          }
          .poster-box {
            border: 3px solid #0f172a;
            border-radius: 20px;
            padding: 40px 25px;
            max-width: 600px;
            width: 100%;
            background: #ffffff;
          }
          .kegiatan-title {
            font-size: 28px;
            font-weight: 900;
            color: #0f172a;
            margin: 0 0 8px 0;
            line-height: 1.2;
            text-transform: uppercase;
          }
          .kegiatan-kategori {
            font-size: 14px;
            font-weight: bold;
            color: #047857;
            margin-bottom: 25px;
          }
          .qr-wrapper {
            margin: 15px auto 25px auto;
            display: inline-block;
            padding: 15px;
            border: 2px dashed #cbd5e1;
            border-radius: 16px;
          }
          .info-box {
            margin: 20px auto 0 auto;
            font-size: 15px;
            text-align: left;
            border-collapse: collapse;
            width: 100%;
            max-width: 480px;
          }
          .info-box td {
            padding: 6px 10px;
          }
          .footer-note {
            margin-top: 25px;
            font-size: 12px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="poster-box">
          <div class="kegiatan-title">${kegiatan.namaKegiatan}</div>
          <div class="kegiatan-kategori">${katInfo.label}</div>

          <div class="qr-wrapper">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(kegiatan.qrCodeToken)}" width="260" height="260" alt="QR Code Presensi" />
          </div>

          <table class="info-box">
            <tr>
              <td width="28%"><strong>Tempat</strong></td>
              <td width="4%">:</td>
              <td><strong>${kegiatan.tempat}</strong></td>
            </tr>
            <tr>
              <td><strong>Tanggal</strong></td>
              <td>:</td>
              <td>${tglStr}</td>
            </tr>
            <tr>
              <td><strong>Waktu</strong></td>
              <td>:</td>
              <td>${kegiatan.waktuMulai || '-'} s.d ${kegiatan.waktuSelesai || '-'} WIB</td>
            </tr>
            ${kegiatan.pemateri ? `<tr><td><strong>Pemateri</strong></td><td>:</td><td>${kegiatan.pemateri}</td></tr>` : ''}
          </table>

          <div class="footer-note">
            Silakan scan QR code di atas melalui menu <strong>Scan QR Absen</strong> pada SIMASMUH.
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  // Filter List Kegiatan
  const filteredKegiatan = useMemo(() => {
    return kegiatanList.filter((item) => {
      const matchSearch =
        item.namaKegiatan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.pemateri && item.pemateri.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.tempat && item.tempat.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.nomorKegiatan && item.nomorKegiatan.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchSearch
    })
  }, [kegiatanList, searchQuery])

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-5 sm:p-6 shadow-md">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-[11px] font-semibold text-emerald-200">
              <Sparkles className="w-3 h-3 text-emerald-300" />
              <span>{isIsmubaUser ? 'Waka ISMUBA & Tim Keagamaan' : 'Manajemen Tata Usaha & Humas'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Kegiatan Sekolah &amp; Presensi QR
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Pengelolaan kegiatan sekolah &amp; program ISMUBA (Kajian Selasa Pagi, Sholat Jumat, MABIT, Workshop, Upacara) beserta absensi presensi mandiri QR Code.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
            {canManageKegiatan && (
              <Button
                onClick={() => { resetForm(); setIsAddModalOpen(true) }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-sm gap-1.5 flex-1 sm:flex-initial"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Kegiatan Baru</span>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs h-9 px-3 rounded-xl gap-1.5"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Template Presets (Khusus TU & Waka ISMUBA) */}
      {canManageKegiatan && (
        <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Template Cepat Kegiatan (1-Klik):
            </span>
            <span className="text-[10px] text-slate-400">Pilih untuk isi form otomatis</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <Button
              size="sm"
              variant="outline"
              onClick={() => { applyPreset('KAJIAN_SELASA_PAGI'); setIsAddModalOpen(true) }}
              className="h-7 text-[11px] px-2.5 rounded-lg border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950/30 shrink-0 gap-1"
            >
              <span>📖 Kajian Selasa Pagi</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { applyPreset('SHOLAT_JUMAT'); setIsAddModalOpen(true) }}
              className="h-7 text-[11px] px-2.5 rounded-lg border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 bg-teal-50/50 hover:bg-teal-100 dark:bg-teal-950/30 shrink-0 gap-1"
            >
              <span>🕌 Sholat Jumat</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { applyPreset('MABIT_TAQWA'); setIsAddModalOpen(true) }}
              className="h-7 text-[11px] px-2.5 rounded-lg border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 hover:bg-indigo-100 dark:bg-indigo-950/30 shrink-0 gap-1"
            >
              <span>🌙 MABIT Siswa</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { applyPreset('BAITUL_ARQAM'); setIsAddModalOpen(true) }}
              className="h-7 text-[11px] px-2.5 rounded-lg border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 bg-green-50/50 hover:bg-green-100 dark:bg-green-950/30 shrink-0 gap-1"
            >
              <span>⭐ Baitul Arqam</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { applyPreset('UPACARA_APEL'); setIsAddModalOpen(true) }}
              className="h-7 text-[11px] px-2.5 rounded-lg border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 bg-rose-50/50 hover:bg-rose-100 dark:bg-rose-950/30 shrink-0 gap-1"
            >
              <span>🚩 Upacara / Apel</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { applyPreset('MENDESAK_QR'); setIsAddModalOpen(true) }}
              className="h-7 text-[11px] px-2.5 rounded-lg border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 bg-amber-50/50 hover:bg-amber-100 dark:bg-amber-950/30 shrink-0 gap-1"
            >
              <AlertCircle className="w-3 h-3 text-amber-600" />
              <span>⚡ Kegiatan Mendesak (QR Saja)</span>
            </Button>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari nama kegiatan, pemateri, tempat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            <div>
              <Select value={selectedKategori} onValueChange={(val: string | null) => setSelectedKategori(val || 'ALL')}>
                <SelectTrigger className="text-xs h-9 bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Kategori Kegiatan" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="ALL">Semua Kategori</SelectItem>
                  {Object.entries(KATEGORI_KEGIATAN_MAP).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {val.ismuba ? `[ISMUBA] ${val.label}` : val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={selectedSifat} onValueChange={(val: string | null) => setSelectedSifat(val || 'ALL')}>
                <SelectTrigger className="text-xs h-9 bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Sifat Kegiatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Sifat</SelectItem>
                  <SelectItem value="TERJADWAL">Terjadwal (Kalender)</SelectItem>
                  <SelectItem value="MENDESAK">Mendesak (Khusus QR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={selectedStatus} onValueChange={(val: string | null) => setSelectedStatus(val || 'ALL')}>
                <SelectTrigger className="text-xs h-9 bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Status Kegiatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value="DIBUKA">Dibuka (Presensi Aktif)</SelectItem>
                  <SelectItem value="SELESAI">Selesai</SelectItem>
                  <SelectItem value="DITUTUP">Ditutup</SelectItem>
                  <SelectItem value="DIBATALKAN">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List / Grid Card Kegiatan */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-2 text-emerald-600" />
          <p className="text-xs font-medium">Memuat agenda kegiatan sekolah...</p>
        </div>
      ) : filteredKegiatan.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Belum Ada Agenda Kegiatan</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Belum ditemukan kegiatan sekolah yang sesuai dengan filter atau pencarian Anda.
          </p>
          {canManageKegiatan && (
            <Button
              onClick={() => { resetForm(); setIsAddModalOpen(true) }}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Agenda Sekarang</span>
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredKegiatan.map((item) => {
            const katConfig = KATEGORI_KEGIATAN_MAP[item.kategori] || KATEGORI_KEGIATAN_MAP.KEGIATAN_LAIN
            const hadirCount = item._count?.presensis || item.presensis?.length || 0
            const tglFormatted = new Date(item.tanggal).toLocaleDateString('id-ID', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })
            const isMendesak = item.sifatKegiatan === 'MENDESAK'

            return (
              <Card 
                key={item.id} 
                className="border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  {/* Top Bar Header */}
                  <div className={`p-3 bg-gradient-to-r ${katConfig.color} text-white flex items-center justify-between`}>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-bold tracking-wide uppercase truncate max-w-[200px]">{katConfig.label}</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/20 backdrop-blur-xs font-semibold shrink-0">
                      {item.nomorKegiatan || 'KEG'}
                    </span>
                  </div>

                  <CardHeader className="p-4 pb-2 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-emerald-600 transition-colors" title={item.namaKegiatan}>
                        {item.namaKegiatan}
                      </CardTitle>
                      <Badge 
                        variant="secondary"
                        className={`text-[10px] uppercase font-bold shrink-0 ${
                          item.status === 'DIBUKA' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                          item.status === 'SELESAI' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                          'bg-slate-500/10 text-slate-600 border-slate-500/20'
                        }`}
                      >
                        {item.status}
                      </Badge>
                    </div>

                    {/* Sifat Kegiatan Badge */}
                    <div className="flex items-center gap-1.5">
                      {isMendesak ? (
                        <Badge variant="outline" className="text-[9px] font-semibold bg-amber-500/10 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 gap-1 py-0">
                          <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
                          <span>Mendesak (Khusus QR)</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] font-semibold bg-sky-500/10 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800 gap-1 py-0">
                          <Calendar className="w-2.5 h-2.5 text-sky-600" />
                          <span>Tersinkron Kalender</span>
                        </Badge>
                      )}
                    </div>

                    {item.pemateri && (
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5 truncate">
                        <span className="text-slate-400">Pemateri:</span>
                        <strong className="text-slate-800 dark:text-slate-100 truncate">{item.pemateri}</strong>
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="p-4 pt-1 space-y-3">
                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{tglFormatted}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{item.waktuMulai || '-'} s.d {item.waktuSelesai || '-'} WIB</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate" title={item.tempat}>{item.tempat}</span>
                      </div>
                    </div>

                    {/* Live Hadir Stats */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 font-medium">Kehadiran Pegawai</div>
                          <div className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                            {hadirCount} Guru &amp; Karyawan
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setActiveKegiatan(item); setIsQrModalOpen(true) }}
                        className="h-7 text-xs px-2 text-emerald-700 hover:bg-emerald-100/60 dark:text-emerald-300 gap-1"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Lihat QR</span>
                      </Button>
                    </div>
                  </CardContent>
                </div>

                {/* Card Action Buttons */}
                <div className="p-3 bg-slate-50/70 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setActiveKegiatan(item); setIsDetailModalOpen(true) }}
                    className="text-xs h-8 px-2.5 flex-1 gap-1 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Detail &amp; Peserta</span>
                  </Button>

                  {canManageKegiatan && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePrintQrStand(item)}
                        className="h-8 w-8 p-0 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
                        title="Cetak Lembar Poster QR"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditModal(item)}
                        className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                        title="Edit Kegiatan"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(item.id, item.namaKegiatan)}
                        className="h-8 w-8 p-0 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                        title="Hapus Kegiatan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ================= MODAL TAMBAH KEGIATAN ================= */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Sparkles className="w-5 h-5" /> Buat Agenda Kegiatan Baru
            </DialogTitle>
            <DialogDescription>
              Isi data kegiatan sekolah. Sistem akan otomatis membuat Kode QR khusus untuk absensi guru &amp; karyawan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nama Kegiatan / Agenda <span className="text-rose-500">*</span></Label>
              <Input
                placeholder="Misal: Kajian Selasa Pagi / Sholat Jumat Berjamaah / Workshop"
                value={formState.namaKegiatan}
                onChange={(e) => setFormState({ ...formState, namaKegiatan: e.target.value })}
                required
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Kategori Kegiatan</Label>
                <Select
                  value={formState.kategori}
                  onValueChange={(val: string | null) => { if (val) setFormState({ ...formState, kategori: val }) }}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {Object.entries(KATEGORI_KEGIATAN_MAP).map(([key, val]) => (
                      <SelectItem key={key} value={key}>
                        {val.ismuba ? `[ISMUBA] ${val.label}` : val.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Sifat Kegiatan &amp; Visibilitas</Label>
                <Select
                  value={formState.sifatKegiatan}
                  onValueChange={(val: string | null) => { if (val) setFormState({ ...formState, sifatKegiatan: val }) }}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TERJADWAL">📅 Terjadwal (Tampil di Kalender)</SelectItem>
                    <SelectItem value="MENDESAK">⚡ Mendesak (Khusus QR - Tanpa Kalender)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tanggal Pelaksanaan</Label>
                <Input
                  type="date"
                  value={formState.tanggal}
                  onChange={(e) => setFormState({ ...formState, tanggal: e.target.value })}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Waktu Pelaksanaan</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="time"
                    value={formState.waktuMulai}
                    onChange={(e) => setFormState({ ...formState, waktuMulai: e.target.value })}
                    className="text-xs h-9"
                  />
                  <span>-</span>
                  <Input
                    type="time"
                    value={formState.waktuSelesai}
                    onChange={(e) => setFormState({ ...formState, waktuSelesai: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
              </div>
            </div>

            {formState.sifatKegiatan === 'MENDESAK' && (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  <strong>Kegiatan Mendesak:</strong> Kegiatan ini tidak akan ditampilkan di kalender publik sekolah, namun langsung mengaktifkan Kode QR dan pencatatan presensi instan.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tempat / Ruangan</Label>
                <Input
                  placeholder="Misal: Masjid Al-Manar / Aula Utama"
                  value={formState.tempat}
                  onChange={(e) => setFormState({ ...formState, tempat: e.target.value })}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Pemateri / Narasumber</Label>
                <Input
                  placeholder="Misal: Ustadz Dr. H. Syarif, M.Ag"
                  value={formState.pemateri}
                  onChange={(e) => setFormState({ ...formState, pemateri: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Penanggung Jawab / Panitia</Label>
              <Input
                placeholder="Misal: Waka ISMUBA / Tata Usaha & Humas"
                value={formState.penanggungJawab}
                onChange={(e) => setFormState({ ...formState, penanggungJawab: e.target.value })}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Ringkasan / Catatan Materi</Label>
              <Textarea
                placeholder="Tuliskan ringkasan materi atau poin-poin utama kegiatan..."
                rows={2}
                value={formState.ringkasanMateri}
                onChange={(e) => setFormState({ ...formState, ringkasanMateri: e.target.value })}
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="text-xs h-9"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 gap-1.5"
              >
                {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan &amp; Generate QR</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL EDIT KEGIATAN ================= */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Edit className="w-5 h-5" /> Edit Data Kegiatan
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nama Kegiatan / Agenda <span className="text-rose-500">*</span></Label>
              <Input
                value={formState.namaKegiatan}
                onChange={(e) => setFormState({ ...formState, namaKegiatan: e.target.value })}
                required
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Kategori</Label>
                <Select
                  value={formState.kategori}
                  onValueChange={(val: string | null) => { if (val) setFormState({ ...formState, kategori: val }) }}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {Object.entries(KATEGORI_KEGIATAN_MAP).map(([key, val]) => (
                      <SelectItem key={key} value={key}>
                        {val.ismuba ? `[ISMUBA] ${val.label}` : val.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Sifat Kegiatan</Label>
                <Select
                  value={formState.sifatKegiatan}
                  onValueChange={(val: string | null) => { if (val) setFormState({ ...formState, sifatKegiatan: val }) }}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TERJADWAL">📅 Terjadwal (Kalender)</SelectItem>
                    <SelectItem value="MENDESAK">⚡ Mendesak (Khusus QR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Status</Label>
                <Select
                  value={formState.status}
                  onValueChange={(val: string | null) => { if (val) setFormState({ ...formState, status: val }) }}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIBUKA">Dibuka (Presensi Aktif)</SelectItem>
                    <SelectItem value="SELESAI">Selesai</SelectItem>
                    <SelectItem value="DITUTUP">Ditutup</SelectItem>
                    <SelectItem value="DIBATALKAN">Dibatalkan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tanggal Pelaksanaan</Label>
                <Input
                  type="date"
                  value={formState.tanggal}
                  onChange={(e) => setFormState({ ...formState, tanggal: e.target.value })}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Waktu</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="time"
                    value={formState.waktuMulai}
                    onChange={(e) => setFormState({ ...formState, waktuMulai: e.target.value })}
                    className="text-xs h-9"
                  />
                  <span>-</span>
                  <Input
                    type="time"
                    value={formState.waktuSelesai}
                    onChange={(e) => setFormState({ ...formState, waktuSelesai: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tempat</Label>
                <Input
                  value={formState.tempat}
                  onChange={(e) => setFormState({ ...formState, tempat: e.target.value })}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Pemateri</Label>
                <Input
                  value={formState.pemateri}
                  onChange={(e) => setFormState({ ...formState, pemateri: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Penanggung Jawab</Label>
              <Input
                value={formState.penanggungJawab}
                onChange={(e) => setFormState({ ...formState, penanggungJawab: e.target.value })}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Ringkasan Materi</Label>
              <Textarea
                rows={2}
                value={formState.ringkasanMateri}
                onChange={(e) => setFormState({ ...formState, ringkasanMateri: e.target.value })}
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                className="text-xs h-9"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 gap-1.5"
              >
                {updateMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Perbarui Data</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL DISPLAY QR CODE & PROYEKTOR ================= */}
      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent className="sm:max-w-[500px] text-center">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-600" />
              <span>QR Code Absensi Kegiatan</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tampilkan QR Code ini di layar monitor / proyektor agar guru dan karyawan dapat scan presensi.
            </DialogDescription>
          </DialogHeader>

          {activeKegiatan && (
            <div className="py-3 space-y-4">
              <div className="bg-emerald-50 dark:bg-slate-900 p-3 rounded-xl border border-emerald-200 dark:border-slate-800">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{activeKegiatan.namaKegiatan}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeKegiatan.tempat} | {activeKegiatan.waktuMulai} - {activeKegiatan.waktuSelesai} WIB
                </p>
              </div>

              {/* QR Code Canvas */}
              <div className="p-5 bg-white rounded-2xl border-2 border-emerald-500/30 inline-block shadow-inner">
                <QRCodeSVG
                  value={activeKegiatan.qrCodeToken}
                  size={240}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-mono font-bold text-slate-400">
                  TOKEN: <span className="text-emerald-600 dark:text-emerald-400">{activeKegiatan.qrCodeToken}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Tercatat Hadir: <strong className="text-emerald-600">{detailData?._count?.presensis || activeKegiatan._count?.presensis || 0} Pegawai</strong>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePrintQrStand(activeKegiatan)}
                  className="text-xs h-8 gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Lembar / Stand QR</span>
                </Button>

                {canManageKegiatan && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refreshQrMutation.mutate(activeKegiatan.id)}
                    disabled={refreshQrMutation.isPending}
                    className="text-xs h-8 gap-1 text-slate-600 hover:text-emerald-700"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshQrMutation.isPending ? 'animate-spin' : ''}`} />
                    <span>Regenerate QR Token</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-center">
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsQrModalOpen(false)}
              className="bg-slate-900 text-white hover:bg-slate-800 text-xs h-8 px-6"
            >
              Tutup Layar QR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL DETAIL & REKAP PRESENSI ================= */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[780px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-base font-extrabold text-slate-900 dark:text-white">
              <span className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <span>Detail & Daftar Presensi Kegiatan</span>
              </span>
              {detailData && (
                <Badge variant="outline" className="text-xs font-mono">
                  {detailData.nomorKegiatan}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {detailData && (
            <div className="space-y-4 py-2 text-xs">
              {/* Ringkasan Header Kegiatan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="sm:col-span-2 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-600">
                    {KATEGORI_KEGIATAN_MAP[detailData.kategori]?.label || detailData.kategori}
                  </span>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {detailData.namaKegiatan}
                  </h3>
                  {detailData.pemateri && (
                    <p className="text-slate-600 dark:text-slate-300">
                      Narasumber / Pemateri: <strong>{detailData.pemateri}</strong>
                    </p>
                  )}
                  <p className="text-slate-500">
                    Tempat: {detailData.tempat} | Penanggung Jawab: {detailData.penanggungJawab || '-'}
                  </p>
                </div>

                <div className="flex flex-col justify-center sm:items-end border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 pt-2 sm:pt-0 sm:pl-3">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Kehadiran</span>
                  <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {detailData.presensis?.length || 0}
                  </span>
                  <span className="text-[10px] text-slate-500">Guru & Karyawan</span>
                </div>
              </div>

              {detailData.ringkasanMateri && (
                <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 space-y-1">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" /> Ringkasan Materi Kegiatan:
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {detailData.ringkasanMateri}
                  </p>
                </div>
              )}

              {/* Action Toolbar Daftar Presensi */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Daftar Hadir Peserta ({detailData.presensis?.length || 0})</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {canManageKegiatan && (
                    <Button
                      size="sm"
                      onClick={() => setIsManualPresensiOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-2.5 gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Input Manual</span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExportExcel(detailData, detailData.presensis)}
                    className="text-xs h-8 px-2.5 gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Excel</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePrint(detailData, detailData.presensis)}
                    className="text-xs h-8 px-2.5 gap-1 text-slate-700 border-slate-200 hover:bg-slate-100"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak</span>
                  </Button>
                </div>
              </div>

              {/* Tabel Daftar Hadir Live */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80">
                    <TableRow className="text-xs">
                      <TableHead className="w-12 text-center px-3 font-bold">No</TableHead>
                      <TableHead className="min-w-[180px] max-w-[300px] px-3 font-bold">Nama Pegawai</TableHead>
                      <TableHead className="w-32 text-center px-3 font-bold">NIP / NBM</TableHead>
                      <TableHead className="w-32 text-center px-3 font-bold">Waktu Presensi</TableHead>
                      <TableHead className="w-28 text-center px-3 font-bold">Metode</TableHead>
                      {canManageKegiatan && <TableHead className="w-24 text-right px-3 font-bold">Aksi</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!detailData.presensis || detailData.presensis.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canManageKegiatan ? 6 : 5} className="text-center py-6 text-slate-400">
                          Belum ada peserta yang melakukan presensi di kegiatan ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      detailData.presensis.map((p, idx) => (
                        <TableRow key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                          <TableCell className="text-center font-medium text-slate-400">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="font-bold text-slate-900 dark:text-white">{p.namaPeserta}</div>
                            <div className="text-[10px] text-slate-400">{p.role}</div>
                          </TableCell>
                          <TableCell className="text-center font-mono text-[11px] text-slate-600 dark:text-slate-300">
                            {p.nipNbm || p.user?.nipNbm || '-'}
                          </TableCell>
                          <TableCell className="text-center whitespace-nowrap text-emerald-700 dark:text-emerald-400 font-medium font-mono text-[11px]">
                            {new Date(p.waktuPresensi).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant="secondary" 
                              className={`text-[9px] font-semibold ${
                                p.metode === 'QR_SCAN' 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {p.metode === 'QR_SCAN' ? 'Scan QR' : 'Manual'}
                            </Badge>
                          </TableCell>
                          {canManageKegiatan && (
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deletePresensiMutation.mutate(p.id)}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Batalkan Presensi"
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
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDetailModalOpen(false)}
              className="text-xs h-8"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL INPUT MANUAL PRESENSI ================= */}
      <Dialog open={isManualPresensiOpen} onOpenChange={setIsManualPresensiOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-sm">
              <UserPlus className="w-4 h-4" /> Input Presensi Pegawai Manual
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pilih guru atau staf yang berhalangan scan kamera untuk ditandai hadir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Pilih Guru / Karyawan</Label>
              <Select value={selectedManualUserId} onValueChange={(val: string | null) => setSelectedManualUserId(val || '')}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Pilih Pegawai" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {userList.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.role} {u.nipNbm ? `- ${u.nipNbm}` : ''})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Keterangan / Alasan</Label>
              <Input
                value={manualKeterangan}
                onChange={(e) => setManualKeterangan(e.target.value)}
                placeholder="Misal: Hadir, kamera HP bermasalah"
                className="text-xs h-9"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsManualPresensiOpen(false)}
              className="text-xs h-8"
            >
              Batal
            </Button>
            <Button
              size="sm"
              disabled={!selectedManualUserId || manualPresensiMutation.isPending}
              onClick={() => {
                if (activeKegiatan && selectedManualUserId) {
                  manualPresensiMutation.mutate({
                    kegiatanId: activeKegiatan.id,
                    userId: selectedManualUserId,
                    keterangan: manualKeterangan
                  })
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 gap-1"
            >
              {manualPresensiMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Catat Kehadiran</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
