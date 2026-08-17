'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
import Swal from 'sweetalert2'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Webcam from 'react-webcam'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, RefreshCcw, Save, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

export default function TambahJurnalPage() {
  const authenticatedFetch = useAuthenticatedFetch()
  const router = useRouter()
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id
  const userRole = (session?.user as any)?.role

  const webcamRef = useRef<Webcam>(null)
  
  const [photoSrc, setPhotoSrc] = useState<string | null>(null)
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('')
  const [attendances, setAttendances] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
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

  const selectedSchedule = (Array.isArray(schedules) ? schedules : []).find(s => s.id === selectedScheduleId)

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

  // Set default attendances when students load
  useEffect(() => {
    if (classData?.students) {
      const initialAtt: Record<string, string> = {}
      classData.students.forEach((s: any) => {
        initialAtt[s.id] = 'HADIR'
      })
      setTimeout(() => {
        setAttendances(prev => Object.keys(prev).length === 0 ? initialAtt : prev)
      }, 0)
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

  // Mutation for attendances (bulk or single)
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
      Swal.fire('Informasi', 'Pilih jadwal kelas terlebih dahulu', 'info')
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

      // 2. Simpan Absensi (Bulk)
      const attendancePayload = Object.entries(attendances).map(([studentId, status]) => ({
        date: new Date(formData.date).toISOString(),
        status: status,
        studentId: studentId,
        scheduleId: selectedSchedule.id
      }))
      if (attendancePayload.length > 0) {
        await createAttendanceMutation.mutateAsync(attendancePayload)
      }

      Swal.fire('Informasi', 'Data jurnal dan absensi berhasil disimpan!', 'info')
      router.push('/akademik/jurnal-mengajar')
    } catch (error) {
      console.error(error)
      Swal.fire('Informasi', 'Terjadi kesalahan saat menyimpan data.', 'info')
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Tambah Jurnal Mengajar</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Isi detail pengajaran, absensi siswa, dan ambil foto bukti.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Detail Jurnal */}
        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
            <CardTitle>Detail Pengajaran</CardTitle>
            <CardDescription>Informasi mengenai kelas dan materi yang diajarkan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pilih Jadwal Mengajar</Label>
                <Select value={selectedScheduleId} onValueChange={(v) => setSelectedScheduleId(v || '')} required>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingSchedules ? "Memuat jadwal..." : "Pilih Jadwal"}>
                      {selectedSchedule
                        ? `${selectedSchedule.class?.name || ''} - ${selectedSchedule.subject?.name || ''} (${selectedSchedule.startTime || ''}-${selectedSchedule.endTime || ''})`
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(schedules) ? schedules : []).map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.class?.name} - {s.subject?.name} ({s.startTime}-{s.endTime})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input 
                  type="date" 
                  required 
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jam ke berapa</Label>
                <Input 
                  type="text" 
                  placeholder="Contoh: 1-2" 
                  required 
                  value={formData.period}
                  onChange={e => setFormData({...formData, period: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Lama jam pelajaran (Jam)</Label>
                <Input 
                  type="number" 
                  placeholder="2" 
                  required 
                  value={formData.duration}
                  onChange={e => setFormData({...formData, duration: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Materi</Label>
              <Input 
                type="text" 
                placeholder="Materi pokok yang diajarkan" 
                required 
                value={formData.topic}
                onChange={e => setFormData({...formData, topic: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Keterangan</Label>
              <Textarea 
                placeholder="Catatan tambahan selama proses belajar mengajar..." 
                rows={3} 
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Absensi Siswa */}
        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
            <CardTitle>Absensi Kelas</CardTitle>
            <CardDescription>Silakan centang kehadiran siswa. Default diatur ke Hadir.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow>
                    <TableHead className="w-[100px] pl-6">NIS</TableHead>
                    <TableHead>Nama Siswa</TableHead>
                    <TableHead className="text-center w-[300px]">Kehadiran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingStudents ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10">
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-600" />
                          Memuat data siswa...
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
                        Belum ada siswa di kelas ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (Array.isArray(classData?.students) ? classData?.students : []).map((student: any) => (
                      <TableRow key={student.id}>
                        <TableCell className="pl-6 font-medium text-slate-600 dark:text-slate-400">{student.nis}</TableCell>
                        <TableCell className="font-semibold text-slate-900 dark:text-white">{student.name}</TableCell>
                        <TableCell>
                          <div className="w-[120px] mx-auto">
                            <Select 
                              value={attendances[student.id] || 'HADIR'} 
                              onValueChange={(val) => handleAttendanceChange(student.id, val || 'HADIR')}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="HADIR">Hadir</SelectItem>
                                <SelectItem value="IZIN">Izin</SelectItem>
                                <SelectItem value="SAKIT">Sakit</SelectItem>
                                <SelectItem value="ALPA">Alpa</SelectItem>
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

        {/* Capture Foto */}
        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
            <CardTitle>Bukti Mengajar</CardTitle>
            <CardDescription>Ambil foto kondisi kelas sebagai bukti kegiatan belajar mengajar.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              {photoSrc ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-200 shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoSrc} alt="Bukti Mengajar" className="w-full max-w-lg object-contain" />
                  <Button 
                    type="button" 
                    variant="secondary" 
                    size="sm" 
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white dark:bg-slate-900/80 backdrop-blur shadow-xs"
                    onClick={handleRetake}
                  >
                    <RefreshCcw className="w-4 h-4 mr-2" /> Ulangi
                  </Button>
                </div>
              ) : (
                <div className="w-full max-w-lg rounded-lg overflow-hidden border border-slate-200 bg-black flex items-center justify-center shadow-xs">
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
                <Button type="button" onClick={capture} className="bg-slate-900 hover:bg-slate-800 text-white font-bold">
                  <Camera className="w-4 h-4 mr-2" />
                  Ambil Foto
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 sticky bottom-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg z-10">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <Button type="submit" size="lg" disabled={createJournalMutation.isPending || createAttendanceMutation.isPending} className="bg-blue-600 hover:bg-blue-700 font-bold shadow-md">
            {(createJournalMutation.isPending || createAttendanceMutation.isPending) ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Simpan Jurnal & Absensi
          </Button>
        </div>
      </form>
    </div>
  )
}
