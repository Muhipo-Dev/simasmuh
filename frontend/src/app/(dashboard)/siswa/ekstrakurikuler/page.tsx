'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Sparkles, Award, Calendar, Clock, MapPin, Users,
  CheckCircle2, ShieldCheck, BookOpen, AlertCircle, Info,
  Filter, Search, UserCheck, Star, ChevronRight, UserPlus, LogOut, Loader2
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableSearch } from '@/components/TableSearch'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import Swal from 'sweetalert2'

export default function SiswaEkstrakurikulerPage() {
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'my' | 'catalog'>('my')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [leavingId, setLeavingId] = useState<string | null>(null)

  // 1. Fetch Aktivitas & Katalog Ekskul Siswa Realtime
  const { data, isLoading } = useQuery<{
    myMemberships: any[]
    availableCatalog: any[]
  }>({
    queryKey: ['student-my-extracurriculars'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/extracurricular/student/my-activities')
      if (!res.ok) return { myMemberships: [], availableCatalog: [] }
      return res.json()
    },
    staleTime: 30000,
  })

  const myMemberships = data?.myMemberships || []
  const availableCatalog = data?.availableCatalog || []

  // Set ID ekskul yang sudah diikuti
  const joinedEkskulIds = new Set(myMemberships.map((m: any) => m.extracurricularId || m.extracurricular?.id))

  // Handler Gabung Ekstrakurikuler Mandiri
  const handleJoinExtracurricular = async (ekskul: any) => {
    const confirm = await Swal.fire({
      title: `Gabung Ekstrakurikuler?`,
      html: `
        <div class="text-left text-xs space-y-2 p-2">
          <p>Anda akan mendaftar ke unit kegiatan: <b>${ekskul.name}</b></p>
          <div class="p-3 bg-amber-50 dark:bg-slate-800 rounded-xl border border-amber-200">
            <p class="text-slate-600 dark:text-slate-300"><b>Jadwal:</b> ${ekskul.scheduleDay || '-'} (${ekskul.scheduleTime || '-'})</p>
            <p class="text-slate-600 dark:text-slate-300"><b>Lokasi:</b> ${ekskul.location || '-'}</p>
            <p class="text-slate-600 dark:text-slate-300"><b>Pembina:</b> ${ekskul.pembinaName || '-'}</p>
          </div>
          <p class="text-slate-500">Pendaftaran akan langsung tersinkronisasi dengan Guru Pembina dan Bidang Kesiswaan.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Gabung Sekarang',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#d97706',
    })

    if (!confirm.isConfirmed) return

    try {
      setJoiningId(ekskul.id)
      const res = await authenticatedFetch(`/api-backend/extracurricular/student/join/${ekskul.id}`, {
        method: 'POST',
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.message || 'Gagal mendaftar ekstrakurikuler')

      Swal.fire({
        title: 'Berhasil Bergabung!',
        text: result.message || `Anda resmi terdaftar di ekstrakurikuler ${ekskul.name}.`,
        icon: 'success',
        timer: 2500,
        showConfirmButton: false,
      })

      queryClient.invalidateQueries({ queryKey: ['student-my-extracurriculars'] })
      queryClient.invalidateQueries({ queryKey: ['student-dashboard-ekskul'] })
      setActiveTab('my')
    } catch (err: any) {
      Swal.fire({
        title: 'Pendaftaran Gagal',
        text: err?.message || 'Terjadi kesalahan sistem.',
        icon: 'error',
      })
    } finally {
      setJoiningId(null)
    }
  }

  // Handler Keluar Ekstrakurikuler Mandiri
  const handleLeaveExtracurricular = async (ekskul: any) => {
    const confirm = await Swal.fire({
      title: `Keluar dari Ekstrakurikuler?`,
      text: `Apakah Anda yakin ingin berhenti dan keluar dari keanggotaan ${ekskul.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#e11d48',
    })

    if (!confirm.isConfirmed) return

    try {
      setLeavingId(ekskul.id)
      const res = await authenticatedFetch(`/api-backend/extracurricular/student/leave/${ekskul.id}`, {
        method: 'POST',
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.message || 'Gagal memproses permohonan keluar')

      Swal.fire({
        title: 'Berhasil Keluar',
        text: result.message || `Anda telah keluar dari ekstrakurikuler ${ekskul.name}.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      })

      queryClient.invalidateQueries({ queryKey: ['student-my-extracurriculars'] })
      queryClient.invalidateQueries({ queryKey: ['student-dashboard-ekskul'] })
    } catch (err: any) {
      Swal.fire({
        title: 'Gagal Keluar',
        text: err?.message || 'Terjadi kesalahan sistem.',
        icon: 'error',
      })
    } finally {
      setLeavingId(null)
    }
  }

  // Pilih membership pertama secara default jika ada
  const activeMembership = myMemberships.find((m) => m.id === selectedMembershipId) || myMemberships[0] || null

  // Filter katalog
  const filteredCatalog = availableCatalog.filter((item) => {
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchName = item.name?.toLowerCase().includes(q)
      const matchPembina = item.pembinaName?.toLowerCase().includes(q)
      const matchLoc = item.location?.toLowerCase().includes(q)
      return matchName || matchPembina || matchLoc
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">
                Ekstrakurikuler Siswa
              </h1>
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                MUHIPO Hebat
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Informasi kegiatan ekstrakurikuler yang kamu ikuti, presensi kehadiran, nilai rapor, dan katalog klub resmi.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('my')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'my'
              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Award className="h-3.5 w-3.5" />
          <span>Ekstrakurikuler Saya ({myMemberships.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'catalog'
              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Katalog Ekskul MUHIPO ({availableCatalog.length})</span>
        </button>
      </div>

      {/* TAB 1: EKSTRAKURIKULER SAYA */}
      {activeTab === 'my' && (
        <div className="space-y-6">
          {myMemberships.length > 0 ? (
            <div className="space-y-6">
              {/* Pilihan Selector jika Siswa mengikuti > 1 Ekskul */}
              {myMemberships.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {myMemberships.map((m) => {
                    const isSelected = activeMembership?.id === m.id
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMembershipId(m.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-400'
                        }`}
                      >
                        {m.extracurricular?.name} ({m.role})
                      </button>
                    )
                  })}
                </div>
              )}

              {activeMembership && (
                <>
                  {/* Card Detail Ekskul Aktif */}
                  <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm bg-gradient-to-r from-amber-50/40 via-white to-orange-50/20 dark:from-slate-900 dark:to-slate-850">
                    <CardHeader className="p-5 pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg font-bold text-slate-800 dark:text-white">
                              {activeMembership.extracurricular?.name}
                            </CardTitle>
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold">
                              {activeMembership.role}
                            </Badge>
                          </div>
                          <CardDescription className="text-xs mt-1">
                            {activeMembership.extracurricular?.description || 'Unit kegiatan pengembangan potensi siswa SMA Muhammadiyah 1 Ponorogo.'}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 self-start">
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs font-bold">
                            Status: {activeMembership.status}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLeaveExtracurricular(activeMembership.extracurricular)}
                            disabled={leavingId === activeMembership.extracurricular?.id}
                            className="h-7 text-[11px] font-bold text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          >
                            {leavingId === activeMembership.extracurricular?.id ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                <span>Keluar...</span>
                              </>
                            ) : (
                              <>
                                <LogOut className="w-3 h-3 mr-1" />
                                <span>Keluar Ekskul</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                          <span>
                            <strong>Jadwal:</strong> {activeMembership.extracurricular?.scheduleDay || '-'} ({activeMembership.extracurricular?.scheduleTime || '-'})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <MapPin className="h-4 w-4 text-rose-500 flex-shrink-0" />
                          <span className="truncate">
                            <strong>Lokasi:</strong> {activeMembership.extracurricular?.location || '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          <span>
                            <strong>Pembina:</strong> {activeMembership.extracurricular?.pembinaName || '-'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Statistik Kehadiran & Nilai Rapor Siswa */}
                  {(() => {
                    const attendances = activeMembership.attendances || []
                    const totalSessions = activeMembership.extracurricular?.sessions?.length || 0
                    const hadirCount = attendances.filter((a: any) => a.status === 'HADIR').length
                    const izinCount = attendances.filter((a: any) => a.status === 'IZIN').length
                    const sakitCount = attendances.filter((a: any) => a.status === 'SAKIT').length
                    const alfaCount = attendances.filter((a: any) => a.status === 'ALFA').length
                    const pctHadir = totalSessions > 0 ? Math.round((hadirCount / totalSessions) * 100) : 100

                    const latestGrade = activeMembership.grades?.[0] || null

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Box Kehadiran */}
                        <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
                          <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              Rekap Kehadiran Latihan
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">
                                  {pctHadir}%
                                </p>
                                <p className="text-xs text-slate-500">
                                  Hadir {hadirCount} dari {totalSessions} total pertemuan
                                </p>
                              </div>
                              <div className="flex gap-1.5 text-xs font-bold">
                                <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md">
                                  H: {hadirCount}
                                </span>
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md">
                                  I: {izinCount}
                                </span>
                                <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-md">
                                  S: {sakitCount}
                                </span>
                                <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded-md">
                                  A: {alfaCount}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Box Nilai & Evaluasi Rapor */}
                        <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
                          <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                              <Award className="h-4 w-4 text-purple-500" />
                              Nilai & Predikat Rapor
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            {latestGrade ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl font-black text-slate-800 dark:text-white">
                                      {latestGrade.score ?? '-'}
                                    </span>
                                    <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30 text-xs font-bold">
                                      Predikat {latestGrade.predicate}
                                    </Badge>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-semibold">
                                    Semester {latestGrade.semester} {latestGrade.academicYear}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                                  &quot;{latestGrade.description || 'Aktif berpartisipasi dan menyelesaikan tugas latihan dengan sangat baik.'}&quot;
                                </p>
                              </div>
                            ) : (
                              <div className="py-2 text-center text-xs text-slate-400">
                                <p>Belum ada nilai yang diinput oleh pembina untuk periode ini.</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )
                  })()}

                  {/* Riwayat Sesi Pertemuan Siswa */}
                  <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-amber-500" />
                        Log Presensi Pertemuan Mingguan
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50 dark:bg-slate-850 text-[11px] font-bold">
                              <TableHead className="w-12 text-center">NO</TableHead>
                              <TableHead className="w-32 text-center">TANGGAL</TableHead>
                              <TableHead className="w-24 text-center">WAKTU</TableHead>
                              <TableHead className="min-w-[180px]">JUDUL & TOPIK LATIHAN</TableHead>
                              <TableHead className="w-32">LOKASI</TableHead>
                              <TableHead className="w-28 text-center">STATUS SAYA</TableHead>
                              <TableHead className="min-w-[140px]">KETERANGAN</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {activeMembership.extracurricular?.sessions && activeMembership.extracurricular.sessions.length > 0 ? (
                              activeMembership.extracurricular.sessions.map((session: any, idx: number) => {
                                const myAttendance = activeMembership.attendances?.find(
                                  (a: any) => a.sessionId === session.id
                                )
                                const status = myAttendance?.status || 'HADIR'

                                return (
                                  <TableRow key={session.id} className="text-xs">
                                    <TableCell className="text-center font-medium text-slate-500">{idx + 1}</TableCell>
                                    <TableCell className="text-center font-semibold text-slate-700 dark:text-slate-200">
                                      {new Date(session.sessionDate).toLocaleDateString('id-ID', {
                                        weekday: 'short',
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                      })}
                                    </TableCell>
                                    <TableCell className="text-center font-mono text-[11px] text-slate-500">
                                      {session.startTime && session.endTime ? `${session.startTime} - ${session.endTime}` : '-'}
                                    </TableCell>
                                    <TableCell>
                                      <p className="font-bold text-slate-800 dark:text-slate-100">{session.title}</p>
                                      {session.topic && (
                                        <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
                                          Materi: {session.topic}
                                        </p>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-slate-600 truncate max-w-[120px]">
                                      {session.location || '-'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Badge
                                        className={`text-[10px] font-bold ${
                                          status === 'HADIR'
                                            ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                                            : status === 'IZIN'
                                            ? 'bg-blue-500/15 text-blue-600 border-blue-500/30'
                                            : status === 'SAKIT'
                                            ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                                            : 'bg-rose-500/15 text-rose-600 border-rose-500/30'
                                        }`}
                                      >
                                        {status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-[11px]">
                                      {myAttendance?.notes || '-'}
                                    </TableCell>
                                  </TableRow>
                                )
                              })
                            ) : (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center py-6 text-slate-400 text-xs">
                                  Belum ada catatan pertemuan untuk ekstrakurikuler ini.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          ) : (
            <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm text-center p-8">
              <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">
                Belum Terdaftar di Ekstrakurikuler
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                Kamu belum terdaftar di unit kegiatan ekstrakurikuler manapun. Silakan hubungi pembina ekskul atau kesiswaan untuk pendaftaran.
              </p>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                onClick={() => setActiveTab('catalog')}
              >
                Lihat Katalog Ekstrakurikuler
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* TAB 2: KATALOG SELURUH EKSTRAKURIKULER MUHIPO */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <TableSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari ekskul / nama pembina / lokasi..."
              className="w-full"
              activeFiltersCount={selectedCategory !== 'ALL' ? 1 : 0}
              onResetFilters={() => setSelectedCategory('ALL')}
              filters={
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Kategori Ekstrakurikuler</label>
                  <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val || 'ALL')}>
                    <SelectTrigger className="w-full h-9 text-xs bg-slate-50 dark:bg-slate-800">
                      <SelectValue placeholder="Semua Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL" className="text-xs">-- Semua Kategori --</SelectItem>
                      <SelectItem value="WAJIB_MUHAMMADIYAH" className="text-xs">Wajib Muhammadiyah (HW, TS)</SelectItem>
                      <SelectItem value="KEORGANISASIAN" className="text-xs">Keorganisasian (IPM)</SelectItem>
                      <SelectItem value="KESEHATAN_SOSIAL" className="text-xs">Kesehatan & Sosial (PMR)</SelectItem>
                      <SelectItem value="KEPEMIMPINAN" className="text-xs">Kepemimpinan (Paskibra)</SelectItem>
                      <SelectItem value="OLAHRAGA" className="text-xs">Olahraga & Bela Diri</SelectItem>
                      <SelectItem value="AKADEMIK_SAINS" className="text-xs">Akademik, Robotik & Sains</SelectItem>
                      <SelectItem value="KEAGAMAAN" className="text-xs">Keagamaan & Tahfidz</SelectItem>
                      <SelectItem value="SENI_BUDAYA" className="text-xs">Seni & Budaya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              }
            />
          </div>

          {/* Grid Katalog */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCatalog.map((ekskul) => (
              <Card
                key={ekskul.id}
                className="border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold mb-1">
                        {ekskul.category?.replace(/_/g, ' ')}
                      </Badge>
                      <CardTitle className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1">
                        {ekskul.name}
                      </CardTitle>
                    </div>
                    {ekskul.code && (
                      <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                        {ekskul.code}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs line-clamp-2 mt-1">
                    {ekskul.description || 'Unit kegiatan ekstrakurikuler SMA Muhammadiyah 1 Ponorogo.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="space-y-1.5 py-2 border-y border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">
                        {ekskul.scheduleDay || '-'} ({ekskul.scheduleTime || '-'})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span className="truncate">{ekskul.location || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">Pembina: {ekskul.pembinaName}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500">
                    <span>Target: {ekskul.targetPeserta || 'Semua Tingkat'}</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {ekskul._count?.members || 0} Siswa
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    {joinedEkskulIds.has(ekskul.id) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="w-full h-8 text-xs font-bold text-emerald-600 border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Sudah Terdaftar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleJoinExtracurricular(ekskul)}
                        disabled={joiningId === ekskul.id}
                        className="w-full h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs flex items-center justify-center gap-1"
                      >
                        {joiningId === ekskul.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Mendaftar...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Gabung Ekstrakurikuler</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
