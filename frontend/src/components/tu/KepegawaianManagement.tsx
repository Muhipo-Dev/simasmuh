'use client'

import React, { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  AlertCircle,
  Loader2,
  RefreshCw,
  Phone,
  Mail,
  UserCog,
  Upload,
  Camera,
  FileUp,
  ExternalLink,
  MapPin,
  Landmark,
  FileBadge,
  Sparkles,
  Layers,
  ArrowUpRight,
  DoorOpen,
  Power,
  UserX,
  ToggleLeft,
  ToggleRight
} from 'lucide-react'
import Swal from 'sweetalert2'
import Link from 'next/link'
import { CutiPegawaiManagement } from '@/app/(dashboard)/presensi/cuti/page'
import { IzinKeluarPegawaiManagement } from '@/app/(dashboard)/presensi/izin-keluar/page'
import { compressImageFile } from '@/utils/imageCompressor'

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
  cvUrl?: string
  skUrl?: string
  ijazahUrl?: string
}

interface PegawaiUserItem {
  id: string
  name: string
  username: string
  email?: string
  phone?: string
  nipNbm?: string
  role: string
  isActive?: boolean
  subRole?: string
  subRole2?: string
  subRole3?: string
  subRole4?: string
  subRole5?: string
  employmentStatus?: string
  avatarUrl?: string
  address?: string
  bankName?: string
  bankAccountNumber?: string
  bankAccountHolder?: string
  createdAt?: string
  teacherProfile?: {
    id?: string
    nip?: string
    phone?: string
    lastEducation?: string
    certificationStatus?: string
    certificationYear?: number
    skUrl?: string
    cvUrl?: string
    ijazahUrl?: string
    berkasUrl?: string
  }
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

// Data Awal Bersih Pelamar & Evaluasi Kinerja
const INITIAL_PELAMAR: PelamarItem[] = []
const INITIAL_EVALUASI: EvaluasiKinerjaItem[] = []


const ROLE_OPTIONS = [
  { value: 'GURU', label: 'Guru / Tenaga Pendidik' },
  { value: 'ADMIN_TU', label: 'Admin Tata Usaha' },
  { value: 'PEGAWAI', label: 'Pegawai / Karyawan' },
  { value: 'KEPALA_SEKOLAH', label: 'Kepala Sekolah' },
  { value: 'ADMIN_IT', label: 'Admin IT' },
]

const SUB_ROLE_OPTIONS = [
  { value: 'NONE', label: '— Tanpa Sub Role —' },
  { value: 'ADMIN_TU', label: 'Tata Usaha' },
  { value: 'WALI_KELAS', label: 'Wali Kelas' },
  { value: 'KEUANGAN_ALL', label: 'Keuangan Penuh' },
  { value: 'KEUANGAN_MASUK', label: 'Keuangan Masuk' },
  { value: 'KEUANGAN_KELUAR', label: 'Keuangan Keluar' },
  { value: 'HUMAS_SDM', label: 'Humas & SDM' },
  { value: 'KURIKULUM', label: 'Kurikulum' },
  { value: 'KETERTIBAN', label: 'Ketertiban / Tatib' },
  { value: 'BK_BP', label: 'Bimbingan Konseling (BK/BP)' },
  { value: 'PERSURATAN', label: 'Persuratan' },
  { value: 'PUSTAKAWAN', label: 'Pustakawan' },
  { value: 'GURU_TAHFIDZ', label: 'Guru Tahfidz' },
  { value: 'PEMBINA_EKSTRA', label: 'Pembina Ekstrakulikuler' },
  { value: 'ADMIN_WEB', label: 'Admin Web' },
  { value: 'KEAMANAN', label: 'Keamanan' },
  { value: 'KEBERSIHAN', label: 'Kebersihan' },
  { value: 'GURU_PIKET', label: 'Guru Piket' },
]

const EDUCATION_OPTIONS = [
  { value: 'S3', label: 'S3' },
  { value: 'S2', label: 'S2' },
  { value: 'S1', label: 'S1' },
  { value: 'D4', label: 'D4' },
  { value: 'D3', label: 'D3' },
  { value: 'SMA/SMK', label: 'SMA/SMK' },
]

const normalizeEducation = (edu?: string | null): string => {
  if (!edu) return 'S1'
  const trimmed = edu.trim()
  if (trimmed === 'S1 / Sarjana' || trimmed === 'S1 Pendidikan' || trimmed === 'Sarjana (S1)') return 'S1'
  if (trimmed === 'S2 / Magister' || trimmed === 'Magister (S2)') return 'S2'
  if (trimmed === 'S3 / Doktoral' || trimmed === 'Doktor (S3)' || trimmed === 'S3 / Doktor') return 'S3'
  if (trimmed === 'D4 / Sarjana Terapan' || trimmed === 'Diploma IV (D4)') return 'D4'
  if (trimmed === 'D3 / Ahli Madya' || trimmed === 'Diploma III (D3)') return 'D3'
  if (trimmed === 'SMA / SMK / Sederajat' || trimmed === 'SMA / SMK' || trimmed === 'SMA/SMK/MA') return 'SMA/SMK'
  return trimmed
}

export function KepegawaianManagement() {
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const user = session?.user as any

  // Tab Active State
  const [activeTab, setActiveTab] = useState<'database' | 'rekrutmen' | 'cuti' | 'izin-keluar' | 'evaluasi'>('database')

  // Datasets
  const [pelamarList, setPelamarList] = useState<PelamarItem[]>(INITIAL_PELAMAR)
  const [evaluasiList, setEvaluasiList] = useState<EvaluasiKinerjaItem[]>(INITIAL_EVALUASI)

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<'ALL' | 'GURU' | 'PEGAWAI' | 'TU'>('ALL')
  const [filterActiveStatus, setFilterActiveStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [filterPelamarStatus, setFilterPelamarStatus] = useState<string>('ALL')

  // Dialog States
  const [showAddPelamarModal, setShowAddPelamarModal] = useState(false)
  const [showAddPegawaiModal, setShowAddPegawaiModal] = useState(false)
  const [showEditPegawaiModal, setShowEditPegawaiModal] = useState(false)
  const [showDetailPegawaiModal, setShowDetailPegawaiModal] = useState(false)
  const [showAddEvaluasiModal, setShowAddEvaluasiModal] = useState(false)
  const [selectedPegawai, setSelectedPegawai] = useState<PegawaiUserItem | null>(null)

  // File Upload Ref
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const editAvatarInputRef = useRef<HTMLInputElement>(null)
  const skDocInputRef = useRef<HTMLInputElement>(null)
  const ijazahDocInputRef = useRef<HTMLInputElement>(null)
  const otherDocInputRef = useRef<HTMLInputElement>(null)

  // Document states in modals
  const [uploadedDocs, setUploadedDocs] = useState<{
    skName?: string
    skUrl?: string
    ijazahName?: string
    ijazahUrl?: string
    otherName?: string
    otherUrl?: string
    cvName?: string
    cvUrl?: string
  }>({})
  const [isUploadingDoc, setIsUploadingDoc] = useState(false)

  // Form States - Pelamar Baru
  const [formPelamar, setFormPelamar] = useState({
    nama: '',
    posisi: '',
    pendidikanTerakhir: 'S1',
    noHp: '',
    email: '',
    catatan: ''
  })

  // Form States - Pegawai Baru (Ranah Profesional SDM & TU)
  const [formPegawai, setFormPegawai] = useState({
    nipNbm: '',
    nama: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    role: 'GURU',
    subRole: 'NONE',
    employmentStatus: 'GTTP',
    lastEducation: 'S1',
    isActive: true,
    address: '',
    avatarUrl: ''
  })

  // Form States - Edit Pegawai (Ranah Profesional SDM & TU)
  const [editFormPegawai, setEditFormPegawai] = useState({
    id: '',
    nipNbm: '',
    nama: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    role: 'GURU',
    subRole: 'NONE',
    employmentStatus: 'GTTP',
    lastEducation: 'S1',
    isActive: true,
    address: '',
    avatarUrl: ''
  })

  // Form States - Evaluasi Kinerja (Preview Kinerja Muhipo)
  const [formEvaluasi, setFormEvaluasi] = useState({
    pegawaiId: '',
    periode: 'Semester Ganjil 2026/2027',
    skorPedagogik: 85,
    skorKepribadian: 85,
    skorSosial: 85,
    skorProfesional: 85,
    catatanPembinaan: ''
  })

  // Query Data Riil Pegawai & Guru dari Backend SIMASMUH
  const { data: allUsers = [], isLoading: isLoadingUsers, refetch: refetchUsers } = useQuery<PegawaiUserItem[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/users')
      if (!res.ok) throw new Error('Gagal mengambil data pegawai')
      return res.json()
    }
  })

