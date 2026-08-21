'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  BellRing, MessageSquare, Phone, CheckCircle2, ShieldCheck, 
  Send, Save, Loader2, Sparkles, AlertCircle, Info, Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
    whatsappTargetNumber: '',
  })

  // Fetch Dashboard & Notification Settings
  const { data: dashboardData, isLoading } = useQuery({
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
    if (dashboardData?.notificationSettings) {
      setSettings((prev) => ({
        ...prev,
        ...dashboardData.notificationSettings,
        whatsappTargetNumber: dashboardData.parentUser?.phone || dashboardData.notificationSettings.whatsappTargetNumber || '',
      }))
    }
  }, [dashboardData])

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await authenticatedFetch('/api-backend/parents/my-notification-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Gagal menyimpan pengaturan notifikasi')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['parent-notification-settings'] })
      alert(data.message || 'Pengaturan notifikasi WhatsApp berhasil disimpan!')
    },
    onError: (err: any) => {
      alert(err.message || 'Gagal menyimpan pengaturan notifikasi')
    },
  })

  const handleSave = () => {
    mutation.mutate(settings)
  }

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <BellRing className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          Pengaturan Notifikasi WhatsApp
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Atur penerimaan pesan notifikasi otomatis dari sistem SIMASMUH langsung ke nomor WhatsApp Anda.
        </p>
      </div>

      {/* Info Card Pengirim Resmi */}
      <Card className="border-emerald-100 dark:border-emerald-950/60 bg-gradient-to-br from-emerald-50/50 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 shadow-sm">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 px-2 py-0.5 rounded">
                  Official Gateway Active
                </span>
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold">
                  Online 24/7
                </Badge>
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                Nomor Pengirim Resmi Sistem: <span className="font-mono text-emerald-700 dark:text-emerald-400 font-extrabold">088293733330</span>
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <p>Penerima: <strong>{dashboardData?.parentUser?.name || 'Wali Murid'}</strong></p>
            <p>Nomor Terdaftar: <strong className="font-mono">{settings.whatsappTargetNumber || '-'}</strong></p>
          </div>
        </CardContent>
      </Card>

      {/* Switches Notifikasi */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-lg">Kategori Notifikasi WhatsApp</CardTitle>
          <CardDescription>
            Aktifkan atau nonaktifkan notifikasi yang ingin Anda terima secara real-time.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 divide-y divide-slate-100 dark:divide-slate-800">
          {/* Notif 1: Presensi Masuk */}
          <div className="py-4 flex items-center justify-between gap-4 first:pt-0">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                Notifikasi Presensi Kedatangan Siswa
              </Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Menerima pesan WhatsApp begitu siswa melakukan presensi masuk di sekolah (Face Cam / QR / Manual).
              </p>
            </div>
            <Switch
              checked={settings.notifPresensiMasuk}
              onCheckedChange={(checked) => setSettings({ ...settings, notifPresensiMasuk: checked })}
            />
          </div>

          {/* Notif 2: Presensi Pulang */}
          <div className="py-4 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Notifikasi Presensi Kepulangan Siswa
              </Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Menerima pesan WhatsApp konfirmasi saat jam kepulangan siswa dari sekolah.
              </p>
            </div>
            <Switch
              checked={settings.notifPresensiPulang}
              onCheckedChange={(checked) => setSettings({ ...settings, notifPresensiPulang: checked })}
            />
          </div>

          {/* Notif 3: Tagihan Baru */}
          <div className="py-4 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-600" />
                Notifikasi Tagihan Keuangan Baru
              </Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pemberitahuan rincian tagihan baru (SPP bulanan, DPP, atau perlengkapan) lengkap dengan nomor Virtual Account.
              </p>
            </div>
            <Switch
              checked={settings.notifTagihanBaru}
              onCheckedChange={(checked) => setSettings({ ...settings, notifTagihanBaru: checked })}
            />
          </div>

          {/* Notif 4: Pelunasan & Verifikasi */}
          <div className="py-4 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                Notifikasi Bukti Pembayaran & Kuitansi Lunas
              </Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Konfirmasi saat pembayaran transfer atau Virtual Account berhasil diverifikasi oleh bendahara sekolah.
              </p>
            </div>
            <Switch
              checked={settings.notifTagihanLunas}
              onCheckedChange={(checked) => setSettings({ ...settings, notifTagihanLunas: checked })}
            />
          </div>

          {/* Notif 5: Pengumuman Penting */}
          <div className="py-4 flex items-center justify-between gap-4 last:pb-0">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Pengumuman Resmi & Agenda Sekolah
              </Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Informasi agenda pertemuan wali murid, kalender akademik, dan surat edaran resmi sekolah.
              </p>
            </div>
            <Switch
              checked={settings.notifPengumuman}
              onCheckedChange={(checked) => setSettings({ ...settings, notifPengumuman: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Button Simpan */}
      <div className="flex justify-end gap-3">
        <Button
          onClick={handleSave}
          disabled={mutation.isPending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 px-6"
        >
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan Pengaturan
        </Button>
      </div>
    </div>
  )
}
