'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarDays, ClipboardCheck, BookOpen, Receipt, CreditCard,
  GraduationCap, Award, Sparkles, TrendingUp, CheckCircle2,
  Laptop, Clock, Users, QrCode, HeartHandshake, X, Search, User, Info,
  ShieldCheck, AlertTriangle, FileText, ShieldAlert, BookMarked,
  Table as TableIcon, LayoutGrid, Printer, ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import PaymentBillingPopup from '@/components/student/PaymentBillingPopup'
import { ActivityCalendarWidget } from '@/components/dashboard/ActivityCalendarWidget'
import { SystemInfoWidget } from '@/components/dashboard/SystemInfoWidget'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import Swal from 'sweetalert2'

interface StudentDashboardProps {
  session: any
  activeStudent: any
  studentClass: any
  classmates?: any[]
  schedules?: any[]
  dailyAttendanceHistory?: any[]
  studentTagihans?: any
  announcements?: any[]
  systemAnnouncements?: any[]
  clock: {
    greeting: string
    dateString: string
    timeString: string
  }
}

export function StudentDashboard({
  session,
  activeStudent,
  studentClass,
  classmates = [],
  schedules = [],
  dailyAttendanceHistory = [],
  studentTagihans,
  announcements = [],
  systemAnnouncements = [],
  clock
}: StudentDashboardProps) {
  const authenticatedFetch = useAuthenticatedFetch()

  // Modals state
  const [showPaymentPopup, setShowPaymentPopup] = useState(false)
  const [showClassmatesModal, setShowClassmatesModal] = useState(false)
  const [classmateSearch, setClassmateSearch] = useState('')

  // Identifiers
  const effectiveNis = activeStudent?.nis || activeStudent?.nisn || (session?.user as any)?.username || (session?.user as any)?.nis || ''

  // 1. LIVE SIMASMUH SUBJECTS FETCHING
  const { data: subjectsFromDb = [] } = useQuery<any[]>({
    queryKey: ['simasmuh-subjects-list'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/subjects')
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 60000,
  })

  // 3. LIVE TODAY'S ATTENDANCE FETCHING
  const { data: todayAttendanceFromApi } = useQuery<any>({
    queryKey: ['student-today-attendance', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null
      const res = await authenticatedFetch('/api-backend/daily-attendances/today')
      if (!res.ok) return null
      const list = await res.json()
      if (Array.isArray(list)) {
        return list.find((a: any) => a.userId === session?.user?.id) || null
      }
      return null
    },
    enabled: !!session?.user?.id,
    refetchInterval: 15000,
  })

  // 4. LIVE CHARACTER ASSESSMENTS & TATIB FETCHING
  const { data: characterSummary } = useQuery<any>({
    queryKey: ['student-character-summary', activeStudent?.id, effectiveNis],
    queryFn: async () => {
      if (activeStudent?.id) {
        try {
          const res = await authenticatedFetch(`/api-backend/character-assessments/student-summary/${activeStudent.id}`)
          if (res.ok) return res.json()
        } catch {}
      }
      try {
        const resParent = await authenticatedFetch('/api-backend/parents/my-dashboard')
        if (resParent.ok) {
          const pData = await resParent.json()
          const st = (pData?.students || []).find((s: any) => s.id === activeStudent?.id || s.nis === effectiveNis) || pData?.students?.[0]
          return st?.etikaTataTertib || null
        }
      } catch {}
      return null
    },
    enabled: !!(activeStudent?.id || effectiveNis),
    staleTime: 30000,
  })

  const { data: rawAssessments = [] } = useQuery<any[]>({
    queryKey: ['student-character-assessments-list', activeStudent?.id],
    queryFn: async () => {
      if (!activeStudent?.id) return []
      try {
        const res = await authenticatedFetch(`/api-backend/character-assessments?studentId=${activeStudent.id}&limit=10`)
        if (res.ok) {
          const data = await res.json()
          return Array.isArray(data) ? data : data.data || []
        }
      } catch {}
      return []
    },
    enabled: !!activeStudent?.id,
    staleTime: 30000,
  })

  // 5. LIVE STUDENT EXTRACURRICULAR FETCHING
  const { data: ekskulData } = useQuery<any>({
    queryKey: ['student-dashboard-ekskul'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/extracurricular/student/my-activities')
      if (!res.ok) return { myMemberships: [], availableCatalog: [] }
      return res.json()
    },
    staleTime: 30000,
  })

  const studentMemberships = ekskulData?.myMemberships || []

  // Calculations & Formatters
  const todayDayIndex = new Date().getDay()
  const daysMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

  const parseTimeToMinutes = (t: string | undefined | null): number => {
    if (!t) return 0
    const clean = t.replace('.', ':').trim()
    const parts = clean.split(':')
    const hours = parseInt(parts[0] || '0', 10) || 0
    const minutes = parseInt(parts[1] || '0', 10) || 0
    return hours * 60 + minutes
  }

  // Filter today's class schedule
  const todaySchedules = useMemo(() => {
    return (schedules || [])
      .filter((sch: any) => sch.classId === studentClass?.id && sch.dayOfWeek === todayDayIndex)
      .sort((a: any, b: any) => {
        const timeA = parseTimeToMinutes(a.startTime)
        const timeB = parseTimeToMinutes(b.startTime)
        if (timeA !== timeB) return timeA - timeB
        return parseTimeToMinutes(a.endTime) - parseTimeToMinutes(b.endTime)
      })
  }, [schedules, studentClass, todayDayIndex])

  // Homeroom teacher
  const homeroomTeacherName = useMemo(() => {
    if (studentClass?.homeroomTeacher?.user?.name) {
      return studentClass.homeroomTeacher.user.name
    }
    return 'Drs. H. Bambang S., M.Pd.'
  }, [studentClass])

  // Schedule view switcher (table matriks mingguan default vs hari ini)
  const [scheduleViewTab, setScheduleViewTab] = useState<'table' | 'today'>('table')

  // All schedules for student's class
  const studentClassSchedules = useMemo(() => {
    return (schedules || []).filter((sch: any) => sch.classId === studentClass?.id)
  }, [schedules, studentClass])

  // Menghitung Timestamp Pembaruan Terakhir Jadwal Siswa
  const studentScheduleLastUpdated = useMemo(() => {
    if (!studentClassSchedules || studentClassSchedules.length === 0) return null
    const timestamps = studentClassSchedules
      .map((s: any) => {
        const time = new Date(s.updatedAt || s.createdAt || 0).getTime()
        return isNaN(time) ? 0 : time
      })
      .filter((t: number) => t > 0)
    if (timestamps.length === 0) return null
    return new Date(Math.max(...timestamps))
  }, [studentClassSchedules])

  const formatScheduleUpdateTime = (dateInput?: string | Date | null) => {
    if (!dateInput) return 'Belum Diperbarui'
    try {
      const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
      if (isNaN(d.getTime()) || d.getTime() === 0) return 'Belum Diperbarui'
      return (
        new Intl.DateTimeFormat('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(d) + ' WIB'
      )
    } catch {
      return 'Belum Diperbarui'
    }
  }

  // Unique time slots for student's class
  const studentWeeklySlots = useMemo(() => {
    const map = new Map<string, { startTime: string; endTime: string; startMinutes: number; endMinutes: number }>()
    studentClassSchedules.forEach((sch: any) => {
      if (!sch.startTime || !sch.endTime) return
      const s = sch.startTime.trim()
      const e = sch.endTime.trim()
      const key = `${s}-${e}`
      if (!map.has(key)) {
        map.set(key, {
          startTime: s,
          endTime: e,
          startMinutes: parseTimeToMinutes(s),
          endMinutes: parseTimeToMinutes(e)
        })
      }
    })
    return Array.from(map.values()).sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes
      return a.endMinutes - b.endMinutes
    })
  }, [studentClassSchedules])

  // Grouped by day (1..5 - Senin s.d. Jumat)
  const studentGroupedWeekly = useMemo(() => {
    const grouped: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] }
    studentClassSchedules.forEach((sch: any) => {
      const day = sch.dayOfWeek ?? 1
      if (!grouped[day]) grouped[day] = []
      grouped[day].push(sch)
    })
    return grouped
  }, [studentClassSchedules])

  // Financial tagihans
  const allUnpaid = (studentTagihans?.tagihans || []).filter(
    (t: any) => t.status === 'BELUM_LUNAS' || t.status === 'ANGSURAN'
  )
  const totalUnpaidAmount = allUnpaid.reduce(
    (sum: number, tagihan: any) => sum + Math.max(0, tagihan.amount - (tagihan.amountPaid || 0)),
    0
  )

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount)

  // Current semester index & level
  const currentGradeLevel = studentClass?.gradeLevel || 10
  const currentSemester = currentGradeLevel === 10 ? 2 : currentGradeLevel === 11 ? 4 : 6

  // Distinct subjects for student's class
  const classSubjects = useMemo(() => {
    const map = new Map<string, any>()
    const classSchedules = (schedules || []).filter((s: any) => s.classId === studentClass?.id)

    classSchedules.forEach((sch: any) => {
      if (sch.subject && !map.has(sch.subject.id)) {
        map.set(sch.subject.id, {
          id: sch.subject.id,
          name: sch.subject.name,
          code: sch.subject.code,
          teacherName: sch.teacher?.user?.name || homeroomTeacherName,
        })
      }
    })

    if (map.size === 0 && subjectsFromDb.length > 0) {
      subjectsFromDb.forEach((sub: any) => {
        map.set(sub.id, {
          id: sub.id,
          name: sub.name,
          code: sub.code,
          teacherName: homeroomTeacherName,
        })
      })
    }

    return Array.from(map.values()).map((sub) => ({
      ...sub,
      teacher: sub.teacherName,
    }))
  }, [schedules, studentClass, subjectsFromDb, homeroomTeacherName])

  // Attendance Statistics (Live Realtime)
  const attendanceStats = useMemo(() => {
    const list = Array.isArray(dailyAttendanceHistory) ? dailyAttendanceHistory : []
    const totalDays = list.length
    const hadirCount = list.filter((a: any) => a.status === 'HADIR').length
    const izinSakitCount = list.filter((a: any) => ['IZIN', 'SAKIT'].includes(a.status)).length
    const alphaCount = list.filter((a: any) => ['ALPHA', 'ALPA'].includes(a.status)).length

    const rate = totalDays > 0 ? Math.round((hadirCount / totalDays) * 100) : 100
    const izinRate = totalDays > 0 ? Math.round((izinSakitCount / totalDays) * 100) : 0

    return {
      totalDays,
      hadirCount,
      izinSakitCount,
      alphaCount,
      rate,
      izinRate
    }
  }, [dailyAttendanceHistory])

  // Today's attendance record
  const todayAttendance = useMemo(() => {
    if (todayAttendanceFromApi) return todayAttendanceFromApi
    const todayStr = new Date().toISOString().split('T')[0]
    return (dailyAttendanceHistory || []).find((a: any) => {
      const aDate = a.date ? new Date(a.date).toISOString().split('T')[0] : ''
      return aDate === todayStr
    })
  }, [todayAttendanceFromApi, dailyAttendanceHistory])

  // Classmates filtered list
  const filteredClassmates = useMemo(() => {
    if (!classmateSearch.trim()) return classmates
    const q = classmateSearch.toLowerCase()
    return classmates.filter(
      (c: any) =>
        c.name?.toLowerCase().includes(q) ||
        c.nisn?.toLowerCase().includes(q) ||
        c.nis?.toLowerCase().includes(q)
    )
  }, [classmates, classmateSearch])

  // Quick Absensi Action (Terpusat ke Biometrik Face AI / QR Scanner)
  const handleQuickPresensi = () => {
    Swal.fire({
      title: 'Presensi Biometrik AI & QR',
      html: `
        <div class="text-left space-y-3 p-2 text-xs">
          <div class="p-3 bg-blue-50 dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-blue-900/60">
            <p class="font-bold text-blue-900 dark:text-blue-200">Presensi Terpusat SIMASMUH</p>
            <p class="text-slate-600 dark:text-slate-400 mt-0.5">Waktu Server: <b>${clock.timeString} WIB</b></p>
            <p class="text-slate-600 dark:text-slate-400">Lokasi: <b>SMA Muhammadiyah 1 Ponorogo</b></p>
          </div>
          <p class="text-slate-600 dark:text-slate-300">
            Presensi siswa dicatat secara otomatis melalui <b>Gate Biometrik Face AI</b> di pintu masuk sekolah atau pemindaian <b>QR Code Cadangan</b> oleh petugas.
          </p>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Buka Log & Scan QR',
      cancelButtonText: 'Tutup',
      confirmButtonColor: '#2563eb',
    }).then((res) => {
      if (res.isConfirmed) {
        window.location.href = '/presensi/kehadiran-siswa'
      }
    })
  }

  // Cetak Jadwal Pelajaran Siswa (Dokumen Resmi A4 Landscape Terisolasi)
  const handlePrintSchedule = () => {
    const printWindow = window.open('', '_blank', 'width=1100,height=850')
    if (!printWindow) {
      window.print()
      return
    }

    const daysHeader = [1, 2, 3, 4, 5]
      .map((d) => `<th style="border: 1px solid #000; padding: 6px 4px; text-align: center; background: #f3f4f6; font-size: 11px; font-weight: bold; text-transform: uppercase;">${daysMap[d]}</th>`)
      .join('')

    const tableRows = studentWeeklySlots.map((slot, slotIdx) => {
      const dayCells = [1, 2, 3, 4, 5].map((dayNum) => {
        const lessons = (studentGroupedWeekly[dayNum] || []).filter((sch: any) => {
          return (sch.startTime || '').trim() === slot.startTime || 
            (parseTimeToMinutes(sch.startTime) <= slot.startMinutes && parseTimeToMinutes(sch.endTime) > slot.startMinutes)
        })

        if (lessons.length === 0) {
          return `<td style="border: 1px solid #000; padding: 6px; text-align: center; color: #9ca3af; font-size: 11px;">—</td>`
        }

        const lessonContent = lessons.map((sch: any) => `
          <div style="margin-bottom: 4px; padding: 2px;">
            <div style="font-weight: bold; font-size: 11px; color: #000; line-height: 1.2;">${sch.subject?.name || 'Mata Pelajaran'}</div>
            <div style="font-size: 10px; color: #374151; margin-top: 1px;">${sch.teacher?.user?.name || sch.teacher?.nip || 'Guru Pengampu'}</div>
          </div>
        `).join('')

        return `<td style="border: 1px solid #000; padding: 6px 4px; vertical-align: top; background: #fff;">${lessonContent}</td>`
      }).join('')

      return `
        <tr>
          <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-family: monospace; font-weight: bold; font-size: 10.5px; background: #fafafa; white-space: nowrap;">
            <div style="font-size: 9.5px; color: #4b5563; text-transform: uppercase;">Jam ${slotIdx + 1}</div>
            <div style="color: #000; margin-top: 2px; font-weight: 800;">${slot.startTime} - ${slot.endTime}</div>
          </td>
          ${dayCells}
        </tr>
      `
    }).join('')

    const todayFormatted = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date())

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8">
          <title>Jadwal Pelajaran Kelas ${studentClass?.name || ''}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm 12mm 10mm 12mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background: #fff;
              color: #000;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .kop {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              border-bottom: 2.5px solid #000;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .kop-logo {
              width: 64px;
              height: 64px;
              object-fit: contain;
            }
            .kop-text {
              text-align: center;
              flex: 1;
            }
            .kop-text h4 {
              margin: 0;
              font-size: 10.5px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .kop-text h3 {
              margin: 2px 0 0 0;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .kop-text h2 {
              margin: 2px 0 0 0;
              font-size: 15px;
              font-weight: 900;
              text-transform: uppercase;
            }
            .kop-text p {
              margin: 3px 0 0 0;
              font-size: 9.5px;
              color: #1f2937;
            }
            .doc-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-top: 1px solid #000;
              padding-top: 6px;
              margin-top: 6px;
              font-size: 12px;
            }
            .doc-title {
              font-size: 13px;
              font-weight: 900;
              text-transform: uppercase;
              text-decoration: underline;
              letter-spacing: 0.5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            .signature-section {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              text-align: center;
              gap: 16px;
              margin-top: 24px;
              font-size: 11px;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .sig-title {
              font-weight: bold;
            }
            .sig-space {
              height: 55px;
            }
            .sig-name {
              font-weight: 800;
              text-decoration: underline;
            }
            .sig-nip {
              font-size: 10px;
              color: #374151;
              margin-top: 2px;
            }
          </style>
        </head>
        <body>
          <div class="kop">
            <img src="/images/logo-muhammadiyah.png" alt="Logo" class="kop-logo" onerror="this.style.display='none'" />
            <div class="kop-text">
              <h4>MAJELIS PENDIDIKAN DASAR MENENGAH DAN PENDIDIKAN NONFORMAL</h4>
              <h3>PIMPINAN DAERAH MUHAMMADIYAH PONOROGO</h3>
              <h2>SMA MUHAMMADIYAH 1 PONOROGO</h2>
              <p>Alamat: Jl. Batoro Katong No. 130 Ponorogo, Jawa Timur 63411 • Telp. (0352) 481521 • Website: smamuhipo.sch.id</p>
            </div>
            <div style="width: 64px;"></div>
          </div>

          <div class="doc-header">
            <span class="doc-title">JADWAL PELAJARAN KELAS ${studentClass?.name || ''}</span>
            <span style="font-weight: bold; font-size: 11px;">Tahun Ajaran: ${studentClass?.academicYear || '2026/2027'} • Terakhir Diperbarui: ${studentScheduleLastUpdated ? formatScheduleUpdateTime(studentScheduleLastUpdated) : '-'}</span>
          </div>

          <table>
            <thead>
              <tr>
                <th style="border: 1px solid #000; padding: 6px 4px; text-align: center; background: #f3f4f6; width: 110px; font-size: 11px; font-weight: bold; text-transform: uppercase;">Waktu / Jam</th>
                ${daysHeader}
              </tr>
            </thead>
            <tbody>
              ${studentWeeklySlots.length === 0 ? `<tr><td colspan="6" style="border: 1px solid #000; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">Belum ada jadwal pelajaran untuk kelas ini.</td></tr>` : tableRows}
            </tbody>
          </table>

          <div class="signature-section">
            <div>
              <p style="margin: 0;">Mengetahui,</p>
              <p class="sig-title" style="margin: 2px 0 0 0;">Kepala Sekolah</p>
              <div class="sig-space"></div>
              <p class="sig-name" style="margin: 0;">Drs. M. Dahron, M.Pd.</p>
              <p class="sig-nip">NBM. 19680512 199403 1 002</p>
            </div>
            <div>
              <p style="margin: 0;">Menyetujui,</p>
              <p class="sig-title" style="margin: 2px 0 0 0;">Waka Kurikulum</p>
              <div class="sig-space"></div>
              <p class="sig-name" style="margin: 0;">Anik Yulaika, M.Pd.</p>
              <p class="sig-nip">NBM. 19750820 200212 2 001</p>
            </div>
            <div>
              <p style="margin: 0;">Ponorogo, ${todayFormatted}</p>
              <p class="sig-title" style="margin: 2px 0 0 0;">Wali Kelas ${studentClass?.name || ''}</p>
              <div class="sig-space"></div>
              <p class="sig-name" style="margin: 0;">${studentClass?.homeroomTeacher?.user?.name || homeroomTeacherName || '( .............................................. )'}</p>
              <p class="sig-nip">NIP/NBM. ${studentClass?.homeroomTeacher?.nipNbm || '-'}</p>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="space-y-3.5 sm:space-y-4 w-full font-sans text-slate-800 dark:text-slate-100">
      {/* 1. TOP BREADCRUMB & TITLE BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Dashboard Siswa
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Portal Akademik & Layanan Informasi Terpadu SIMASMUH
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <Link href="/dashboard" className="hover:text-blue-600 transition-colors">
            Home
          </Link>
          <span>&rsaquo;</span>
          <span className="text-blue-600 dark:text-blue-400 font-bold">Dashboard Siswa</span>
        </div>
      </div>

      {/* 2. MAIN HERO PROFILE BANNER (SIMASMUH INSTITUTIONAL STYLE) */}
      <div className="simas-dash-header p-3.5 sm:p-4 md:p-5 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          {/* Left: Avatar & Identity Details */}
          <div className="flex flex-row items-center gap-3 sm:gap-4">
              <div className="relative shrink-0">
                <div className="w-13 h-13 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-full bg-slate-100 dark:bg-slate-800 border-2 sm:border-3 border-white/20 shadow-inner flex items-center justify-center overflow-hidden">
                  {(session?.user as any)?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={(session?.user as any)?.avatarUrl}
                      alt={session?.user?.name || 'Siswa'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-xl sm:text-2xl font-black">
                      {(session?.user?.name || 'S').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div 
                  className={`absolute bottom-0 right-0 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-slate-900 flex items-center justify-center ${
                    activeStudent?.isActive !== false && (session?.user as any)?.isActive !== false
                      ? 'bg-emerald-500'
                      : 'bg-rose-500'
                  }`} 
                  title={activeStudent?.isActive !== false && (session?.user as any)?.isActive !== false ? 'Akun Siswa Aktif' : 'Akun Siswa Nonaktif'} 
                />
              </div>

              {/* Student Info */}
              <div className="space-y-0.5 sm:space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h2 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-white uppercase truncate max-w-[200px] sm:max-w-none">
                    {clock.greeting}, <span className="text-blue-300">{session?.user?.name || 'MUH NAILAR RAZA'}</span>
                  </h2>
                  {activeStudent?.isActive !== false && (session?.user as any)?.isActive !== false ? (
                    <Badge className="bg-emerald-500/90 text-white font-bold text-[9px] sm:text-[9.5px] px-1.5 sm:px-2 py-0.2 rounded-full border-none shadow-xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      Aktif
                    </Badge>
                  ) : (
                    <Badge className="bg-rose-500/90 text-white font-bold text-[9px] sm:text-[9.5px] px-1.5 sm:px-2 py-0.2 rounded-full border-none shadow-xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      Nonaktif
                    </Badge>
                  )}
                </div>

              {/* Subtitle Details: NISN, Class, Program, Homeroom Teacher */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] sm:text-[11px] md:text-xs text-blue-100/90 font-medium">
                <span>NISN/NIS: <b className="text-white font-mono">{activeStudent?.nisn || activeStudent?.nis || (session?.user as any)?.username || '-'}</b></span>
                <span>•</span>
                <span>Kelas: <b className="text-white">{studentClass?.name || activeStudent?.class?.name || '-'}</b> ({activeStudent?.program || 'Reguler'})</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-blue-300" />
                  Wali Kelas: <b className="text-white">{homeroomTeacherName}</b>
                </span>
              </div>

              {/* 3 Bottom Badged Pills */}
              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 pt-0.5 sm:pt-1">
                <div className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/15 backdrop-blur-md text-[9.5px] sm:text-[10.5px] font-semibold text-blue-100 flex items-center gap-1 border border-white/10 transition-colors">
                  <CalendarDays className="w-3 h-3 text-blue-300" />
                  <span>{clock.dateString || 'Jumat, 11 September 2026'}</span>
                </div>
                <div className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/15 backdrop-blur-md text-[9.5px] sm:text-[10.5px] font-semibold text-blue-100 flex items-center gap-1 border border-white/10 transition-colors">
                  <BookOpen className="w-3 h-3 text-indigo-300" />
                  <span>Semester {currentSemester} ({currentSemester % 2 === 0 ? 'Genap' : 'Ganjil'})</span>
                </div>
                <div className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/15 backdrop-blur-md text-[9.5px] sm:text-[10.5px] font-semibold text-blue-100 flex items-center gap-1 border border-white/10 transition-colors">
                  <GraduationCap className="w-3 h-3 text-emerald-300" />
                  <span>Kelas {studentClass?.name || activeStudent?.class?.name || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Prominent Actions (BUKU INDUK, KARTU PELAJAR & Secondary Buttons) */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-1.5 sm:gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
              <Link
                href="/siswa/buku-induk"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 h-8 sm:h-9 md:h-10 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20 border border-teal-400/40 transition-all transform hover:-translate-y-0.5"
              >
                <BookMarked className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Buku Induk</span>
              </Link>

              <Link
                href="/pengaturan/profil#kartu-pelajar"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 h-8 sm:h-9 md:h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 border border-blue-400/40 transition-all transform hover:-translate-y-0.5"
              >
                <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Kartu Pelajar</span>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 w-full sm:w-auto justify-start sm:justify-end">
              <Link
                href="/agenda"
                className="inline-flex items-center bg-white/10 hover:bg-white/20 text-white border border-white/20 text-[10px] sm:text-[11px] h-7 px-2 sm:px-2.5 rounded-lg font-semibold backdrop-blur-sm transition-colors"
                title="Buka Halaman Khusus Kalender Akademik"
              >
                <CalendarDays className="w-3 h-3 mr-1 text-blue-300" />
                Kalender Akademik
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClassmatesModal(true)}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-[10px] sm:text-[11px] h-7 px-2 sm:px-2.5 rounded-lg font-semibold backdrop-blur-sm"
              >
                <Users className="w-3 h-3 mr-1 text-emerald-300" />
                Teman Sekelas ({classmates.length || 32})
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* NOTIFIKASI & AREA TAGIHAN KEUANGAN SISWA (STANDAR SINKRONISASI KEUANGAN) */}
      {allUnpaid.length > 0 ? (
        <div className="relative overflow-hidden p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-rose-950/90 via-amber-950/80 to-slate-900 border-2 border-rose-500/50 shadow-md text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in-50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white font-black flex items-center justify-center shrink-0 shadow-md shadow-rose-600/30">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-black uppercase tracking-wide text-rose-300">
                  Pemberitahuan Tagihan Siswa
                </span>
                <Badge className="bg-rose-500 text-white font-extrabold text-[9.5px] px-2 py-0 border-none shadow-2xs">
                  {allUnpaid.length} Tagihan Aktif
                </Badge>
              </div>
              <p className="text-xs text-slate-200 truncate">
                Total kewajiban: <strong className="text-rose-400 font-mono font-black text-sm">{formatCurrency(totalUnpaidAmount)}</strong>
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowPaymentPopup(true)}
            className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-slate-950 font-black text-xs h-9 sm:h-10 px-4 rounded-xl shadow-md shadow-rose-950/40 shrink-0 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <CreditCard className="w-4 h-4 text-slate-950" />
            <span>Bayar / Rincian Tagihan</span>
          </Button>
        </div>
      ) : (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">Alhamdulillah, seluruh administrasi keuangan &amp; SPP siswa telah lunas tercatat.</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPaymentPopup(true)}
            className="h-7 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/60 shrink-0"
          >
            Riwayat &rarr;
          </Button>
        </div>
      )}

      {/* 3. TOP 4 METRIC SUMMARY CARDS (COMPACT RESPONSIVE) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Card 1: Mapel & Jam Hari Ini */}
        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-tight block">
                Mapel Hari Ini
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                {todaySchedules.length} <span className="text-[10px] font-bold text-slate-500">Mapel</span>
              </h3>
            </div>
            <div className="w-7.5 h-7.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              {todaySchedules.length > 0 ? `${todaySchedules.length * 2} Jam KBM Aktif` : 'Tidak Ada Jam'}
            </span>
          </div>
        </Card>

        {/* Card 2: Kehadiran Siswa */}
        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-tight block">
                Kehadiran
              </span>
              <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {attendanceStats.rate}%
              </h3>
            </div>
            <div className="w-7.5 h-7.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              {attendanceStats.hadirCount} Hadir ({attendanceStats.totalDays} Hari)
            </span>
          </div>
        </Card>

        {/* Card 3: Status Presensi Hari Ini */}
        <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-tight block">
                Presensi Hari Ini
              </span>
              <h3 className={`text-xl font-black mt-0.5 ${todayAttendance?.status === 'HADIR' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {todayAttendance?.status === 'HADIR' ? 'Hadir' : (todayAttendance?.status || 'Belum')}
              </h3>
            </div>
            <div className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 ${todayAttendance?.status === 'HADIR' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600' : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600'}`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate block">
              {todayAttendance?.checkInTime || todayAttendance?.time ? `Masuk: ${todayAttendance.checkInTime || todayAttendance.time} WIB` : 'Biometrik Face AI / QR'}
            </span>
          </div>
        </Card>

        {/* Card 4: Status Tagihan & SPP (DITONJOLKAN DENGAN BORDER & ACCENT) */}
        <Card
          onClick={() => setShowPaymentPopup(true)}
          className={`border-2 transition-all rounded-xl p-3 flex flex-col justify-between cursor-pointer group hover:shadow-md ${
            allUnpaid.length > 0
              ? 'border-rose-400/80 dark:border-rose-500/60 bg-gradient-to-br from-rose-50/60 via-white to-amber-50/40 dark:from-slate-900 dark:to-rose-950/30'
              : 'border-emerald-300/80 dark:border-emerald-700/60 bg-white dark:bg-slate-900 shadow-2xs'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-tight block">
                Tagihan SPP &amp; Keuangan
              </span>
              <h3 className={`text-xl font-black mt-0.5 ${allUnpaid.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                {allUnpaid.length > 0 ? `${allUnpaid.length} Tagihan` : 'Lunas'}
              </h3>
            </div>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
              allUnpaid.length > 0
                ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300'
                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600'
            }`}>
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <span className={`text-[10px] font-black truncate ${allUnpaid.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
              {allUnpaid.length > 0 ? formatCurrency(totalUnpaidAmount) : 'Bebas Tunggakan'}
            </span>
            <span className="text-[9.5px] text-blue-600 dark:text-blue-400 font-bold group-hover:underline">
              Detail &rarr;
            </span>
          </div>
        </Card>
      </div>

      {/* 4. PINTASAN LAYANAN AKADEMIK SISWA (7 SERVICE SHORTCUT CARDS) */}
      <Card className="border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-2xs rounded-xl p-3 sm:p-3.5">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Pintasan Layanan Siswa
            </h3>
          </div>
          <span className="text-[10px] sm:text-[10.5px] font-semibold text-slate-400 hidden sm:inline">
            Akses Layanan Akademik Mandiri
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-2.5">
          {/* Shortcut 1: Buku Induk Siswa */}
          <Link
            href="/siswa/buku-induk"
            className="group p-2 sm:p-2.5 rounded-xl border border-teal-200/80 dark:border-teal-900/60 bg-teal-50/50 dark:bg-teal-950/30 hover:bg-white dark:hover:bg-slate-800 hover:border-teal-400 dark:hover:border-teal-600 hover:shadow-xs transition-all text-center flex flex-col items-center justify-center min-h-[72px]"
          >
            <div className="w-7.5 h-7.5 rounded-lg bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
              <BookMarked className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-[11px] font-black text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors leading-tight">
              Buku Induk
            </h4>
            <span className="text-[9px] text-teal-600 dark:text-teal-400 font-medium mt-0.5 truncate max-w-full">
              Biodata & F4
            </span>
          </Link>

          {/* Shortcut 2: Kartu Pelajar */}
          <Link
            href="/pengaturan/profil#kartu-pelajar"
            className="group p-2 sm:p-2.5 rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-xs transition-all text-center flex flex-col items-center justify-center min-h-[72px]"
          >
            <div className="w-7.5 h-7.5 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-[11px] font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors leading-tight">
              Kartu Pelajar
            </h4>
            <span className="text-[9px] text-blue-600 dark:text-blue-400 font-medium mt-0.5 truncate max-w-full">
              ID Card Digital
            </span>
          </Link>

          {/* Shortcut 3: Presensi Siswa */}
          <Link
            href="/presensi/kehadiran-siswa"
            className="group p-2 sm:p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-xs transition-all text-center flex flex-col items-center justify-center min-h-[72px]"
          >
            <div className="w-7.5 h-7.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
              <ClipboardCheck className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-[11px] font-black text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors leading-tight">
              Log Absensi
            </h4>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5 truncate max-w-full">
              Riwayat & QR
            </span>
          </Link>

          {/* Shortcut 4: Jadwal Pelajaran */}
          <Link
            href="/akademik/jadwal-pelajaran"
            className="group p-2 sm:p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-xs transition-all text-center flex flex-col items-center justify-center min-h-[72px]"
          >
            <div className="w-7.5 h-7.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-[11px] font-black text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors leading-tight">
              Jadwal KBM
            </h4>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5 truncate max-w-full">
              Jadwal Mingguan
            </span>
          </Link>

          {/* Shortcut 5: Konseling & Izin */}
          <Link
            href="/presensi/izin-siswa"
            className="group p-2 sm:p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-xs transition-all text-center flex flex-col items-center justify-center min-h-[72px]"
          >
            <div className="w-7.5 h-7.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
              <HeartHandshake className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-[11px] font-black text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors leading-tight">
              Izin & BK
            </h4>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5 truncate max-w-full">
              Konseling & Izin
            </span>
          </Link>

          {/* Shortcut 6: Ujian CBT Online */}
          <Link
            href="/demo-waiting-room"
            className="group p-2 sm:p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-xs transition-all text-center flex flex-col items-center justify-center min-h-[72px]"
          >
            <div className="w-7.5 h-7.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
              <Laptop className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-[11px] font-black text-slate-900 dark:text-white group-hover:text-rose-600 transition-colors leading-tight">
              Ujian CBT
            </h4>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5 truncate max-w-full">
              Asesmen Online
            </span>
          </Link>

          {/* Shortcut 7: Tagihan & Keuangan */}
          <button
            onClick={() => setShowPaymentPopup(true)}
            className="group p-2 sm:p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xs transition-all text-center flex flex-col items-center justify-center w-full min-h-[72px]"
          >
            <div className="w-7.5 h-7.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
              <Receipt className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-[11px] font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors leading-tight">
              Tagihan SPP
            </h4>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5 truncate max-w-full">
              Rincian Biaya
            </span>
          </button>
        </div>
      </Card>

      {/* 5. MAIN BOTTOM SPLIT LAYOUT (8 COLS LEFT + 4 COLS RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
        {/* LEFT COLUMN (8 COLS): JADWAL PELAJARAN (ATAS) & POIN KETERTIBAN SISWA (BAWAH) */}
        <div className="lg:col-span-8 flex flex-col gap-3.5 sm:gap-4">
          {/* Card 1: Jadwal Pelajaran (Tabel Matriks Mingguan Default & Hari Ini) */}
          <Card className="border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-2xs rounded-xl overflow-hidden">
            <CardHeader className="p-3 sm:p-4 pb-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-purple-600" />
                  Jadwal Pelajaran Kelas {studentClass?.name || activeStudent?.class?.name || '-'}
                </CardTitle>
                <CardDescription className="text-[11px] mt-0.5 text-slate-500 flex flex-wrap items-center gap-1.5">
                  <span>{scheduleViewTab === 'table' ? 'Tabel Jadwal Mingguan' : `Jadwal Hari Ini (${daysMap[todayDayIndex]})`} • Semester {currentSemester}</span>
                  {studentScheduleLastUpdated && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                        <Clock className="w-3 h-3 text-purple-500" />
                        Update: <strong className="font-bold">{formatScheduleUpdateTime(studentScheduleLastUpdated)}</strong>
                      </span>
                    </>
                  )}
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700">
                  <button
                    onClick={() => setScheduleViewTab('table')}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                      scheduleViewTab === 'table'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <TableIcon className="w-3 h-3" />
                    <span>Tabel Mingguan</span>
                  </button>
                  <button
                    onClick={() => setScheduleViewTab('today')}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                      scheduleViewTab === 'today'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-3 h-3" />
                    <span>Hari Ini</span>
                  </button>
                </div>

                <Button
                  onClick={handlePrintSchedule}
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs font-bold text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100"
                  title="Cetak Jadwal Pelajaran (A4)"
                >
                  <Printer className="w-3.5 h-3.5 mr-1 text-blue-600" />
                  <span>Cetak</span>
                </Button>

                <Link href="/akademik/jadwal-pelajaran">
                  <Button variant="ghost" size="sm" className="text-xs font-bold text-purple-600 h-7 px-2">
                    Lengkap &rarr;
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-3.5">
              {scheduleViewTab === 'table' ? (
                studentWeeklySlots.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs border border-dashed rounded-xl space-y-1">
                    <BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold">Belum ada jadwal mingguan untuk kelas {studentClass?.name || 'Anda'}.</p>
                    <p className="text-[11px]">Jadwal pelajaran akan muncul setelah dikonfigurasi oleh tim Kurikulum.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60">
                    <table className="w-full text-left border-collapse min-w-[650px] text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                          <th className="py-2.5 px-2.5 w-24 text-center border-r border-slate-200/80 dark:border-slate-800">
                            <div className="flex items-center justify-center gap-1">
                              <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              <span>Waktu</span>
                            </div>
                          </th>
                          {[1, 2, 3, 4, 5].map((dayNum) => {
                            const isToday = todayDayIndex === dayNum
                            return (
                              <th
                                key={dayNum}
                                className={`py-2.5 px-2 text-center border-r last:border-r-0 border-slate-200/80 dark:border-slate-800 ${
                                  isToday ? 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : ''
                                }`}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <span>{daysMap[dayNum]}</span>
                                  {isToday && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />}
                                </div>
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                        {studentWeeklySlots.map((slot, slotIdx) => (
                          <tr key={slotIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-2 px-1.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-50/40 dark:bg-slate-800/20 border-r border-slate-200/80 dark:border-slate-800 whitespace-nowrap">
                              <div className="text-[9px] text-slate-400 uppercase">Jam {slotIdx + 1}</div>
                              <div className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400">
                                {slot.startTime} - {slot.endTime}
                              </div>
                            </td>
                            {[1, 2, 3, 4, 5].map((dayNum) => {
                              const dayLessons = (studentGroupedWeekly[dayNum] || []).filter((sch: any) => {
                                return (sch.startTime || '').trim() === slot.startTime || 
                                  (parseTimeToMinutes(sch.startTime) <= slot.startMinutes && parseTimeToMinutes(sch.endTime) > slot.startMinutes)
                              })
                              const isToday = todayDayIndex === dayNum

                              return (
                                <td
                                  key={dayNum}
                                  className={`p-1.5 border-r last:border-r-0 border-slate-200/80 dark:border-slate-800 align-top ${
                                    isToday ? 'bg-blue-50/20 dark:bg-blue-950/10' : ''
                                  }`}
                                >
                                  {dayLessons.length === 0 ? (
                                    <div className="h-full min-h-[38px] flex items-center justify-center text-slate-300 dark:text-slate-700 text-xs">
                                      —
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      {dayLessons.map((sch: any) => (
                                        <div
                                          key={sch.id}
                                          className="p-1.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/40"
                                        >
                                          <div className="font-extrabold text-[10.5px] text-slate-900 dark:text-white leading-tight line-clamp-1">
                                            {sch.subject?.name || 'Mapel'}
                                          </div>
                                          <div className="text-[9.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                            {sch.teacher?.user?.name || 'Guru'}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : todaySchedules.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs border border-dashed rounded-xl space-y-1">
                  <BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold">Tidak ada jadwal mata pelajaran hari ini ({daysMap[todayDayIndex]}).</p>
                  <p className="text-[11px]">Silakan klik tab "Tabel Mingguan" untuk melihat seluruh jadwal kelas.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {todaySchedules.map((sch: any, idx: number) => (
                    <div
                      key={sch.id || idx}
                      className="p-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 flex items-center justify-between gap-2.5 hover:shadow-xs transition-shadow"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-indigo-100">
                          {sch.startTime} - {sch.endTime} WIB
                        </span>
                        <h4 className="font-black text-slate-900 dark:text-white text-xs truncate">
                          {sch.subject?.name || 'Mata Pelajaran'}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">
                          {sch.teacher?.user?.name || 'Guru Pengampu'}
                        </p>
                      </div>
                      <Badge className="bg-blue-600 text-white font-bold text-[10px] shrink-0">
                        Aktif
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Log Presensi & Riwayat Kehadiran Siswa (Menggantikan Poin Ketertiban yang duplikat) */}
          <Card className="border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-2xs rounded-xl overflow-hidden">
            <CardHeader className="p-3.5 sm:p-4 pb-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                  Log Presensi &amp; Riwayat Kehadiran Siswa
                </CardTitle>
                <CardDescription className="text-[11px] mt-0.5 text-slate-500">
                  Rekam jejak presensi harian biometrik Face AI, QR code, dan perizinan resmi
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleQuickPresensi}
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-[11px] font-bold text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/40 rounded-lg flex items-center gap-1"
                >
                  <QrCode className="w-3.5 h-3.5 text-blue-600" />
                  <span>Scan QR / Info</span>
                </Button>
                <Link href="/presensi/kehadiran-siswa">
                  <Button variant="ghost" size="sm" className="text-xs font-bold text-emerald-600 h-7 px-2">
                    Lengkap &rarr;
                  </Button>
                </Link>
              </div>
            </CardHeader>

            <CardContent className="p-3.5 sm:p-4 space-y-3">
              {/* Summary Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 sm:p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-950/60 bg-emerald-50/40 dark:bg-emerald-950/20">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                    Hadir
                  </span>
                  <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    {attendanceStats.hadirCount} <span className="text-[10px] font-normal text-slate-500">Hari</span>
                  </h4>
                  <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400">
                    {attendanceStats.rate}% Rasio
                  </span>
                </div>

                <div className="p-2 sm:p-2.5 rounded-xl border border-amber-100 dark:border-amber-950/60 bg-amber-50/40 dark:bg-amber-950/20">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                    Izin / Sakit
                  </span>
                  <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    {attendanceStats.izinSakitCount} <span className="text-[10px] font-normal text-slate-500">Hari</span>
                  </h4>
                  <span className="text-[9.5px] font-semibold text-amber-600 dark:text-amber-400">
                    {attendanceStats.izinRate}% Izin
                  </span>
                </div>

                <div className="p-2 sm:p-2.5 rounded-xl border border-rose-100 dark:border-rose-950/60 bg-rose-50/40 dark:bg-rose-950/20">
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
                    Alpha / Alpa
                  </span>
                  <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    {attendanceStats.alphaCount} <span className="text-[10px] font-normal text-slate-500">Hari</span>
                  </h4>
                  <span className="text-[9.5px] font-semibold text-rose-600 dark:text-rose-400">
                    {attendanceStats.alphaCount === 0 ? 'Nihil (Bagus)' : 'Perlu Diperbaiki'}
                  </span>
                </div>

                <div className="p-2 sm:p-2.5 rounded-xl border border-blue-100 dark:border-blue-950/60 bg-blue-50/40 dark:bg-blue-950/20">
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">
                    Hari Ini
                  </span>
                  <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    {todayAttendance?.status === 'HADIR' ? 'Hadir' : (todayAttendance?.status || 'Belum')}
                  </h4>
                  <span className="text-[9.5px] font-semibold text-blue-600 dark:text-blue-400 truncate block">
                    {todayAttendance?.checkInTime || todayAttendance?.time ? `${todayAttendance.checkInTime || todayAttendance.time} WIB` : 'Gate Biometrik'}
                  </span>
                </div>
              </div>

              {/* Attendance Table */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-500" />
                    Riwayat Presensi Terbaru
                  </span>
                  <span className="text-[9.5px] text-slate-400">Sinkronisasi Real-Time</span>
                </div>

                {(!dailyAttendanceHistory || dailyAttendanceHistory.length === 0) ? (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-0.5">
                    <ClipboardCheck className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Belum ada riwayat presensi harian tercatat
                    </p>
                    <p className="text-[10.5px] text-slate-400">
                      Presensi akan otomatis tercatat saat siswa melewati gate sekolah atau dipindai petugas.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2 px-2.5">Tanggal</th>
                          <th className="py-2 px-2.5">Hari</th>
                          <th className="py-2 px-2.5">Jam Masuk</th>
                          <th className="py-2 px-2.5">Metode / Keterangan</th>
                          <th className="py-2 px-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {dailyAttendanceHistory.slice(0, 6).map((item: any, idx: number) => {
                          const attDate = new Date(item.date || item.createdAt)
                          const dayName = daysMap[attDate.getDay()] || 'Hari'
                          const isHadir = item.status === 'HADIR'
                          const isIzin = ['IZIN', 'SAKIT'].includes(item.status)

                          return (
                            <tr key={item.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                              <td className="py-1.5 px-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap font-mono font-medium">
                                {attDate.toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </td>
                              <td className="py-1.5 px-2.5 font-semibold text-slate-700 dark:text-slate-200">
                                {dayName}
                              </td>
                              <td className="py-1.5 px-2.5 font-mono text-slate-700 dark:text-slate-300">
                                {item.checkInTime || item.time || (isHadir ? '06:45 WIB' : '-')}
                              </td>
                              <td className="py-1.5 px-2.5 text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                                {item.notes || item.method || (isHadir ? 'Biometrik Face AI' : isIzin ? 'Surat Dispensasi/Izin' : 'Tanpa Keterangan')}
                              </td>
                              <td className="py-1.5 px-2.5 text-center">
                                <Badge
                                  className={`text-[9px] font-bold px-2 py-0 border-none ${
                                    isHadir
                                      ? 'bg-emerald-500 text-white'
                                      : isIzin
                                      ? 'bg-amber-500 text-white'
                                      : 'bg-rose-500 text-white'
                                  }`}
                                >
                                  {item.status || 'HADIR'}
                                </Badge>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN (4 COLS): DONUT CHART, CLASSMATES & ACADEMIC INFO */}
        <div className="lg:col-span-4 flex flex-col gap-3.5 sm:gap-4">
          {/* Card: Poin Ketertiban & Evaluasi Karakter Siswa */}
          <Card className="border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-2xs rounded-xl p-3.5 sm:p-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Poin Ketertiban &amp; Adab
                </h3>
              </div>
              <Link href="/akademik/etika-tatib">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-0.5">
                  Buku Saku <ChevronRight className="w-3 h-3" />
                </span>
              </Link>
            </div>

            <div className="py-2.5 space-y-2.5">
              {/* Main Score Box */}
              <div className="p-3 rounded-xl bg-gradient-to-tr from-emerald-50 via-teal-50/50 to-white dark:from-slate-800 dark:to-slate-850 border border-emerald-200/70 dark:border-emerald-900/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                    Skor Kedisiplinan
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {characterSummary?.kedisiplinanScore ?? 100}
                    </span>
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-[10px] font-bold px-1.5 py-0">
                      Grade {characterSummary?.kedisiplinanGrade || ((characterSummary?.kedisiplinanScore ?? 100) >= 90 ? 'A' : (characterSummary?.kedisiplinanScore ?? 100) >= 70 ? 'B' : 'C')}
                    </Badge>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-black text-sm shrink-0">
                  <Award className="w-5 h-5" />
                </div>
              </div>

              {/* Mini Indicators */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1 text-teal-700 dark:text-teal-300 font-bold">
                    <HeartHandshake className="w-3 h-3" />
                    <span>Ibadah: {characterSummary?.ibadahGrade || 'A'}</span>
                  </div>
                  <span className="text-[9.5px] text-slate-400 block mt-0.5 truncate">
                    {characterSummary?.ibadahStatus || 'Tertib Sholat'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1 text-cyan-700 dark:text-cyan-300 font-bold">
                    <Users className="w-3 h-3" />
                    <span>Adab: {characterSummary?.perilakuGrade || 'A'}</span>
                  </div>
                  <span className="text-[9.5px] text-slate-400 block mt-0.5 truncate">
                    {characterSummary?.perilakuStatus || 'Santun & Tertib'}
                  </span>
                </div>
              </div>

              <div className="pt-1 text-[10.5px] text-slate-500 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  {rawAssessments.length === 0 ? 'Bebas Pelanggaran' : `${rawAssessments.length} Catatan Pembinaan`}
                </span>
                <span className="font-semibold text-slate-400">Tim Tatib &amp; BK</span>
              </div>
            </div>
          </Card>

          {/* Card: Ekstrakurikuler Siswa Widget */}
          <Card className="border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-2xs rounded-xl p-3.5 sm:p-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Ekstrakurikuler Saya
                </h3>
              </div>
              <Link href="/siswa/ekstrakurikuler">
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-0.5">
                  Detail <ChevronRight className="w-3 h-3" />
                </span>
              </Link>
            </div>

            <div className="py-2.5 space-y-2">
              {studentMemberships.length > 0 ? (
                studentMemberships.map((m: any) => {
                  const latestGrade = m.grades?.[0]
                  return (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                          {m.extracurricular?.name}
                        </span>
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[9px] font-bold">
                          {m.role}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[10.5px] text-slate-500 pt-0.5">
                        <span className="truncate">
                          {m.extracurricular?.scheduleDay || '-'} ({m.extracurricular?.scheduleTime || '-'})
                        </span>
                        {latestGrade && (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            Predikat {latestGrade.predicate}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="py-4 text-center text-xs text-slate-400 space-y-1.5">
                  <p>Belum terdaftar di ekstrakurikuler.</p>
                  <Link href="/siswa/ekstrakurikuler">
                    <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold text-amber-600 border-amber-300">
                      Jelajahi Ekstrakurikuler
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </Card>

          {/* 1. Kalender Akademik & Hari Libur Nasional */}
          <ActivityCalendarWidget
            announcements={announcements}
            title="Kalender Akademik & Libur"
          />

          {/* 2. Informasi & Pengumuman Sistem */}
          <SystemInfoWidget
            announcements={systemAnnouncements}
            title="Informasi & Pengumuman Sistem"
            limit={3}
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL 2: TEMAN SEKELAS LIST DIALOG                          */}
      {/* ============================================================ */}
      {showClassmatesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    Daftar Teman Sekelas ({studentClass?.name || 'Kelas X 1'})
                  </h3>
                  <p className="text-[11px] text-slate-500">Total {classmates.length || 32} Siswa Terdaftar</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowClassmatesModal(false)}
                className="h-8 w-8 p-0 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Search input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={classmateSearch}
                onChange={(e) => setClassmateSearch(e.target.value)}
                placeholder="Cari nama atau NISN teman sekelas..."
                className="w-full h-9 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Classmates Table */}
            <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Nama Lengkap</th>
                    <th className="py-2.5 px-3">NISN / NIS</th>
                    <th className="py-2.5 px-3">Program</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredClassmates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        Tidak ada teman sekelas yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredClassmates.map((st: any, i: number) => (
                      <tr key={st.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-slate-400 font-mono">{i + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            {st.name?.charAt(0) || 'S'}
                          </div>
                          <span>{st.name}</span>
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-mono">{st.nisn || st.nis || '-'}</td>
                        <td className="py-2 px-3">
                          <Badge variant="outline" className="text-[10px]">
                            {st.program || 'Reguler'}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                            Aktif
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-2 text-right">
              <Button
                onClick={() => setShowClassmatesModal(false)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: PAYMENT BILLING POPUP (INTEGRATED)                  */}
      {/* ============================================================ */}
      <PaymentBillingPopup
        open={showPaymentPopup}
        onClose={() => setShowPaymentPopup(false)}
      />
    </div>
  )
}
