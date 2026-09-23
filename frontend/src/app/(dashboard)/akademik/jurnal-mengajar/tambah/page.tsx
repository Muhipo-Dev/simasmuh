'use client'

import React, { useRef, useState, useCallback, useEffect, Suspense } from 'react'
import Swal from 'sweetalert2'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Webcam from 'react-webcam'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Camera, RefreshCcw, Save, Loader2, Calendar, Clock, BookOpen } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

const DAYS_NAME = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

function TambahJurnalContent() {
  const authenticatedFetch = useAuthenticatedFetch()
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlScheduleId = searchParams.get('scheduleId') || ''
  const urlDate = searchParams.get('date') || ''

  const { data: session } = useSession()
  const userId = (session?.user as any)?.id
  const userRole = (session?.user as any)?.role

  const webcamRef = useRef<Webcam>(null)
  
  const [photoSrc, setPhotoSrc] = useState<string | null>(null)
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(urlScheduleId)
  const [attendances, setAttendances] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState({
    date: urlDate || new Date().toISOString().split('T')[0],
    period: '',
    duration: '2',
    topic: '',
    notes: ''
  })

  // 1. Ambil jadwal eksklusif untuk guru yang sedang login
  const { data: rawSchedules, isLoading: loadingSchedules } = useQuery<any[]>({
    queryKey: ['schedules', userId, userRole],
    queryFn: async () => {
      const url = userId && userRole === 'GURU' ? `/api-backend/schedules?userId=${userId}` : '/api-backend/schedules'
      const res = await authenticatedFetch(url)
      if (!res.ok) throw new Error('Gagal memuat jadwal')
      return res.json()
    }
  })

  const schedules = (Array.isArray(rawSchedules) ? rawSchedules : []).filter(s => {
    if (userRole === 'ADMIN_IT' || userRole === 'SUPERADMIN' || !userRole) return true
    return s?.teacher?.userId === userId || s?.teacher?.user?.email === session?.user?.email || (s?.teacher?.user?.username && s?.teacher?.user?.username === (session?.user as any)?.username)
  })

  // Otomatis pilih jadwal hari ini jika tidak ada query param
  useEffect(() => {
    if (urlScheduleId) {
      setSelectedScheduleId(urlScheduleId)
    } else if (schedules.length > 0 && !selectedScheduleId) {
      const currentDay = new Date().getDay()
      const todaySchedule = schedules.find(s => Number(s.dayOfWeek) === currentDay)
      if (todaySchedule) {
        setSelectedScheduleId(todaySchedule.id)
      } else {
        setSelectedScheduleId(schedules[0].id)
      }
    }
  }, [urlScheduleId, schedules, selectedScheduleId])

  const selectedSchedule = (Array.isArray(schedules) ? schedules : []).find(s => s.id === selectedScheduleId)

  // Otomatis isi jam ke & durasi dari waktu jadwal jika tersedia
  useEffect(() => {
    if (selectedSchedule) {
      if (!formData.period && selectedSchedule.startTime && selectedSchedule.endTime) {
        setFormData(prev => ({
          ...prev,
          period: `${selectedSchedule.startTime} - ${selectedSchedule.endTime}`
        }))
      }
    }
  }, [selectedSchedule, formData.period])

  // 2. Jika jadwal sudah dipilih, ambil data kelas untuk mendapatkan daftar siswa
  const { data: classData, isLoading: loadingStudents } = useQuery<any>({
    queryKey: ['classes', selectedSchedule?.classId],
    queryFn: async () => {
      if (!selectedSchedule?.classId) return null
      const res = await authenticatedFetch(`/api-backend/classes/${selectedSchedule.classId}`)
      if (!res.ok) throw new Error('Gagal memuat kelas')
      return res.json()
    },
    enabled: !!selectedSchedule?.classId
  })

  // Set default attendances saat siswa berhasil dimuat
  useEffect(() => {
    if (classData?.students) {
      const initialAtt: Record<string, string> = {}
      classData.students.forEach((s: any) => {
        initialAtt[s.id] = 'HADIR'
      })
      setAttendances(initialAtt)
    }
  }, [classData])

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot()
      setPhotoSrc(imageSrc)
    }
  }, [webcamRef])

  const handleRetake = () => {
    setPhotoSrc(null)
  }

  const handleAttendanceChange = (studentId: string, status: string) => {
    setAttendances(prev => ({ ...prev, [studentId]: status }))
  }

  // Mutation for teaching-journals
  const createJournalMutation = useMutation({
    mutationFn: async (payload: any) => {
      let photoUrl = payload.photoUrl
      if (photoUrl && photoUrl.startsWith('data:image')) {
        const uploadRes = await authenticatedFetch('/api-backend/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: photoUrl, folder: 'journals' })
        })
        if (!uploadRes.ok) throw new Error('Gagal mengunggah foto')
        const uploadData = await uploadRes.json()
        photoUrl = uploadData.url
      }

      const res = await authenticatedFetch('/api-backend/teaching-journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, photoUrl })
      })
      if (!res.ok) throw new Error('Gagal menyimpan jurnal')
      return res.json()
    }
  })

  // Mutation for attendances (bulk)
  const createAttendanceMutation = useMutation({
    mutationFn: async (payload: any) => {
      const isBulk = Array.isArray(payload)
      const res = await authenticatedFetch(`/api-backend/attendances${isBulk ? '/bulk' : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Gagal menyimpan absensi')
      return res.json()
    }
  })

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSchedule) {
      Swal.fire('Informasi', 'Pilih jadwal mengajar terlebih dahulu', 'info')
      return
    }

    try {
      // 1. Simpan Jurnal
      await createJournalMutation.mutateAsync({
        date: new Date(formData.date).toISOString(),
        material: formData.topic,
        notes: formData.notes,
        scheduleId: selectedSchedule.id,
        teacherId: selectedSchedule.teacherId,
        photoUrl: photoSrc,
      })

      // 2. Simpan Absensi Siswa
      const attendancePayload = Object.entries(attendances).map(([studentId, status]) => ({
        date: new Date(formData.date).toISOString(),
        status: status,
        studentId: studentId,
        scheduleId: selectedSchedule.id
      }))
      if (attendancePayload.length > 0) {
        await createAttendanceMutation.mutateAsync(attendancePayload)
      }

      Swal.fire('Berhasil', 'Jurnal mengajar dan presensi siswa berhasil disimpan!', 'success')
      router.push('/akademik/jurnal-mengajar')
    } catch (error) {
      console.error(error)
      Swal.fire('Gagal', 'Terjadi kendala saat menyimpan jurnal.', 'error')
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Isi Jurnal Mengajar & Presensi
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Detail jadwal otomatis terhubung. Isi materi pembelajaran, absensi kehadiran siswa, dan foto kegiatan.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Detail Pengajaran Otomatis Terhubung Jadwal */}
        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Detail Pengajaran Berdasarkan Jadwal
            </CardTitle>
            <CardDescription>
              Pilih jadwal sesi KBM Anda. Data kelas dan mata pelajaran akan langsung terisi otomatis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold">Jadwal Mengajar</Label>
                <Select value={selectedScheduleId} onValueChange={(v) => setSelectedScheduleId(v || '')} required>
                  <SelectTrigger className="font-medium">
                    <SelectValue placeholder={loadingSchedules ? "Memuat jadwal..." : "Pilih Jadwal"}>
                      {selectedSchedule
                        ? `[${DAYS_NAME[selectedSchedule.dayOfWeek] || ''}] ${selectedSchedule.class?.name || ''} - ${selectedSchedule.subject?.name || ''} (${selectedSchedule.startTime || ''}-${selectedSchedule.endTime || ''})`
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(schedules) ? schedules : []).map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        [{DAYS_NAME[s.dayOfWeek]}] {s.class?.name} - {s.subject?.name} ({s.startTime}-{s.endTime})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Tanggal Kegiatan KBM</Label>
                <Input 
                  type="date" 
                  required 
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>
            </div>

            {/* Info Badge Otomatis */}
            {selectedSchedule && (
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Kelas Target:</span>
                  <span className="font-bold text-blue-700 dark:text-blue-300 text-sm">
                    {selectedSchedule.class?.name || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Mata Pelajaran:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {selectedSchedule.subject?.name || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">Alokasi Waktu:</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-slate-200 text-sm">
                    {selectedSchedule.startTime} - {selectedSchedule.endTime} WIB
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold">Jam Ke / Waktu</Label>
                <Input 
                  type="text" 
                  placeholder="Contoh: 1-2 atau 07:00 - 08:30" 
                  required 
                  value={formData.period}
                  onChange={e => setFormData({...formData, period: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Alokasi Jam Pelajaran (JP)</Label>
                <Input 
                  type="number" 
                  placeholder="2" 
                  min="1"
                  required 
                  value={formData.duration}
                  onChange={e => setFormData({...formData, duration: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">Materi / Topik Pembelajaran</Label>
              <Input 
                type="text" 
                placeholder="Topik atau capaian materi yang diajarkan pada sesi ini..." 
                required 
                value={formData.topic}
                onChange={e => setFormData({...formData, topic: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">Catatan Khusus KBM (Opsional)</Label>
              <Textarea 
                placeholder="Catatan perkembangan kelas, respon siswa, atau kendala selama pembelajaran..." 
                rows={3} 
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Absensi Siswa Manual Saat KBM Berlangsung */}
        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg">Absensi Siswa (Presensi Kelas)</CardTitle>
              <CardDescription>
                Input manual status kehadiran siswa di kelas saat proses pembelajaran berlangsung.
              </CardDescription>
            </div>
            {classData?.students && classData.students.length > 0 && (
              <div className="flex items-center gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="text-xs h-8"
                  onClick={() => {
                    const allHadir: Record<string, string> = {}
                    classData.students.forEach((s: any) => { allHadir[s.id] = 'HADIR' })
                    setAttendances(allHadir)
                  }}
                >
                  Set Semua Hadir
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow>
                    <TableHead className="w-[100px] pl-6">NIS</TableHead>
                    <TableHead>Nama Siswa</TableHead>
                    <TableHead className="text-center w-[200px] pr-6">Kehadiran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingStudents ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10">
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-600" />
                          Memuat data siswa kelas...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : !selectedSchedule ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-slate-500">
                        Pilih jadwal kelas terlebih dahulu untuk melihat daftar siswa.
                      </TableCell>
                    </TableRow>
                  ) : classData?.students?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-slate-500">
                        Belum ada siswa terdaftar di kelas ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (Array.isArray(classData?.students) ? classData?.students : []).map((student: any) => (
                      <TableRow key={student.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <TableCell className="pl-6 font-mono text-xs font-semibold text-slate-600 dark:text-slate-400">{student.nis}</TableCell>
                        <TableCell className="font-semibold text-slate-900 dark:text-white">{student.name}</TableCell>
                        <TableCell className="pr-6">
                          <div className="w-[140px] mx-auto">
                            <Select 
                              value={attendances[student.id] || 'HADIR'} 
                              onValueChange={(val) => handleAttendanceChange(student.id, val || 'HADIR')}
                            >
                              <SelectTrigger className="h-8 text-xs font-semibold">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="HADIR" className="text-emerald-700 font-semibold">Hadir</SelectItem>
                                <SelectItem value="IZIN" className="text-blue-700 font-semibold">Izin</SelectItem>
                                <SelectItem value="SAKIT" className="text-amber-700 font-semibold">Sakit</SelectItem>
                                <SelectItem value="ALPA" className="text-red-700 font-semibold">Alpa</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Bukti Dokumentasi Kegiatan KBM */}
        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base sm:text-lg">Bukti Mengajar (Dokumentasi)</CardTitle>
            <CardDescription>Ambil foto kondisi kelas sebagai bukti otentik kegiatan belajar mengajar.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              {photoSrc ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-200 shadow-xs max-w-md w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoSrc} alt="Bukti Mengajar" className="w-full object-contain" />
                  <Button 
                    type="button" 
                    variant="secondary" 
                    size="sm" 
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white dark:bg-slate-900/90 backdrop-blur shadow-xs text-xs"
                    onClick={handleRetake}
                  >
                    <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> Ulangi Foto
                  </Button>
                </div>
              ) : (
                <div className="w-full max-w-md rounded-xl overflow-hidden border border-slate-200 bg-black flex items-center justify-center shadow-xs">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full"
                    videoConstraints={{ facingMode: "user" }}
                  />
                </div>
              )}
              
              {!photoSrc && (
                <Button type="button" onClick={capture} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs">
                  <Camera className="w-4 h-4 mr-2" />
                  Ambil Foto Kondisi Kelas
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Floating Action Bar */}
        <div className="flex justify-end gap-3 sticky bottom-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg z-10">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <Button 
            type="submit" 
            size="lg" 
            disabled={createJournalMutation.isPending || createAttendanceMutation.isPending} 
            className="bg-blue-600 hover:bg-blue-700 font-bold shadow-md"
          >
            {(createJournalMutation.isPending || createAttendanceMutation.isPending) ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Simpan Jurnal & Presensi
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function TambahJurnalPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Memuat formulir...</div>}>
      <TambahJurnalContent />
    </Suspense>
  )
}
