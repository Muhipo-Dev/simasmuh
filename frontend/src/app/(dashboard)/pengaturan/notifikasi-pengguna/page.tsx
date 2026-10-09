'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { 
  Mail, CheckCircle2, Send, Save, Loader2, Sparkles, AlertCircle, Globe,
  Clock, Check, FileCheck, Banknote, CalendarDays, Megaphone,
  Wallet, ShieldAlert, UserCheck, ShieldCheck, BookOpen, BellRing
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { useSession } from 'next-auth/react'

export default function NotifikasiPenggunaPage() {
  const authenticatedFetch = useAuthenticatedFetch()
  const { data: session } = useSession()
  const sessionRole = (session?.user as any)?.role || ''

  // State settings with role-adaptive defaults
  const [settings, setSettings] = useState({
    notifPresensiMasuk: true,
    notifPresensiPulang: true,
    notifJadwalPelajaran: true,
    notifReminderJadwal: true,
    notifGaji: true,
    notifDisposisi: true,
    notifIzinCuti: true,
    notifPengumuman: true,
    notifTagihan: true,
    notifTagihanLunas: true,
    notifKedisiplinan: true,
    email: '',
  })

  const [editingEmail, setEditingEmail] = useState(false)
  const [inputEmail, setInputEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  // Fetch current user email preferences
  const { data: prefData, isLoading, refetch } = useQuery({
    queryKey: ['user-email-preferences'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/notifications/email-preferences')
      if (!res.ok) {
        throw new Error('Gagal memuat pengaturan notifikasi')
      }
      return res.json()
    },
  })

  // Determine if user is Staff/Guru/Pegawai vs Siswa/Wali
  const effectiveRole = prefData?.role || sessionRole || 'GURU'
  const isStaff = prefData?.isStaff !== undefined 
    ? prefData.isStaff 
    : !['SISWA', 'WALI_MURID'].includes(effectiveRole.toUpperCase())

  useEffect(() => {
    if (prefData) {
      const email = prefData.email || ''
      setSettings((prev) => ({
        ...prev,
        email,
        ...(prefData.preferences || {}),
      }))
      setInputEmail(email)
    }
  }, [prefData])

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await authenticatedFetch('/api-backend/notifications/email-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: payload.email, preferences: payload }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.message || 'Gagal menyimpan preferensi')
      }
      return res.json()
    },
    onSuccess: () => {
      refetch()
      setEditingEmail(false)
      toast.success('Pengaturan notifikasi berhasil diperbarui!')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan preferensi')
    },
  })

  const handleSave = () => {
    mutation.mutate({
      ...settings,
      email: inputEmail || settings.email,
    })
  }

  const handleSendTestEmail = async () => {
    const targetEmail = inputEmail || settings.email
    if (!targetEmail || !targetEmail.includes('@')) {
      toast.error('Masukkan alamat email terlebih dahulu')
      return
    }

    setSendingTest(true)
    setTestResult(null)

    try {
      const res = await authenticatedFetch('/api-backend/notifications/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setTestResult('Email uji coba berhasil dikirim! Silakan periksa kotak masuk (Inbox/Spam).')
        toast.success('Email uji coba terkirim!')
      } else {
        setTestResult(`Gagal: ${data.message || 'Server SMTP tidak dapat mengirimkan email saat ini'}`)
        toast.error(data.message || 'Gagal mengirim email uji coba')
      }
    } catch (e: any) {
      setTestResult(`Error: ${e.message}`)
      toast.error('Terjadi kesalahan jaringan')
    } finally {
      setSendingTest(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Info Banner */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/15 text-primary border-primary/25 font-semibold text-xs">
                <Sparkles className="mr-1 h-3.5 w-3.5" /> Notifikasi Resmi SIMASMUH
              </Badge>
              <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-xs">
                <Check className="mr-1 h-3.5 w-3.5" />
                {isStaff ? 'Mode Guru & Pegawai' : 'Mode Siswa & Wali Murid'}
              </Badge>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Pengaturan Notifikasi & Akun Email
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-2xl">
              {isStaff
                ? 'Kelola kanal notifikasi email resmi untuk absensi harian, rincian slip gaji, disposisi surat masuk, perizinan cuti, dan surat edaran dinas.'
                : 'Kelola kanal notifikasi email resmi untuk kehadiran harian siswa, tagihan SPP, kwitansi lunas, perizinan, dan pengumuman sekolah.'}
            </p>
          </div>
          <Button onClick={handleSave} disabled={mutation.isPending} className="gap-2 shrink-0 h-10 px-5 text-xs sm:text-sm font-semibold">
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Simpan Pengaturan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Kolom Kiri: Penautan Akun Email & Uji Coba */}
        <div className="space-y-6 lg:col-span-1">
          {/* Card Akun Email */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Mail className="h-4 w-4 text-primary" />
                Alamat Email Penerima
              </CardTitle>
              <CardDescription className="text-xs">
                Email tujuan untuk menerima notifikasi instan dari SIMASMUH.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-muted bg-muted/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Status Akun Email:</span>
                  {settings.email ? (
                    <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-xs">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Terhubung
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-xs">
                      <AlertCircle className="mr-1 h-3 w-3" /> Belum Ditautkan
                    </Badge>
                  )}
                </div>

                {editingEmail ? (
                  <div className="space-y-2 pt-1">
                    <Input
                      type="email"
                      value={inputEmail}
                      onChange={(e) => setInputEmail(e.target.value)}
                      placeholder="contoh: nama.anda@gmail.com"
                      className="text-xs sm:text-sm h-9"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSettings((prev) => ({ ...prev, email: inputEmail }))
                          setEditingEmail(false)
                        }}
                        className="h-8 flex-1 text-xs font-medium"
                      >
                        Terapkan
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setInputEmail(settings.email)
                          setEditingEmail(false)
                        }}
                        className="h-8 text-xs"
                      >
                        Batal
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <span className="font-mono text-xs sm:text-sm font-medium text-foreground truncate flex-1 min-w-0" title={settings.email || 'Belum diatur'}>
                      {settings.email || 'Belum diatur'}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingEmail(true)}
                      className="h-7 px-2.5 text-xs text-primary shrink-0"
                    >
                      Ubah Email
                    </Button>
                  </div>
                )}
              </div>

              {/* Uji Coba Pengiriman */}
              <div className="pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendTestEmail}
                  disabled={sendingTest || (!inputEmail && !settings.email)}
                  className="w-full text-xs gap-2 border-primary/30 hover:bg-primary/5 text-primary h-9 font-medium"
                >
                  {sendingTest ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Kirim Email Uji Coba ke Inbox
                </Button>

                {testResult && (
                  <div
                    className={`mt-2.5 rounded-lg p-2.5 text-xs ${
                      testResult.startsWith('Email uji coba berhasil')
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {testResult}
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-blue-50/70 dark:bg-blue-950/30 p-3 text-xs text-blue-900 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50 flex gap-2">
                <Globe className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                <p>
                  Notifikasi email langsung dikirimkan ke kotak masuk Gmail di smartphone Anda secara instan dan tanpa biaya SMS.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kolom Kanan: Pengaturan Kategori Notifikasi Sesuai Peran Pengguna */}
        <div className="space-y-6 lg:col-span-2">
          {isStaff ? (
            /* ========================================================
               KATEGORI NOTIFIKASI KHUSUS GURU / PEGAWAI / KARYAWAN / TU
               ======================================================== */
            <>
              {/* 1. Presensi & Kehadiran Pegawai */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Notifikasi Presensi & Kehadiran Pegawai
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pemberitahuan real-time saat scan QR / Face Biometrik AI pegawai berhasil tercatat.
                  </CardDescription>
                </CardHeader>
                <CardContent className="divide-y divide-border/60 space-y-3 pt-0">
                  <div className="flex items-center justify-between pt-3 gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <Label className="text-xs sm:text-sm font-medium">Presensi Masuk (Datang)</Label>
                      <p className="text-xs text-muted-foreground">
                        Terima email konfirmasi saat scan presensi kedatangan berhasil masuk ke sistem.
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifPresensiMasuk}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, notifPresensiMasuk: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3 gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <Label className="text-xs sm:text-sm font-medium">Presensi Kepulangan</Label>
                      <p className="text-xs text-muted-foreground">
                        Terima email konfirmasi saat scan presensi kepulangan jam kerja berhasil tercatat.
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifPresensiPulang}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, notifPresensiPulang: checked }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 2. Gaji & Penggajian (Payroll) Pegawai */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Banknote className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    Notifikasi Penggajian & Slip Gaji (Payroll)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pemberitahuan penerbitan slip honorarium, gaji bulanan, dan tunjangan kehadiran.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <Label className="text-xs sm:text-sm font-medium">Penerbitan Slip Gaji & Tunjangan Bulanan</Label>
                      <p className="text-xs text-muted-foreground">
                        Kirim notifikasi email saat bendahara mempublikasikan rincian slip gaji, tunjangan harian, dan honor mengajar.
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifGaji}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, notifGaji: checked }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 3. Disposisi & Persuratan Dinas */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <FileCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Notifikasi Lembar Disposisi & Persuratan
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pemberitahuan instruksi lembar disposisi surat masuk dan surat tugas dari Kepala Sekolah / Pimpinan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <Label className="text-xs sm:text-sm font-medium">Disposisi Surat Masuk & Surat Tugas</Label>
                      <p className="text-xs text-muted-foreground">
                        Terima email saat Anda ditugaskan atau menerima lembar disposisi persuratan dan instruksi dinas penting.
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifDisposisi}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, notifDisposisi: checked }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 4. Perizinan & Cuti Pegawai */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <CalendarDays className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Notifikasi Izin Keluar & Cuti Kerja
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pemberitahuan status verifikasi pengajuan izin keluar kantor dan cuti kerja.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <Label className="text-xs sm:text-sm font-medium">Persetujuan Izin Keluar & Cuti Dinas</Label>
                      <p className="text-xs text-muted-foreground">
                        Terima email saat permohonan izin keluar kantor saat jam dinas atau cuti telah diverifikasi & disetujui Kepala Sekolah.
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifIzinCuti}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, notifIzinCuti: checked }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 5. Pengumuman & Informasi Kedinasan */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Megaphone className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    Pengumuman & Surat Edaran Kedinasan
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pemberitahuan agenda rapat guru/pegawai, kalender akademik dinas, dan siaran resmi sekolah.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <Label className="text-xs sm:text-sm font-medium">Pengumuman Resmi & Surat Edaran</Label>
                      <p className="text-xs text-muted-foreground">
                        Terima informasi edaran dinas, agenda rapat pendidik/tendik, dan pengumuman internal sekolah.
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifPengumuman}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, notifPengumuman: checked }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 6. Supervisi & Verifikasi Perangkat Ajar (Guru & Tendik) */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Notifikasi Supervisi Perangkat Ajar & Akademik
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pemberitahuan status verifikasi modul ajar, ATP/RPP, dan hasil supervisi akademik oleh Kepala Sekolah / Tim Kurikulum.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <Label className="text-xs sm:text-sm font-medium">Verifikasi Modul Ajar & Supervisi</Label>
                      <p className="text-xs text-muted-foreground">
                        Terima email saat modul ajar Anda disetujui atau mendapat umpan balik dari tim supervisi.
                      </p>
                    </div>
                    <Switch
                      checked={(settings as any).notifPerangkatAjar ?? true}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, notifPerangkatAjar: checked } as any))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 7. Jadwal Mengajar Harian Guru */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Notifikasi Jadwal Mengajar Harian
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pemberitahuan otomatis ringkasan jadwal mengajar dan kelas yang diampu setiap pagi hari sekolah (06:00 WIB).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <Label className="text-xs sm:text-sm font-medium">Ringkasan Jadwal Mengajar Pagi</Label>
                      <p className="text-xs text-muted-foreground">
                        Kirim email ringkasan jadwal kelas, jam mengajar, dan mata pelajaran setiap pagi hari kerja.
                      </p>
                    </div>
                    <Switch
                      checked={(settings as any).notifJadwalMengajar ?? true}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, notifJadwalMengajar: checked } as any))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            /* ========================================================
               KATEGORI NOTIFIKASI KHUSUS SISWA & WALI MURID
               ======================================================== */
            <>
              {/* 1. Presensi & Kehadiran Siswa */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Notifikasi Presensi & Kehadiran Siswa
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pemberitahuan saat scan presensi masuk dan kepulangan siswa tercatat.
                  </CardDescription>
                </CardHeader>
                <CardContent className="divide-y divide-border/60 space-y-3 pt-0">
                  <div className="flex items-center justify-between pt-3 gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <Label className="text-xs sm:text-sm font-medium">Presensi Masuk (Datang)</Label>
                      <p className="text-xs text-muted-foreground">
                        Kirim email konfirmasi saat presensi masuk tercatat di gerbang / kelas sekolah.
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifPresensiMasuk}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, notifPresensiMasuk: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3 gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <Label className="text-xs sm:text-sm font-medium">Presensi Kepulangan</Label>
                      <p className="text-xs text-muted-foreground">
                        Kirim email konfirmasi saat scan presensi kepulangan sekolah berhasil.
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifPresensiPulang}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, notifPresensiPulang: checked }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 2. Jadwal Pelajaran Hari Ini (Setiap Pagi 06:00 WIB) */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Notifikasi Jadwal Pelajaran Harian (Jam 06:00 Pagi)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pemberitahuan email resmi satu kali sehari berisi susunan lengkap mata pelajaran, jam pelajaran, dan guru pengampu hari ini.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs sm:text-sm font-medium">Jadwal Pelajaran Hari Ini (06:00 WIB)</Label>
                        <Badge className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[10px] py-0 px-1.5 font-bold">
                          1x Sehari Pagi
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Terima email ringkasan seluruh jadwal mata pelajaran dan guru pengampu hari ini setiap pagi pukul 06:00 WIB sebelum kegiatan belajar dimulai.
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifJadwalPelajaran}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, notifJadwalPelajaran: checked }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 2. Tagihan & Keuangan SPP */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Notifikasi Tagihan & Keuangan SPP
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pemberitahuan penerbitan iuran, jatuh tempo SPP, dan kwitansi pembayaran lunas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="divide-y divide-border/60 space-y-3 pt-0">
                  <div className="flex items-center justify-between pt-3 gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <Label className="text-xs sm:text-sm font-medium">Penerbitan Tagihan Baru & SPP</Label>
                      <p className="text-xs text-muted-foreground">
                        Terima rincian tagihan bulanan beserta nomor Virtual Account pembayaran.
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifTagihan}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, notifTagihan: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3 gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <Label className="text-xs sm:text-sm font-medium">Kwitansi Pembayaran Lunas</Label>
                      <p className="text-xs text-muted-foreground">
                        Kirim konfirmasi pembayaran lunas dan tautan unduh kwitansi tanda terima digital.
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifTagihanLunas}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, notifTagihanLunas: checked }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 3. Perizinan & Dispensasi Siswa */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Notifikasi Izin Keluar & Dispensasi
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pemberitahuan pengajuan perizinan keluar gerbang dan dispensasi kegiatan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <Label className="text-xs sm:text-sm font-medium">Status Persetujuan Izin Siswa</Label>
                      <p className="text-xs text-muted-foreground">
                        Terima email saat permohonan izin keluar/dispensasi ananda telah diverifikasi & disetujui pihak sekolah.
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifIzinCuti}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, notifIzinCuti: checked }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 4. Catatan Karakter & Kedisiplinan Siswa */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <ShieldAlert className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    Catatan Karakter & Kedisiplinan Siswa
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pemberitahuan prestasi dan catatan pembinaan adab/tata tertib.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <Label className="text-xs sm:text-sm font-medium">Catatan Prestasi & Tata Tertib Siswa</Label>
                      <p className="text-xs text-muted-foreground">
                        Kirim email pemberitahuan saat terdapat rekor prestasi atau evaluasi adab/tata tertib ananda.
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifKedisiplinan}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, notifKedisiplinan: checked }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 5. Pengumuman & Surat Edaran Sekolah */}
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <Megaphone className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    Pengumuman & Surat Edaran Sekolah
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pemberitahuan informasi kegiatan, kalender akademik, dan surat undangan sekolah.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <Label className="text-xs sm:text-sm font-medium">Pengumuman Resmi & Surat Edaran</Label>
                      <p className="text-xs text-muted-foreground">
                        Terima informasi siaran massal, kalender akademik, dan undangan resmi sekolah.
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifPengumuman}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, notifPengumuman: checked }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Tombol Simpan Bawah Responsif */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={mutation.isPending}
              className="font-semibold text-xs sm:text-sm px-6 h-10 gap-2 shadow-xs"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Simpan Pengaturan Notifikasi
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