  // Filter hanya staf internal (Guru, Pegawai, Admin TU, Kepala Sekolah, dll, bukan siswa / wali murid)
  const staffList = allUsers.filter(u => u.role !== 'SISWA' && u.role !== 'WALI_MURID')

  // Upload Handler helper dengan batas maksimal 20 MB
  const handleFileUpload = async (file: File, folder: string = 'sdm_docs'): Promise<string> => {
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Ukuran file "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal 20 MB`);
    }

    if (file.type.startsWith('image/')) {
      const compressed = await compressImageFile(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.88 })
      const res = await authenticatedFetch('/api-backend/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: compressed.dataUrl, folder })
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.message || 'Gagal mengunggah foto berkas')
      }
      const data = await res.json()
      return data.url
    } else {
      // Handle PDF, DOC, DOCX or document via base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = async (e) => {
          try {
            const base64Str = e.target?.result as string
            const res = await authenticatedFetch('/api-backend/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: base64Str, folder })
            })
            if (!res.ok) {
              const errJson = await res.json().catch(() => null)
              throw new Error(errJson?.message || 'Gagal mengunggah dokumen')
            }
            const data = await res.json()
            resolve(data.url)
          } catch (err) {
            reject(err)
          }
        }
        reader.onerror = () => reject(new Error('Gagal membaca file berkas'))
        reader.readAsDataURL(file)
      })
    }
  }

  // Mutation Tambah Pegawai Baru (Ranah Profesional SDM & TU)
  const createPegawaiMutation = useMutation({
    mutationFn: async (payload: typeof formPegawai) => {
      let finalAvatarUrl = payload.avatarUrl
      if (finalAvatarUrl && finalAvatarUrl.startsWith('data:image')) {
        const uploadRes = await authenticatedFetch('/api-backend/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: finalAvatarUrl, folder: 'profiles' })
        })
        if (uploadRes.ok) {
          const upData = await uploadRes.json()
          finalAvatarUrl = upData.url
        }
      }

      const res = await authenticatedFetch('/api-backend/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payload.nama,
          username: payload.username || payload.nipNbm || payload.nama.toLowerCase().replace(/[^a-z0-9]/g, ''),
          nipNbm: payload.nipNbm,
          phone: payload.phone || '088293733330',
          email: payload.email || undefined,
          password: payload.password || payload.username || payload.nipNbm || '123456',
          role: payload.role,
          subRole: payload.subRole !== 'NONE' ? payload.subRole : null,
          employmentStatus: payload.employmentStatus,
          lastEducation: payload.lastEducation,
          isActive: payload.isActive,
          address: payload.address || undefined,
          avatarUrl: finalAvatarUrl || undefined,
          skUrl: (payload as any).skUrl || uploadedDocs.skUrl || null,
          cvUrl: (payload as any).cvUrl || uploadedDocs.cvUrl || uploadedDocs.otherUrl || null,
          ijazahUrl: (payload as any).ijazahUrl || uploadedDocs.ijazahUrl || null,
          berkasUrl: (payload as any).berkasUrl || uploadedDocs.otherUrl || null,
        })
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.message || 'Gagal menambahkan pegawai ke database')
      }
      return res.json()
    },
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowAddPegawaiModal(false)
      setUploadedDocs({})
      setFormPegawai({
        nipNbm: '',
        nama: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        role: 'GURU',
        subRole: 'NONE',
        employmentStatus: 'GTTP',
        lastEducation: 'S1',
        isActive: true,
        address: '',
        avatarUrl: ''
      })
      Swal.fire({
        icon: 'success',
        title: 'Pegawai Berhasil Ditambahkan',
        text: `Data ${newUser.name || 'pegawai'} resmi terdaftar di database dan akun login telah dibuat.`,
        timer: 2000,
        showConfirmButton: false
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal Menambah Pegawai', err.message || 'Terjadi kesalahan sistem', 'error')
    }
  })

  // Mutation Update Pegawai (Ranah Profesional SDM & TU)
  const updatePegawaiMutation = useMutation({
    mutationFn: async (payload: typeof editFormPegawai) => {
      let finalAvatarUrl = payload.avatarUrl
      if (finalAvatarUrl && finalAvatarUrl.startsWith('data:image')) {
        const uploadRes = await authenticatedFetch('/api-backend/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: finalAvatarUrl, folder: 'profiles' })
        })
        if (uploadRes.ok) {
          const upData = await uploadRes.json()
          finalAvatarUrl = upData.url
        }
      }

      const bodyData: any = {
        name: payload.nama,
        username: payload.username,
        nipNbm: payload.nipNbm,
        phone: payload.phone,
        email: payload.email,
        role: payload.role,
        subRole: payload.subRole !== 'NONE' ? payload.subRole : null,
        employmentStatus: payload.employmentStatus,
        lastEducation: payload.lastEducation,
        isActive: payload.isActive,
        address: payload.address,
        avatarUrl: finalAvatarUrl || null,
        skUrl: uploadedDocs.skUrl || null,
        cvUrl: uploadedDocs.cvUrl || uploadedDocs.otherUrl || null,
        ijazahUrl: uploadedDocs.ijazahUrl || null,
        berkasUrl: uploadedDocs.otherUrl || null,
      }

      if (payload.password && payload.password.trim() !== '') {
        bodyData.password = payload.password.trim()
      }

      const res = await authenticatedFetch(`/api-backend/users/${payload.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.message || 'Gagal memperbarui data pegawai')
      }
      return res.json()
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowEditPegawaiModal(false)
      if (selectedPegawai && selectedPegawai.id === updated.id) {
        setSelectedPegawai(prev => prev ? { ...prev, ...updated } : null)
      }
      Swal.fire({
        icon: 'success',
        title: 'Data Pegawai Diperbarui',
        text: `Profil profesional pegawai ${updated.name || ''} berhasil disimpan.`,
        timer: 1800,
        showConfirmButton: false
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal Memperbarui Pegawai', err.message || 'Terjadi kesalahan sistem', 'error')
    }
  })

  // Mutation Toggle Aktif / Nonaktif Akun Pegawai (Tersinkronisasi 100% dengan Manajemen Akun)
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await authenticatedFetch(`/api-backend/users/${id}/toggle-active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.message || 'Gagal mengubah status keaktifan akun')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      if (selectedPegawai && selectedPegawai.id === data.id) {
        setSelectedPegawai(prev => prev ? { ...prev, isActive: data.isActive } : null)
      }
      Swal.fire({
        icon: 'success',
        title: data.isActive ? 'Akun Pegawai Diaktifkan' : 'Akun Pegawai Dinonaktifkan',
        text: `Status akun ${data.name || 'pegawai'} resmi ${data.isActive ? 'Aktif (dapat login)' : 'Nonaktif (akses dikunci)'}.`,
        timer: 1800,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal Mengubah Status', err.message || 'Terjadi kesalahan sistem', 'error')
    }
  })

  // Handler Quick Toggle Active / Inactive
  const handleToggleActive = (peg: PegawaiUserItem) => {
    const isCurrentlyActive = peg.isActive !== false
    const newStatus = !isCurrentlyActive
    Swal.fire({
      title: newStatus ? 'Aktifkan Akun Pegawai?' : 'Nonaktifkan Akun Pegawai?',
      html: newStatus
        ? `Aktifkan kembali akun login <strong>"${peg.name}"</strong>?<br/><span class="text-xs text-emerald-600">Pegawai akan dapat kembali login ke SIMASMUH.</span>`
        : `Nonaktifkan akun <strong>"${peg.name}"</strong>?<br/><span class="text-xs text-rose-500">Akses login akan dinonaktifkan sementara tanpa menghapus data kepegawaian.</span>`,
      icon: newStatus ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonColor: newStatus ? '#10b981' : '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: newStatus ? 'Ya, Aktifkan Akun' : 'Ya, Nonaktifkan Akun',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        toggleActiveMutation.mutate({ id: peg.id, isActive: newStatus })
      }
    })
  }

  // Mutation Hapus Pegawai
  const deletePegawaiMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/users/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.message || 'Gagal menghapus data pegawai')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      Swal.fire({
        icon: 'success',
        title: 'Pegawai Dihapus',
        text: 'Data pegawai dan akun sistem telah dihapus dengan aman.',
        timer: 1800,
        showConfirmButton: false
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal Menghapus', err.message || 'Terjadi kesalahan saat menghapus', 'error')
    }
  })

  // Delete Action with SweetAlert2 Confirmation
  const handleDeletePegawai = (peg: PegawaiUserItem) => {
    Swal.fire({
      title: 'Hapus Pegawai Ini?',
      html: `Apakah Anda yakin ingin menghapus data pegawai <strong>"${peg.name}"</strong> (${peg.nipNbm || peg.username})?<br/><span class="text-xs text-rose-500">Tindakan ini akan menghapus akun login dan riwayat kepegawaian.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Permanen',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        deletePegawaiMutation.mutate(peg.id)
      }
    })
  }

  // Open Edit Modal with Pre-filled Data (Ranah Profesional SDM & TU)
  const handleOpenEdit = (peg: PegawaiUserItem) => {
    setEditFormPegawai({
      id: peg.id,
      nipNbm: peg.nipNbm || peg.teacherProfile?.nip || '',
      nama: peg.name || '',
      username: peg.username || '',
      email: peg.email || '',
      phone: peg.phone || peg.teacherProfile?.phone || '',
      password: '',
      role: peg.role || 'GURU',
      subRole: peg.subRole || 'NONE',
      employmentStatus: peg.employmentStatus || (peg.role === 'GURU' ? 'GTTP' : 'PTTP'),
      lastEducation: normalizeEducation(peg.teacherProfile?.lastEducation),
      isActive: peg.isActive !== false,
      address: peg.address || '',
      avatarUrl: peg.avatarUrl || ''
    })
    setUploadedDocs({
      skUrl: peg.teacherProfile?.skUrl || '',
      skName: peg.teacherProfile?.skUrl ? 'SK Tersimpan di SIMASMUH ✓' : '',
      ijazahUrl: peg.teacherProfile?.ijazahUrl || '',
      ijazahName: peg.teacherProfile?.ijazahUrl ? 'Ijazah Tersimpan di SIMASMUH ✓' : '',
      otherUrl: peg.teacherProfile?.berkasUrl || peg.teacherProfile?.cvUrl || '',
      otherName: (peg.teacherProfile?.berkasUrl || peg.teacherProfile?.cvUrl) ? 'CV/Berkas Tersimpan ✓' : '',
      cvUrl: peg.teacherProfile?.cvUrl || '',
      cvName: peg.teacherProfile?.cvUrl ? 'CV Tersimpan ✓' : '',
    })
    setShowEditPegawaiModal(true)
  }

  // Open Detail Modal
  const handleOpenDetail = (peg: PegawaiUserItem) => {
    setSelectedPegawai(peg)
    setShowDetailPegawaiModal(true)
  }

  // Handler Tambah Pelamar
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
      pendidikanTerakhir: formPelamar.pendidikanTerakhir || 'S1',
      noHp: formPelamar.noHp || '088293733330',
      email: formPelamar.email || 'pelamar@gmail.com',
      tanggalLamar: new Date().toISOString().split('T')[0],
      status: 'BERKAS_MASUK',
      catatan: formPelamar.catatan || 'Berkas lamaran diterima digital.',
      cvUrl: uploadedDocs.cvUrl,
      skUrl: uploadedDocs.skUrl,
      ijazahUrl: uploadedDocs.ijazahUrl
    }

    setPelamarList([newPelamar, ...pelamarList])
    setShowAddPelamarModal(false)
    setUploadedDocs({})
    setFormPelamar({ nama: '', posisi: '', pendidikanTerakhir: 'S1', noHp: '', email: '', catatan: '' })
    Swal.fire({
      icon: 'success',
      title: 'Pelamar Ditambahkan',
      text: `Berkas ${newPelamar.nama} berhasil terdaftar dalam alur rekrutmen SDM.`,
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

  // Terima Pelamar Jadi Pegawai Langsung ke Database (Ranah Profesional SDM)
  const handlePromotePelamarToPegawai = (pelamar: PelamarItem) => {
    Swal.fire({
      title: 'Terima Sebagai Pegawai?',
      text: `Terima ${pelamar.nama} dan otomatis buat akun pegawai resmi di database sekolah?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Terima & Buat Akun',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const isTeacher = pelamar.posisi.toLowerCase().includes('guru')
        const generatedUsername = pelamar.nama.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(10 + Math.random() * 89)
        const generatedNip = `NBM.${Math.floor(100000 + Math.random() * 900000)}`

        try {
          await createPegawaiMutation.mutateAsync({
            nama: pelamar.nama,
            nipNbm: generatedNip,
            username: generatedUsername,
            email: pelamar.email,
            phone: pelamar.noHp,
            password: 'password123',
            role: isTeacher ? 'GURU' : 'PEGAWAI',
            subRole: 'NONE',
            employmentStatus: isTeacher ? 'GTTP' : 'PTTP',
            lastEducation: pelamar.pendidikanTerakhir,
            address: '',
            avatarUrl: '',
            skUrl: pelamar.skUrl,
            cvUrl: pelamar.cvUrl,
            ijazahUrl: pelamar.ijazahUrl,
            berkasUrl: pelamar.berkasUrl,
          } as any)
          handleUpdateStatusPelamar(pelamar.id, 'DITERIMA')
        } catch {
          // Handled by mutation onError
        }
      }
    })
  }

  // Handler Pegawai Baru Submit Form
  const handleAddPegawaiSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formPegawai.nama) {
      Swal.fire('Peringatan', 'Nama lengkap pegawai wajib diisi!', 'warning')
      return
    }
    createPegawaiMutation.mutate(formPegawai)
  }

  // Handler Edit Pegawai Submit Form
  const handleEditPegawaiSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editFormPegawai.nama) {
      Swal.fire('Peringatan', 'Nama lengkap pegawai wajib diisi!', 'warning')
      return
    }
    updatePegawaiMutation.mutate(editFormPegawai)
  }

  // Handler Evaluasi Kinerja Baru
  const handleAddEvaluasi = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formEvaluasi.pegawaiId) {
      Swal.fire('Peringatan', 'Pilih pegawai yang dievaluasi!', 'warning')
      return
    }

    const pegawaiTarget = staffList.find(p => p.id === formEvaluasi.pegawaiId)
    const total = (Number(formEvaluasi.skorPedagogik) + Number(formEvaluasi.skorKepribadian) + Number(formEvaluasi.skorSosial) + Number(formEvaluasi.skorProfesional)) / 4

    let predikat: EvaluasiKinerjaItem['predikat'] = 'CUKUP'
    if (total >= 90) predikat = 'SANGAT_BAIK'
    else if (total >= 80) predikat = 'BAIK'
    else if (total >= 70) predikat = 'CUKUP'
    else predikat = 'PERLU_PEMBINAAN'

    const newEv: EvaluasiKinerjaItem = {
      id: `EV-${String(evaluasiList.length + 1).padStart(3, '0')}`,
      pegawaiId: formEvaluasi.pegawaiId,
      pegawaiNama: pegawaiTarget?.name || 'Pegawai SIMASMUH',
      periode: formEvaluasi.periode,
      skorPedagogik: Number(formEvaluasi.skorPedagogik),
      skorKepribadian: Number(formEvaluasi.skorKepribadian),
      skorSosial: Number(formEvaluasi.skorSosial),
      skorProfesional: Number(formEvaluasi.skorProfesional),
      totalSkor: Number(total.toFixed(2)),
      predikat: predikat,
      evaluator: user?.name || 'Humas & SDM',
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

  // Filter Data Pegawai
  const filteredPegawai = staffList.filter(p => {
    const matchSearch =
      (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.nipNbm && p.nipNbm.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.username && p.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchRole =
      filterRole === 'ALL' ? true :
      filterRole === 'GURU' ? p.role === 'GURU' || p.subRole === 'GURU' :
      filterRole === 'PEGAWAI' ? p.role === 'PEGAWAI' || p.role === 'KARYAWAN' :
      filterRole === 'TU' ? ['ADMIN_TU', 'BAU', 'TATA_USAHA', 'KEPEGAWAIAN', 'SDM', 'WAKA_HUMAS_SDM', 'HUMAS_SDM'].includes(p.role) || ['ADMIN_TU', 'BAU', 'TATA_USAHA', 'KEPEGAWAIAN', 'SDM', 'WAKA_HUMAS_SDM', 'HUMAS_SDM'].includes(p.subRole || '') : true

    const matchActive =
      filterActiveStatus === 'ALL' ? true :
      filterActiveStatus === 'ACTIVE' ? p.isActive !== false :
      p.isActive === false

    return matchSearch && matchRole && matchActive
  })

  const filteredPelamar = pelamarList.filter(p => {
    const matchSearch = p.nama.toLowerCase().includes(searchQuery.toLowerCase()) || p.posisi.toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = filterPelamarStatus === 'ALL' || p.status === filterPelamarStatus
    return matchSearch && matchStatus
  })

  const filteredEvaluasi = evaluasiList.filter(e =>
    e.pegawaiNama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.periode.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeStaffCount = staffList.filter(u => u.isActive !== false).length
  const inactiveStaffCount = staffList.filter(u => u.isActive === false).length

  return (
    <div className="space-y-6">
      {/* Banner Ringkas Dashboard Humas & SDM */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-purple-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-500/20 text-purple-200 border-purple-400/30 text-[11px]">
                Humas & SDM Terintegrasi
              </Badge>
              <span className="text-xs text-purple-300">Bagian Humas & SDM</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Pusat Layanan Humas & SDM
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/80 max-w-2xl">
              Tata kelola profesional guru & staf (biodata, jabatan, SK, ijazah, status keaktifan akun & rekrutmen). Ranah payroll gaji diatur Bagian Keuangan.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center shrink-0">
            <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10">
              <div className="text-lg font-black text-emerald-400">
                {isLoadingUsers ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : activeStaffCount}
              </div>
              <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Pegawai Aktif</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10">
              <div className="text-lg font-black text-rose-300">
                {isLoadingUsers ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : inactiveStaffCount}
              </div>
              <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Nonaktif</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10">
              <div className="text-lg font-black text-amber-300">{pelamarList.length}</div>
              <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Pelamar</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10">
              <div className="text-lg font-black text-cyan-300">{evaluasiList.length}</div>
              <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Evaluasi</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons Tab Utama Kepegawaian */}
      <div className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="bg-transparent h-auto p-0 gap-1 grid grid-cols-2 sm:grid-cols-5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('database')}
              className={`rounded-xl py-2 px-3 text-xs font-bold transition-all flex items-center gap-1.5 justify-center ${
                activeTab === 'database'
                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Database ({staffList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rekrutmen')}
              className={`rounded-xl py-2 px-3 text-xs font-bold transition-all flex items-center gap-1.5 justify-center ${
                activeTab === 'rekrutmen'
                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Rekrutmen SDM</span>
              {pelamarList.filter(p => p.status === 'BERKAS_MASUK').length > 0 && (
                <span className="ml-1 bg-amber-500 text-white rounded-full px-1.5 py-0.2 text-[10px]">
                  {pelamarList.filter(p => p.status === 'BERKAS_MASUK').length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cuti')}
              className={`rounded-xl py-2 px-3 text-xs font-bold transition-all flex items-center gap-1.5 justify-center ${
                activeTab === 'cuti'
                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Izin Cuti</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('izin-keluar')}
              className={`rounded-xl py-2 px-3 text-xs font-bold transition-all flex items-center gap-1.5 justify-center ${
                activeTab === 'izin-keluar'
                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
              }`}
            >
              <DoorOpen className="w-4 h-4" />
              <span>Izin Keluar</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('evaluasi')}
              className={`rounded-xl py-2 px-3 text-xs font-bold transition-all flex items-center gap-1.5 justify-center ${
                activeTab === 'evaluasi'
                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Evaluasi</span>
            </button>
          </div>

          {/* Search Quick Input */}
          <div className="flex items-center gap-2">
            <div className="relative shrink-0 w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Cari data guru / staf..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
            </div>
            {activeTab === 'database' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchUsers()}
                className="h-9 px-2.5 rounded-xl border-slate-200 dark:border-slate-800"
                title="Refresh Data Pegawai"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isLoadingUsers ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>

        {/* TAB 1: DATABASE PEGAWAI (RANAH PROFESIONAL SDM & TU) */}
        {activeTab === 'database' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Database Pegawai & Tenaga Pendidik (Ranah Profesional SDM)
                </h3>
                <p className="text-xs text-slate-500">
                  Dikelola Humas SDM & Admin TU. Terhubung langsung dengan Manajemen Akun & Berkas Resmi SIMASMUH.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Filter Kategori Role */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                  <button
                    onClick={() => setFilterRole('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                      filterRole === 'ALL' ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Semua ({staffList.length})
                  </button>
                  <button
                    onClick={() => setFilterRole('GURU')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                      filterRole === 'GURU' ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Guru ({staffList.filter(u => u.role === 'GURU').length})
                  </button>
                  <button
                    onClick={() => setFilterRole('PEGAWAI')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                      filterRole === 'PEGAWAI' ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Karyawan ({staffList.filter(u => u.role === 'PEGAWAI' || u.role === 'KARYAWAN').length})
                  </button>
                </div>

                {/* Filter Status Keaktifan Akun */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                  <button
                    onClick={() => setFilterActiveStatus('ALL')}
                    className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all ${
                      filterActiveStatus === 'ALL' ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setFilterActiveStatus('ACTIVE')}
                    className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all ${
                      filterActiveStatus === 'ACTIVE' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Aktif ({activeStaffCount})
                  </button>
                  <button
                    onClick={() => setFilterActiveStatus('INACTIVE')}
                    className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all ${
                      filterActiveStatus === 'INACTIVE' ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Nonaktif ({inactiveStaffCount})
                  </button>
                </div>

                <Button
                  onClick={() => {
                    setUploadedDocs({})
                    setShowAddPegawaiModal(true)
                  }}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Pegawai</span>
                </Button>
              </div>
            </div>

            {isLoadingUsers ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
                <span className="text-xs">Menyinkronkan data database pegawai...</span>
              </div>
            ) : filteredPegawai.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
                Tidak ada data pegawai yang sesuai dengan pencarian.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPegawai.map(peg => {
                  const nip = peg.nipNbm || peg.teacherProfile?.nip || '-'
                  const phone = peg.phone || peg.teacherProfile?.phone || '-'
                  const education = normalizeEducation(peg.teacherProfile?.lastEducation)
                  const status = peg.employmentStatus || (peg.role === 'GURU' ? 'GTTP' : 'PTTP')

                  return (
                    <Card key={peg.id} className="border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-900 transition-all rounded-2xl shadow-xs">
                      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0 gap-2">
                        <div className="flex items-start gap-3">
                          {/* Avatar Foto Pegawai */}
                          <div className="w-11 h-11 rounded-full bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center shrink-0 overflow-hidden">
                            {peg.avatarUrl ? (
                              <img src={peg.avatarUrl} alt={peg.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-black text-purple-700 dark:text-purple-300 text-sm">
                                {peg.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="space-y-0.5">
                            <Badge variant="outline" className="text-[10px] font-mono bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200">
                              {nip !== '-' ? nip : `@${peg.username}`}
                            </Badge>
                            <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-1">
                              {peg.name}
                            </CardTitle>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate">{peg.role} {peg.subRole && peg.subRole !== 'NONE' ? `(${peg.subRole})` : ''}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge className={`text-[10px] uppercase font-bold shrink-0 ${
                            status.includes('GTP') || status.includes('GTY') ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'
                          }`}>
                            {status}
                          </Badge>
                          <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 ${
                            peg.isActive !== false 
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300' 
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300'
                          }`}>
                            {peg.isActive !== false ? '● Aktif' : '● Nonaktif'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 text-xs space-y-2">
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px]">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Pendidikan:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block">{education}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Kontak WA:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block">{phone}</span>
                          </div>
                        </div>

                        {peg.email && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                            <Mail className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span className="truncate">{peg.email}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] gap-1">
                          <Button 
                            onClick={() => handleOpenDetail(peg)} 
                            size="sm" 
                            variant="outline" 
                            className="h-7 text-[10px] rounded-lg gap-1 border-slate-200 text-slate-700 hover:bg-purple-50 hover:text-purple-700 shrink-0"
                          >
                            <Eye className="w-3 h-3 text-purple-600" />
                            <span>Detail</span>
                          </Button>

                          <div className="flex items-center gap-1">
                            <Button 
                              onClick={() => handleToggleActive(peg)} 
                              size="sm" 
                              variant="outline" 
                              className={`h-7 px-2 text-[10px] rounded-lg gap-1 ${
                                peg.isActive !== false
                                  ? 'border-slate-200 text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700'
                                  : 'border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100'
                              }`}
                              title={peg.isActive !== false ? 'Nonaktifkan Akun Pegawai (Kunci Akses Login)' : 'Aktifkan Akun Pegawai (Beri Akses Login)'}
                              disabled={toggleActiveMutation.isPending}
                            >
                              <Power className={`w-3 h-3 ${peg.isActive !== false ? 'text-slate-400' : 'text-emerald-600'}`} />
                              <span>{peg.isActive !== false ? 'Nonaktifkan' : 'Aktifkan'}</span>
                            </Button>

                            <Button 
                              onClick={() => handleOpenEdit(peg)} 
                              size="sm" 
                              variant="outline" 
                              className="h-7 px-2 text-[10px] rounded-lg gap-1 border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-100"
                              title="Edit Biodata, Jabatan & Berkas SDM"
                            >
                              <Edit className="w-3 h-3 text-amber-600" />
                              <span>Edit</span>
                            </Button>

                            <Button 
                              onClick={() => handleDeletePegawai(peg)} 
                              size="sm" 
                              variant="outline" 
                              className="h-7 px-2 text-[10px] rounded-lg gap-1 border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100"
                              title="Hapus Data Pegawai"
                            >
                              <Trash2 className="w-3 h-3 text-rose-600" />
                              <span>Hapus</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REKRUTMEN SDM PEGAWAI (LENGKAP FUNGSIONAL) */}
        {activeTab === 'rekrutmen' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-purple-600" />
                  Alur Rekrutmen Calon Pendidik & Tenaga Kependidikan
                </h3>
                <p className="text-xs text-slate-500">
                  Kelola penerimaan berkas, seleksi administrasi, wawancara, hingga pengangkatan langsung menjadi staf resmi SIMASMUH.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Select value={filterPelamarStatus} onValueChange={(val: string | null) => setFilterPelamarStatus(val || 'ALL')}>
                  <SelectTrigger className="h-8 text-[11px] font-bold w-40 rounded-xl bg-white dark:bg-slate-800 border-slate-200">
                    <SelectValue placeholder="Status Tahap" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Tahap</SelectItem>
                    <SelectItem value="BERKAS_MASUK">Berkas Masuk</SelectItem>
                    <SelectItem value="SELEKSI_ADMINISTRASI">Seleksi Administrasi</SelectItem>
                    <SelectItem value="WAWANCARA">Wawancara</SelectItem>
                    <SelectItem value="DITERIMA">Diterima</SelectItem>
                    <SelectItem value="DITOLAK">Ditolak</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={() => setShowAddPelamarModal(true)}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Input Pelamar Baru</span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      onValueChange={(val: string | null) => handleUpdateStatusPelamar(pel.id, (val || 'BERKAS_MASUK') as any)}
                    >
                      <SelectTrigger className="h-8 text-[11px] font-bold w-36 rounded-xl bg-purple-50 dark:bg-purple-950/40 border-purple-200">
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
                      <div><span className="text-slate-400">Pendidikan:</span> <span className="font-semibold">{normalizeEducation(pel.pendidikanTerakhir)}</span></div>
                      <div><span className="text-slate-400">Kontak/WA:</span> <span className="font-semibold">{pel.noHp} ({pel.email})</span></div>
                      
                      {/* Tautan Berkas Dokumen Pelamar */}
                      {(pel.skUrl || pel.ijazahUrl || pel.cvUrl) && (
                        <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-200/50 flex-wrap">
                          {pel.skUrl && (
                            <a
                              href={pel.skUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 rounded text-[9px] font-bold border border-purple-200"
                            >
                              <Eye className="w-2.5 h-2.5" /> SK
                            </a>
                          )}
                          {pel.ijazahUrl && (
                            <a
                              href={pel.ijazahUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded text-[9px] font-bold border border-emerald-200"
                            >
                              <Eye className="w-2.5 h-2.5" /> Ijazah
                            </a>
                          )}
                          {pel.cvUrl && (
                            <a
                              href={pel.cvUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded text-[9px] font-bold border border-blue-200"
                            >
                              <Eye className="w-2.5 h-2.5" /> CV
                            </a>
                          )}
                        </div>
                      )}

                      {pel.catatan && (
                        <div className="text-purple-800 dark:text-purple-300 pt-1 italic border-t border-slate-200/50 mt-1">
                          "{pel.catatan}"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">Tahap: <strong className="text-purple-700 dark:text-purple-300">{pel.status.replace('_', ' ')}</strong></span>
                      {pel.status !== 'DITERIMA' ? (
                        <Button
                          onClick={() => handlePromotePelamarToPegawai(pel)}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-7 gap-1 font-bold"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Terima Jadi Pegawai</span>
                        </Button>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px] font-bold">
                          Pegawai Terdaftar ✓
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CUTI & IZIN KERJA (INTEGRASI PENUH VERIFIKASI SDM) */}
        {activeTab === 'cuti' && (
          <div className="space-y-4">
            <div className="bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-purple-950 dark:text-purple-200 text-sm sm:text-base flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-purple-600" />
                  Pusat Pengajuan & Verifikasi Cuti / Izin Pegawai
                </h3>
                <p className="text-xs text-purple-800/80 dark:text-purple-300/80 mt-0.5">
                  Pengajuan cuti seluruh Guru & Pegawai terhubung langsung dengan Verifikasi Bagian SDM Kepegawaian & Waka SDM Humas.
                </p>
              </div>
            </div>

            <CutiPegawaiManagement />
          </div>
        )}

        {/* TAB 4: IZIN KELUAR & DINAS LUAR PEGAWAI */}
        {activeTab === 'izin-keluar' && (
          <div className="space-y-4">
            <div className="bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-purple-950 dark:text-purple-200 text-sm sm:text-base flex items-center gap-2">
                  <DoorOpen className="w-5 h-5 text-purple-600" />
                  Pusat Monitoring & Izin Keluar / Dinas Luar Pegawai
                </h3>
                <p className="text-xs text-purple-800/80 dark:text-purple-300/80 mt-0.5">
                  Rekap dan pencatatan izin keluar kampus, urusan dinas luar kantor, dan keperluan mendesak guru maupun staf.
                </p>
              </div>
            </div>

            <IzinKeluarPegawaiManagement />
          </div>
        )}

        {/* TAB 5: EVALUASI KINERJA PEGAWAI (KINERJA MUHIPO - COMING SOON) */}
        {activeTab === 'evaluasi' && (
          <div className="space-y-4">
            {/* Banner Khusus Kinerja Muhipo */}
            <div className="bg-gradient-to-r from-cyan-900 via-indigo-900 to-purple-950 text-white rounded-2xl p-5 shadow-sm border border-cyan-800/40">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-cyan-500/20 text-cyan-200 border-cyan-400/40 text-[11px] font-extrabold gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-300" />
                      Sistem Terpisah: KINERJA MUHIPO
                    </Badge>
                    <Badge variant="outline" className="text-[10px] text-amber-300 border-amber-400/40 font-bold bg-amber-400/10">
                      Coming Soon
                    </Badge>
                  </div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                    Platform Penilaian & Evaluasi Kinerja Mandiri (Kinerja Muhipo)
                  </h3>
                  <p className="text-xs text-cyan-100/80 max-w-2xl">
                    Evaluasi kinerja berkala (SKP, RPP, supervisi kelas, portofolio guru, dan pembinaan kedisiplinan) akan disajikan dalam portal khusus terintegrasi <strong>Kinerja Muhipo</strong>.
                  </p>
                </div>

                <Button
                  onClick={() => setShowAddEvaluasiModal(true)}
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-sm shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Input Evaluasi Internal</span>
                </Button>
              </div>
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
                      <span className="text-slate-500">Skor Rata-rata Kinerja:</span>
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
              Input Berkas Pelamar Baru (Rekrutmen SDM)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tambahkan calon pendidik / tenaga kependidikan ke dalam alur seleksi SDM.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddPelamar} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-bold">Nama Lengkap & Gelar *</Label>
              <Input
                placeholder="Contoh: Ahmad Fauzi, S.Pd"
                value={formPelamar.nama}
                onChange={(e) => setFormPelamar({ ...formPelamar, nama: e.target.value })}
                className="mt-1 h-9 rounded-xl text-xs"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Posisi yang Dilamar *</Label>
              <Input
                placeholder="Contoh: Guru Matematika / Staf IT Laboran"
                value={formPelamar.posisi}
                onChange={(e) => setFormPelamar({ ...formPelamar, posisi: e.target.value })}
                className="mt-1 h-9 rounded-xl text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-bold">Pendidikan Terakhir</Label>
                <Select
                  value={formPelamar.pendidikanTerakhir}
                  onValueChange={(val: string | null) => setFormPelamar({ ...formPelamar, pendidikanTerakhir: val || 'S1' })}
                >
                  <SelectTrigger className="mt-1 h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold">No. WhatsApp *</Label>
                <Input
                  placeholder="081234567890"
                  value={formPelamar.noHp}
                  onChange={(e) => setFormPelamar({ ...formPelamar, noHp: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold">Email</Label>
              <Input
                type="email"
                placeholder="pelamar@gmail.com"
                value={formPelamar.email}
                onChange={(e) => setFormPelamar({ ...formPelamar, email: e.target.value })}
                className="mt-1 h-9 rounded-xl text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Catatan Kualifikasi / Rekam Jejak</Label>
              <Textarea
                placeholder="IPK, sertifikat keahlian, pengalaman mengajar..."
                value={formPelamar.catatan}
                onChange={(e) => setFormPelamar({ ...formPelamar, catatan: e.target.value })}
                className="mt-1 rounded-xl text-xs h-16"
              />
            </div>

            {/* SEKSI UPLOAD BERKAS PELAMAR */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FileBadge className="w-3.5 h-3.5 text-purple-600" />
                  Lampiran Berkas (Maks. 20 MB / Berkas)
                </span>
                {isUploadingDoc && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />}
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px]">
                {/* Upload SK */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => skDocInputRef.current?.click()}
                  className={`h-7 text-[10px] rounded-lg gap-1 w-full ${uploadedDocs.skUrl ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : ''}`}
                >
                  <FileUp className="w-3 h-3" />
                  <span className="truncate">{uploadedDocs.skUrl ? 'SK Terupload ✓' : 'Upload SK'}</span>
                </Button>

                {/* Upload Ijazah */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => ijazahDocInputRef.current?.click()}
                  className={`h-7 text-[10px] rounded-lg gap-1 w-full ${uploadedDocs.ijazahUrl ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : ''}`}
                >
                  <FileUp className="w-3 h-3" />
                  <span className="truncate">{uploadedDocs.ijazahUrl ? 'Ijazah ✓' : 'Upload Ijazah'}</span>
                </Button>

                {/* Upload CV */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => otherDocInputRef.current?.click()}
                  className={`h-7 text-[10px] rounded-lg gap-1 w-full ${uploadedDocs.cvUrl || uploadedDocs.otherUrl ? 'border-blue-300 text-blue-700 bg-blue-50' : ''}`}
                >
                  <FileUp className="w-3 h-3" />
                  <span className="truncate">{uploadedDocs.cvUrl || uploadedDocs.otherUrl ? 'CV/Berkas ✓' : 'Upload CV'}</span>
                </Button>
              </div>
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

      {/* MODAL INPUT PEGAWAI BARU (RANAH PROFESIONAL SDM & TU) */}
      <Dialog open={showAddPegawaiModal} onOpenChange={setShowAddPegawaiModal}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Tambah Data Pegawai (Ranah Profesional SDM & TU)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Daftarkan pegawai/guru baru ke database kepegawaian, upload pasfoto, SK, Ijazah, dan dokumen SDM.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddPegawaiSubmit} className="space-y-4 py-2 text-xs">
            {/* Foto Profil Pegawai */}
            <div className="flex items-center gap-4 p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-2xl border border-purple-100 dark:border-purple-900/50">
              <div className="relative group w-16 h-16 rounded-full bg-purple-200 dark:bg-purple-900 flex items-center justify-center overflow-hidden border-2 border-purple-400 shrink-0">
                {formPegawai.avatarUrl ? (
                  <img src={formPegawai.avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-purple-700 dark:text-purple-300" />
                )}
              </div>
              <div className="space-y-1.5 flex-1">
                <Label className="text-xs font-bold text-purple-950 dark:text-purple-200">Foto Resmi Pegawai</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={avatarInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const compressed = await compressImageFile(file, { maxWidth: 500, maxHeight: 500, quality: 0.8 })
                        setFormPegawai(prev => ({ ...prev, avatarUrl: compressed.dataUrl }))
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => avatarInputRef.current?.click()}
                    className="h-8 text-xs rounded-xl gap-1.5 border-purple-300 text-purple-700 bg-white dark:bg-slate-900"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Foto</span>
                  </Button>
                  {formPegawai.avatarUrl && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setFormPegawai(prev => ({ ...prev, avatarUrl: '' }))}
                      className="h-8 text-xs text-rose-600 hover:bg-rose-50 rounded-xl"
                    >
                      Hapus Foto
                    </Button>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 block">Format: JPG, PNG, WEBP (Otomatis dikompresi ringan).</span>
              </div>
            </div>

            {/* Form Fields: Data Pokok Profesional */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">NIP / NBM</Label>
                <Input
                  placeholder="19850412 201001 1 003"
                  value={formPegawai.nipNbm}
                  onChange={(e) => setFormPegawai({ ...formPegawai, nipNbm: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Nama Lengkap & Gelar *</Label>
                <Input
                  placeholder="Drs. H. Muhammad Nailar, M.Pd"
                  value={formPegawai.nama}
                  onChange={(e) => setFormPegawai({ ...formPegawai, nama: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Username Login</Label>
                <Input
                  placeholder="nailar / guru_matematika"
                  value={formPegawai.username}
                  onChange={(e) => setFormPegawai({ ...formPegawai, username: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Password Awal</Label>
                <Input
                  type="password"
                  placeholder="Default: username / 123456"
                  value={formPegawai.password}
                  onChange={(e) => setFormPegawai({ ...formPegawai, password: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                    {ROLE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold">Sub-Role / Penugasan Khusus</Label>
                <Select
                  value={formPegawai.subRole}
                  onValueChange={(val: string | null) => setFormPegawai({ ...formPegawai, subRole: val || 'NONE' })}
                >
                  <SelectTrigger className="mt-1 h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUB_ROLE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Status Kepegawaian</Label>
                <Select
                  value={formPegawai.employmentStatus}
                  onValueChange={(val: string | null) => setFormPegawai({ ...formPegawai, employmentStatus: val || 'GTTP' })}
                >
                  <SelectTrigger className="mt-1 h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GTTP">GTT (Guru Tidak Tetap)</SelectItem>
                    <SelectItem value="GTP">GTY (Guru Tetap Yayasan)</SelectItem>
                    <SelectItem value="PTTP">PTT (Pegawai Tidak Tetap)</SelectItem>
                    <SelectItem value="PTP">PTY (Pegawai Tetap Yayasan)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold">Pendidikan Terakhir</Label>
                <Select
                  value={formPegawai.lastEducation}
                  onValueChange={(val: string | null) => setFormPegawai({ ...formPegawai, lastEducation: val || 'S1' })}
                >
                  <SelectTrigger className="mt-1 h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">No. WhatsApp / HP *</Label>
                <Input
                  placeholder="088293733330"
                  value={formPegawai.phone}
                  onChange={(e) => setFormPegawai({ ...formPegawai, phone: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Email</Label>
                <Input
                  type="email"
                  placeholder="pegawai@simasmuh.sch.id"
                  value={formPegawai.email}
                  onChange={(e) => setFormPegawai({ ...formPegawai, email: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs font-bold">Alamat Lengkap</Label>
                <Input
                  placeholder="Jl. Raya Timur No. 12, Ponorogo"
                  value={formPegawai.address}
                  onChange={(e) => setFormPegawai({ ...formPegawai, address: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Status Keaktifan Akun</Label>
                <Select
                  value={formPegawai.isActive ? 'ACTIVE' : 'INACTIVE'}
                  onValueChange={(val: string | null) => setFormPegawai({ ...formPegawai, isActive: val !== 'INACTIVE' })}
                >
                  <SelectTrigger className="mt-1 h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Aktif (Dapat Login)</SelectItem>
                    <SelectItem value="INACTIVE">Nonaktif (Akses Dikunci)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* SEKSI UPLOAD BERKAS KEPERLUAN SDM (SK, IJAZAH, SERTIFIKAT) */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileBadge className="w-4 h-4 text-purple-600" />
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    Upload Berkas SDM (SK, Fotocopy Ijazah & Sertifikat)
                  </span>
                </div>
                {isUploadingDoc && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                {/* Upload SK */}
                <div className="border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl bg-white dark:bg-slate-800 space-y-1.5 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">1. SK Pengangkatan</span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {uploadedDocs.skName || 'Belum diunggah (PDF/Gambar)'}
                    </span>
                  </div>
                  <input
                    type="file"
                    ref={skDocInputRef}
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        try {
                          setIsUploadingDoc(true)
                          const url = await handleFileUpload(file, 'sdm_docs')
                          setUploadedDocs(prev => ({ ...prev, skName: file.name, skUrl: url }))
                          Swal.fire({ icon: 'success', title: 'SK Terupload', timer: 1200, showConfirmButton: false })
                        } catch (err: any) {
                          Swal.fire('Gagal Upload SK', err.message, 'error')
                        } finally {
                          setIsUploadingDoc(false)
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => skDocInputRef.current?.click()}
                    className={`h-7 text-[10px] rounded-lg gap-1 w-full ${uploadedDocs.skUrl ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : ''}`}
                  >
                    <FileUp className="w-3 h-3" />
                    <span>{uploadedDocs.skUrl ? 'Ubah SK' : 'Upload SK'}</span>
                  </Button>
                </div>

                {/* Upload Fotocopy Ijazah */}
                <div className="border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl bg-white dark:bg-slate-800 space-y-1.5 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">2. Fotocopy Ijazah</span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {uploadedDocs.ijazahName || 'Belum diunggah (PDF/Gambar)'}
                    </span>
                  </div>
                  <input
                    type="file"
                    ref={ijazahDocInputRef}
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        try {
                          setIsUploadingDoc(true)
                          const url = await handleFileUpload(file, 'sdm_docs')
                          setUploadedDocs(prev => ({ ...prev, ijazahName: file.name, ijazahUrl: url }))
                          Swal.fire({ icon: 'success', title: 'Ijazah Terupload', timer: 1200, showConfirmButton: false })
                        } catch (err: any) {
                          Swal.fire('Gagal Upload Ijazah', err.message, 'error')
                        } finally {
                          setIsUploadingDoc(false)
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => ijazahDocInputRef.current?.click()}
                    className={`h-7 text-[10px] rounded-lg gap-1 w-full ${uploadedDocs.ijazahUrl ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : ''}`}
                  >
                    <FileUp className="w-3 h-3" />
                    <span>{uploadedDocs.ijazahUrl ? 'Ubah Ijazah' : 'Upload Ijazah'}</span>
                  </Button>
                </div>

                {/* Upload Dokumen Tambahan */}
                <div className="border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl bg-white dark:bg-slate-800 space-y-1.5 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">3. Dokumen Lain / Sertifikat</span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {uploadedDocs.otherName || 'CV / Sertifikasi'}
                    </span>
                  </div>
                  <input
                    type="file"
                    ref={otherDocInputRef}
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        try {
                          setIsUploadingDoc(true)
                          const url = await handleFileUpload(file, 'sdm_docs')
                          setUploadedDocs(prev => ({ ...prev, otherName: file.name, otherUrl: url }))
                          Swal.fire({ icon: 'success', title: 'Berkas Terupload', timer: 1200, showConfirmButton: false })
                        } catch (err: any) {
                          Swal.fire('Gagal Upload Berkas', err.message, 'error')
                        } finally {
                          setIsUploadingDoc(false)
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => otherDocInputRef.current?.click()}
                    className={`h-7 text-[10px] rounded-lg gap-1 w-full ${uploadedDocs.otherUrl ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : ''}`}
                  >
                    <FileUp className="w-3 h-3" />
                    <span>{uploadedDocs.otherUrl ? 'Ubah Berkas' : 'Upload Berkas'}</span>
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddPegawaiModal(false)} className="rounded-xl text-xs">
                Batal
              </Button>
              <Button type="submit" disabled={createPegawaiMutation.isPending || isUploadingDoc} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold gap-1">
                {createPegawaiMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Simpan Pegawai & Berkas</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL EDIT PEGAWAI (RANAH PROFESIONAL SDM & TU) */}
      <Dialog open={showEditPegawaiModal} onOpenChange={setShowEditPegawaiModal}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <Edit className="w-5 h-5 text-amber-600" />
              Ubah Data Profesional Pegawai & Kelola Berkas SDM
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sesuaikan identitas profesional, jabatan, kontak, alamat, dan perbarui berkas dokumen SDM pegawai.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditPegawaiSubmit} className="space-y-4 py-2 text-xs">
            {/* Foto Profil Pegawai */}
            <div className="flex items-center gap-4 p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/50">
              <div className="relative group w-16 h-16 rounded-full bg-amber-200 dark:bg-amber-900 flex items-center justify-center overflow-hidden border-2 border-amber-400 shrink-0">
                {editFormPegawai.avatarUrl ? (
                  <img src={editFormPegawai.avatarUrl} alt="Avatar Edit Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-amber-700 dark:text-amber-300" />
                )}
              </div>
              <div className="space-y-1.5 flex-1">
                <Label className="text-xs font-bold text-amber-950 dark:text-amber-200">Foto Resmi Pegawai</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={editAvatarInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const compressed = await compressImageFile(file, { maxWidth: 500, maxHeight: 500, quality: 0.8 })
                        setEditFormPegawai(prev => ({ ...prev, avatarUrl: compressed.dataUrl }))
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => editAvatarInputRef.current?.click()}
                    className="h-8 text-xs rounded-xl gap-1.5 border-amber-300 text-amber-700 bg-white dark:bg-slate-900"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Foto Baru</span>
                  </Button>
                  {editFormPegawai.avatarUrl && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditFormPegawai(prev => ({ ...prev, avatarUrl: '' }))}
                      className="h-8 text-xs text-rose-600 hover:bg-rose-50 rounded-xl"
                    >
                      Hapus Foto
                    </Button>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 block">Pembaruan foto otomatis disinkronkan ke seluruh sistem.</span>
              </div>
            </div>

            {/* Form Fields: Data Pokok Profesional */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">NIP / NBM</Label>
                <Input
                  placeholder="19850412 201001 1 003"
                  value={editFormPegawai.nipNbm}
                  onChange={(e) => setEditFormPegawai({ ...editFormPegawai, nipNbm: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Nama Lengkap & Gelar *</Label>
                <Input
                  placeholder="Drs. H. Muhammad Nailar, M.Pd"
                  value={editFormPegawai.nama}
                  onChange={(e) => setEditFormPegawai({ ...editFormPegawai, nama: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Username Login</Label>
                <Input
                  placeholder="nailar / guru_matematika"
                  value={editFormPegawai.username}
                  onChange={(e) => setEditFormPegawai({ ...editFormPegawai, username: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Ganti Password (Opsional)</Label>
                <Input
                  type="password"
                  placeholder="Kosongkan jika tidak diubah"
                  value={editFormPegawai.password}
                  onChange={(e) => setEditFormPegawai({ ...editFormPegawai, password: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Jabatan Utama (Role)</Label>
                <Select
                  value={editFormPegawai.role}
                  onValueChange={(val: string | null) => setEditFormPegawai({ ...editFormPegawai, role: val || 'GURU' })}
                >
                  <SelectTrigger className="mt-1 h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold">Sub-Role / Penugasan Khusus</Label>
                <Select
                  value={editFormPegawai.subRole}
                  onValueChange={(val: string | null) => setEditFormPegawai({ ...editFormPegawai, subRole: val || 'NONE' })}
                >
                  <SelectTrigger className="mt-1 h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUB_ROLE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Status Kepegawaian</Label>
                <Select
                  value={editFormPegawai.employmentStatus}
                  onValueChange={(val: string | null) => setEditFormPegawai({ ...editFormPegawai, employmentStatus: val || 'GTTP' })}
                >
                  <SelectTrigger className="mt-1 h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GTTP">GTT (Guru Tidak Tetap)</SelectItem>
                    <SelectItem value="GTP">GTY (Guru Tetap Yayasan)</SelectItem>
                    <SelectItem value="PTTP">PTT (Pegawai Tidak Tetap)</SelectItem>
                    <SelectItem value="PTP">PTY (Pegawai Tetap Yayasan)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold">Pendidikan Terakhir</Label>
                <Select
                  value={editFormPegawai.lastEducation}
                  onValueChange={(val: string | null) => setEditFormPegawai({ ...editFormPegawai, lastEducation: val || 'S1' })}
                >
                  <SelectTrigger className="mt-1 h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">No. WhatsApp / HP</Label>
                <Input
                  placeholder="088293733330"
                  value={editFormPegawai.phone}
                  onChange={(e) => setEditFormPegawai({ ...editFormPegawai, phone: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Email</Label>
                <Input
                  type="email"
                  placeholder="pegawai@simasmuh.sch.id"
                  value={editFormPegawai.email}
                  onChange={(e) => setEditFormPegawai({ ...editFormPegawai, email: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs font-bold">Alamat Lengkap</Label>
                <Input
                  placeholder="Jl. Raya Timur No. 12, Ponorogo"
                  value={editFormPegawai.address}
                  onChange={(e) => setEditFormPegawai({ ...editFormPegawai, address: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Status Keaktifan Akun</Label>
                <Select
                  value={editFormPegawai.isActive ? 'ACTIVE' : 'INACTIVE'}
                  onValueChange={(val: string | null) => setEditFormPegawai({ ...editFormPegawai, isActive: val !== 'INACTIVE' })}
                >
                  <SelectTrigger className="mt-1 h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Aktif (Dapat Login)</SelectItem>
                    <SelectItem value="INACTIVE">Nonaktif (Akses Dikunci)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* SEKSI UPLOAD BERKAS KEPERLUAN SDM (SK, IJAZAH, SERTIFIKAT) */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileBadge className="w-4 h-4 text-purple-600" />
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    Pembaruan Berkas SDM (SK, Fotocopy Ijazah & Sertifikat)
                  </span>
                </div>
                {isUploadingDoc && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                {/* Upload SK */}
                <div className="border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl bg-white dark:bg-slate-800 space-y-1.5 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">1. SK Pengangkatan</span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {uploadedDocs.skName || 'Pembaruan berkas SK'}
                    </span>
                  </div>
                  <input
                    type="file"
                    ref={skDocInputRef}
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        try {
                          setIsUploadingDoc(true)
                          const url = await handleFileUpload(file, 'sdm_docs')
                          setUploadedDocs(prev => ({ ...prev, skName: file.name, skUrl: url }))
                          Swal.fire({ icon: 'success', title: 'SK Terupload', timer: 1200, showConfirmButton: false })
                        } catch (err: any) {
                          Swal.fire('Gagal Upload SK', err.message, 'error')
                        } finally {
                          setIsUploadingDoc(false)
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => skDocInputRef.current?.click()}
                    className={`h-7 text-[10px] rounded-lg gap-1 w-full ${uploadedDocs.skUrl ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : ''}`}
                  >
                    <FileUp className="w-3 h-3" />
                    <span>{uploadedDocs.skUrl ? 'SK Terupload ✓' : 'Upload SK'}</span>
                  </Button>
                </div>

                {/* Upload Fotocopy Ijazah */}
                <div className="border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl bg-white dark:bg-slate-800 space-y-1.5 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">2. Fotocopy Ijazah</span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {uploadedDocs.ijazahName || 'Pembaruan Ijazah'}
                    </span>
                  </div>
                  <input
                    type="file"
                    ref={ijazahDocInputRef}
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        try {
                          setIsUploadingDoc(true)
                          const url = await handleFileUpload(file, 'sdm_docs')
                          setUploadedDocs(prev => ({ ...prev, ijazahName: file.name, ijazahUrl: url }))
                          Swal.fire({ icon: 'success', title: 'Ijazah Terupload', timer: 1200, showConfirmButton: false })
                        } catch (err: any) {
                          Swal.fire('Gagal Upload Ijazah', err.message, 'error')
                        } finally {
                          setIsUploadingDoc(false)
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => ijazahDocInputRef.current?.click()}
                    className={`h-7 text-[10px] rounded-lg gap-1 w-full ${uploadedDocs.ijazahUrl ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : ''}`}
                  >
                    <FileUp className="w-3 h-3" />
                    <span>{uploadedDocs.ijazahUrl ? 'Ijazah Terupload ✓' : 'Upload Ijazah'}</span>
                  </Button>
                </div>

                {/* Upload Dokumen Lain */}
                <div className="border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl bg-white dark:bg-slate-800 space-y-1.5 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">3. Dokumen Lain</span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {uploadedDocs.otherName || 'CV / Sertifikat'}
                    </span>
                  </div>
                  <input
                    type="file"
                    ref={otherDocInputRef}
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        try {
                          setIsUploadingDoc(true)
                          const url = await handleFileUpload(file, 'sdm_docs')
                          setUploadedDocs(prev => ({ ...prev, otherName: file.name, otherUrl: url }))
                          Swal.fire({ icon: 'success', title: 'Berkas Terupload', timer: 1200, showConfirmButton: false })
                        } catch (err: any) {
                          Swal.fire('Gagal Upload Berkas', err.message, 'error')
                        } finally {
                          setIsUploadingDoc(false)
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => otherDocInputRef.current?.click()}
                    className={`h-7 text-[10px] rounded-lg gap-1 w-full ${uploadedDocs.otherUrl ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : ''}`}
                  >
                    <FileUp className="w-3 h-3" />
                    <span>{uploadedDocs.otherUrl ? 'Berkas Terupload ✓' : 'Upload Berkas'}</span>
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowEditPegawaiModal(false)} className="rounded-xl text-xs">
                Batal
              </Button>
              <Button type="submit" disabled={updatePegawaiMutation.isPending || isUploadingDoc} className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold gap-1">
                {updatePegawaiMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Simpan Perubahan</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DETAIL PROFIL SDM PEGAWAI */}
      <Dialog open={showDetailPegawaiModal} onOpenChange={setShowDetailPegawaiModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <UserCog className="w-5 h-5 text-purple-600" />
              Detail Arsip & Profil Pegawai
            </DialogTitle>
          </DialogHeader>

          {selectedPegawai && (
            <div className="space-y-4 text-xs py-2">
              <div className="flex items-center gap-3.5 p-3.5 bg-purple-50/60 dark:bg-purple-950/40 rounded-2xl border border-purple-100 dark:border-purple-900/40">
                <div className="w-14 h-14 rounded-full bg-purple-200 dark:bg-purple-900 border-2 border-purple-400 flex items-center justify-center shrink-0 overflow-hidden">
                  {selectedPegawai.avatarUrl ? (
                    <img src={selectedPegawai.avatarUrl} alt={selectedPegawai.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-black text-purple-700 dark:text-purple-300 text-lg">
                      {selectedPegawai.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{selectedPegawai.name}</h4>
                  <div className="text-[11px] text-purple-700 dark:text-purple-300 font-mono font-bold">
                    {selectedPegawai.nipNbm || selectedPegawai.teacherProfile?.nip || `@${selectedPegawai.username}`}
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <Badge className="text-[9px] bg-purple-600 text-white uppercase">{selectedPegawai.role}</Badge>
                    <Badge variant="outline" className="text-[9px] font-bold text-slate-600">{selectedPegawai.employmentStatus || 'GTTP'}</Badge>
                    <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 ${
                      selectedPegawai.isActive !== false
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300'
                    }`}>
                      {selectedPegawai.isActive !== false ? '● Aktif' : '● Nonaktif'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-[11px]">
                <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-400">Status Akun Login:</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${selectedPegawai.isActive !== false ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {selectedPegawai.isActive !== false ? 'Aktif (Dapat Login)' : 'Nonaktif (Akses Dikunci)'}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleActive(selectedPegawai)}
                      className={`h-6 px-2 text-[10px] rounded-lg gap-1 ${
                        selectedPegawai.isActive !== false
                          ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                      disabled={toggleActiveMutation.isPending}
                    >
                      <Power className="w-2.5 h-2.5" />
                      <span>{selectedPegawai.isActive !== false ? 'Nonaktifkan' : 'Aktifkan'}</span>
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-400">Kontak WhatsApp:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedPegawai.phone || selectedPegawai.teacherProfile?.phone || '-'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedPegawai.email || '-'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-400">Pendidikan Terakhir:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{normalizeEducation(selectedPegawai.teacherProfile?.lastEducation)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-400">Alamat:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedPegawai.address || 'Ponorogo'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Ranah Payroll Gaji:</span>
                  <span className="font-semibold text-emerald-600">Dikelola Penggajian Keuangan</span>
                </div>
              </div>

              {/* Berkas Dokumen Kepegawaian (SK, Ijazah, CV) */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-[11px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FileBadge className="w-3.5 h-3.5 text-purple-600" />
                    Berkas Dokumen Pegawai
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Maks. 20 MB / File</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {/* SK Pengangkatan */}
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">SK Pengangkatan</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200 block truncate">
                        {selectedPegawai.teacherProfile?.skUrl ? 'SK Terlampir' : 'Belum Diunggah'}
                      </span>
                    </div>
                    {selectedPegawai.teacherProfile?.skUrl ? (
                      <a
                        href={selectedPegawai.teacherProfile.skUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center justify-center gap-1 px-2 py-1 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900 rounded-lg text-[10px] font-bold border border-purple-200 dark:border-purple-800 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Lihat SK</span>
                      </a>
                    ) : (
                      <span className="mt-2 text-[10px] text-slate-400 italic block">-</span>
                    )}
                  </div>

                  {/* Fotocopy Ijazah */}
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Fotocopy Ijazah</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200 block truncate">
                        {selectedPegawai.teacherProfile?.ijazahUrl ? 'Ijazah Terlampir' : 'Belum Diunggah'}
                      </span>
                    </div>
                    {selectedPegawai.teacherProfile?.ijazahUrl ? (
                      <a
                        href={selectedPegawai.teacherProfile.ijazahUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center justify-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-lg text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Lihat Ijazah</span>
                      </a>
                    ) : (
                      <span className="mt-2 text-[10px] text-slate-400 italic block">-</span>
                    )}
                  </div>

                  {/* CV / Dokumen Lain */}
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">CV / Sertifikat</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200 block truncate">
                        {(selectedPegawai.teacherProfile?.cvUrl || selectedPegawai.teacherProfile?.berkasUrl) ? 'Dokumen Terlampir' : 'Belum Diunggah'}
                      </span>
                    </div>
                    {(selectedPegawai.teacherProfile?.cvUrl || selectedPegawai.teacherProfile?.berkasUrl) ? (
                      <a
                        href={selectedPegawai.teacherProfile?.cvUrl || selectedPegawai.teacherProfile?.berkasUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center justify-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg text-[10px] font-bold border border-blue-200 dark:border-blue-800 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Lihat Berkas</span>
                      </a>
                    ) : (
                      <span className="mt-2 text-[10px] text-slate-400 italic block">-</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  onClick={() => {
                    setShowDetailPegawaiModal(false)
                    handleOpenEdit(selectedPegawai)
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold gap-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Ubah Data Pegawai</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowDetailPegawaiModal(false)}
                  className="rounded-xl text-xs"
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL EVALUASI KINERJA (PORTAL INTERNAL KINERJA MUHIPO) */}
      <Dialog open={showAddEvaluasiModal} onOpenChange={setShowAddEvaluasiModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              Input Penilaian Evaluasi Kinerja (Internal SDM)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Beri nilai 1-100 pada tiap kompetensi kinerja pegawai.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddEvaluasi} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-bold">Pilih Pegawai / Guru</Label>
              <Select
                value={formEvaluasi.pegawaiId}
                onValueChange={(val: string | null) => setFormEvaluasi({ ...formEvaluasi, pegawaiId: val || '' })}
              >
                <SelectTrigger className="mt-1 h-9 rounded-xl text-xs">
                  <SelectValue placeholder="Pilih Pegawai / Guru..." />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map(peg => (
                    <SelectItem key={peg.id} value={peg.id}>
                      {peg.name} ({peg.nipNbm || peg.role})
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
