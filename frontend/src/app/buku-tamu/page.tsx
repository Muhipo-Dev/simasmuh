'use client'

import { useState } from 'react'
import { 
  Building2, User, Phone, FileText, Send, CheckCircle2, 
  Sparkles, Contact, MapPin, Clock, ArrowRight, RefreshCw, ShieldCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Swal from 'sweetalert2'
import { getPublicApiUrl } from '@/lib/api-config'

export default function PublicGuestBookPage() {
  const [loading, setLoading] = useState(false)
  const [submittedData, setSubmittedData] = useState<any>(null)

  const [formState, setFormState] = useState({
    namaTamu: '',
    instansi: '',
    kategori: 'STUDI_TIRU',
    tujuan: '',
    dituju: 'Tata Usaha',
    kontak: '',
    catatan: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formState.namaTamu.trim() || !formState.instansi.trim() || !formState.tujuan.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Form Belum Lengkap',
        text: 'Mohon isi Nama Tamu, Instansi/Asal, dan Tujuan Keperluan Anda.',
        confirmButtonColor: '#2563eb'
      })
      return
    }

    setLoading(true)

    try {
      const res = await fetch(getPublicApiUrl('/guest-book/public'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Gagal menyimpan data kedatangan.')
      }

      setSubmittedData(data.data || formState)

      Swal.fire({
        icon: 'success',
        title: 'Registrasi Berhasil!',
        text: 'Terima kasih, data kedatangan Anda telah tersimpan di Buku Tamu SIMASMUH.',
        timer: 3000,
        showConfirmButton: false
      })
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Terjadi Kesalahan',
        text: err.message || 'Gagal terhubung ke server. Silakan coba beberapa saat lagi.',
        confirmButtonColor: '#ef4444'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSubmittedData(null)
    setFormState({
      namaTamu: '',
      instansi: '',
      kategori: 'STUDI_TIRU',
      tujuan: '',
      dituju: 'Tata Usaha',
      kontak: '',
      catatan: '',
    })
  }

  return (
    <div className="min-h-screen bg-slate-900 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-10 relative overflow-hidden">
      {/* Dynamic Background Effects */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header Branding */}
      <header className="max-w-3xl w-full mx-auto text-center space-y-3 z-10 my-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold backdrop-blur-md">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span>SMA Muhammadiyah 1 Ponorogo</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center justify-center gap-3">
          <Contact className="w-8 h-8 text-blue-400" />
          <span>Buku Tamu Digital</span>
        </h1>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Selamat datang! Mohon mengisi formulir registrasi kedatangan tamu sekolah di bawah ini.
        </p>
      </header>

      {/* Main Content Form / Success Confirmation */}
      <main className="max-w-xl w-full mx-auto z-10 my-4">
        {submittedData ? (
          <Card className="border-emerald-500/30 bg-slate-900/90 backdrop-blur-xl shadow-2xl overflow-hidden text-slate-100">
            <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3 text-emerald-400 shadow-lg shadow-emerald-500/10 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <CardTitle className="text-2xl font-bold text-emerald-400">Kedatangan Terregistrasi!</CardTitle>
              <CardDescription className="text-slate-400 text-sm">
                Data Anda telah dicatat otomatis ke Log Layanan Tata Usaha.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between border-b border-slate-700/50 pb-2">
                  <span className="text-slate-400">Nama Tamu</span>
                  <span className="font-semibold text-white">{submittedData.namaTamu}</span>
                </div>
                <div className="flex justify-between border-b border-slate-700/50 pb-2">
                  <span className="text-slate-400">Instansi / Asal</span>
                  <span className="font-semibold text-white">{submittedData.instansi}</span>
                </div>
                <div className="flex justify-between border-b border-slate-700/50 pb-2">
                  <span className="text-slate-400">Kategori</span>
                  <span className="font-semibold text-blue-400">{submittedData.kategori}</span>
                </div>
                <div className="flex justify-between border-b border-slate-700/50 pb-2">
                  <span className="text-slate-400">Person / Dituju</span>
                  <span className="font-semibold text-white">{submittedData.dituju}</span>
                </div>
                <div className="flex justify-between border-b border-slate-700/50 pb-2">
                  <span className="text-slate-400">Keperluan</span>
                  <span className="font-medium text-slate-200 text-right">{submittedData.tujuan}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-400">Waktu Kedatangan</span>
                  <span className="font-semibold text-amber-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {submittedData.waktu || 'Baru saja'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 text-center">
                Silakan dipersilakan menunggu di Ruang Tamu Utama / Meja Resepsionis. Petugas kami akan segera melayani Anda.
              </div>

              <Button 
                onClick={handleReset}
                variant="outline"
                className="w-full border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Isi Formulir Tamu Lainnya
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl text-slate-100 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-bold text-white flex items-center justify-between">
                <span>Formulir Kedatangan</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30">QR Direct Link</span>
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs sm:text-sm">
                Isi data diri & maksud kunjungan secara cepat di bawah ini.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    Nama Lengkap / Nama Rombongan <span className="text-rose-500">*</span>
                  </Label>
                  <Input 
                    placeholder="Contoh: Dr. H. Ahmad Dahlan / Tim Studi Tiru"
                    value={formState.namaTamu}
                    onChange={(e) => setFormState({ ...formState, namaTamu: e.target.value })}
                    required
                    className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                      Instansi / Asal Tamu <span className="text-rose-500">*</span>
                    </Label>
                    <Input 
                      placeholder="Contoh: Dinas Pendidikan / SMA Muh 2"
                      value={formState.instansi}
                      onChange={(e) => setFormState({ ...formState, instansi: e.target.value })}
                      required
                      className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      Kategori Kunjungan
                    </Label>
                    <Select 
                      value={formState.kategori}
                      onValueChange={(val) => { if (val) setFormState({ ...formState, kategori: val }) }}
                    >
                      <SelectTrigger className="bg-slate-950/60 border-slate-800 text-white">
                        <SelectValue placeholder="Pilih Kategori" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="STUDI_TIRU">Studi Tiru / Banding</SelectItem>
                        <SelectItem value="PEJABAT">Kunjungan Dinas / Pejabat</SelectItem>
                        <SelectItem value="ALUMNI_IJAZAH">Layanan Alumni / Legalisir</SelectItem>
                        <SelectItem value="VENDOR_UMUM">Tamu Umum / Vendor</SelectItem>
                        <SelectItem value="ORANG_TUA">Orang Tua / Wali Murid</SelectItem>
                        <SelectItem value="LAINNYA">Lain-lain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Contact className="w-3.5 h-3.5 text-emerald-400" />
                      Person / Unit yang Dituju
                    </Label>
                    <Input 
                      placeholder="Contoh: Kepala Sekolah / Tim TU / Waka"
                      value={formState.dituju}
                      onChange={(e) => setFormState({ ...formState, dituju: e.target.value })}
                      className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-amber-400" />
                      Nomor Telepon / WhatsApp
                    </Label>
                    <Input 
                      placeholder="Contoh: 081234567890"
                      value={formState.kontak}
                      onChange={(e) => setFormState({ ...formState, kontak: e.target.value })}
                      className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-rose-400" />
                    Tujuan / Keperluan Kunjungan <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea 
                    placeholder="Tuliskan secara singkat maksud & tujuan kedatangan..."
                    value={formState.tujuan}
                    onChange={(e) => setFormState({ ...formState, tujuan: e.target.value })}
                    required
                    rows={3}
                    className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500 resize-none text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">
                    Catatan Tambahan (Opsional)
                  </Label>
                  <Input 
                    placeholder="Contoh: Membawa proposal penawaran / Rombongan 5 orang"
                    value={formState.catatan}
                    onChange={(e) => setFormState({ ...formState, catatan: e.target.value })}
                    className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500 text-xs sm:text-sm"
                  />
                </div>

                <Button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-2.5 shadow-lg shadow-blue-600/25 transition-all mt-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Menyimpan Data Kedatangan...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Kirim Registrasi Kedatangan
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 z-10 my-4">
        &copy; {new Date().getFullYear()} SIMASMUH - Sistem Informasi Manajemen Sekolah Muhammadiyah
      </footer>
    </div>
  )
}
