'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  BellRing, Mail, CheckCircle2, ShieldCheck, 
  Send, Save, Loader2, Sparkles, AlertCircle, Globe, RefreshCw,
  Clock, Check, UserCheck, ShieldAlert, FileCheck, Wallet, CalendarDays,
  Smartphone
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
  const userRole = (session?.user as any)?.role || 'SISWA'
  const queryClient = useQueryClient()

  const [settings, setSettings] = useState({
    notifPresensiMasuk: true,
    notifPresensiPulang: true,
    notifTagihan: true,
    notifTagihanLunas: true,
    notifPengumuman: true,
    notifKedisiplinan: true,
    notifIzinCuti: true,
    notifPersuratan: true,
    notifKepegawaian: true,
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
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/20 text-primary border-primary/30">
                <Sparkles className="mr-1 h-3 w-3" /> Notifikasi Resmi SIMASMUH
              </Badge>
              <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">
                <Check className="mr-1 h-3 w-3" /> 100% Bebas Blokir & Gratis
              </Badge>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Pengaturan Notifikasi & Akun Email
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Atur kanal pemberitahuan email otomatis untuk presensi, perizinan, tagihan, kedisiplinan, dan pengumuman sekolah.
            </p>
          </div>
          <Button onClick={handleSave} disabled={mutation.isPending} className="gap-2 shrink-0">
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Simpan Perubahan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Kolom Kiri: Penautan Akun Email & Uji Coba */}
        <div className="space-y-6 lg:col-span-1">
          {/* Card Akun Email */}
          <Card className="border-border/60 shadow-sm">
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
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Terhubung
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
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
                      className="text-sm h-9"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSettings((prev) => ({ ...prev, email: inputEmail }))
                          setEditingEmail(false)
                        }}
                        className="h-8 flex-1 text-xs"
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
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-sm font-medium text-foreground truncate max-w-[180px]">
                      {settings.email || 'Belum diatur'}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingEmail(true)}
                      className="h-7 text-xs text-primary"
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
                  className="w-full text-xs gap-2 border-primary/30 hover:bg-primary/5 text-primary"
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
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {testResult}
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-blue-50/70 p-3 text-xs text-blue-900 border border-blue-100 flex gap-2">
                <Globe className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                <p>
                  Notifikasi email langsung masuk ke aplikasi Gmail di Android / iOS Anda tanpa risiko diblokir atau pulsa SMS terpotong.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kolom Kanan: Pengaturan Kategori Notifikasi */}
        <div className="space-y-6 lg:col-span-2">
          {/* Bagian Presensi & Kehadiran */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Clock className="h-4 w-4 text-emerald-600" />
                Notifikasi Presensi & Kehadiran
              </CardTitle>
              <CardDescription className="text-xs">
                Pemberitahuan real-time saat scan QR / Kamera AI berhasil tercatat.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/60 space-y-3 pt-0">
              <div className="flex items-center justify-between pt-3">
                <div className="space-y-0.5 pr-4">
                  <Label className="text-sm font-medium">Presensi Masuk (Datang)</Label>
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

              <div className="flex items-center justify-between pt-3">
                <div className="space-y-0.5 pr-4">
                  <Label className="text-sm font-medium">Presensi Pulang</Label>
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

          {/* Bagian Perizinan & Cuti */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <CalendarDays className="h-4 w-4 text-blue-600" />
                Notifikasi Perizinan & Cuti
              </CardTitle>
              <CardDescription className="text-xs">
                Pemberitahuan pengajuan dispensasi, izin sakit, dan cuti dinas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 pr-4">
                  <Label className="text-sm font-medium">Status Persetujuan Izin & Cuti</Label>
                  <p className="text-xs text-muted-foreground">
                    Terima email saat permohonan izin keluar/cuti telah diverifikasi & ditandatangani digital oleh Kepala Sekolah.
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

          {/* Bagian Keuangan & SPP (Jika Siswa / Wali / Admin Keuangan) */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Wallet className="h-4 w-4 text-amber-600" />
                Notifikasi Tagihan & Keuangan Sekolah
              </CardTitle>
              <CardDescription className="text-xs">
                Pemberitahuan penerbitan iuran, jatuh tempo SPP, dan kwitansi pembayaran lunas.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/60 space-y-3 pt-0">
              <div className="flex items-center justify-between pt-3">
                <div className="space-y-0.5 pr-4">
                  <Label className="text-sm font-medium">Penerbitan Tagihan Baru & SPP</Label>
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

              <div className="flex items-center justify-between pt-3">
                <div className="space-y-0.5 pr-4">
                  <Label className="text-sm font-medium">Kwitansi Lunas Terverifikasi</Label>
                  <p className="text-xs text-muted-foreground">
                    Kirim konfirmasi pembayaran lunas dan tautan unduh kwitansi digital.
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

          {/* Bagian Kedisiplinan & Pengumuman */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <ShieldAlert className="h-4 w-4 text-purple-600" />
                Catatan Karakter & Pengumuman Sekolah
              </CardTitle>
              <CardDescription className="text-xs">
                Pemberitahuan catatan pembinaan adab/tatib dan surat edaran resmi.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/60 space-y-3 pt-0">
              <div className="flex items-center justify-between pt-3">
                <div className="space-y-0.5 pr-4">
                  <Label className="text-sm font-medium">Catatan Prestasi & Kedisiplinan Siswa</Label>
                  <p className="text-xs text-muted-foreground">
                    Kirim email pemberitahuan saat terdapat rekor prestasi atau evaluasi adab/tata tertib.
                  </p>
                </div>
                <Switch
                  checked={settings.notifKedisiplinan}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, notifKedisiplinan: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div className="space-y-0.5 pr-4">
                  <Label className="text-sm font-medium">Pengumuman & Surat Edaran Resmi</Label>
                  <p className="text-xs text-muted-foreground">
                    Terima informasi siaran massal, kalender akademik, dan rapat sekolah.
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
        </div>
      </div>
    </div>
  )
}
