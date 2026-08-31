'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  BellRing, Mail, CheckCircle2, ShieldCheck, 
  Send, Save, Loader2, Sparkles, AlertCircle, Globe, RefreshCw,
  Clock, Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

export default function NotifikasiWaliPage() {
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()

  const [settings, setSettings] = useState({
    notifPresensiMasuk: true,
    notifPresensiPulang: true,
    notifTagihanBaru: true,
    notifTagihanLunas: true,
    notifPengumuman: true,
    notifKedisiplinan: true,
    email: '',
    whatsappTargetNumber: '',
  })

  const [editingEmail, setEditingEmail] = useState(false)
  const [inputEmail, setInputEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  // Fetch Dashboard & Notification Settings
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['parent-notification-settings'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/parents/my-dashboard')
      if (!res.ok) {
        throw new Error('Gagal memuat data pengaturan')
      }
      return res.json()
    },
  })

  useEffect(() => {
    if (dashboardData) {
      const parentEmail = dashboardData.parentUser?.email || ''
      setSettings((prev) => ({
        ...prev,
        email: parentEmail,
        whatsappTargetNumber: dashboardData.parentUser?.phone || '',
      }))
      setInputEmail(parentEmail)
    }
  }, [dashboardData])

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await authenticatedFetch('/api-backend/notifications/email-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: payload.email, preferences: payload }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.message || 'Gagal menyimpan pengaturan notifikasi')
      }
      return res.json()
    },
    onSuccess: () => {
      refetch()
      setEditingEmail(false)
      toast.success('Pengaturan notifikasi & akun email berhasil disimpan!')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan pengaturan notifikasi')
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
      if (res.ok) {
        setTestResult(data.message || 'Email uji coba terkirim!')
        toast.success('Notifikasi uji coba berhasil dikirim ke ' + targetEmail)
      } else {
        toast.error(data.message || 'Gagal mengirim email uji coba')
      }
    } catch (e) {
      toast.error('Koneksi terputus ke server notifikasi')
    } finally {
      setSendingTest(false)
    }
  }

  const isEmailLinked = !!(settings.email && settings.email.includes('@'))

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          Pengaturan Notifikasi & Akun Email
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Pemberitahuan resmi absensi harian, rincian tagihan SPP, kwitansi lunas, dan pengumuman sekolah langsung ke kotak masuk email Anda.
        </p>
      </div>

      {/* Email Link Status Card */}
      <Card className="border-blue-100 dark:border-blue-950/60 bg-gradient-to-br from-blue-50/50 via-white to-white dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900 shadow-sm">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 px-2 py-0.5 rounded">
                  Email Account Link
                </span>
                {isEmailLinked ? (
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 font-semibold gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Terhubung
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300 font-semibold gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    Belum Terhubung
                  </Badge>
                )}
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                Alamat Email: <span className="font-mono text-blue-700 dark:text-blue-400 font-bold">{settings.email || 'Belum diisi'}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Wali Murid: <strong>{dashboardData?.parentUser?.name || 'Wali Murid'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingEmail(!editingEmail)}
              className="text-xs h-9 font-semibold"
            >
              {isEmailLinked ? 'Ubah Akun Email' : 'Tautkan Akun Email'}
            </Button>
          </div>
        </CardContent>

        {editingEmail && (
          <div className="px-5 pb-5 pt-2 border-t border-blue-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full space-y-1">
                <Label htmlFor="wali-email" className="text-xs font-semibold">
                  Alamat Email Wali Murid
                </Label>
                <Input
                  id="wali-email"
                  type="email"
                  placeholder="contoh: ayah.bunda@gmail.com"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleSave} disabled={mutation.isPending} className="h-9 text-xs font-semibold gap-1">
                  {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Simpan Tautan
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingEmail(false)} className="h-9 text-xs">
                  Batal
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Switches Notifikasi Email */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-lg">Kategori Notifikasi Email</CardTitle>
          <CardDescription>
            Pilih jenis pemberitahuan yang ingin Anda terima secara otomatis melalui email Gmail.
          </CardDescription>
        </CardHeader>

        <CardContent className="divide-y divide-slate-100 dark:divide-slate-800 p-0">
          {/* Presensi Masuk */}
          <div className="p-5 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                Presensi Kehadiran Masuk Siswa
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pemberitahuan langsung saat ananda tiba dan melakukan presensi di sekolah.
              </p>
            </div>
            <Switch
              checked={settings.notifPresensiMasuk}
              onCheckedChange={(checked) => setSettings({ ...settings, notifPresensiMasuk: checked })}
            />
          </div>

          {/* Presensi Pulang */}
          <div className="p-5 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                Presensi Kepulangan Siswa
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pemberitahuan saat jam pulang sekolah atau kegiatan selesai.
              </p>
            </div>
            <Switch
              checked={settings.notifPresensiPulang}
              onCheckedChange={(checked) => setSettings({ ...settings, notifPresensiPulang: checked })}
            />
          </div>

          {/* Tagihan Baru */}
          <div className="p-5 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                Penerbitan Tagihan SPP & Iuran Sekolah
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pemberitahuan invoice rincian tagihan bulanan beserta batas jatuh tempo.
              </p>
            </div>
            <Switch
              checked={settings.notifTagihanBaru}
              onCheckedChange={(checked) => setSettings({ ...settings, notifTagihanBaru: checked })}
            />
          </div>

          {/* Tagihan Lunas */}
          <div className="p-5 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                Kwitansi & Bukti Pembayaran Lunas
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pengiriman dokumen tanda terima / kwitansi digital resmi berformat PDF.
              </p>
            </div>
            <Switch
              checked={settings.notifTagihanLunas}
              onCheckedChange={(checked) => setSettings({ ...settings, notifTagihanLunas: checked })}
            />
          </div>

          {/* Pengumuman & Berita */}
          <div className="p-5 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                Pengumuman Resmi & Surat Edaran
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Surat undangan rapat wali murid, jadwal ujian, dan libur akademik.
              </p>
            </div>
            <Switch
              checked={settings.notifPengumuman}
              onCheckedChange={(checked) => setSettings({ ...settings, notifPengumuman: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Uji Coba Email Push */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-600" />
            Uji Coba Pengiriman Notifikasi Email
          </CardTitle>
          <CardDescription className="text-xs">
            Pastikan email masuk ke aplikasi Gmail di ponsel Anda dengan menekan tombol uji coba berikut.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleSendTestEmail}
            disabled={sendingTest || !settings.email}
            variant="outline"
            className="text-xs font-semibold gap-2 h-9"
          >
            {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Kirim Notifikasi Percobaan ke {settings.email || 'Email Gmail'}
          </Button>

          {testResult && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
              <Check className="w-4 h-4" /> {testResult}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tombol Simpan Bawah */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={mutation.isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-6 h-10 gap-2 shadow-sm"
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
  )
}
