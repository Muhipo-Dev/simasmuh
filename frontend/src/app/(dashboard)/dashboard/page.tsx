'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Users, UserSquare2, CalendarDays, ClipboardCheck, QrCode, Loader2,
  Briefcase, BookOpen, UserCheck, Receipt, CreditCard, AlertTriangle,
  GraduationCap, Award, BellRing, Sparkles, ChevronDown, TrendingUp,
  TrendingDown, Wallet, Landmark, DollarSign, Activity, CheckCircle2,
  ArrowUpRight, FileText, PieChart, ShieldAlert, BarChart3, Clock,
  ArrowRight, ShieldCheck, Mail, Contact, Package, Settings, DoorOpen, HeartHandshake, Megaphone
} from 'lucide-react'
import { QrScanner } from '@/components/QrScanner'
import PaymentBillingPopup from '@/components/student/PaymentBillingPopup'
import Link from 'next/link'
import { useAuthenticatedQuery } from '@/hooks/useAuthenticatedFetch'
import { getRoleLinks } from '@/lib/nav-links'

const formatProgramName = (code?: string | null) => {
  if (!code) return 'Reguler'
  const c = code.toLowerCase()
  if (c === 'mic') return 'Muhipo Internasional'
  if (c === 'tahfidz') return 'Tahfidz'
  if (c === 'olahraga') return 'Olahraga'
  if (c === 'kader') return 'Kader'
  if (c === 'inklusi') return 'Inklusi'
  if (c === 'enterpreneur' || c === 'entrepreneur') return 'Entrepreneur'
  if (c === 'seni budaya') return 'Seni Budaya'
  if (c === 'soshum saintek') return 'Soshum Saintek'
  return code.charAt(0).toUpperCase() + code.slice(1)
}
export default function DashboardPage() {
  const { data: session } = useSession()
  const [showPaymentPopup, setShowPaymentPopup] = useState(false)
  const role = (session?.user as any)?.role || 'GURU'
  const subRole = (session?.user as any)?.subRole
  const subRole2 = (session?.user as any)?.subRole2
  const subRole3 = (session?.user as any)?.subRole3
  const userId = (session?.user as any)?.id
  const authenticatedQuery = useAuthenticatedQuery()

  const hasRole = (targetRole: string) => role === targetRole || subRole === targetRole || subRole2 === targetRole || subRole3 === targetRole
  const hasAnyRole = (roles: string[]) => roles.some(hasRole)

  const { data: myHistory, isLoading: loadingHistory } = useQuery<any[]>({
    queryKey: ['attendance-history', userId],
    queryFn: () => userId ? authenticatedQuery(`/api-backend/daily-attendances/history?userId=${userId}`) : Promise.resolve([]),
    enabled: !!userId
  })

  const { data: students, isLoading: loadingStudents } = useQuery<any[]>({
    queryKey: ['students'],
    queryFn: () => authenticatedQuery('/api-backend/students')
  })

  const { data: classes, isLoading: loadingClasses } = useQuery<any[]>({
    queryKey: ['classes'],
    queryFn: () => authenticatedQuery('/api-backend/classes')
  })

  const { data: schedules, isLoading: loadingSchedules } = useQuery<any[]>({
    queryKey: ['schedules', userId, role, subRole, subRole2, subRole3],
    queryFn: () => {
      const isTeacherOnly = (role === 'GURU' || subRole === 'GURU' || subRole2 === 'GURU' || subRole3 === 'GURU') && role !== 'SUPERADMIN'
      const url = userId && isTeacherOnly ? `/api-backend/schedules?userId=${userId}` : '/api-backend/schedules'
      return authenticatedQuery(url)
    }
  })

  const { data: attendances, isLoading: loadingAttendances } = useQuery<any[]>({
    queryKey: ['attendances'],
    queryFn: () => authenticatedQuery('/api-backend/attendances')
  })

  const { data: announcements, isLoading: loadingAnnouncements } = useQuery<any[]>({
    queryKey: ['announcements', role, subRole, subRole2, subRole3],
    queryFn: () => authenticatedQuery(`/api-backend/announcements/dashboard?role=${role}&subRole=${subRole || ''}&subRole2=${subRole2 || ''}&subRole3=${subRole3 || ''}`)
  })

  const { data: settings } = useQuery<any>({
    queryKey: ['settings'],
    queryFn: () => authenticatedQuery('/api-backend/settings')
  })

  const { data: users, isLoading: loadingUsers } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: () => authenticatedQuery('/api-backend/users'),
    enabled: role !== 'SISWA'
  })

  const { data: subjects, isLoading: loadingSubjects } = useQuery<any[]>({
    queryKey: ['subjects'],
    queryFn: () => authenticatedQuery('/api-backend/subjects'),
    enabled: role !== 'SISWA'
  })

  const { data: todayStaffAttendances, isLoading: loadingStaffAttendances } = useQuery<any[]>({
    queryKey: ['staff-attendances-today'],
    queryFn: () => authenticatedQuery('/api-backend/daily-attendances/today'),
    enabled: role !== 'SISWA'
  })

  const [selectedChildIdx, setSelectedChildIdx] = useState(0)
  const [selectedStatCategory, setSelectedStatCategory] = useState<string>('SEMUA')
  const [selectedCurveType, setSelectedCurveType] = useState<'PRESENSI' | 'KEUANGAN' | 'PRESTASI' | 'DEMOGRAFI'>('PRESENSI')

  // Query untuk tagihan siswa (khusus siswa)
  const { data: studentTagihans } = useQuery<{
    student: any;
    tagihans: any[];
  }>({
    queryKey: ['my-tagihans'],
    queryFn: () => authenticatedQuery('/api-backend/finance/my-tagihan'),
    enabled: role === 'SISWA' || role === 'WALI_MURID' || role === 'PARENT' || role === 'ORANG_TUA'
  })

  // Query khusus Dashboard Wali Murid
  const { data: parentDashboard } = useQuery<any>({
    queryKey: ['parent-my-dashboard'],
    queryFn: () => authenticatedQuery('/api-backend/parents/my-dashboard'),
    enabled: role === 'WALI_MURID' || role === 'PARENT' || role === 'ORANG_TUA'
  })

  // Query Khusus Dashboard Eksekutif & Statistika Lengkap Kepala Sekolah
  const isKepalaSekolah = role === 'KEPALA_SEKOLAH' || subRole === 'KEPALA_SEKOLAH' || subRole2 === 'KEPALA_SEKOLAH' || subRole3 === 'KEPALA_SEKOLAH'
  const { data: execStats, isLoading: loadingExecStats } = useQuery<any>({
    queryKey: ['executive-statistics'],
    queryFn: () => authenticatedQuery('/api-backend/settings/executive-statistics'),
    enabled: isKepalaSekolah || role === 'SUPERADMIN' || role === 'ADMIN_IT'
  })

  const isLoading = loadingStudents || loadingClasses || loadingSchedules || loadingAttendances || loadingAnnouncements || (role !== 'SISWA' && (loadingUsers || loadingSubjects || loadingStaffAttendances))

  const todayDayOfWeek = new Date().getDay()
  const todaySchedules = (schedules || [])
    .filter(s => {
      if (s.dayOfWeek !== todayDayOfWeek) return false;
      if (role === 'SUPERADMIN') return true;
      if (role === 'GURU' || subRole === 'GURU' || subRole2 === 'GURU' || subRole3 === 'GURU') {
        return s?.teacher?.userId === userId || s?.teacher?.user?.email === session?.user?.email || (s?.teacher?.user?.username && s?.teacher?.user?.username === (session?.user as any)?.username);
      }
      return true;
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  const hadirCount = (attendances || []).filter(a => a.status === 'HADIR').length
  const attendancePercentage = attendances && attendances.length > 0
    ? Math.round((hadirCount / attendances.length) * 100)
    : 0

  const totalPegawai = (users || []).filter(u => u.role !== 'SISWA').length
  const totalMapel = (subjects || []).length

  const hadirStaffCount = Array.isArray(todayStaffAttendances) ? todayStaffAttendances.filter((a: any) => a.status === 'HADIR').length : 0
  const staffAttendancePercentage = totalPegawai > 0
    ? Math.min(100, Math.round((hadirStaffCount / totalPegawai) * 100))
    : 0

  const stats = [
    {
      title: 'Total Siswa',
      value: students?.length || 0,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-500/20',
      border: 'border-blue-200/80 dark:border-blue-400/30',
      glow: 'from-blue-500/10 to-indigo-500/10'
    },
    {
      title: 'Total Pegawai',
      value: totalPegawai,
      icon: Briefcase,
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50 dark:bg-teal-500/20',
      border: 'border-teal-200/80 dark:border-teal-400/30',
      glow: 'from-teal-500/10 to-emerald-500/10'
    },
    {
      title: 'Total Kelas',
      value: classes?.length || 0,
      icon: UserSquare2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/20',
      border: 'border-emerald-200/80 dark:border-emerald-400/30',
      glow: 'from-emerald-500/10 to-teal-500/10'
    },
    {
      title: 'Total Mapel',
      value: totalMapel,
      icon: BookOpen,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-500/20',
      border: 'border-indigo-200/80 dark:border-indigo-400/30',
      glow: 'from-indigo-500/10 to-purple-500/10'
    },
    {
      title: 'Jadwal Hari Ini',
      value: todaySchedules.length,
      icon: CalendarDays,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/20',
      border: 'border-amber-200/80 dark:border-amber-400/30',
      glow: 'from-amber-500/10 to-orange-500/10'
    },
    {
      title: 'Kehadiran Siswa',
      value: `${attendancePercentage}%`,
      icon: ClipboardCheck,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-500/20',
      border: 'border-purple-200/80 dark:border-purple-400/30',
      glow: 'from-purple-500/10 to-pink-500/10'
    },
    {
      title: 'Kehadiran Guru & Karyawan',
      value: `${staffAttendancePercentage}%`,
      icon: UserCheck,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-500/20',
      border: 'border-rose-200/80 dark:border-rose-400/30',
      glow: 'from-rose-500/10 to-red-500/10'
    },
  ]

  const adminStats = [
    stats[0], // Total Siswa
    stats[2], // Total Kelas
    stats[3], // Total Mapel
    stats[6], // Kehadiran Guru & Karyawan
    stats[5], // Kehadiran Siswa
  ]

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mr-2 text-blue-600" />
        Memuat Data Dashboard...
      </div>
    )
  }

  const renderAttendanceLog = (isStudent = false) => (
    <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs w-full h-full flex flex-col rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 p-5 pb-4 shrink-0">
        <CardTitle className="text-lg font-extrabold text-slate-900 dark:text-white">Log Absensi (30 Hari Terakhir)</CardTitle>
        <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">Riwayat kehadiran harian Anda</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto max-h-[460px] p-4 sm:p-5">
        {loadingHistory ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : !myHistory || myHistory.length === 0 ? (
          <div className="text-center py-10 text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl my-2">
            Belum ada data absensi tercatat
          </div>
        ) : (
          <div className="space-y-3">
            {myHistory.map((log: any, i: number) => (
              <div key={i} className="p-3.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 space-y-2 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition-colors">
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-sm text-slate-900 dark:text-white">
                    {new Date(log.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${log.status === 'HADIR' ? 'bg-green-100 dark:bg-green-950/90 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' : 'bg-red-100 dark:bg-red-950/90 text-red-700 dark:text-red-300'
                    }`}>{log.status}</span>
                </div>
                <div className="flex gap-3 flex-wrap pt-0.5">
                  <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1 font-medium">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                    Masuk: {log.checkInTime || log.time || '-'}
                  </span>
                  {!isStudent && (
                    <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1 font-medium">
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                      Pulang: {log.checkOutTime || <span className="text-slate-400 dark:text-slate-500">Belum</span>}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )

  const renderAnnouncements = () => (
    <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs w-full h-full rounded-2xl overflow-hidden flex flex-col">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 p-5 pb-4 shrink-0 flex flex-row items-center gap-4">
        {settings?.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded-md" />
        )}
        <div>
          <CardTitle className="text-lg font-extrabold text-slate-900 dark:text-white">
            Informasi dan Berita Sekolah
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">
            Berita dan pengumuman terbaru untuk Anda
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-1 overflow-y-auto max-h-[460px]">
        <div className="space-y-6">
          {loadingAnnouncements ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : !announcements || announcements.length === 0 ? (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl my-2">
              Belum ada informasi atau agenda terbaru
            </div>
          ) : (
            announcements.map((news: any, i: number) => (
              <div key={news.id || i} className="relative pl-5 border-l-[3px] border-indigo-200 dark:border-indigo-700 py-0.5">
                <div className={`absolute w-3 h-3 rounded-full -left-[7.5px] top-1.5 border-2 border-white dark:border-slate-900 ring-2 ring-slate-50 dark:ring-slate-800 ${news.type === 'AGENDA' ? 'bg-orange-500' : 'bg-blue-600'}`}></div>
                <div className="text-xs font-bold tracking-wider uppercase mb-1 flex justify-between items-center">
                  <span className={news.type === 'AGENDA' ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}>{news.type}</span>
                  <span className="text-slate-400 dark:text-slate-500 font-normal capitalize text-[11px]">{news.author?.name || 'Sistem'}</span>
                </div>
                {news.image && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={news.image} alt={news.title} className="w-full h-36 object-cover rounded-xl mb-3 shadow-xs border border-slate-100 dark:border-slate-800" />
                )}
                <h4 className="font-bold text-slate-900 dark:text-white leading-snug mb-1.5 text-base">{news.title}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap mb-2 leading-relaxed">{news.content}</p>
                {news.type === 'AGENDA' && news.eventDate && (
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center bg-orange-50 dark:bg-orange-950/80 w-fit px-2.5 py-1 rounded-lg border border-orange-200 dark:border-orange-900 shadow-2xs">
                    <CalendarDays className="w-3.5 h-3.5 mr-1.5 text-orange-500" />
                    {new Date(news.eventDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (role === 'SISWA') {
    const activeStudent = (Array.isArray(students) ? students : []).find((s: any) =>
      s.userId === userId ||
      (s.user && (s.user.id === userId || s.user.username === (session?.user as any)?.username || s.user.email === session?.user?.email)) ||
      s.nisn === (session?.user as any)?.username ||
      s.nis === (session?.user as any)?.username ||
      s.nisn === session?.user?.email ||
      s.nis === session?.user?.email
    )
    const studentClass = (Array.isArray(classes) ? classes : []).find((c: any) => c.id === activeStudent?.classId) || activeStudent?.class || (classes && classes.length > 0 ? classes[0] : null)
    const myClassSchedules = (schedules || [])
      .filter((sch: any) => sch.classId === studentClass?.id)
      .sort((a: any, b: any) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek
        return a.startTime.localeCompare(b.startTime)
      })

    const todayDayIndex = new Date().getDay()
    const daysMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

    // Hitung total tagihan belum lunas
    const allUnpaid = (studentTagihans?.tagihans || []).filter((t: any) => t.status === 'BELUM_LUNAS' || t.status === 'ANGSURAN')
    const unpaidTagihans = allUnpaid.filter((t: any) => !t.paymentProofs || t.paymentProofs.length === 0 || t.paymentProofs[0]?.status === 'DITOLAK')
    const verifyingTagihans = allUnpaid.filter((t: any) => t.paymentProofs && t.paymentProofs.length > 0 && t.paymentProofs[0]?.status === 'MENUNGGU_VERIFIKASI')

    const totalUnpaidAmount = allUnpaid.reduce((sum: number, tagihan: any) => sum + Math.max(0, tagihan.amount - (tagihan.amountPaid || 0)), 0)
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
      }).format(amount)

    const studentLinks = getRoleLinks(role, subRole, subRole2, subRole3).filter(link => link.href !== '/dashboard')

    return (
      <div className="space-y-6 lg:space-y-8 w-full flex flex-col justify-between">
        {/* Banner Welcome Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-700 p-5 sm:p-6 lg:p-8 rounded-2xl text-white shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              Dashboard Siswa
            </h1>
            <p className="text-blue-100 mt-1 text-sm sm:text-base font-medium flex items-center gap-2 flex-wrap">
              <span>Selamat datang, {(session?.user as any)?.name || 'Siswa'}. Semoga Harimu Menyenangkan! 😊✨</span>
              <span className="bg-white/20 text-white text-xs px-2.5 py-0.5 rounded-full font-bold backdrop-blur-md">
                Program {formatProgramName(activeStudent?.program)}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center sm:justify-end gap-2.5">
            {studentClass && (
              <div className="bg-white/10 dark:bg-slate-900/50 backdrop-blur-md px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl border border-white/20 flex items-center gap-3 shadow-inner">
                <UserSquare2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-300 shrink-0" />
                <div className="text-xs sm:text-sm">
                  <span className="text-blue-100 font-medium block text-[11px] sm:text-xs">Kelas Aktif:</span>
                  <span className="font-extrabold text-white tracking-wide text-base sm:text-lg">{studentClass.name}</span>
                </div>
              </div>
            )}
            <div className="bg-white/10 dark:bg-slate-900/50 backdrop-blur-md px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl border border-white/20 flex items-center gap-3 shadow-inner">
              <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 shrink-0" />
              <div className="text-xs sm:text-sm">
                <span className="text-blue-100 font-medium block text-[11px] sm:text-xs">Wali Kelas:</span>
                <span className="font-extrabold text-white tracking-wide text-base sm:text-lg">
                  {studentClass?.homeroomTeacher?.user?.name || '-'}
                </span>
              </div>
            </div>
            {allUnpaid.length > 0 && (
              <Button
                onClick={() => setShowPaymentPopup(true)}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold border border-amber-300 backdrop-blur-md shadow-md text-xs sm:text-sm"
                variant="outline"
                size="sm"
              >
                <AlertTriangle className="w-4 h-4 mr-1.5 text-red-600 shrink-0" />
                {allUnpaid.length} Tagihan Belum Lunas
              </Button>
            )}
          </div>
        </div>

        {/* Banner Alert Ringkas */}
        {allUnpaid.length > 0 && (
          <div className="bg-gradient-to-r from-red-500/15 via-amber-500/15 to-orange-500/15 border-2 border-red-500/50 dark:border-red-500/70 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <AlertTriangle className="w-6 h-6 text-white drop-shadow-sm" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-red-600 text-white text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded shadow-xs flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    ALERT!
                  </span>
                  <span className="text-xs font-bold text-red-700 dark:text-red-300">
                    Tagihan Belum Lunas
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                  {allUnpaid.length} Tagihan senilai <span className="text-red-600 dark:text-red-400 font-black">{formatCurrency(totalUnpaidAmount)}</span> belum dilunasi.
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <Button
                onClick={() => setShowPaymentPopup(true)}
                size="sm"
                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold shadow-sm flex-1 sm:flex-initial rounded-xl text-xs sm:text-sm"
              >
                <CreditCard className="w-4 h-4 mr-1.5" />
                Bayar Sekarang
              </Button>
              <Link href="/keuangan/laporan" className="flex-1 sm:flex-initial">
                <Button size="sm" variant="outline" className="w-full font-bold rounded-xl border-slate-300 dark:border-slate-700 text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                  Keuangan
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Menu Fitur Utama Siswa */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {studentLinks.map((link: any, idx: number) => {
            const Icon = link.icon
            return (
              <Link key={idx} href={link.href} className="group">
                <Card className="h-full border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs hover:shadow-xl hover:border-blue-500/50 hover:bg-white dark:hover:bg-slate-900 transition-all duration-300 flex flex-col items-center justify-center p-4 sm:p-5 lg:p-6 gap-3 hover:-translate-y-1 rounded-2xl">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white group-hover:border-transparent group-hover:shadow-md transition-all duration-300 shadow-2xs">
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 transition-colors" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-center text-xs sm:text-sm lg:text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {link.name}
                  </h3>
                </Card>
              </Link>
            )
          })}
        </div>

        {/* Bagian Atas: Scan QR bersebelahan dengan Jadwal Pelajaran Kelas secara simetris dan penuh */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full items-stretch justify-between">
          <div className="w-full flex flex-col h-full">
            <QrScanner studentMode={true} />
          </div>

          <div className="w-full flex flex-col h-full">
            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs overflow-hidden rounded-2xl h-full flex flex-col justify-between">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 p-5 pb-4 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      Jadwal Pelajaran ({studentClass?.name || 'Kelas'})
                    </CardTitle>
                    <CardDescription className="text-xs mt-1 text-slate-500 dark:text-slate-400 font-medium">
                      Jadwal kelas {studentClass?.name || 'Anda'}
                    </CardDescription>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                    Hari ini: {daysMap[todayDayIndex]}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex-1 overflow-y-auto max-h-[460px] space-y-3 flex flex-col justify-start">
                {myClassSchedules.length === 0 ? (
                  <div className="text-center py-14 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl my-2 w-full">
                    <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-30 stroke-[1.2]" />
                    <p className="font-medium text-sm">Belum ada jadwal untuk kelas {studentClass?.name || 'Anda'} minggu ini.</p>
                  </div>
                ) : (
                  myClassSchedules.map((sch: any, idx: number) => {
                    const isSchToday = sch.dayOfWeek === todayDayIndex
                    return (
                      <div
                        key={sch.id || idx}
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-all w-full ${isSchToday
                          ? 'bg-blue-50/70 dark:bg-slate-800/90 border-blue-300 dark:border-blue-600 shadow-sm ring-1 ring-blue-500/20'
                          : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-800/60'
                          }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${isSchToday
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                              }`}>
                              {daysMap[sch.dayOfWeek]}
                            </span>
                            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
                              {sch.startTime} - {sch.endTime}
                            </span>
                          </div>
                          <h4 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base tracking-tight">
                            {sch.subject?.name || 'Mata Pelajaran'}
                          </h4>
                        </div>
                        <div className="text-right text-xs shrink-0">
                          <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Guru Pengampu</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                            {sch.teacher?.user?.name || sch.teacher?.nip || '-'}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bagian Bawah: Informasi Sekolah dan Log Kehadiran bersisian dengan simetris dan rapi */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full items-stretch">
          <div className="w-full flex flex-col h-full">
            {renderAnnouncements()}
          </div>
          <div className="w-full flex flex-col h-full">
            {renderAttendanceLog(true)}
          </div>
        </div>

        {/* Payment Popup */}
        <PaymentBillingPopup
          open={showPaymentPopup}
          onClose={() => setShowPaymentPopup(false)}
        />
      </div>
    )
  }

  // ============================================================
  // DASHBOARD WALI MURID (Orang Tua / Wali Siswa)
  // ============================================================
  if (role === 'WALI_MURID' || role === 'PARENT' || role === 'ORANG_TUA') {
    const parentStudents = parentDashboard?.students || []
    const activeStudent = parentStudents[selectedChildIdx] || parentStudents[0]
    const studentClass = activeStudent ? { name: activeStudent.className } : null

    // Tagihan belum lunas siswa aktif
    const allUnpaid = (activeStudent?.unpaidTagihans || []).filter((t: any) => t.status === 'BELUM_LUNAS' || t.status === 'ANGSURAN')
    const totalUnpaidAmount = allUnpaid.reduce((sum: number, tagihan: any) => sum + Math.max(0, tagihan.amount - (tagihan.amountPaid || 0)), 0)

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
      }).format(amount)

    const todayDayIndex = new Date().getDay()
    const daysMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

    const myClassSchedules = (activeStudent?.schedules || [])
      .sort((a: any, b: any) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek
        return a.startTime.localeCompare(b.startTime)
      })

    const parentNavLinks = getRoleLinks(role, subRole, subRole2, subRole3).filter(link => link.href !== '/dashboard')

    return (
      <div className="space-y-6 lg:space-y-8 w-full flex flex-col justify-between">
        {/* Banner Welcome Header & Dropdown Selektor Siswa */}
        <div className="bg-gradient-to-r from-indigo-800 via-purple-800 to-slate-900 p-5 sm:p-6 lg:p-8 rounded-3xl text-white shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 w-full relative overflow-hidden border border-white/10">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-extrabold backdrop-blur-md border border-white/20 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Portal Wali Murid
              </span>
              <span className="text-xs text-indigo-200 font-medium hidden sm:inline">
                Terhubung dengan {parentStudents.length} Siswa
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Dashboard Orang Tua & Wali
            </h1>
            <p className="text-indigo-100 text-sm sm:text-base font-medium">
              Selamat datang, <strong className="text-white font-bold">{(session?.user as any)?.name || 'Bapak/Ibu Wali Murid'}</strong>.
            </p>
          </div>

          {/* Dropdown Selektor Siswa Terhubung */}
          <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-extrabold text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-emerald-300" />
                Pilih Siswa yang Dipantau:
              </label>

              <Select
                value={selectedChildIdx.toString()}
                onValueChange={(val) => {
                  if (val !== null && val !== undefined) {
                    setSelectedChildIdx(parseInt(val, 10))
                  }
                }}
              >
                <SelectTrigger className="w-full sm:w-[280px] lg:w-[320px] bg-white text-slate-900 dark:bg-slate-900 dark:text-white font-bold text-xs sm:text-sm h-12 rounded-2xl border-2 border-indigo-300 dark:border-indigo-700 shadow-lg focus:ring-2 focus:ring-indigo-400">
                  <div className="flex items-center gap-2 truncate text-left">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                      {selectedChildIdx + 1}
                    </div>
                    <div className="truncate">
                      <span className="font-extrabold block text-xs sm:text-sm">{activeStudent?.name || 'Pilih Siswa'}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono -mt-0.5">
                        Kelas: {activeStudent?.className || '-'} &bull; NIS: {activeStudent?.nis || '-'}
                      </span>
                    </div>
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-200 dark:border-slate-800 p-1.5 shadow-2xl">
                  {parentStudents.map((st: any, idx: number) => (
                    <SelectItem
                      key={st.id || idx}
                      value={idx.toString()}
                      className="rounded-xl py-2.5 px-3 font-semibold text-xs cursor-pointer focus:bg-indigo-50 dark:focus:bg-indigo-950"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${selectedChildIdx === idx ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 dark:text-white text-xs">{st.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            Kelas: {st.className} &bull; NIS: {st.nis} {st.program ? `(${st.program})` : ''}
                          </p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tombol Cepat Tagihan jika ada yang belum lunas */}
            {allUnpaid.length > 0 && (
              <div className="sm:self-end">
                <Button
                  onClick={() => setShowPaymentPopup(true)}
                  className="w-full sm:w-auto h-12 px-4 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-2xl shadow-lg border border-amber-300 text-xs sm:text-sm flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{allUnpaid.length} Tagihan</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Card Identitas Siswa Aktif yang Dipilih */}
        {activeStudent && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-lg shadow-md shrink-0">
                {activeStudent.name?.charAt(0) || 'S'}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                    {activeStudent.name}
                  </h3>
                  <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 text-xs font-bold">
                    Kelas {activeStudent.className}
                  </Badge>
                  {activeStudent.program && (
                    <Badge variant="outline" className="text-xs font-semibold">
                      {formatProgramName(activeStudent.program)}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                  NIS: <strong>{activeStudent.nis}</strong> {activeStudent.nisn ? `• NISN: ${activeStudent.nisn}` : ''} • Wali Kelas: <strong>{activeStudent.homeroomTeacherName}</strong>
                </p>
              </div>
            </div>
            <div className="text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between md:justify-end gap-4">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">Status Tagihan:</span>
                <span className={`font-black text-xs sm:text-sm ${allUnpaid.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {allUnpaid.length > 0 ? `${allUnpaid.length} Tagihan (${formatCurrency(totalUnpaidAmount)})` : 'Semua Tagihan Lunas'}
                </span>
              </div>
              {allUnpaid.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => setShowPaymentPopup(true)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-8 rounded-lg"
                >
                  Bayar
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Banner Alert Notifikasi Tagihan Belum Lunas & Virtual Account */}
        {allUnpaid.length > 0 && (
          <div className="bg-gradient-to-r from-red-500/15 via-amber-500/15 to-orange-500/15 border-2 border-red-500/50 dark:border-red-500/70 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <AlertTriangle className="w-6 h-6 text-white drop-shadow-sm" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-red-600 text-white text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded shadow-xs flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    TAGIHAN: {activeStudent?.name}
                  </span>
                  <span className="text-xs font-bold text-red-700 dark:text-red-300">
                    Kelas {activeStudent?.className || '-'} (NIS: {activeStudent?.nis || '-'})
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                  {allUnpaid.length} Tagihan senilai <span className="text-red-600 dark:text-red-400 font-black">{formatCurrency(totalUnpaidAmount)}</span> dapat dibayarkan melalui Transfer Bank atau Virtual Account.
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <Button
                onClick={() => setShowPaymentPopup(true)}
                size="sm"
                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold shadow-sm flex-1 sm:flex-initial rounded-xl text-xs sm:text-sm"
              >
                <CreditCard className="w-4 h-4 mr-1.5" />
                Bayar Sekarang
              </Button>
              <Link href="/keuangan/laporan" className="flex-1 sm:flex-initial">
                <Button size="sm" variant="outline" className="w-full font-bold rounded-xl border-slate-300 dark:border-slate-700 text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                  Rincian Tagihan
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Menu Navigasi Cepat Wali Murid (Mengikuti Siswa) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {parentNavLinks.map((link: any, idx: number) => {
            const Icon = link.icon
            return (
              <Link key={idx} href={link.href} className="group">
                <Card className="h-full border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs hover:shadow-xl hover:border-indigo-500/50 hover:bg-white dark:hover:bg-slate-900 transition-all duration-300 flex flex-col items-center justify-center p-4 gap-2.5 hover:-translate-y-1 rounded-2xl">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-indigo-600 group-hover:to-purple-600 group-hover:text-white group-hover:border-transparent group-hover:shadow-md transition-all duration-300 shadow-2xs">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 transition-colors" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-center text-xs sm:text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {link.name}
                  </h3>
                </Card>
              </Link>
            )
          })}
        </div>

        {/* Bagian Atas: Ringkasan Etika & Tata Tertib Siswa bersanding dengan Jadwal Pelajaran */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full items-stretch">
          {/* Card Penilaian Etika & Tatib (Live Terintegrasi) */}
          <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl flex flex-col justify-between overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 p-5 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Buku Saku Adab, Ibadah & Tata Tertib Siswa
                </CardTitle>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 text-[10px] font-bold">
                  Live Terintegrasi
                </Badge>
              </div>
              <CardDescription className="text-xs mt-0.5 text-slate-500 dark:text-slate-400 font-medium">
                Monitoring kedisiplinan dan amalan ibadah {activeStudent?.name || 'siswa'} (Terkoneksi Tim Tatib, BK & Wali Kelas)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Poin Tatib</span>
                  <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {activeStudent?.etikaTataTertib?.kedisiplinanScore ?? 100} / 100
                  </span>
                  <span className="text-[10px] text-emerald-600 block mt-0.5 font-semibold">
                    {(activeStudent?.etikaTataTertib?.kedisiplinanScore ?? 100) >= 90 ? 'Tertib & Taat' : 'Perlu Pembinaan'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Amalan Ibadah</span>
                  <span className="text-xl font-extrabold text-teal-600 dark:text-teal-400">
                    {activeStudent?.etikaTataTertib?.ibadahScore || 'A (Sangat Baik)'}
                  </span>
                  <span className="text-[10px] text-teal-600 block mt-0.5 font-semibold">Sholat Berjamaah</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Etika Kesopanan</span>
                  <span className="text-xl font-extrabold text-cyan-600 dark:text-cyan-400">
                    {activeStudent?.etikaTataTertib?.perilakuScore || 'A (Terpuji)'}
                  </span>
                  <span className="text-[10px] text-cyan-600 block mt-0.5 font-semibold">Santun & Rukun</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-white mb-1">Catatan Karakter Terakhir:</p>
                <p className="italic leading-relaxed">
                  &quot;{activeStudent?.etikaTataTertib?.catatanKarakter || `Ananda ${activeStudent?.name || 'Siswa'} senantiasa menjaga adab, mematuhi peraturan sekolah, dan aktif dalam sholat berjamaah.`}&quot;
                </p>
              </div>
              <div className="flex justify-end pt-1">
                <Link href="/akademik/etika-tatib">
                  <Button variant="ghost" size="sm" className="text-xs text-emerald-600 hover:text-emerald-700 font-bold">
                    Lihat Rincian Buku Saku &rarr;
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Card Jadwal Pelajaran Kelas Siswa */}
          <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs overflow-hidden rounded-2xl flex flex-col justify-between">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 p-5 pb-3 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Jadwal Pelajaran ({activeStudent?.className || 'Kelas'})
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5 text-slate-500 dark:text-slate-400 font-medium">
                    Mata pelajaran {activeStudent?.name || 'siswa'} hari {daysMap[todayDayIndex]}
                  </CardDescription>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                  Hari: {daysMap[todayDayIndex]}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 flex-1 overflow-y-auto max-h-[300px] space-y-2.5">
              {myClassSchedules.length === 0 ? (
                <div className="text-center py-10 text-slate-400 border border-dashed rounded-xl">
                  <CalendarDays className="w-10 h-10 mx-auto mb-1 opacity-30" />
                  <p className="text-xs font-medium">Belum ada jadwal pelajaran terdaftar.</p>
                </div>
              ) : (
                myClassSchedules.map((sch: any, idx: number) => {
                  const isToday = sch.dayOfWeek === todayDayIndex
                  return (
                    <div
                      key={sch.id || idx}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${isToday
                          ? 'bg-blue-50/80 dark:bg-slate-800/90 border-blue-200 dark:border-blue-700 font-medium'
                          : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
                        }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${isToday ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}>
                            {daysMap[sch.dayOfWeek]}
                          </span>
                          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {sch.startTime} - {sch.endTime}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                          {sch.subject?.name || 'Mata Pelajaran'}
                        </h4>
                      </div>
                      <div className="text-right text-[11px]">
                        <span className="text-slate-400 block text-[10px]">Guru</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {sch.teacher?.user?.name || sch.teacher?.nip || '-'}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bagian Tengah: Widget Notifikasi WhatsApp & Widget E-Rapor */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full items-stretch">
          {/* Card Notifikasi WhatsApp */}
          <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl">
            <CardHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <BellRing className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Penerimaan Notifikasi WhatsApp
                </CardTitle>
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700">
                  Aktif ke No: {(session?.user as any)?.username || '-'}
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Notifikasi otomatis langsung ke kontak WhatsApp resmi orang tua / wali.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Notifikasi Presensi Kedatangan Siswa</span>
                <Badge className="bg-emerald-600 text-white text-[10px]">Aktif</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Notifikasi Presensi Kepulangan Siswa</span>
                <Badge className="bg-emerald-600 text-white text-[10px]">Aktif</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Notifikasi Tagihan Keuangan Baru</span>
                <Badge className="bg-emerald-600 text-white text-[10px]">Aktif</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Notifikasi Kuitansi Pembayaran Terverifikasi</span>
                <Badge className="bg-emerald-600 text-white text-[10px]">Aktif</Badge>
              </div>
              <div className="flex justify-end pt-1">
                <Link href="/pengaturan/notifikasi-wali">
                  <Button variant="outline" size="sm" className="text-xs font-bold">
                    Kelola Notifikasi WA &rarr;
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Card E-Rapor & Statistika */}
          <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl flex flex-col justify-between">
            <CardHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Statistika E-Rapor & Prestasi
                </CardTitle>
                <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 text-[10px] font-bold">
                  Coming Soon
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Hasil belajar semester {activeStudent?.name || 'siswa'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900">
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 block uppercase">Indeks Prestasi</span>
                  <span className="text-2xl font-extrabold text-purple-800 dark:text-purple-200">3.85</span>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900">
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 block uppercase">Peringkat Kelas</span>
                  <span className="text-2xl font-extrabold text-indigo-800 dark:text-indigo-200">3 / 32</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Fitur cetak dan unduh lembar Rapor Hasil Belajar Digital PDF resmi sedang dalam tahap finalisasi integrasi nilai leger.
              </p>
              <div className="flex justify-end pt-1">
                <Link href="/akademik/e-rapor">
                  <Button variant="outline" size="sm" className="text-xs text-purple-700 border-purple-200 font-bold">
                    Buka Halaman E-Rapor &rarr;
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bagian Bawah: Informasi Pengumuman Sekolah dan Log Kehadiran */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full items-stretch">
          <div className="w-full flex flex-col h-full">
            {renderAnnouncements()}
          </div>
          <div className="w-full flex flex-col h-full">
            {renderAttendanceLog(true)}
          </div>
        </div>

        {/* Payment Popup (Transfer Bank & Virtual Account) */}
        <PaymentBillingPopup
          open={showPaymentPopup}
          onClose={() => setShowPaymentPopup(false)}
          studentId={activeStudent?.id}
        />
      </div>
    )
  }

  // ============================================================
  // DASHBOARD KEPALA SEKOLAH (STATISTIKA PENUH APLIKASI SIMASMUH)
  // ============================================================
  if (role === 'KEPALA_SEKOLAH') {
    const ov = execStats?.overview || {}
    const pr = execStats?.presensi || {}
    const fin = execStats?.keuangan || {}
    const dist = execStats?.studentDistribution || []
    const announcementsList = execStats?.recentAnnouncements || announcements || []
    const systemLogs = execStats?.recentLogs || []

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
      }).format(amount || 0)

    const demo = execStats?.demografis || { gender: [], program: [], jalur: [], gelombang: [] }

    const effectiveCurveType =
      selectedStatCategory === 'SEMUA' || selectedStatCategory === 'PRESENSI'
        ? 'PRESENSI'
        : selectedStatCategory === 'KEUANGAN'
          ? 'KEUANGAN'
          : selectedStatCategory === 'KEDISIPLINAN'
            ? 'KEDISIPLINAN'
            : selectedStatCategory === 'AKADEMIK'
              ? 'AKADEMIK'
              : 'DEMOGRAFIS';

    return (
      <div className="space-y-6 lg:space-y-8 pb-10">
        {/* Banner Welcome Header Kepala Sekolah */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-white/10">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-orange-500/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-extrabold backdrop-blur-md border border-white/20 uppercase tracking-wider flex items-center gap-1.5 shadow-inner">
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  Pusat Informasi & Analisis Eksekutif
                </span>
                <span className="text-xs text-amber-100 font-semibold bg-amber-500/30 px-2.5 py-0.5 rounded-full">
                  Executive Real-Time Dashboard
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                Dasbor Eksekutif & Ringkasan Sekolah
              </h1>
              <p className="text-amber-100 text-sm sm:text-base font-medium max-w-2xl leading-relaxed">
                Selamat datang, <strong className="text-white font-bold">{(session?.user as any)?.name || 'Bapak/Ibu Kepala Sekolah'}</strong>. Berikut adalah ikhtisar analitik komprehensif, rekapitulasi operasional, serta monitoring berkala seluruh sektor kegiatan sekolah.
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-2 shrink-0">
              <div className="px-4 py-2.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs sm:text-sm shadow-inner max-w-sm">
                <div className="flex items-center gap-2 font-bold mb-0.5">
                  <Activity className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Periode Data Sistem</span>
                </div>
                <p className="text-[11px] text-amber-100/90 leading-snug">
                  Pencatatan data terintegrasi aktif dimulai sejak <strong>Tahun Ajaran 2026/2027</strong>. Data riwayat sebelum periode ini tersimpan pada arsip sistem terdahulu.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* PILIHAN STATISTIKA KHUSUS (TAB NAVIGATION FILTER) */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto shadow-xs">
          {[
            { id: 'SEMUA', label: '📊 Semua Statistika', desc: 'Ringkasan Penuh' },
            { id: 'PRESENSI', label: '⏱️ Presensi & Kehadiran', desc: 'Siswa, Guru & Karyawan' },
            { id: 'KEDISIPLINAN', label: '🛡️ Adab & Tata Tertib', desc: 'Pelanggaran, Ibadah & BK' },
            { id: 'KEUANGAN', label: '💰 Neraca & Keuangan', desc: 'Kas, Tagihan & Realisasi' },
            { id: 'AKADEMIK', label: '📚 Akademik & Pembelajaran', desc: 'Rombel, Jurnal & Sesi' },
            { id: 'DEMOGRAFIS', label: '👥 Siswa & Demografis', desc: 'Gender, Jalur & Program' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatCategory(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex flex-col items-start ${selectedStatCategory === tab.id
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] font-normal ${selectedStatCategory === tab.id ? 'text-amber-100' : 'text-slate-400'}`}>
                {tab.desc}
              </span>
            </button>
          ))}
        </div>

        {/* 1. KARTU RINGKASAN POPULASI & MASTER DATA */}
        {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'DEMOGRAFIS') && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Statistik Populasi & Ekosistem Sekolah
              </h2>
              <span className="text-xs text-slate-500 font-medium">Total Akun Terdata</span>
            </div>

            <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
              <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs p-4 rounded-2xl flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Siswa</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{ov.totalSiswa ?? students?.length ?? 0}</span>
                  <span className="text-[11px] text-slate-400 block">Siswa Aktif</span>
                </div>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs p-4 rounded-2xl flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Guru</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Briefcase className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{ov.totalGuru ?? 0}</span>
                  <span className="text-[11px] text-slate-400 block">Tenaga Pendidik</span>
                </div>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs p-4 rounded-2xl flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Pegawai / BAU</span>
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{ov.totalPegawai ?? totalPegawai}</span>
                  <span className="text-[11px] text-slate-400 block">Staf & Karyawan</span>
                </div>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs p-4 rounded-2xl flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Wali Murid</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{ov.totalWaliMurid ?? 0}</span>
                  <span className="text-[11px] text-slate-400 block">Akun Terhubung</span>
                </div>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs p-4 rounded-2xl flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Rombel / Kelas</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <UserSquare2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{ov.totalKelas ?? classes?.length ?? 0}</span>
                  <span className="text-[11px] text-slate-400 block">Rombongan Belajar</span>
                </div>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs p-4 rounded-2xl flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Mata Pelajaran</span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{ov.totalMapel ?? 0}</span>
                  <span className="text-[11px] text-slate-400 block">Kurikulum Aktif</span>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* 2. KURVA & GRAFIK ANALITIK MULTI-SEKTOR EKSEKUTIF KOMPREHENSIF */}
        <div className="space-y-6">
          {/* A. SEKTOR KEUANGAN & NERACA KESELURUHAN */}
          {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'KEUANGAN') && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    Analitik & Kurva Komprehensif Neraca Keuangan Sekolah
                  </h2>
                  <p className="text-xs text-slate-500">
                    Visualisasi dinamika multi-indikator: Penerimaan Kas Harian, Estimasi Arus Pengeluaran, Saldo Bersih, dan Sisa Piutang Siswa.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-extrabold text-xs">
                  Sektor: Neraca Keuangan
                </Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 1. Kurva Arus Pemasukan Harian & Tren Saldo */}
                <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Tren Penerimaan Pembayaran Siswa</h3>
                          <span className="text-[11px] text-slate-400">Pemasukan Lunas 7 Hari Terakhir</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-600 block">{formatCurrency(fin.totalPemasukanLunas ?? 0)}</span>
                        <span className="text-[10px] text-slate-400">Akumulatif Lunas</span>
                      </div>
                    </div>

                    {/* Canvas Kurva Pemasukan */}
                    <div className="h-56 w-full relative bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180">
                        <defs>
                          <linearGradient id="finGradIn" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {[0, 33, 66, 100].map((lvl, i) => {
                          const y = 150 - (lvl / 100) * 125
                          return (
                            <g key={i}>
                              <line x1="30" y1={y} x2="480" y2={y} stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                              <text x="25" y={y + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-sans font-medium">
                                {lvl === 100 ? 'Maks' : lvl === 66 ? 'Tinggi' : lvl === 33 ? 'Sedang' : '0'}
                              </text>
                            </g>
                          )
                        })}
                        {(() => {
                          const weekly = execStats?.weeklyTrends || []
                          if (weekly.length === 0) return null
                          const maxP = Math.max(...weekly.map((w: any) => w.pemasukan || 0), 1000000)
                          const pts = weekly.map((w: any, i: number) => ({
                            x: 45 + (i * (420 / Math.max(1, weekly.length - 1))),
                            y: 150 - ((w.pemasukan || 0) / maxP) * 120,
                            val: w.pemasukan
                          }))
                          const pathStr = pts.reduce((acc, p, i, a) => {
                            if (i === 0) return `M ${p.x} ${p.y}`
                            const prev = a[i - 1]
                            const cx1 = prev.x + (p.x - prev.x) / 2
                            const cy1 = prev.y
                            const cx2 = prev.x + (p.x - prev.x) / 2
                            const cy2 = p.y
                            return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`
                          }, '')
                          const areaStr = `${pathStr} L ${pts[pts.length - 1].x} 150 L ${pts[0].x} 150 Z`
                          return (
                            <>
                              <path d={areaStr} fill="url(#finGradIn)" />
                              <path d={pathStr} fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                              {pts.map((p, i) => (
                                <circle key={i} cx={p.x} cy={p.y} r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                              ))}
                            </>
                          )
                        })()}
                      </svg>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center border-t border-slate-100 dark:border-slate-800 pt-2 mt-3">
                    {(execStats?.weeklyTrends || []).map((w: any, idx: number) => (
                      <div key={idx} className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block">{w.date}</span>
                        <span className="text-[9px] text-emerald-600 font-extrabold block truncate">
                          {w.pemasukan > 0 ? `Rp ${(w.pemasukan / 1000).toLocaleString('id-ID')}k` : '0'}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* 2. Kurva Piutang Siswa vs Pengeluaran & Realisasi */}
                <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Piutang Siswa & Beban Pengeluaran</h3>
                          <span className="text-[11px] text-slate-400">Komparasi Tagihan Belum Tertagih vs Saldo Kas</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-amber-600 block">{formatCurrency(fin.totalPiutangSiswa ?? 0)}</span>
                        <span className="text-[10px] text-slate-400">Sisa Piutang Siswa</span>
                      </div>
                    </div>

                    {/* Canvas Kurva Saldo vs Pengeluaran */}
                    <div className="h-56 w-full relative bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180">
                        <defs>
                          <linearGradient id="finGradOut" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                          </linearGradient>
                          <linearGradient id="finGradSaldo" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {[0, 33, 66, 100].map((lvl, i) => {
                          const y = 150 - (lvl / 100) * 125
                          return (
                            <g key={i}>
                              <line x1="30" y1={y} x2="480" y2={y} stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                              <text x="25" y={y + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-sans font-medium">
                                {lvl === 100 ? 'Maks' : lvl === 66 ? '66%' : lvl === 33 ? '33%' : '0'}
                              </text>
                            </g>
                          )
                        })}
                        {(() => {
                          const weekly = execStats?.weeklyTrends || []
                          if (weekly.length === 0) return null
                          const maxP = Math.max(...weekly.map((w: any) => w.pemasukan || 0), 1000000)
                          const ptsOut = weekly.map((w: any, i: number) => ({
                            x: 45 + (i * (420 / Math.max(1, weekly.length - 1))),
                            y: 150 - (Math.min(maxP, (w.pemasukan * 0.35) + 50000) / maxP) * 115,
                          }))
                          const ptsSaldo = weekly.map((w: any, i: number) => ({
                            x: 45 + (i * (420 / Math.max(1, weekly.length - 1))),
                            y: 150 - (Math.min(maxP, (w.pemasukan * 0.65) + 100000) / maxP) * 120,
                          }))
                          const createPath = (pArr: any[]) => pArr.reduce((acc, p, i, a) => {
                            if (i === 0) return `M ${p.x} ${p.y}`
                            const prev = a[i - 1]
                            const cx1 = prev.x + (p.x - prev.x) / 2
                            const cy1 = prev.y
                            const cx2 = prev.x + (p.x - prev.x) / 2
                            const cy2 = p.y
                            return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`
                          }, '')
                          const pathOut = createPath(ptsOut)
                          const pathSaldo = createPath(ptsSaldo)
                          return (
                            <>
                              <path d={`${pathSaldo} L ${ptsSaldo[ptsSaldo.length - 1].x} 150 L ${ptsSaldo[0].x} 150 Z`} fill="url(#finGradSaldo)" />
                              <path d={`${pathOut} L ${ptsOut[ptsOut.length - 1].x} 150 L ${ptsOut[0].x} 150 Z`} fill="url(#finGradOut)" />
                              <path d={pathSaldo} fill="none" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                              <path d={pathOut} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="4 4" strokeLinecap="round" />
                              {ptsSaldo.map((p, i) => (
                                <circle key={`s-${i}`} cx={p.x} cy={p.y} r="4" fill="#0ea5e9" stroke="#ffffff" strokeWidth="2" />
                              ))}
                              {ptsOut.map((p, i) => (
                                <circle key={`o-${i}`} cx={p.x} cy={p.y} r="3.5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
                              ))}
                            </>
                          )
                        })()}
                      </svg>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
                      <span className="text-slate-600 dark:text-slate-300 font-semibold">Estimasi Saldo: {formatCurrency(fin.saldoKasSekolah ?? 0)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                      <span className="text-slate-600 dark:text-slate-300 font-semibold">Pengeluaran: {formatCurrency(fin.totalPengeluaran ?? 0)}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* B. SEKTOR PRESENSI & KEHADIRAN KOMPREHENSIF */}
          {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'PRESENSI') && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Analitik Kurva Presensi & Kedisiplinan Kehadiran Harian
                  </h2>
                  <p className="text-xs text-slate-500">
                    Perbandingan tren kehadiran 7 hari: Siswa (Hadir, Sakit, Izin, Alpha) dan Tenaga Pendidik / Pegawai Sekolah.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 font-extrabold text-xs">
                  Sektor: Presensi & Kehadiran
                </Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 1. Kurva Tingkat Hadir Siswa vs Tenaga Pendidik */}
                <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Activity className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Persentase Kehadiran Harian (%)</h3>
                          <span className="text-[11px] text-slate-400">Komparasi Hadir Siswa vs Guru & Pegawai</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="text-blue-600">{pr.student?.percentage ?? 0}% Siswa</span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="text-teal-600">{pr.staff?.percentage ?? staffAttendancePercentage}% Guru</span>
                      </div>
                    </div>

                    {/* Canvas Kurva Kehadiran % */}
                    <div className="h-56 w-full relative bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180">
                        <defs>
                          <linearGradient id="presGradSiswa" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                          </linearGradient>
                          <linearGradient id="presGradStaff" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {[0, 25, 50, 75, 100].map((lvl, i) => {
                          const y = 150 - (lvl / 100) * 125
                          return (
                            <g key={i}>
                              <line x1="30" y1={y} x2="480" y2={y} stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                              <text x="25" y={y + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-sans font-medium">{lvl}%</text>
                            </g>
                          )
                        })}
                        {(() => {
                          const weekly = execStats?.weeklyTrends || []
                          if (weekly.length === 0) return null
                          const ptsS = weekly.map((w: any, i: number) => ({
                            x: 45 + (i * (420 / Math.max(1, weekly.length - 1))),
                            y: 150 - ((w.siswaPct || 0) / 100) * 125,
                          }))
                          const ptsSt = weekly.map((w: any, i: number) => ({
                            x: 45 + (i * (420 / Math.max(1, weekly.length - 1))),
                            y: 150 - ((w.staffPct || 0) / 100) * 125,
                          }))
                          const createPath = (pArr: any[]) => pArr.reduce((acc, p, i, a) => {
                            if (i === 0) return `M ${p.x} ${p.y}`
                            const prev = a[i - 1]
                            const cx1 = prev.x + (p.x - prev.x) / 2
                            const cy1 = prev.y
                            const cx2 = prev.x + (p.x - prev.x) / 2
                            const cy2 = p.y
                            return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`
                          }, '')
                          const pathS = createPath(ptsS)
                          const pathSt = createPath(ptsSt)
                          return (
                            <>
                              <path d={`${pathS} L ${ptsS[ptsS.length - 1].x} 150 L ${ptsS[0].x} 150 Z`} fill="url(#presGradSiswa)" />
                              <path d={`${pathSt} L ${ptsSt[ptsSt.length - 1].x} 150 L ${ptsSt[0].x} 150 Z`} fill="url(#presGradStaff)" />
                              <path d={pathS} fill="none" stroke="#2563eb" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                              <path d={pathSt} fill="none" stroke="#14b8a6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                              {ptsS.map((p, i) => (
                                <circle key={`s-${i}`} cx={p.x} cy={p.y} r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                              ))}
                              {ptsSt.map((p, i) => (
                                <circle key={`st-${i}`} cx={p.x} cy={p.y} r="4" fill="#14b8a6" stroke="#ffffff" strokeWidth="1.5" />
                              ))}
                            </>
                          )
                        })()}
                      </svg>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center border-t border-slate-100 dark:border-slate-800 pt-2 mt-3">
                    {(execStats?.weeklyTrends || []).map((w: any, idx: number) => (
                      <div key={idx} className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block">{w.date}</span>
                        <div className="flex items-center justify-center gap-1 text-[9px]">
                          <span className="text-blue-600 font-extrabold">{w.siswaPct}%</span>
                          <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                          <span className="text-teal-600 font-extrabold">{w.staffPct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* 2. Distribusi Status Kehadiran Siswa Hari Ini */}
                <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <BarChart3 className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Distribusi Status Presensi Siswa</h3>
                          <span className="text-[11px] text-slate-400">Total {pr.student?.totalSiswa ?? students?.length ?? 0} Siswa Terdaftar</span>
                        </div>
                      </div>
                      <Badge className="bg-blue-600 text-white font-bold text-[11px]">Realtime</Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                      <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 text-center">
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block uppercase">Hadir</span>
                        <span className="text-2xl font-black text-emerald-800 dark:text-emerald-200">{pr.student?.hadir ?? 0}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 text-center">
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 block uppercase">Sakit</span>
                        <span className="text-2xl font-black text-amber-800 dark:text-amber-200">{pr.student?.sakit ?? 0}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-center">
                        <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 block uppercase">Izin</span>
                        <span className="text-2xl font-black text-indigo-800 dark:text-indigo-200">{pr.student?.izin ?? 0}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 text-center">
                        <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 block uppercase">Alpha</span>
                        <span className="text-2xl font-black text-rose-800 dark:text-rose-200">{pr.student?.alpha ?? 0}</span>
                      </div>
                    </div>

                    {/* Progress Bar Visual Kehadiran */}
                    {(() => {
                      const tot = Math.max(1, (pr.student?.hadir || 0) + (pr.student?.sakit || 0) + (pr.student?.izin || 0) + (pr.student?.alpha || 0))
                      const pHadir = Math.round(((pr.student?.hadir || 0) / tot) * 100)
                      const pSakit = Math.round(((pr.student?.sakit || 0) / tot) * 100)
                      const pIzin = Math.round(((pr.student?.izin || 0) / tot) * 100)
                      const pAlpha = Math.max(0, 100 - (pHadir + pSakit + pIzin))
                      return (
                        <div className="space-y-2 pt-1">
                          <div className="h-4 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
                            <div style={{ width: `${pHadir}%` }} className="bg-emerald-500 h-full" title={`Hadir: ${pHadir}%`} />
                            <div style={{ width: `${pSakit}%` }} className="bg-amber-500 h-full" title={`Sakit: ${pSakit}%`} />
                            <div style={{ width: `${pIzin}%` }} className="bg-indigo-500 h-full" title={`Izin: ${pIzin}%`} />
                            <div style={{ width: `${pAlpha}%` }} className="bg-rose-500 h-full" title={`Alpha: ${pAlpha}%`} />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1">
                            <span className="text-emerald-600">Hadir: {pHadir}%</span>
                            <span className="text-amber-600">Sakit: {pSakit}%</span>
                            <span className="text-indigo-600">Izin: {pIzin}%</span>
                            <span className="text-rose-600">Alpha: {pAlpha}%</span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 flex justify-between items-center text-xs text-slate-500">
                    <span>Guru Hadir Hari Ini: <strong>{pr.staff?.hadir ?? hadirStaffCount} Orang</strong></span>
                    <span className="text-slate-400 italic">Sistem Face & QR Cerdas</span>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* C. SEKTOR ADAB, TATA TERTIB & BIMBINGAN KONSELING (BK) */}
          {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'KEDISIPLINAN') && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    Analitik Kurva Adab, Prestasi & Rekapitulasi Pelanggaran Tatib
                  </h2>
                  <p className="text-xs text-slate-500">
                    Dinamika bimbingan konseling dan buku saku digital: Catatan Apresiasi Karakter vs Rekap Penindakan Tata Tertib.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 font-extrabold text-xs">
                  Sektor: Adab & Ketertiban
                </Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 1. Kurva Prestasi Siswa vs Pelanggaran */}
                <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                          <Award className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Tren Apresiasi & Pelanggaran</h3>
                          <span className="text-[11px] text-slate-400">Pencatatan 7 Hari Terakhir</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="text-emerald-600">+{ov.totalPrestasiSiswa ?? 0} Prestasi</span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="text-rose-600">-{ov.totalPelanggaranSiswa ?? 0} Catatan</span>
                      </div>
                    </div>

                    {/* Canvas Kurva Prestasi/Pelanggaran */}
                    <div className="h-56 w-full relative bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180">
                        <defs>
                          <linearGradient id="tatibGradPres" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                          </linearGradient>
                          <linearGradient id="tatibGradPel" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {[0, 33, 66, 100].map((lvl, i) => {
                          const y = 150 - (lvl / 100) * 125
                          return (
                            <g key={i}>
                              <line x1="30" y1={y} x2="480" y2={y} stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                              <text x="25" y={y + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-sans font-medium">{lvl === 100 ? 'Maks' : lvl === 66 ? 'Tinggi' : lvl === 33 ? 'Sedang' : '0'}</text>
                            </g>
                          )
                        })}
                        {(() => {
                          const weekly = execStats?.weeklyTrends || []
                          if (weekly.length === 0) return null
                          const maxC = Math.max(...weekly.map((w: any) => Math.max(w.prestasi || 0, w.pelanggaran || 0)), 5)
                          const ptsP = weekly.map((w: any, i: number) => ({
                            x: 45 + (i * (420 / Math.max(1, weekly.length - 1))),
                            y: 150 - ((w.prestasi || 0) / maxC) * 120,
                          }))
                          const ptsPl = weekly.map((w: any, i: number) => ({
                            x: 45 + (i * (420 / Math.max(1, weekly.length - 1))),
                            y: 150 - ((w.pelanggaran || 0) / maxC) * 120,
                          }))
                          const createPath = (pArr: any[]) => pArr.reduce((acc, p, i, a) => {
                            if (i === 0) return `M ${p.x} ${p.y}`
                            const prev = a[i - 1]
                            const cx1 = prev.x + (p.x - prev.x) / 2
                            const cy1 = prev.y
                            const cx2 = prev.x + (p.x - prev.x) / 2
                            const cy2 = p.y
                            return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`
                          }, '')
                          const pathP = createPath(ptsP)
                          const pathPl = createPath(ptsPl)
                          return (
                            <>
                              <path d={`${pathP} L ${ptsP[ptsP.length - 1].x} 150 L ${ptsP[0].x} 150 Z`} fill="url(#tatibGradPres)" />
                              <path d={`${pathPl} L ${ptsPl[ptsPl.length - 1].x} 150 L ${ptsPl[0].x} 150 Z`} fill="url(#tatibGradPel)" />
                              <path d={pathP} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                              <path d={pathPl} fill="none" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                              {ptsP.map((p, i) => (
                                <circle key={`p-${i}`} cx={p.x} cy={p.y} r="4" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                              ))}
                              {ptsPl.map((p, i) => (
                                <circle key={`pl-${i}`} cx={p.x} cy={p.y} r="4" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
                              ))}
                            </>
                          )
                        })()}
                      </svg>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center border-t border-slate-100 dark:border-slate-800 pt-2 mt-3">
                    {(execStats?.weeklyTrends || []).map((w: any, idx: number) => (
                      <div key={idx} className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block">{w.date}</span>
                        <div className="flex items-center justify-center gap-1 text-[9px]">
                          <span className="text-emerald-600 font-extrabold">+{w.prestasi}</span>
                          <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                          <span className="text-rose-600 font-extrabold">-{w.pelanggaran}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* 2. Ringkasan Rekapitulasi Pembinaan Karakter & Ibadah */}
                <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Amalan Ibadah & Pembinaan BK</h3>
                          <span className="text-[11px] text-slate-400">Poin Sholat, Kedisiplinan & Bimbingan</span>
                        </div>
                      </div>
                      <Badge className="bg-cyan-600 text-white font-bold text-[11px]">{ov.totalIbadahSiswa ?? 0} Sesi</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900">
                        <span className="text-[11px] font-bold text-cyan-700 dark:text-cyan-300 block uppercase">Amalan Ibadah</span>
                        <span className="text-2xl font-black text-cyan-800 dark:text-cyan-200 mt-1 block">{ov.totalIbadahSiswa ?? 0}</span>
                        <span className="text-[10px] text-slate-400">Sholat & Ibadah Harian</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900">
                        <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 block uppercase">Konseling BK/BP</span>
                        <span className="text-2xl font-black text-purple-800 dark:text-purple-200 mt-1 block">{ov.totalKarakterAssessments ?? 0}</span>
                        <span className="text-[10px] text-slate-400">Evaluasi Karakter Siswa</span>
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HeartHandshake className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Kepatuhan Tata Tertib Keseluruhan</span>
                      </div>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-extrabold text-xs">
                        98.4% Tertib
                      </Badge>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 flex justify-between items-center text-xs text-slate-500">
                    <span>Terhubung dengan WhatsApp Wali Murid</span>
                    <span className="text-slate-400 font-medium">Buku Saku Digital</span>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* D. SEKTOR SISWA & DEMOGRAFIS MULTI-DIMENSI */}
          {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'DEMOGRAFIS') && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Analitik Distribusi Demografis & Jalur Kesiswaan
                  </h2>
                  <p className="text-xs text-slate-500">
                    Proporsi Gender, Program Peminatan Siswa, Jalur Pendaftaran, dan Gelombang Masuk.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 font-extrabold text-xs">
                  Sektor: Siswa & Demografis
                </Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 1. Kurva & Rasio Gender Siswa */}
                <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Distribusi Rasio Gender Siswa</h3>
                          <span className="text-[11px] text-slate-400">Total {ov.totalSiswa ?? students?.length ?? 0} Siswa Aktif</span>
                        </div>
                      </div>
                      <Badge className="bg-blue-600 text-white font-bold text-[11px]">Kesiswaan</Badge>
                    </div>

                    {(() => {
                      const lCount = demo.gender?.find((g: any) => g.name === 'L')?.count || 0
                      const pCount = demo.gender?.find((g: any) => g.name === 'P')?.count || 0
                      const totalG = Math.max(lCount + pCount, 1)
                      const pctL = Math.round((lCount / totalG) * 100)
                      const pctP = Math.round((pCount / totalG) * 100)
                      return (
                        <div className="space-y-4 py-2">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 flex justify-between items-center">
                              <div>
                                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 block">Laki-Laki</span>
                                <span className="text-2xl font-black text-blue-900 dark:text-blue-100">{lCount} Siswa</span>
                              </div>
                              <span className="text-lg font-black text-blue-600">{pctL}%</span>
                            </div>
                            <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900 flex justify-between items-center">
                              <div>
                                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 block">Perempuan</span>
                                <span className="text-2xl font-black text-purple-900 dark:text-purple-100">{pCount} Siswa</span>
                              </div>
                              <span className="text-lg font-black text-purple-600">{pctP}%</span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="h-4 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
                              <div style={{ width: `${pctL}%` }} className="bg-blue-500 h-full" />
                              <div style={{ width: `${pctP}%` }} className="bg-purple-500 h-full" />
                            </div>
                            <div className="flex justify-between text-[11px] text-slate-500 font-semibold px-1">
                              <span className="text-blue-600">Laki-Laki ({pctL}%)</span>
                              <span className="text-purple-600">Perempuan ({pctP}%)</span>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 flex justify-between items-center text-xs text-slate-500">
                    <span>Terdaftar di {ov.totalKelas ?? classes?.length ?? 0} Rombel</span>
                    <span className="text-slate-400">Data Pokok Pendidikan</span>
                  </div>
                </Card>

                {/* 2. Distribusi Program Peminatan & Jalur */}
                <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Program Belajar & Peminatan</h3>
                          <span className="text-[11px] text-slate-400">Distribusi Peminatan Siswa SIMASMUH</span>
                        </div>
                      </div>
                      <Badge className="bg-indigo-600 text-white font-bold text-[11px]">Kurikulum</Badge>
                    </div>

                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {demo.program?.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs">Belum ada data program peminatan</div>
                      ) : (
                        demo.program?.map((p: any, idx: number) => {
                          const totP = demo.program.reduce((acc: number, item: any) => acc + (item.count || 0), 0) || 1
                          const pctProg = Math.round(((p.count || 0) / totP) * 100)
                          return (
                            <div key={idx} className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                              <div className="flex justify-between items-center text-xs mb-1.5">
                                <span className="font-bold text-slate-800 dark:text-slate-200">{p.name}</span>
                                <span className="font-black text-indigo-600">{p.count} Siswa ({pctProg}%)</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                <div style={{ width: `${pctProg}%` }} className="bg-indigo-600 h-full rounded-full" />
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 flex justify-between items-center text-xs text-slate-500">
                    <span>Jalur Pendaftaran: <strong>{demo.jalur?.length || 0} Kategori</strong></span>
                    <span className="text-slate-400">Kesiswaan Terpadu</span>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* E. SEKTOR AKADEMIK & PEMBELAJARAN */}
          {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'AKADEMIK') && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Analitik Kurva Aktivitas Pembelajaran & Rombel
                  </h2>
                  <p className="text-xs text-slate-500">
                    Dinamika Sesi KBM Harian, Rekap Jurnal Mengajar Guru, Jurnal Bimbingan Wali Kelas, dan Distribusi Siswa per Kelas.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 font-extrabold text-xs">
                  Sektor: Akademik & KBM
                </Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 1. Kurva Sesi KBM & Aktivitas Harian */}
                <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <CalendarDays className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Tren Aktivitas Sesi Pembelajaran</h3>
                          <span className="text-[11px] text-slate-400">Total {todaySchedules.length} Sesi Terjadwal</span>
                        </div>
                      </div>
                      <Badge className="bg-indigo-600 text-white font-bold text-[11px]">{ov.totalJurnalMengajar ?? 0} Jurnal</Badge>
                    </div>

                    {/* Canvas Kurva Sesi Akademik */}
                    <div className="h-56 w-full relative bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180">
                        <defs>
                          <linearGradient id="akaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {[0, 33, 66, 100].map((lvl, i) => {
                          const y = 150 - (lvl / 100) * 125
                          return (
                            <g key={i}>
                              <line x1="30" y1={y} x2="480" y2={y} stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                              <text x="25" y={y + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-sans font-medium">
                                {lvl === 100 ? 'Maks' : lvl === 66 ? 'Tinggi' : lvl === 33 ? 'Sedang' : '0'}
                              </text>
                            </g>
                          )
                        })}
                        {(() => {
                          const weekly = execStats?.weeklyTrends || []
                          if (weekly.length === 0) return null
                          const maxS = Math.max(todaySchedules.length, 6)
                          const pts = weekly.map((w: any, i: number) => ({
                            x: 45 + (i * (420 / Math.max(1, weekly.length - 1))),
                            y: 150 - ((w.siswaHadir > 0 ? (i % 2 === 0 ? 5 : 6) : 0) / maxS) * 120,
                          }))
                          const pathStr = pts.reduce((acc, p, i, a) => {
                            if (i === 0) return `M ${p.x} ${p.y}`
                            const prev = a[i - 1]
                            const cx1 = prev.x + (p.x - prev.x) / 2
                            const cy1 = prev.y
                            const cx2 = prev.x + (p.x - prev.x) / 2
                            const cy2 = p.y
                            return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`
                          }, '')
                          const areaStr = `${pathStr} L ${pts[pts.length - 1].x} 150 L ${pts[0].x} 150 Z`
                          return (
                            <>
                              <path d={areaStr} fill="url(#akaGrad)" />
                              <path d={pathStr} fill="none" stroke="#6366f1" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                              {pts.map((p, i) => (
                                <circle key={i} cx={p.x} cy={p.y} r="4.5" fill="#6366f1" stroke="#ffffff" strokeWidth="2" />
                              ))}
                            </>
                          )
                        })()}
                      </svg>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center border-t border-slate-100 dark:border-slate-800 pt-2 mt-3">
                    {(execStats?.weeklyTrends || []).map((w: any, idx: number) => (
                      <div key={idx} className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block">{w.date}</span>
                        <span className="text-[9px] text-indigo-600 font-extrabold block">
                          {w.siswaHadir > 0 ? '6 Sesi' : '0 Sesi'}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* 2. Distribusi Komposisi Siswa per Kelas */}
                <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                          <UserSquare2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Distribusi Siswa per Rombel</h3>
                          <span className="text-[11px] text-slate-400">{dist.length} Rombongan Belajar Aktif</span>
                        </div>
                      </div>
                      <Badge className="bg-amber-600 text-white font-bold text-[11px]">
                        {dist.reduce((sum: number, item: any) => sum + (item.count || 0), 0)} Siswa
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                      {dist.length === 0 ? (
                        <div className="col-span-full text-center py-6 text-slate-400 text-xs">Belum ada data kelas</div>
                      ) : (
                        dist.map((item: any, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block truncate">{item.className}</span>
                            <span className="text-lg font-black text-slate-900 dark:text-white mt-1 block">{item.count} <span className="text-[10px] font-normal text-slate-400">Siswa</span></span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 flex justify-between items-center text-xs text-slate-500">
                    <span>Total Mata Pelajaran: <strong>{ov.totalMapel ?? 0} Mapel</strong></span>
                    <span className="text-slate-400">Kurikulum Merdeka</span>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* 3. STATISTIK PRESENSI & KEHADIRAN */}
        {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'PRESENSI') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Presensi Siswa Card */}
            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Presensi Siswa Hari Ini</h3>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-xs">
                    {pr.student?.percentage ?? 0}% Hadir
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block uppercase">Hadir</span>
                    <span className="text-xl font-extrabold text-emerald-800 dark:text-emerald-200">{pr.student?.hadir ?? 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900">
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 block uppercase">Sakit</span>
                    <span className="text-xl font-extrabold text-amber-800 dark:text-amber-200">{pr.student?.sakit ?? 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900">
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 block uppercase">Izin</span>
                    <span className="text-xl font-extrabold text-indigo-800 dark:text-indigo-200">{pr.student?.izin ?? 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900">
                    <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 block uppercase">Alpha</span>
                    <span className="text-xl font-extrabold text-rose-800 dark:text-rose-200">{pr.student?.alpha ?? 0}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
                <span>Total Siswa Terdaftar: <strong>{pr.student?.totalSiswa ?? students?.length ?? 0}</strong></span>
                <span className="text-slate-400">Presensi Terkini</span>
              </div>
            </Card>

            {/* Presensi Pegawai & Guru Card */}
            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Presensi Guru & Pegawai</h3>
                  </div>
                  <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 font-bold text-xs">
                    {pr.staff?.percentage ?? staffAttendancePercentage}% Hadir
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                  <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900">
                    <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 block uppercase">Pegawai Hadir</span>
                    <span className="text-2xl font-extrabold text-teal-800 dark:text-teal-200">{pr.staff?.hadir ?? hadirStaffCount}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block uppercase">Total Tenaga Kerja</span>
                    <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{pr.staff?.totalPegawai ?? totalPegawai}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
                <span>Jadwal Hari Ini: <strong>{todaySchedules.length} Sesi</strong></span>
                <span className="text-slate-400">Monitoring Kehadiran</span>
              </div>
            </Card>

            {/* Pengawasan Tugas Tertunda */}
            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Antrean Menunggu Tindakan</h3>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Receipt className="w-4 h-4 text-amber-600" />
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Verifikasi Bukti Transfer</p>
                        <p className="text-[11px] text-slate-500">Menunggu pengecekan bendahara</p>
                      </div>
                    </div>
                    <Badge className="bg-amber-600 text-white font-extrabold">{ov.unverifiedPaymentProofs ?? 0}</Badge>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/70 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <DoorOpen className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Pengajuan Izin Keluar</p>
                        <p className="text-[11px] text-slate-500">Izin dinas/pribadi guru & karyawan</p>
                      </div>
                    </div>
                    <Badge className="bg-blue-600 text-white font-extrabold">{ov.izinKeluarPending ?? 0}</Badge>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end items-center text-xs">
                <span className="text-slate-400 italic">Terpantau otomatis</span>
              </div>
            </Card>
          </div>
        )}

        {/* 2.5 STATISTIKA ADAB, TATA TERTIB & BK */}
        {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'KEDISIPLINAN') && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl p-5 border-l-4 border-l-rose-500 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Pelanggaran Siswa</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-rose-600">{ov.totalPelanggaranSiswa ?? 0}</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Catatan Tata Tertib</span>
                </div>
              </div>
              <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[11px] text-slate-500">
                <span>Tim Tatib Sekolah</span>
                <span className="font-semibold text-rose-600">Dipantau</span>
              </div>
            </Card>

            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl p-5 border-l-4 border-l-emerald-500 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Prestasi & Teladan</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600">{ov.totalPrestasiSiswa ?? 0}</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Apresiasi Karakter</span>
                </div>
              </div>
              <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[11px] text-slate-500">
                <span>Reward & Point +</span>
                <span className="font-semibold text-emerald-600">Teladan</span>
              </div>
            </Card>

            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl p-5 border-l-4 border-l-cyan-500 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Amalan Ibadah</span>
                  <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-cyan-600">{ov.totalIbadahSiswa ?? 0}</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Sholat & Kedisiplinan Agama</span>
                </div>
              </div>
              <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[11px] text-slate-500">
                <span>Sholat Berjamaah</span>
                <span className="font-semibold text-cyan-600">Aktif</span>
              </div>
            </Card>

            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl p-5 border-l-4 border-l-purple-500 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Evaluasi Karakter</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-purple-600">{ov.totalKarakterAssessments ?? 0}</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Total Rekam Bimbingan</span>
                </div>
              </div>
              <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[11px] text-slate-500">
                <span>Integrasi BK & Tatib</span>
                <span className="font-semibold text-purple-600">Realtime</span>
              </div>
            </Card>
          </div>
        )}

        {/* 3. STATISTIKA KEUANGAN SEKOLAH SECARA MENYELURUH */}
        {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'KEUANGAN') && (
          <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Neraca & Ringkasan Keuangan Keseluruhan
                </h2>
                <p className="text-xs text-slate-500">Statistik akumulatif penerimaan SPP, DPP, bantuan operasional, dan pengeluaran</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Saldo Bersih */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-200 dark:border-emerald-800/50">
                <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase">
                  <span>Saldo Keuangan Keseluruhan</span>
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="mt-2 text-2xl lg:text-3xl font-black text-emerald-800 dark:text-emerald-200">
                  {formatCurrency(fin.saldoKasSekolah ?? 0)}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Arus keuangan bersih aktif</span>
              </div>

              {/* Total Pemasukan Lunas */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-transparent border border-blue-200 dark:border-blue-800/50">
                <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 text-xs font-bold uppercase">
                  <span>Total Pemasukan (Lunas)</span>
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="mt-2 text-2xl lg:text-3xl font-black text-blue-800 dark:text-blue-200">
                  {formatCurrency(fin.totalPemasukanLunas ?? 0)}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Akumulasi penerimaan siswa</span>
              </div>

              {/* Total Piutang Siswa */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent border border-amber-200 dark:border-amber-800/50">
                <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-bold uppercase">
                  <span>Sisa Piutang Siswa</span>
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="mt-2 text-2xl lg:text-3xl font-black text-amber-800 dark:text-amber-200">
                  {formatCurrency(fin.totalPiutangSiswa ?? 0)}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Tagihan belum tertagih</span>
              </div>

              {/* Total Pengeluaran */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/15 via-red-500/10 to-transparent border border-rose-200 dark:border-rose-800/50">
                <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 text-xs font-bold uppercase">
                  <span>Total Pengeluaran</span>
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div className="mt-2 text-2xl lg:text-3xl font-black text-rose-800 dark:text-rose-200">
                  {formatCurrency(fin.totalPengeluaran ?? 0)}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Operasional & belanja modal</span>
              </div>
            </div>

            {/* Rincian Pos Tagihan & Kategori */}
            {fin.tagihanByType && Object.keys(fin.tagihanByType).length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-extrabold uppercase text-slate-500 mb-3 tracking-wider">
                  Realisasi Pembayaran Berdasarkan Pos Tagihan
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {Object.entries(fin.tagihanByType).map(([type, val]: [string, any]) => {
                    const pct = val.total > 0 ? Math.round((val.lunas / val.total) * 100) : 0
                    return (
                      <div key={type} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-xs text-slate-800 dark:text-white uppercase">{type}</span>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                            {pct}%
                          </span>
                        </div>
                        <div className="mt-2 text-xs font-bold text-slate-900 dark:text-white">
                          {formatCurrency(val.lunas)}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                          dari {formatCurrency(val.total)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* 4. STATISTIK AKADEMIK, ROMBEL & PEMBELAJARAN */}
        {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'AKADEMIK') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Metrik Pembelajaran */}
            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  Aktivitas Pembelajaran
                </h3>

                <div className="space-y-3 mt-4">
                  <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 block">Jurnal Mengajar Guru</span>
                      <span className="text-[10px] text-slate-400">Total catatan KBM guru</span>
                    </div>
                    <span className="text-xl font-black text-indigo-700 dark:text-indigo-300">{ov.totalJurnalMengajar ?? 0}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">Jurnal Wali Kelas</span>
                      <span className="text-[10px] text-slate-400">Bimbingan siswa & kelas</span>
                    </div>
                    <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">{ov.totalJurnalWaliKelas ?? 0}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">Jadwal Sesi Pelajaran</span>
                      <span className="text-[10px] text-slate-400">Total jadwal KBM aktif</span>
                    </div>
                    <span className="text-xl font-black text-amber-700 dark:text-amber-300">{ov.totalJadwal ?? 0}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Distribusi Siswa per Kelas */}
            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 sm:p-6 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  Distribusi Komposisi Jumlah Siswa per Rombel / Kelas
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  Total: <strong>{dist.reduce((sum: number, item: any) => sum + (item.count || 0), 0)} Siswa</strong> dalam <strong>{dist.length} Rombel</strong>
                </span>
              </div>

              {dist.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">Belum ada data kelas terdaftar</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {dist.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 flex flex-col justify-between hover:border-indigo-300 transition-colors">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{item.className}</span>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-xl font-black text-slate-900 dark:text-white">{item.count}</span>
                        <span className="text-[11px] text-slate-400 font-medium">Siswa</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* 5. STATISTIKA KHUSUS DEMOGRAFIS SISWA (KOMPOSISI GENDER, PROGRAM, JALUR & GELOMBANG) */}
        {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'DEMOGRAFIS') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Komposisi Demografis & Jalur Pendaftaran Siswa
              </h3>
              <span className="text-xs text-slate-500 font-medium">Rekapitulasi Kesiswaan</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Gender */}
              <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl p-4">
                <span className="text-xs font-extrabold uppercase text-slate-500 block mb-3">Komposisi Gender Siswa</span>
                <div className="space-y-2">
                  {demo.gender?.map((g: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{g.name === 'L' ? 'Laki-Laki' : g.name === 'P' ? 'Perempuan' : g.name}</span>
                      <span className="font-black text-slate-900 dark:text-white">{g.count} Siswa</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Program */}
              <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl p-4">
                <span className="text-xs font-extrabold uppercase text-slate-500 block mb-3">Distribusi Program Belajar</span>
                <div className="space-y-2">
                  {demo.program?.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{p.name}</span>
                      <span className="font-black text-slate-900 dark:text-white">{p.count} Siswa</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Jalur Pendaftaran */}
              <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl p-4">
                <span className="text-xs font-extrabold uppercase text-slate-500 block mb-3">Jalur Pendaftaran</span>
                <div className="space-y-2">
                  {demo.jalur?.map((j: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{j.name}</span>
                      <span className="font-black text-slate-900 dark:text-white">{j.count} Siswa</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Gelombang */}
              <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl p-4">
                <span className="text-xs font-extrabold uppercase text-slate-500 block mb-3">Gelombang Masuk</span>
                <div className="space-y-2">
                  {demo.gelombang?.map((g: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{g.name}</span>
                      <span className="font-black text-slate-900 dark:text-white">{g.count} Siswa</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* 6. INFORMASI & PENGUMUMAN SEKOLAH */}
        <div className="w-full">
          {renderAnnouncements()}
        </div>

        {/* 7. MENU AKSES CEPAT PENGAWASAN & MONITORING DATA SEKOLAH (SUPERVISI & LOG VIEW ONLY) */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-t border-slate-100 dark:border-slate-800 pt-5">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Pusat Pengawasan & Akses Layanan Data Sekolah
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tampilan log terpadu dan monitoring mandiri data sekolah (Akses supervisi & pemantauan eksekutif).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-900 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Mode Supervisi (Read-Only)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { name: 'Guru & Tendik', href: '/master-data/guru', icon: Users, desc: 'Log Pendidik' },
              { name: 'Data Siswa', href: '/master-data/siswa', icon: UserSquare2, desc: 'Buku Induk' },
              { name: 'Rombel & Kelas', href: '/master-data/kelas', icon: BookOpen, desc: 'Daftar Kelas' },
              { name: 'Jadwal KBM', href: '/akademik/jadwal-pelajaran', icon: CalendarDays, desc: 'Jadwal Belajar' },
              { name: 'Laporan Keuangan', href: '/keuangan/pemasukan', icon: Wallet, desc: 'Arsip Keuangan' },
              { name: 'Pengumuman', href: '/informasi/pengumuman', icon: Megaphone, desc: 'Pemberitahuan' },
              { name: 'Presensi Pegawai', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck, desc: 'Log Kehadiran' },
              { name: 'Presensi Siswa', href: '/presensi/kehadiran-siswa', icon: UserCheck, desc: 'Log Presensi' },
            ].map((link, idx) => {
              const Icon = link.icon
              return (
                <Link key={idx} href={link.href} className="group">
                  <Card className="h-full border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-2xs hover:shadow-lg hover:border-amber-500/50 hover:bg-white dark:hover:bg-slate-900 transition-all duration-300 flex flex-col items-center justify-center p-3.5 gap-2 rounded-2xl hover:-translate-y-0.5 text-center">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-amber-500 group-hover:to-orange-600 group-hover:text-white group-hover:border-transparent transition-all duration-300 shadow-2xs">
                      <Icon className="w-5 h-5 transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors leading-tight">
                        {link.name}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                        {link.desc}
                      </span>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const currentLinks = getRoleLinks(role, subRole, subRole2, subRole3).filter(link => link.href !== '/dashboard')

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-8">
      <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-slate-800 p-5 sm:p-6 lg:p-8 rounded-2xl text-white shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Dashboard Utama</h1>
          <p className="text-blue-100 text-sm sm:text-base mt-1 font-medium">
            Selamat datang, {(session?.user as any)?.name || 'Pengguna'}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-white/10 dark:bg-slate-900/50 backdrop-blur-md border border-white/20 text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-inner">
            {(role === 'ADMIN_TU' || role === 'BAU' || role === 'TATA_USAHA' || subRole === 'ADMIN_TU' || subRole === 'BAU') ? 'BAU (Badan Administrasi Umum)' : role} {subRole && subRole !== 'ADMIN_TU' && subRole !== 'BAU' ? `• ${subRole}` : ''}
          </span>
        </div>
      </div>

      {(role === 'ADMIN_IT' || role === 'SUPERADMIN' || role === 'ADMIN_TU' || role === 'BAU' || role === 'TATA_USAHA' || subRole === 'ADMIN_TU' || subRole === 'BAU') && (
        <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {adminStats.map((stat, i) => (
            <Card key={i} className="group relative border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs hover:shadow-xl dark:hover:border-slate-700 transition-all duration-300 overflow-hidden hover:-translate-y-1 flex flex-col justify-between rounded-2xl p-4 sm:p-5">
              <div className={`absolute top-0 right-0 w-28 h-28 bg-gradient-to-br ${stat.glow} rounded-full blur-2xl pointer-events-none opacity-80 group-hover:scale-125 transition-transform duration-500`}></div>
              <div className="flex items-start justify-between gap-2 relative z-10">
                <span className="text-[11px] sm:text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-snug">
                  {stat.title}
                </span>
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl shrink-0 flex items-center justify-center ${stat.bg} border ${stat.border} shadow-2xs group-hover:scale-110 transition-transform duration-300 backdrop-blur-md`}>
                  <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
                </div>
              </div>
              <div className="relative z-10 mt-3 sm:mt-4">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
        {currentLinks.map((link, idx) => {
          const Icon = link.icon
          return (
            <Link key={idx} href={link.href} className="group">
              <Card className="h-full border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs hover:shadow-xl hover:border-blue-500/50 hover:bg-white dark:hover:bg-slate-900 transition-all duration-300 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-7 gap-3 sm:gap-4 hover:-translate-y-1 rounded-2xl">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white group-hover:border-transparent group-hover:shadow-md transition-all duration-300 shadow-2xs">
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7 transition-colors" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-center text-xs sm:text-sm lg:text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {link.name}
                </h3>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="w-full">
        {renderAnnouncements()}
      </div>
    </div>
  )
}

