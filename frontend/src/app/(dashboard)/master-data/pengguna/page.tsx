'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Pencil, Trash2, AlertTriangle, ShieldCheck, UserCheck, Info } from 'lucide-react'
import Swal from 'sweetalert2'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

type User = {
  id: string
  name: string
  email: string
  phone?: string
  username?: string
  nipNbm?: string
  teacherProfile?: { nip?: string; phone?: string }
  role: string
  subRole?: string
  subRole2?: string
  subRole3?: string
  subRole4?: string
  subRole5?: string
  createdAt: string
}

const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon?: string }> = {
  SUPERADMIN: { label: 'SUPERADMIN', bg: 'bg-purple-50 dark:bg-purple-950/80', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  ADMIN_IT: { label: 'ADMIN IT', bg: 'bg-indigo-50 dark:bg-indigo-950/80', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
  KEPALA_SEKOLAH: { label: 'KEPALA SEKOLAH', bg: 'bg-amber-50 dark:bg-amber-950/80', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  ADMIN_TU: { label: 'ADMIN TU', bg: 'bg-sky-50 dark:bg-sky-950/80', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800' },
  BAU: { label: 'ADMIN TU', bg: 'bg-sky-50 dark:bg-sky-950/80', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800' },
  TATA_USAHA: { label: 'ADMIN TU', bg: 'bg-sky-50 dark:bg-sky-950/80', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800' },
  GURU: { label: 'GURU', bg: 'bg-emerald-50 dark:bg-emerald-950/80', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  PEGAWAI: { label: 'PEGAWAI', bg: 'bg-cyan-50 dark:bg-cyan-950/80', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
  KARYAWAN: { label: 'PEGAWAI', bg: 'bg-cyan-50 dark:bg-cyan-950/80', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
  WALI_MURID: { label: 'WALI MURID', bg: 'bg-blue-50 dark:bg-blue-950/80', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  SISWA: { label: 'SISWA', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' },
}

const SUB_ROLE_OPTIONS = [
  { value: 'NONE', label: '— Tanpa Sub Role —' },
  { value: 'ADMIN_TU', label: 'Tata Usaha' },
  { value: 'WALI_KELAS', label: 'Wali Kelas' },
  { value: 'KEUANGAN_MASUK', label: 'Keuangan Masuk (Tagihan & Verifikasi)' },
  { value: 'KEUANGAN_KELUAR', label: 'Keuangan Keluar (Pengeluaran)' },
  { value: 'KEUANGAN_ALL', label: 'Keuangan Penuh (Masuk, Keluar, Gaji & Kalkulasi)' },
  { value: 'HUMAS_SDM', label: 'Humas & SDM' },
  { value: 'KETERTIBAN', label: 'Ketertiban' },
  { value: 'BK_BP', label: 'BK / BP' },
  { value: 'PERSURATAN', label: 'Persuratan' },
  { value: 'PUSTAKAWAN', label: 'Pustakawan' },
  { value: 'GURU_TAHFIDZ', label: 'Guru Tahfidz' },
  { value: 'PEMBINA_EKSTRA', label: 'Pembina Ekstrakulikuler' },
  { value: 'ADMIN_WEB', label: 'Admin Web' },
  { value: 'KEAMANAN', label: 'Keamanan' },
  { value: 'KEBERSIHAN', label: 'Kebersihan' },
  { value: 'GURU_PIKET', label: 'Guru Piket' },
  { value: 'KURIKULUM', label: 'Kurikulum' },
  { value: 'GURU', label: 'Guru' },
  { value: 'PEGAWAI', label: 'Pegawai / Karyawan' },
  { value: 'KEPALA_SEKOLAH', label: 'Kepala Sekolah' },
]

const SUB_ROLE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  ADMIN_TU: { label: 'Tata Usaha', bg: 'bg-sky-50/90 dark:bg-sky-950/60', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800' },
  TATA_USAHA: { label: 'Tata Usaha', bg: 'bg-sky-50/90 dark:bg-sky-950/60', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800' },
  BAU: { label: 'Tata Usaha', bg: 'bg-sky-50/90 dark:bg-sky-950/60', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800' },
  WALI_KELAS: { label: 'Wali Kelas', bg: 'bg-blue-50/90 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  KEUANGAN: { label: 'Keuangan', bg: 'bg-emerald-50/90 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  KEUANGAN_MASUK: { label: 'Keuangan Masuk', bg: 'bg-blue-50/90 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  KEUANGAN_KELUAR: { label: 'Keuangan Keluar', bg: 'bg-rose-50/90 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
  KEUANGAN_ALL: { label: 'Keuangan Penuh', bg: 'bg-amber-50/90 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  KEPEGAWAIAN: { label: 'Humas & SDM', bg: 'bg-purple-50/90 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  SDM: { label: 'Humas & SDM', bg: 'bg-purple-50/90 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  WAKA_HUMAS_SDM: { label: 'Humas & SDM', bg: 'bg-purple-50/90 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  HUMAS_SDM: { label: 'Humas & SDM', bg: 'bg-purple-50/90 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  KETERTIBAN: { label: 'Ketertiban', bg: 'bg-rose-50/90 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
  BK_BP: { label: 'BK / BP', bg: 'bg-pink-50/90 dark:bg-pink-950/60', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800' },
  PERSURATAN: { label: 'Persuratan', bg: 'bg-amber-50/90 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  PUSTAKAWAN: { label: 'Pustakawan', bg: 'bg-teal-50/90 dark:bg-teal-950/60', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800' },
  GURU_TAHFIDZ: { label: 'Guru Tahfidz', bg: 'bg-green-50/90 dark:bg-green-950/60', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
  PEMBINA_EKSTRA: { label: 'Pembina Ekskul', bg: 'bg-orange-50/90 dark:bg-orange-950/60', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
  PEMBINA_EXTRA: { label: 'Pembina Ekskul', bg: 'bg-orange-50/90 dark:bg-orange-950/60', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
  ADMIN_WEB: { label: 'Admin Web', bg: 'bg-indigo-50/90 dark:bg-indigo-950/60', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
  KEAMANAN: { label: 'Keamanan', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-700' },
  KEBERSIHAN: { label: 'Kebersihan', bg: 'bg-teal-50/90 dark:bg-teal-950/60', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800' },
  GURU_PIKET: { label: 'Guru Piket', bg: 'bg-lime-50/90 dark:bg-lime-950/60', text: 'text-lime-700 dark:text-lime-300', border: 'border-lime-200 dark:border-lime-800' },
  KURIKULUM: { label: 'Kurikulum', bg: 'bg-fuchsia-50/90 dark:bg-fuchsia-950/60', text: 'text-fuchsia-700 dark:text-fuchsia-300', border: 'border-fuchsia-200 dark:border-fuchsia-800' },
  GURU: { label: 'Guru', bg: 'bg-emerald-50/90 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  PEGAWAI: { label: 'Pegawai / Karyawan', bg: 'bg-cyan-50/90 dark:bg-cyan-950/60', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
  KEPALA_SEKOLAH: { label: 'Kepala Sekolah', bg: 'bg-amber-50/90 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
}

export default function UsersPage() {
  const authenticatedFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({ id: '', name: '', username: '', nipNbm: '', phone: '', email: '', password: '', role: 'GURU', subRole: 'NONE', subRole2: 'NONE', subRole3: 'NONE', subRole4: 'NONE', subRole5: 'NONE' })

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false)

  // Select state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/users')
      if (!res.ok) throw new Error('Gagal memuat data pengguna')
      return res.json()
    }
  })

  const createMutation = useMutation({
    mutationFn: async (newUser: any) => {
      const res = await authenticatedFetch('/api-backend/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.message || 'Gagal menambah pengguna')
      }
      return res.json()
    },
    onError: (err: any) => {
      Swal.fire({
        icon: 'warning',
        title: 'Penugasan Role Ditolak',
        text: err.message || 'Gagal menambah pengguna',
        confirmButtonColor: '#4f46e5'
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      Swal.fire({
        icon: 'success',
        title: 'Pengguna Berhasil Ditambahkan',
        timer: 1500,
        showConfirmButton: false
      })
      handleCloseDialog()
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (updatedUser: any) => {
      const res = await authenticatedFetch(`/api-backend/users/${updatedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.message || 'Gagal memperbarui pengguna')
      }
      return res.json()
    },
    onError: (err: any) => {
      Swal.fire({
        icon: 'warning',
        title: 'Penetapan Role Ditolak',
        text: err.message || 'Gagal memperbarui pengguna',
        confirmButtonColor: '#4f46e5'
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      Swal.fire({
        icon: 'success',
        title: 'Perubahan Akun Disimpan',
        timer: 1500,
        showConfirmButton: false
      })
      handleCloseDialog()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/users/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.message || 'Gagal menghapus pengguna')
      }
      return res.json()
    },
    onError: (err: any) => {
      alert(err.message || 'Gagal menghapus pengguna')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await authenticatedFetch('/api-backend/users/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.message || 'Gagal menghapus pengguna terpilih')
      }
      return res.json()
    },
    onError: (err: any) => {
      alert(err.message || 'Gagal menghapus pengguna terpilih')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeleteDialogOpen(false)
      setSelectedUserIds([])
      setIsBulkDeleteMode(false)
    }
  })

  const handleOpenAddDialog = () => {
    setIsEdit(false)
    setFormData({ id: '', name: '', username: '', nipNbm: '', phone: '', email: '', password: '', role: 'GURU', subRole: 'NONE', subRole2: 'NONE', subRole3: 'NONE', subRole4: 'NONE', subRole5: 'NONE' })
    setOpen(true)
  }

  const handleOpenEditDialog = (user: User) => {
    setIsEdit(true)
    setFormData({ 
      id: user.id, 
      name: user.name || '', 
      username: user.username || '',
      nipNbm: user.nipNbm || user.teacherProfile?.nip || '',
      phone: user.phone || user.teacherProfile?.phone || '',
      email: user.email || '', 
      password: '', 
      role: user.role, 
      subRole: user.subRole || 'NONE',
      subRole2: user.subRole2 || 'NONE',
      subRole3: user.subRole3 || 'NONE',
      subRole4: user.subRole4 || 'NONE',
      subRole5: user.subRole5 || 'NONE'
    })
    setOpen(true)
  }

  const handleCloseDialog = () => {
    setOpen(false)
    setFormData({ id: '', name: '', username: '', nipNbm: '', phone: '', email: '', password: '', role: 'GURU', subRole: 'NONE', subRole2: 'NONE', subRole3: 'NONE', subRole4: 'NONE', subRole5: 'NONE' })
  }

  const handleOpenDeleteDialog = (user: User) => {
    setIsBulkDeleteMode(false)
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }

  const handleOpenBulkDeleteDialog = () => {
    setIsBulkDeleteMode(true)
    setUserToDelete(null)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (isBulkDeleteMode) {
      if (selectedUserIds.length > 0) {
        bulkDeleteMutation.mutate(selectedUserIds)
      }
    } else if (userToDelete) {
      deleteMutation.mutate(userToDelete.id)
    }
  }

  const handleSelectAll = (checked: boolean, filteredList: User[] = []) => {
    if (checked) {
      const allIds = filteredList.map(u => u.id)
      setSelectedUserIds(allIds)
    } else {
      setSelectedUserIds([])
    }
  }

  const handleToggleSelectOne = (id: string) => {
    setSelectedUserIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const usernameVal = (formData.username || '').trim()
    if (!usernameVal) {
      alert('Username wajib diisi')
      return
    }

    const emailVal = (formData.email || '').trim()
    const nipVal = (formData.nipNbm || '').trim()

    const dataToSubmit = {
      ...formData,
      username: usernameVal,
      email: emailVal || null,
      nipNbm: nipVal || null,
      subRole: formData.subRole === 'NONE' ? null : formData.subRole,
      subRole2: formData.subRole2 === 'NONE' ? null : formData.subRole2,
      subRole3: formData.subRole3 === 'NONE' ? null : formData.subRole3,
      subRole4: formData.subRole4 === 'NONE' ? null : formData.subRole4,
      subRole5: formData.subRole5 === 'NONE' ? null : formData.subRole5
    }

    // Validasi Preventif di Sisi Klien untuk Single Role Kepala Sekolah
    const isAssigningKepalaSekolah = 
      formData.role === 'KEPALA_SEKOLAH' || 
      formData.subRole === 'KEPALA_SEKOLAH' || 
      formData.subRole2 === 'KEPALA_SEKOLAH' || 
      formData.subRole3 === 'KEPALA_SEKOLAH' ||
      formData.subRole4 === 'KEPALA_SEKOLAH' ||
      formData.subRole5 === 'KEPALA_SEKOLAH';

    if (isAssigningKepalaSekolah) {
      const currentKepsek = (users || []).find(u => 
        (u.role === 'KEPALA_SEKOLAH' || u.subRole === 'KEPALA_SEKOLAH' || u.subRole2 === 'KEPALA_SEKOLAH' || u.subRole3 === 'KEPALA_SEKOLAH' || u.subRole4 === 'KEPALA_SEKOLAH' || u.subRole5 === 'KEPALA_SEKOLAH') &&
        (!isEdit || u.id !== formData.id)
      );

      if (currentKepsek) {
        Swal.fire({
          icon: 'warning',
          title: 'Kepala Sekolah Sudah Ada',
          html: `Jabatan Kepala Sekolah saat ini masih aktif pada akun <b>"${currentKepsek.name}"</b> (@${currentKepsek.username}).<br/><br/>Demi keamanan dan keabsahan E-Sign resmi sekolah, <b>Role Kepala Sekolah hanya boleh dimiliki oleh 1 orang</b>.<br/><br/>Silakan ubah/kosongkan role pada akun Kepala Sekolah lama terlebih dahulu sebelum menetapkannya ke akun baru.`,
          confirmButtonColor: '#4f46e5'
        });
        return;
      }
    }
    
    if (isEdit) {
      updateMutation.mutate(dataToSubmit)
    } else {
      createMutation.mutate(dataToSubmit)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  // Filter khusus akun pegawai, guru, admin, dan pengelola internal (tidak menampilkan wali murid atau siswa)
  const staffUsers = (users || []).filter(u => !['WALI_MURID', 'SISWA'].includes(u.role))
  const filteredUsers = filterDataBySearch(staffUsers, searchQuery) || []
  const isAllSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.includes(u.id))

  // Deteksi Pejabat Kepala Sekolah Aktif
  const activeKepalaSekolah = (users || []).find(u => 
    u.role === 'KEPALA_SEKOLAH' || u.subRole === 'KEPALA_SEKOLAH' || u.subRole2 === 'KEPALA_SEKOLAH' || u.subRole3 === 'KEPALA_SEKOLAH'
  )

  return (
    <div className="space-y-6">
      {/* Banner Status Pejabat Kepala Sekolah & Penegakan Single Role E-Sign */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs ${
        activeKepalaSekolah 
          ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60' 
          : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${
            activeKepalaSekolah 
              ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300' 
              : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
          }`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Pejabat Kepala Sekolah (E-Sign Penandatangan Sah)
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                activeKepalaSekolah 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {activeKepalaSekolah ? '1 Pejabat Terdaftar (Tunggal)' : 'Belum Ditetapkan'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {activeKepalaSekolah ? (
                <>Pejabat Aktif: <strong>{activeKepalaSekolah.name}</strong> {activeKepalaSekolah.nipNbm ? `(${activeKepalaSekolah.nipNbm})` : ''} — Memegang wewenang E-Sign & pengesahan surat resmi sekolah.</>
              ) : (
                <>Role Kepala Sekolah saat ini kosong. Anda dapat menetapkan role Kepala Sekolah ke salah satu akun guru/pegawai.</>
              )}
            </p>
          </div>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 shrink-0">
          <Info className="w-3.5 h-3.5 text-indigo-600" />
          <span>Aturan Keamanan: Wajib 1 Akun Tunggal</span>
        </div>
      </div>

      {/* Header Glassmorphic Standar CBT MUHIPO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/75 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 backdrop-blur-xl shadow-xs">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
            Master Data Kepegawaian
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Manajemen Akun Pegawai
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
            Kelola data login dan hak akses pegawai, guru, staf TU, dan pengelola sistem.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedUserIds.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleOpenBulkDeleteDialog}
              className="bg-red-600 hover:bg-red-700 text-white gap-2 font-bold text-xs h-9 rounded-xl shadow-xs"
            >
              <Trash2 className="w-4 h-4" />
              Hapus ({selectedUserIds.length}) Terpilih
            </Button>
          )}
          <Button onClick={handleOpenAddDialog} className="bg-blue-600 hover:bg-blue-700 font-bold text-xs h-9 rounded-xl shadow-xs">
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Akun Pegawai
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[650px] md:max-w-[720px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{isEdit ? 'Ubah Akun Pegawai' : 'Tambah Akun Pegawai'}</DialogTitle>
              <DialogDescription>
                {isEdit ? 'Ubah data atau perbarui password pegawai/pengelola sistem.' : 'Buat akun pegawai/guru/staf baru untuk mengakses aplikasi.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap *</Label>
                <Input 
                  id="name" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Ahmad Dahlan, S.Pd."
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input 
                    id="username" 
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Contoh: ahmaddahlan / admin_web" 
                    required
                  />
                  <p className="text-[11px] text-slate-500">Username bebas untuk login (bukan email).</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nipNbm">NIP / NBM (Opsional)</Label>
                  <Input 
                    id="nipNbm" 
                    value={formData.nipNbm}
                    onChange={(e) => setFormData({ ...formData, nipNbm: e.target.value })}
                    placeholder="Contoh: 19850101..." 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">No. WhatsApp (Opsional)</Label>
                  <Input 
                    id="phone" 
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Contoh: 088293733330"
                  />
                  <p className="text-[11px] text-slate-500">Opsional untuk notifikasi otomatis WhatsApp.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (Opsional)</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Contoh: ahmad@sekolah.sch.id"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{isEdit ? 'Password Baru (Kosongkan jika tidak diubah)' : 'Password (Opsional)'}</Label>
                <Input 
                  id="password" 
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={isEdit ? 'Biarkan kosong jika tidak diubah' : 'Default password sama dengan username'}
                />
                {!isEdit && (
                  <p className="text-[11px] text-slate-500">Jika dikosongkan, password awal akan sama dengan username.</p>
                )}
              </div>

              {/* Baris 1: Role Utama & Sub Role 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="role" className="text-xs font-semibold">Role Utama *</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(val) => setFormData({ ...formData, role: val || 'GURU' })}
                  >
                    <SelectTrigger id="role" className="h-9 text-xs">
                      <SelectValue placeholder="Pilih Role Utama" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GURU">GURU (Tenaga Pendidik)</SelectItem>
                      <SelectItem value="PEGAWAI">PEGAWAI (Karyawan / Staf)</SelectItem>
                      <SelectItem value="ADMIN_TU">ADMIN TU (Tata Usaha / BAU)</SelectItem>
                      <SelectItem value="KEUANGAN">KEUANGAN (Bendahara Sekolah)</SelectItem>
                      <SelectItem value="KEPALA_SEKOLAH">KEPALA SEKOLAH</SelectItem>
                      <SelectItem value="ADMIN_IT">ADMIN IT</SelectItem>
                      <SelectItem value="SUPERADMIN">SUPERADMIN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="subRole" className="text-xs font-semibold">Sub Role 1 (Opsional)</Label>
                  <Select 
                    value={formData.subRole} 
                    onValueChange={(val) => setFormData({ ...formData, subRole: val || 'NONE' })}
                  >
                    <SelectTrigger id="subRole" className="h-9 text-xs">
                      <SelectValue placeholder="Pilih Sub Role 1" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUB_ROLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Baris 2: Sub Role 2 & Sub Role 3 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="subRole2" className="text-xs font-semibold">Sub Role 2 (Opsional)</Label>
                  <Select 
                    value={formData.subRole2} 
                    onValueChange={(val) => setFormData({ ...formData, subRole2: val || 'NONE' })}
                  >
                    <SelectTrigger id="subRole2" className="h-9 text-xs">
                      <SelectValue placeholder="Pilih Sub Role 2" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUB_ROLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="subRole3" className="text-xs font-semibold">Sub Role 3 (Opsional)</Label>
                  <Select 
                    value={formData.subRole3} 
                    onValueChange={(val) => setFormData({ ...formData, subRole3: val || 'NONE' })}
                  >
                    <SelectTrigger id="subRole3" className="h-9 text-xs">
                      <SelectValue placeholder="Pilih Sub Role 3" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUB_ROLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Baris 3: Sub Role 4 & Sub Role 5 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="subRole4" className="text-xs font-semibold">Sub Role 4 (Opsional)</Label>
                  <Select 
                    value={formData.subRole4} 
                    onValueChange={(val) => setFormData({ ...formData, subRole4: val || 'NONE' })}
                  >
                    <SelectTrigger id="subRole4" className="h-9 text-xs">
                      <SelectValue placeholder="Pilih Sub Role 4" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUB_ROLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="subRole5" className="text-xs font-semibold">Sub Role 5 (Opsional)</Label>
                  <Select 
                    value={formData.subRole5} 
                    onValueChange={(val) => setFormData({ ...formData, subRole5: val || 'NONE' })}
                  >
                    <SelectTrigger id="subRole5" className="h-9 text-xs">
                      <SelectValue placeholder="Pilih Sub Role 5" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUB_ROLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Batal</Button>
              <Button type="submit" disabled={isPending} className="bg-blue-600">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isEdit ? 'Simpan Perubahan' : 'Simpan Akun'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Daftar Akun Pegawai & Pengelola</CardTitle>
            <CardDescription>Menampilkan daftar akun guru, karyawan/staf, dan admin pengelola sekolah.</CardDescription>
          </div>
          <TableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari pegawai (nama/email/username/NIP)..."
          />
        </CardHeader>
        <CardContent className="p-0">
          <Table className="w-full table-auto">
            <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
              <TableRow>
                <TableHead className="w-10 pl-4 text-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked, filteredUsers)}
                  />
                </TableHead>
                <TableHead className="w-12 text-center">NO</TableHead>
                <TableHead>Pengguna & Akun</TableHead>
                <TableHead className="hidden md:table-cell">NIP / NBM</TableHead>
                <TableHead>Role & Hak Akses</TableHead>
                <TableHead className="text-right pr-4">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
                      Memuat data pengguna...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                    {searchQuery ? 'Tidak ada akun pengguna yang sesuai dengan pencarian.' : 'Belum ada data pengguna.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((item, index) => {
                  const isSelected = selectedUserIds.includes(item.id)
                  const nip = item.nipNbm || item.teacherProfile?.nip
                  return (
                    <TableRow key={item.id} className={isSelected ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''}>
                      <TableCell className="pl-4 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(item.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-slate-500 text-center">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">{item.name}</span>
                          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400 font-mono">
                            {item.username && (
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded font-semibold text-[11px] border border-blue-200/60 dark:border-blue-800/60">
                                @{item.username}
                              </span>
                            )}
                            {(item.phone || item.teacherProfile?.phone) && (
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded font-medium text-[11px] border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1">
                                🟢 WA: {item.phone || item.teacherProfile?.phone}
                              </span>
                            )}
                            {item.email && <span className="truncate">{item.email}</span>}
                            {nip && <span className="md:hidden text-slate-400">NIP: {nip}</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs text-slate-600 dark:text-slate-400">
                        {nip || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Role Utama Badge */}
                          {(() => {
                            const roleCfg = ROLE_CONFIG[item.role] || {
                              label: item.role,
                              bg: 'bg-slate-100 dark:bg-slate-800',
                              text: 'text-slate-700 dark:text-slate-300',
                              border: 'border-slate-200 dark:border-slate-700'
                            }
                            return (
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black tracking-wide border shadow-2xs ${roleCfg.bg} ${roleCfg.text} ${roleCfg.border}`}>
                                {roleCfg.label}
                              </span>
                            )
                          })()}

                          {/* Sub Role 1 Badge */}
                          {item.subRole && item.subRole !== 'NONE' && (() => {
                            const subCfg = SUB_ROLE_CONFIG[item.subRole] || {
                              label: item.subRole,
                              bg: 'bg-slate-50 dark:bg-slate-900',
                              text: 'text-slate-700 dark:text-slate-300',
                              border: 'border-slate-200 dark:border-slate-800'
                            }
                            return (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border shadow-2xs ${subCfg.bg} ${subCfg.text} ${subCfg.border}`}>
                                <span className="opacity-60 text-[9px] mr-1">✦</span>
                                {subCfg.label}
                              </span>
                            )
                          })()}

                          {/* Sub Role 2 Badge */}
                          {item.subRole2 && item.subRole2 !== 'NONE' && (() => {
                            const subCfg = SUB_ROLE_CONFIG[item.subRole2] || {
                              label: item.subRole2,
                              bg: 'bg-slate-50 dark:bg-slate-900',
                              text: 'text-slate-700 dark:text-slate-300',
                              border: 'border-slate-200 dark:border-slate-800'
                            }
                            return (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border shadow-2xs ${subCfg.bg} ${subCfg.text} ${subCfg.border}`}>
                                <span className="opacity-60 text-[9px] mr-1">✦</span>
                                {subCfg.label}
                              </span>
                            )
                          })()}

                          {/* Sub Role 3 Badge */}
                          {item.subRole3 && item.subRole3 !== 'NONE' && (() => {
                            const subCfg = SUB_ROLE_CONFIG[item.subRole3] || {
                              label: item.subRole3,
                              bg: 'bg-slate-50 dark:bg-slate-900',
                              text: 'text-slate-700 dark:text-slate-300',
                              border: 'border-slate-200 dark:border-slate-800'
                            }
                            return (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border shadow-2xs ${subCfg.bg} ${subCfg.text} ${subCfg.border}`}>
                                <span className="opacity-60 text-[9px] mr-1">✦</span>
                                {subCfg.label}
                              </span>
                            )
                          })()}

                          {/* Sub Role 4 Badge */}
                          {item.subRole4 && item.subRole4 !== 'NONE' && (() => {
                            const subCfg = SUB_ROLE_CONFIG[item.subRole4] || {
                              label: item.subRole4,
                              bg: 'bg-slate-50 dark:bg-slate-900',
                              text: 'text-slate-700 dark:text-slate-300',
                              border: 'border-slate-200 dark:border-slate-800'
                            }
                            return (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border shadow-2xs ${subCfg.bg} ${subCfg.text} ${subCfg.border}`}>
                                <span className="opacity-60 text-[9px] mr-1">✦</span>
                                {subCfg.label}
                              </span>
                            )
                          })()}

                          {/* Sub Role 5 Badge */}
                          {item.subRole5 && item.subRole5 !== 'NONE' && (() => {
                            const subCfg = SUB_ROLE_CONFIG[item.subRole5] || {
                              label: item.subRole5,
                              bg: 'bg-slate-50 dark:bg-slate-900',
                              text: 'text-slate-700 dark:text-slate-300',
                              border: 'border-slate-200 dark:border-slate-800'
                            }
                            return (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border shadow-2xs ${subCfg.bg} ${subCfg.text} ${subCfg.border}`}>
                                <span className="opacity-60 text-[9px] mr-1">✦</span>
                                {subCfg.label}
                              </span>
                            )
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleOpenEditDialog(item)}>
                            <Pencil className="w-4 h-4 text-slate-500 hover:text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:bg-red-50" onClick={() => handleOpenDeleteDialog(item)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

      {/* Popup Dialog Hapus Akun */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              {isBulkDeleteMode ? `Hapus ${selectedUserIds.length} Akun Terpilih` : 'Hapus Akun Pengguna'}
            </DialogTitle>
            <DialogDescription>
              {isBulkDeleteMode
                ? `Apakah Anda yakin ingin menghapus ${selectedUserIds.length} akun pengguna yang dipilih secara permanen?`
                : 'Apakah Anda yakin ingin menghapus akun pengguna berikut? Tindakan ini tidak dapat dibatalkan.'}
            </DialogDescription>
          </DialogHeader>
          {!isBulkDeleteMode && userToDelete && (
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Lengkap:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{userToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Username:</span>
                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{userToDelete.username || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Role:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{userToDelete.role}</span>
              </div>
            </div>
          )}

          {isBulkDeleteMode && (
            <div className="bg-red-50 dark:bg-red-950/40 p-4 rounded-xl border border-red-200 dark:border-red-900 space-y-1 text-sm text-red-800 dark:text-red-300">
              <p className="font-semibold">Perhatian:</p>
              <p className="text-xs">
                Sebanyak {selectedUserIds.length} akun akan dihapus dari sistem. Semua profil dan akses terkait akan dihilangkan.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending || bulkDeleteMutation.isPending}
            >
              Batal
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending || bulkDeleteMutation.isPending}
            >
              {deleteMutation.isPending || bulkDeleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              {isBulkDeleteMode ? `Hapus ${selectedUserIds.length} Akun` : 'Hapus Akun'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
