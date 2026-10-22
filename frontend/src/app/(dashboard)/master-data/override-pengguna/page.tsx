'use client'

import React, { useState, useMemo } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import {
  ShieldAlert,
  ShieldCheck,
  Eye,
  Users,
  GraduationCap,
  UserCheck,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  Lock,
  ExternalLink,
  Shield,
  Layers,
  ArrowRight,
  Info,
  KeyRound,
  RotateCcw,
} from 'lucide-react'
import Swal from 'sweetalert2'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TableSearch } from '@/components/TableSearch'
import { TablePagination } from '@/components/TablePagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

interface OverrideDataResponse {
  users: any[]
  students: any[]
}

export default function OverridePenggunaPage() {
  const { data: session } = useSession()
  const authenticatedFetch = useAuthenticatedFetch()

  // State Tabs
  const [activeTab, setActiveTab] = useState<'pegawai' | 'siswa'>('pegawai')

  const userRoles = useMemo(() => {
    const u = session?.user as any
    return [u?.role, u?.subRole, u?.subRole2, u?.subRole3, u?.subRole4, u?.subRole5].filter(Boolean)
  }, [session?.user])

  const isAdmin = useMemo(() => {
    const u = session?.user as any
    return (
      u?.username === 'supermuhipo' ||
      userRoles.includes('SUPERADMIN') ||
      userRoles.includes('ADMIN_IT') ||
      userRoles.includes('ADMIN_TU') ||
      userRoles.includes('BAU') ||
      userRoles.includes('TATA_USAHA')
    )
  }, [userRoles, session?.user])

  // Redirect langsung jika bukan admin
  React.useEffect(() => {
    if (session?.user && !isAdmin) {
      window.location.href = '/dashboard'
    }
  }, [session?.user, isAdmin])

  // Search & Filter State
  const [searchPegawai, setSearchPegawai] = useState('')
  const [filterRolePegawai, setFilterRolePegawai] = useState('ALL')
  const [filterStatusPegawai, setFilterStatusPegawai] = useState('ALL')

  const [searchSiswa, setSearchSiswa] = useState('')
  const [filterKelasSiswa, setFilterKelasSiswa] = useState('ALL')
  const [filterStatusSiswa, setFilterStatusSiswa] = useState('ALL')

  // Pagination State
  const [pagePegawai, setPagePegawai] = useState(1)
  const [pageSizePegawai, setPageSizePegawai] = useState(10)

  const [pageSiswa, setPageSiswa] = useState(1)
  const [pageSizeSiswa, setPageSizeSiswa] = useState(10)

  // Loading indicator for action
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Fetch Data
  const { data, isLoading, refetch, isFetching } = useQuery<OverrideDataResponse>({
    queryKey: ['override-users-data'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/users/override-users')
      if (!res.ok) throw new Error('Gagal memuat data pengguna untuk override')
      return res.json()
    },
    staleTime: 1000 * 30,
  })

  // Filter Pegawai List (Exclude role SISWA & WALI_MURID)
  const pegawaiList = useMemo(() => {
    if (!data?.users) return []
    return data.users.filter((u: any) => u.role !== 'SISWA' && u.role !== 'WALI_MURID')
  }, [data?.users])

  // Filter Siswa List (From students array)
  const siswaList = useMemo(() => {
    if (!data?.students) return []
    return data.students
  }, [data?.students])

  // Distinct roles for filter pegawai
  const distinctRoles = useMemo(() => {
    const roles = new Set<string>()
    pegawaiList.forEach((p: any) => {
      if (p.role) roles.add(p.role)
    })
    return Array.from(roles).sort()
  }, [pegawaiList])

  // Distinct kelas for filter siswa
  const distinctKelas = useMemo(() => {
    const classes = new Map<string, string>()
    siswaList.forEach((s: any) => {
      if (s.class?.id && s.class?.name) {
        classes.set(s.class.id, s.class.name)
      }
    })
    return Array.from(classes.entries()).map(([id, name]) => ({ id, name }))
  }, [siswaList])

  // Processed Pegawai
  const filteredPegawai = useMemo(() => {
    return pegawaiList.filter((item: any) => {
      const q = searchPegawai.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.username && item.username.toLowerCase().includes(q)) ||
        (item.email && item.email.toLowerCase().includes(q)) ||
        (item.nipNbm && item.nipNbm.toLowerCase().includes(q)) ||
        (item.teacherProfile?.nip && item.teacherProfile.nip.toLowerCase().includes(q))

      const matchesRole = filterRolePegawai === 'ALL' || item.role === filterRolePegawai
      const matchesStatus =
        filterStatusPegawai === 'ALL' ||
        (filterStatusPegawai === 'ACTIVE' && item.isActive !== false) ||
        (filterStatusPegawai === 'INACTIVE' && item.isActive === false)

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [pegawaiList, searchPegawai, filterRolePegawai, filterStatusPegawai])

  // Processed Siswa
  const filteredSiswa = useMemo(() => {
    return siswaList.filter((item: any) => {
      const q = searchSiswa.toLowerCase().trim()
      const waliName = item.parentRelations?.[0]?.parent?.user?.name || ''
      const waliUsername = item.parentRelations?.[0]?.parent?.user?.username || ''

      const matchesSearch =
        !q ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.nis && item.nis.toLowerCase().includes(q)) ||
        (item.nisn && item.nisn.toLowerCase().includes(q)) ||
        (item.class?.name && item.class.name.toLowerCase().includes(q)) ||
        waliName.toLowerCase().includes(q) ||
        waliUsername.toLowerCase().includes(q)

      const matchesKelas = filterKelasSiswa === 'ALL' || item.classId === filterKelasSiswa
      const matchesStatus =
        filterStatusSiswa === 'ALL' ||
        (filterStatusSiswa === 'ACTIVE' && item.isActive !== false) ||
        (filterStatusSiswa === 'INACTIVE' && item.isActive === false)

      return matchesSearch && matchesKelas && matchesStatus
    })
  }, [siswaList, searchSiswa, filterKelasSiswa, filterStatusSiswa])

  // Sliced data for pagination
  const paginatedPegawai = useMemo(() => {
    const start = (pagePegawai - 1) * pageSizePegawai
    return filteredPegawai.slice(start, start + pageSizePegawai)
  }, [filteredPegawai, pagePegawai, pageSizePegawai])

  const paginatedSiswa = useMemo(() => {
    const start = (pageSiswa - 1) * pageSizeSiswa
    return filteredSiswa.slice(start, start + pageSizeSiswa)
  }, [filteredSiswa, pageSiswa, pageSizeSiswa])

  // Count active filters
  const activeFiltersPegawaiCount =
    (filterRolePegawai !== 'ALL' ? 1 : 0) + (filterStatusPegawai !== 'ALL' ? 1 : 0)

  const activeFiltersSiswaCount =
    (filterKelasSiswa !== 'ALL' ? 1 : 0) + (filterStatusSiswa !== 'ALL' ? 1 : 0)

  // Execution of Override or Spectator
  const executeOverride = async (
    targetUserId: string,
    targetName: string,
    mode: 'override' | 'spectator',
    relationTitle?: string
  ) => {
    const isSpectator = mode === 'spectator'
    const titleText = isSpectator
      ? `Akses Spectator (Read Only)?`
      : `Aktifkan Override (Full Access)?`

    const confirmResult = await Swal.fire({
      title: titleText,
      html: `
        <div class="text-left text-xs text-slate-600 dark:text-slate-300 space-y-2">
          <p>Anda akan masuk ke dalam akun: <strong>${targetName}</strong> ${relationTitle ? `(${relationTitle})` : ''}.</p>
          <div class="p-2.5 rounded-lg border ${
            isSpectator
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }">
            <p class="font-bold">${isSpectator ? 'Mode Spectator (Hanya Lihat):' : 'Mode Override (Akses Penuh):'}</p>
            <p class="text-[11px] mt-0.5">
              ${
                isSpectator
                  ? 'Anda dapat meninjau dashboard, tampilan fitur, serta laporan pengguna tanpa izin mengubah, menambah, atau menghapus data.'
                  : 'Anda dapat mengoperasikan akun pengguna secara langsung layaknya pengguna bersangkutan. Seluruh aksi diaudit secara aman.'
              }
            </p>
          </div>
          <p class="text-[11px] text-slate-500">Sesi admin Anda akan dicadangkan sehingga Anda dapat kembali ke akun admin kapan saja melalui banner di atas.</p>
        </div>
      `,
      icon: isSpectator ? 'info' : 'warning',
      showCancelButton: true,
      confirmButtonColor: isSpectator ? '#f59e0b' : '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: isSpectator ? 'Mulai Spectator' : 'Mulai Override',
      cancelButtonText: 'Batal',
    })

    // Proteksi: Jangan izinkan override akun sendiri
    if (targetUserId === (session?.user as any)?.id) {
      Swal.fire({
        icon: 'warning',
        title: 'Aksi Tidak Diizinkan',
        text: 'Anda tidak dapat meng-override akun Anda sendiri.',
      })
      return
    }

    setActionLoadingId(`${targetUserId}_${mode}`)
    try {
      // 1. Simpan sesi admin aktif saat ini ke sessionStorage jika belum tersimpan
      if (typeof window !== 'undefined' && session?.user) {
        const existingAdminSession = sessionStorage.getItem('simasmuh_original_admin_session')
        // Pastikan hanya menyimpan jika sesi saat ini BUKAN sesi override
        const isCurrentOverride = Boolean((session.user as any)?.isOverrideSession)
        if (!existingAdminSession && !isCurrentOverride) {
          const rawUser = session.user as any
          const cleanUser = {
            id: rawUser.id,
            name: rawUser.name,
            email: rawUser.email,
            username: rawUser.username,
            nipNbm: rawUser.nipNbm,
            role: rawUser.role,
            isActive: rawUser.isActive !== false,
            subRole: rawUser.subRole,
            subRole2: rawUser.subRole2,
            subRole3: rawUser.subRole3,
            subRole4: rawUser.subRole4,
            subRole5: rawUser.subRole5,
            token: (session as any).accessToken,
            isOverrideSession: false,
            overrideMode: null,
            isReadOnly: false,
            overrideByAdminId: null,
            overrideByAdminName: null,
            overrideByAdminRole: null,
          }
          const adminAuthPayload = {
            user: cleanUser,
            access_token: (session as any).accessToken,
          }
          sessionStorage.setItem(
            'simasmuh_original_admin_session',
            JSON.stringify(adminAuthPayload)
          )
        }
      }

      // 2. Minta token override dari backend
      const res = await authenticatedFetch(
        `/api-backend/users/${targetUserId}/override-token`,
        {
          method: 'POST',
          body: JSON.stringify({ mode }),
        }
      )

      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.message || 'Gagal menghasilkan token override.')
      }

      const overrideData = await res.json()

      // 3. Login ulang NextAuth menggunakan overrideData
      const signInResult = await signIn('credentials', {
        action: 'override_login',
        overrideData: JSON.stringify(overrideData),
        redirect: false,
      })

      if (signInResult?.ok) {
        Swal.fire({
          icon: 'success',
          title: `Berhasil Masuk Mode ${isSpectator ? 'Spectator' : 'Override'}`,
          text: `Mengalihkan ke dashboard akun ${targetName}...`,
          timer: 1500,
          showConfirmButton: false,
        })
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1200)
      } else {
        throw new Error('Gagal menginisialisasi sesi baru di browser.')
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Akses Pengguna',
        text: err.message || 'Terjadi kesalahan sistem saat mencoba mengakses akun pengguna.',
        confirmButtonColor: '#4f46e5',
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Override & Spectator Pengguna
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Akses akun dalam mode Read Only (Spectator) atau Full Access (Override) untuk supervisi, troubleshooting, dan pendampingan.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8.5 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold gap-1.5"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Sinkron Data</span>
          </Button>
        </div>
      </div>

      {/* Tabs Pilihan Modul Tabel */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'pegawai' | 'siswa')}
        className="w-full space-y-4"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList className="bg-slate-200/80 dark:bg-slate-800/80 p-1 rounded-xl h-auto border border-slate-200 dark:border-slate-700/60">
            <TabsTrigger
              value="pegawai"
              className="text-xs font-bold rounded-lg px-3.5 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 gap-1.5"
            >
              <Users className="w-4 h-4" />
              <span>Guru & Karyawan Pegawai</span>
              <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5 font-bold">
                {filteredPegawai.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="siswa"
              className="text-xs font-bold rounded-lg px-3.5 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 gap-1.5"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Siswa & Wali Murid</span>
              <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5 font-bold">
                {filteredSiswa.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: GURU & KARYAWAN PEGAWAI */}
        <TabsContent value="pegawai" className="space-y-3 mt-0">
          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white/95 dark:bg-slate-900/90 rounded-2xl overflow-hidden backdrop-blur-md">
            {/* Filter & Search Bar */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <TableSearch
                value={searchPegawai}
                onChange={(v) => {
                  setSearchPegawai(v)
                  setPagePegawai(1)
                }}
                placeholder="Cari nama, NIP, username, atau email..."
                className="w-full sm:w-80"
                activeFiltersCount={activeFiltersPegawaiCount}
                onResetFilters={() => {
                  setFilterRolePegawai('ALL')
                  setFilterStatusPegawai('ALL')
                  setPagePegawai(1)
                }}
                filters={
                  <div className="space-y-3 p-1 min-w-[220px]">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Peran Jabatan (Role)
                      </Label>
                      <Select
                        value={filterRolePegawai}
                        onValueChange={(val) => {
                          setFilterRolePegawai(val || 'ALL')
                          setPagePegawai(1)
                        }}
                      >
                        <SelectTrigger className="h-8.5 text-xs rounded-xl">
                          <SelectValue placeholder="Pilih Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Semua Peran Jabatan</SelectItem>
                          {distinctRoles.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Status Akun
                      </Label>
                      <Select
                        value={filterStatusPegawai}
                        onValueChange={(val) => {
                          setFilterStatusPegawai(val || 'ALL')
                          setPagePegawai(1)
                        }}
                      >
                        <SelectTrigger className="h-8.5 text-xs rounded-xl">
                          <SelectValue placeholder="Pilih Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Semua Status</SelectItem>
                          <SelectItem value="ACTIVE">Aktif</SelectItem>
                          <SelectItem value="INACTIVE">Nonaktif</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                }
              />

              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium self-end sm:self-auto">
                Total: <strong>{filteredPegawai.length}</strong> pegawai
              </div>
            </div>

            {/* Tabel Pegawai */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800">
                    <TableHead className="w-12 text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                      No
                    </TableHead>
                    <TableHead className="min-w-[180px] max-w-[260px] text-xs font-bold text-slate-700 dark:text-slate-300">
                      Nama Lengkap
                    </TableHead>
                    <TableHead className="w-36 text-xs font-bold text-slate-700 dark:text-slate-300">
                      Username / NIP
                    </TableHead>
                    <TableHead className="w-32 text-xs font-bold text-slate-700 dark:text-slate-300">
                      Peran Jabatan
                    </TableHead>
                    <TableHead className="w-24 text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                      Status
                    </TableHead>
                    <TableHead className="w-48 text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                      Aksi Akses
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-44 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                          <p className="text-xs text-slate-500 font-medium">Memuat data pegawai...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : paginatedPegawai.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-36 text-center">
                        <p className="text-xs text-slate-400 font-medium">
                          Tidak ada data pegawai yang sesuai dengan pencarian atau filter.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedPegawai.map((item: any, index: number) => {
                      const rowNum = (pagePegawai - 1) * pageSizePegawai + index + 1
                      const nipDisplay =
                        item.nipNbm || item.teacherProfile?.nip || '-'
                      const isSpectatorLoading =
                        actionLoadingId === `${item.id}_spectator`
                      const isOverrideLoading =
                        actionLoadingId === `${item.id}_override`

                      return (
                        <TableRow
                          key={item.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60 transition-colors"
                        >
                          <TableCell className="text-center text-xs font-medium text-slate-500">
                            {rowNum}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {item.name}
                              </span>
                              <span className="text-[11px] text-slate-400 truncate">
                                {item.email || 'Tanpa email terdaftar'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {item.username}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                NIP: {nipDisplay}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 items-start">
                              <Badge
                                variant="outline"
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/50"
                              >
                                {item.role}
                              </Badge>
                              {item.subRole && item.subRole !== 'NONE' && (
                                <span className="text-[10px] text-slate-400 font-medium truncate max-w-[130px]">
                                  {item.subRole}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.isActive !== false ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold px-1.5 py-0.5">
                                Aktif
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-bold px-1.5 py-0.5">
                                Nonaktif
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Tombol Spectator (Read Only) */}
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!!actionLoadingId}
                                onClick={() =>
                                  executeOverride(item.id, item.name, 'spectator')
                                }
                                className="h-7.5 px-2 text-[11px] font-bold text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-lg gap-1 shadow-2xs"
                                title="Akses akun dalam mode Read Only (Spectator)"
                              >
                                {isSpectatorLoading ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Eye className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                )}
                                <span>Spectator</span>
                              </Button>

                              {/* Tombol Override (Full Access) */}
                              <Button
                                size="sm"
                                disabled={!!actionLoadingId}
                                onClick={() =>
                                  executeOverride(item.id, item.name, 'override')
                                }
                                className="h-7.5 px-2 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg gap-1 shadow-2xs"
                                title="Akses akun dalam mode Full Access (Override)"
                              >
                                {isOverrideLoading ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <ShieldAlert className="w-3 h-3" />
                                )}
                                <span>Override</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Paginasi Pegawai */}
            <TablePagination
              currentPage={pagePegawai}
              pageSize={pageSizePegawai}
              totalItems={filteredPegawai.length}
              onPageChange={(p) => setPagePegawai(p)}
              onPageSizeChange={(s) => {
                setPageSizePegawai(s)
                setPagePegawai(1)
              }}
              pageSizeOptions={[10, 50, 100]}
              itemLabel="pegawai"
            />
          </Card>
        </TabsContent>

        {/* TAB 2: SISWA & WALI MURID */}
        <TabsContent value="siswa" className="space-y-3 mt-0">
          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-xs bg-white/95 dark:bg-slate-900/90 rounded-2xl overflow-hidden backdrop-blur-md">
            {/* Filter & Search Bar */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <TableSearch
                value={searchSiswa}
                onChange={(v) => {
                  setSearchSiswa(v)
                  setPageSiswa(1)
                }}
                placeholder="Cari nama siswa, NIS/NISN, kelas, atau wali murid..."
                className="w-full sm:w-80"
                activeFiltersCount={activeFiltersSiswaCount}
                onResetFilters={() => {
                  setFilterKelasSiswa('ALL')
                  setFilterStatusSiswa('ALL')
                  setPageSiswa(1)
                }}
                filters={
                  <div className="space-y-3 p-1 min-w-[220px]">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Rombongan Belajar (Kelas)
                      </Label>
                      <Select
                        value={filterKelasSiswa}
                        onValueChange={(val) => {
                          setFilterKelasSiswa(val || 'ALL')
                          setPageSiswa(1)
                        }}
                      >
                        <SelectTrigger className="h-8.5 text-xs rounded-xl">
                          <SelectValue placeholder="Pilih Kelas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Semua Kelas</SelectItem>
                          {distinctKelas.map((k) => (
                            <SelectItem key={k.id} value={k.id}>
                              {k.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Status Siswa
                      </Label>
                      <Select
                        value={filterStatusSiswa}
                        onValueChange={(val) => {
                          setFilterStatusSiswa(val || 'ALL')
                          setPageSiswa(1)
                        }}
                      >
                        <SelectTrigger className="h-8.5 text-xs rounded-xl">
                          <SelectValue placeholder="Pilih Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Semua Status</SelectItem>
                          <SelectItem value="ACTIVE">Aktif</SelectItem>
                          <SelectItem value="INACTIVE">Nonaktif</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                }
              />

              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium self-end sm:self-auto">
                Total: <strong>{filteredSiswa.length}</strong> siswa
              </div>
            </div>

            {/* Tabel Siswa & Wali Murid */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800">
                    <TableHead className="w-12 text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                      No
                    </TableHead>
                    <TableHead className="min-w-[160px] max-w-[220px] text-xs font-bold text-slate-700 dark:text-slate-300">
                      Data Siswa
                    </TableHead>
                    <TableHead className="w-28 text-xs font-bold text-slate-700 dark:text-slate-300">
                      Kelas
                    </TableHead>
                    <TableHead className="w-44 text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                      Aksi Akun Siswa
                    </TableHead>
                    <TableHead className="min-w-[180px] max-w-[240px] text-xs font-bold text-slate-700 dark:text-slate-300">
                      Wali Murid Terhubung
                    </TableHead>
                    <TableHead className="w-44 text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                      Aksi Akun Wali Murid
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-44 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                          <p className="text-xs text-slate-500 font-medium">Memuat data siswa...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : paginatedSiswa.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-36 text-center">
                        <p className="text-xs text-slate-400 font-medium">
                          Tidak ada data siswa yang sesuai dengan pencarian atau filter.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSiswa.map((student: any, index: number) => {
                      const rowNum = (pageSiswa - 1) * pageSizeSiswa + index + 1
                      const studentUser = student.user
                      const parentRelation = student.parentRelations?.[0]
                      const parentUser = parentRelation?.parent?.user
                      const relationName = parentRelation?.relation || 'WALI'

                      const isStudentSpectatorLoading =
                        studentUser &&
                        actionLoadingId === `${studentUser.id}_spectator`
                      const isStudentOverrideLoading =
                        studentUser &&
                        actionLoadingId === `${studentUser.id}_override`

                      const isParentSpectatorLoading =
                        parentUser &&
                        actionLoadingId === `${parentUser.id}_spectator`
                      const isParentOverrideLoading =
                        parentUser &&
                        actionLoadingId === `${parentUser.id}_override`

                      return (
                        <TableRow
                          key={student.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60 transition-colors"
                        >
                          <TableCell className="text-center text-xs font-medium text-slate-500">
                            {rowNum}
                          </TableCell>

                          {/* Data Siswa */}
                          <TableCell>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {student.name}
                              </span>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                                <span>NIS: {student.nis || '-'}</span>
                                {student.nisn && (
                                  <span>• NISN: {student.nisn}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Kelas */}
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/40"
                            >
                              {student.class?.name || 'Belum Ada Kelas'}
                            </Badge>
                          </TableCell>

                          {/* Aksi Akun Siswa */}
                          <TableCell className="text-center">
                            {studentUser ? (
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={!!actionLoadingId}
                                  onClick={() =>
                                    executeOverride(
                                      studentUser.id,
                                      student.name,
                                      'spectator',
                                      'Siswa'
                                    )
                                  }
                                  className="h-7 px-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 rounded-lg gap-1 shadow-2xs"
                                  title="Spectator Akun Siswa (Read Only)"
                                >
                                  {isStudentSpectatorLoading ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Eye className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                  )}
                                  <span>Spectator</span>
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={!!actionLoadingId}
                                  onClick={() =>
                                    executeOverride(
                                      studentUser.id,
                                      student.name,
                                      'override',
                                      'Siswa'
                                    )
                                  }
                                  className="h-7 px-1.5 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg gap-1 shadow-2xs"
                                  title="Override Akun Siswa (Full Access)"
                                >
                                  {isStudentOverrideLoading ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <ShieldAlert className="w-3 h-3" />
                                  )}
                                  <span>Override</span>
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-400 italic">
                                Belum ada akun user
                              </span>
                            )}
                          </TableCell>

                          {/* Data Wali Murid Terhubung */}
                          <TableCell>
                            {parentUser ? (
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {parentUser.name}
                                </span>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                                  <span className="font-semibold text-slate-500">
                                    {relationName}
                                  </span>
                                  <span>•</span>
                                  <span className="truncate">{parentUser.username}</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">
                                Belum terhubung wali murid
                              </span>
                            )}
                          </TableCell>

                          {/* Aksi Akun Wali Murid */}
                          <TableCell className="text-center">
                            {parentUser ? (
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={!!actionLoadingId}
                                  onClick={() =>
                                    executeOverride(
                                      parentUser.id,
                                      parentUser.name,
                                      'spectator',
                                      `Wali Murid dari ${student.name}`
                                    )
                                  }
                                  className="h-7 px-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 rounded-lg gap-1 shadow-2xs"
                                  title="Spectator Akun Wali Murid (Read Only)"
                                >
                                  {isParentSpectatorLoading ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Eye className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                  )}
                                  <span>Spectator Wali</span>
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={!!actionLoadingId}
                                  onClick={() =>
                                    executeOverride(
                                      parentUser.id,
                                      parentUser.name,
                                      'override',
                                      `Wali Murid dari ${student.name}`
                                    )
                                  }
                                  className="h-7 px-1.5 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg gap-1 shadow-2xs"
                                  title="Override Akun Wali Murid (Full Access)"
                                >
                                  {isParentOverrideLoading ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <ShieldAlert className="w-3 h-3" />
                                  )}
                                  <span>Override Wali</span>
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-400 italic">
                                Akun wali belum tersedia
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Paginasi Siswa */}
            <TablePagination
              currentPage={pageSiswa}
              pageSize={pageSizeSiswa}
              totalItems={filteredSiswa.length}
              onPageChange={(p) => setPageSiswa(p)}
              onPageSizeChange={(s) => {
                setPageSizeSiswa(s)
                setPageSiswa(1)
              }}
              pageSizeOptions={[10, 50, 100]}
              itemLabel="siswa"
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
