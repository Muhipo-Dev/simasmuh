'use client'

import { useState } from 'react'
import { 
  Building2, User, Phone, FileText, Send, 
  Sparkles, Contact, Clock, RefreshCw, ShieldCheck, Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Swal from 'sweetalert2'
import { getPublicApiUrl } from '@/lib/api-config'

const KATEGORI_LABELS: Record<string, string> = {
  STUDI_TIRU: 'Studi Tiru / Banding',
  PEJABAT: 'Kunjungan Dinas / Pejabat',
  ALUMNI_IJAZAH: 'Layanan Alumni & Ijazah',
  VENDOR_UMUM: 'Tamu Umum & Mitra',
  ORANG_TUA: 'Orang Tua / Wali Murid',
  LAINNYA: 'Lainnya'
}

const DITUJU_ROLE_OPTIONS = [
  { value: 'Kepala Sekolah', label: 'Kepala Sekolah' },
  { value: 'Wakil Kepala Sekolah (Kurikulum)', label: 'Wakil Kepala Sekolah Bidang Kurikulum' },
  { value: 'Wakil Kepala Sekolah (Kesiswaan)', label: 'Wakil Kepala Sekolah Bidang Kesiswaan' },
  { value: 'Wakil Kepala Sekolah (Sarpras & Humas)', label: 'Wakil Kepala Sekolah Bidang Sarpras & Humas' },
  { value: 'Wakil Kepala Sekolah (Ismuba)', label: 'Wakil Kepala Sekolah Bidang ISMUBA' },
  { value: 'Tata Usaha / Administrasi', label: 'Tata Usaha / Administrasi Sekolah' },
  { value: 'Keuangan / Bendahara', label: 'Bagian Keuangan & Kasir' },
  { value: 'Kepegawaian / HRD', label: 'Bagian Kepegawaian (HRD)' },
  { value: 'Bimbingan Konseling (BK/BP)', label: 'Guru Bimbingan Konseling (BK / BP)' },
  { value: 'Wali Kelas / Guru Pengajar', label: 'Wali Kelas / Guru Mata Pelajaran' },
  { value: 'Ketertiban Sekolah', label: 'Tim Ketertiban & Kedisiplinan' },
  { value: 'Perpustakaan', label: 'Layanan Perpustakaan' },
  { value: 'Laboratorium & IT', label: 'Laboratorium & Tim IT' },
  { value: 'Petugas Keamanan', label: 'Petugas Keamanan / Pos Satpam' },
]

export default function PublicGuestBookPage() {
  const [loading, setLoading] = useState(false)
  const [submittedData, setSubmittedData] = useState<any>(null)

  const [formState, setFormState] = useState({
    namaTamu: '',
    instansi: '',
    kategori: 'STUDI_TIRU',
    tujuan: '',
    dituju: 'Kepala Sekolah',
    kontak: '',
    catatan: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formState.namaTamu.trim() || !formState.instansi.trim() || !formState.tujuan.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Formulir Belum Lengkap',
        text: 'Mohon lengkapi Nama Tamu, Instansi/Asal, serta Maksud dan Tujuan Kunjungan.',
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
        throw new Error(data.message || 'Gagal mencatat data kunjungan.')
      }

      setSubmittedData(data.data || formState)

      Swal.fire({
        icon: 'success',
        title: 'Pencatatan Berhasil',
        text: 'Data kunjungan Anda telah tersimpan rapi dalam Buku Tamu digital sekolah.',
        timer: 2500,
        showConfirmButton: false
      })
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Terjadi Kendala',
        text: err.message || 'Gagal terhubung ke peladen. Silakan coba kembali.',
        confirmButtonColor: '#ef4444'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-between p-3.5 sm:p-6 md:p-8 relative overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* Dynamic Background Glowing Blobs */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed top-1/2 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed -bottom-40 left-1/3 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Identitas Sekolah */}
      <header className="max-w-xl w-full mx-auto text-center space-y-2.5 z-10 pt-2 pb-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs font-medium backdrop-blur-md shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>SMA Muhammadiyah 1 Ponorogo</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2.5">
          <Contact className="w-7 h-7 text-blue-400 shrink-0" />
          <span>Buku Tamu Digital</span>
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
          Selamat datang. Mohon isi data diri dan maksud kedatangan Anda pada formulir resmi di bawah ini.
        </p>
      </header>

      {/* Konten Utama: Formulir / Ringkasan Kedatangan */}
      <main className="max-w-xl w-full mx-auto z-10 py-3">
        {submittedData ? (
          <Card className="border border-emerald-500/30 bg-slate-900/90 backdrop-blur-xl shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-300">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
            <CardHeader className="text-center pb-3 pt-5 px-5 sm:px-6">
              <div className="w-14 h-14 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3 text-emerald-400 shadow-lg shadow-emerald-500/10">
                <Check className="w-7 h-7 stroke-[2.5]" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-emerald-400">Kedatangan Telah Tercatat</CardTitle>
              <CardDescription className="text-slate-300 text-xs sm:text-sm mt-1">
                Data kunjungan Anda telah masuk ke Buku Tamu dan diteruskan kepada pihak yang dituju.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-1 px-5 sm:px-6 pb-6">
              <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-4 space-y-2.5 text-xs sm:text-sm divide-y divide-slate-800/60">
                <div className="flex items-start justify-between gap-3 pb-2">
                  <span className="text-slate-400 font-medium shrink-0">Nama Tamu</span>
                  <span className="font-semibold text-white text-right">{submittedData.namaTamu}</span>
                </div>
                <div className="flex items-start justify-between gap-3 pt-2.5 pb-2">
                  <span className="text-slate-400 font-medium shrink-0">Instansi / Asal</span>
                  <span className="font-semibold text-slate-200 text-right">{submittedData.instansi}</span>
                </div>
                <div className="flex items-center justify-between gap-3 pt-2.5 pb-2">
                  <span className="text-slate-400 font-medium shrink-0">Kategori</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30 text-xs font-semibold">
                    {KATEGORI_LABELS[submittedData.kategori] || submittedData.kategori}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3 pt-2.5 pb-2">
                  <span className="text-slate-400 font-medium shrink-0">Pihak Dituju</span>
                  <span className="font-semibold text-blue-300 text-right">{submittedData.dituju || 'Kepala Sekolah'}</span>
                </div>
                <div className="flex items-start justify-between gap-3 pt-2.5 pb-2">
                  <span className="text-slate-400 font-medium shrink-0">Maksud & Tujuan</span>
                  <span className="font-medium text-slate-300 text-right leading-snug">{submittedData.tujuan}</span>
                </div>
                {submittedData.kontak && (
                  <div className="flex items-center justify-between gap-3 pt-2.5 pb-2">
                    <span className="text-slate-400 font-medium shrink-0">Nomor Kontak</span>
                    <span className="font-medium text-slate-300 text-right">{submittedData.kontak}</span>
                  </div>
                )}
                {submittedData.catatan && (
                  <div className="flex items-start justify-between gap-3 pt-2.5 pb-2">
                    <span className="text-slate-400 font-medium shrink-0">Catatan</span>
                    <span className="font-medium text-slate-400 text-right text-xs italic">{submittedData.catatan}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 pt-2.5">
                  <span className="text-slate-400 font-medium shrink-0">Waktu Kedatangan</span>
                  <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {submittedData.waktu || 'Baru saja'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 text-center leading-relaxed">
                Silakan dipersilakan menunggu di ruang tamu utama atau meja resepsionis. Petugas kami akan segera menyambut dan melayani Anda.
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl text-slate-100 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
            <CardHeader className="space-y-1 pb-3 pt-4 px-5 sm:px-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <span>Formulir Kedatangan</span>
                </CardTitle>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 font-medium">
                  Tautan QR Resmi
                </span>
              </div>
              <CardDescription className="text-slate-400 text-xs leading-relaxed">
                Lengkapi identitas serta maksud kunjungan Anda pada formulir di bawah ini.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5 sm:px-6 pb-6">
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>Nama Lengkap / Rombongan Tamu</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </Label>
                  <Input 
                    placeholder="Contoh: Dr. H. Ahmad Dahlan / Tim Kunjungan Studi Tiru"
                    value={formState.namaTamu}
                    onChange={(e) => setFormState({ ...formState, namaTamu: e.target.value })}
                    required
                    className="bg-slate-950/70 border-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500 text-xs sm:text-sm h-9"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Instansi / Asal</span>
                      <span className="text-rose-500 font-bold">*</span>
                    </Label>
                    <Input 
                      placeholder="Contoh: Dinas Pendidikan Wilayah Ponorogo"
                      value={formState.instansi}
                      onChange={(e) => setFormState({ ...formState, instansi: e.target.value })}
                      required
                      className="bg-slate-950/70 border-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500 text-xs sm:text-sm h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Kategori Kunjungan</span>
                    </Label>
                    <Select 
                      value={formState.kategori}
                      onValueChange={(val) => { if (val) setFormState({ ...formState, kategori: val }) }}
                    >
                      <SelectTrigger className="bg-slate-950/70 border-slate-800 text-white text-xs sm:text-sm h-9">
                        <SelectValue placeholder="Pilih Kategori" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="STUDI_TIRU">Studi Tiru / Banding</SelectItem>
                        <SelectItem value="PEJABAT">Kunjungan Dinas / Pejabat</SelectItem>
                        <SelectItem value="ALUMNI_IJAZAH">Layanan Alumni & Ijazah</SelectItem>
                        <SelectItem value="VENDOR_UMUM">Tamu Umum & Mitra</SelectItem>
                        <SelectItem value="ORANG_TUA">Orang Tua / Wali Murid</SelectItem>
                        <SelectItem value="LAINNYA">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Contact className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Pihak / Bagian yang Dituju</span>
                      <span className="text-rose-500 font-bold">*</span>
                    </Label>
                    <Select 
                      value={formState.dituju}
                      onValueChange={(val) => { if (val) setFormState({ ...formState, dituju: val }) }}
                    >
                      <SelectTrigger className="bg-slate-950/70 border-slate-800 text-white text-xs sm:text-sm h-9">
                        <SelectValue placeholder="Pilih Pihak yang Dituju" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-60">
                        {DITUJU_ROLE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-amber-400" />
                      <span>Nomor Telepon / WhatsApp</span>
                    </Label>
                    <Input 
                      placeholder="Contoh: 081234567890"
                      value={formState.kontak}
                      onChange={(e) => setFormState({ ...formState, kontak: e.target.value })}
                      className="bg-slate-950/70 border-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500 text-xs sm:text-sm h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-rose-400" />
                    <span>Maksud & Tujuan Kunjungan</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </Label>
                  <Textarea 
                    placeholder="Jelaskan secara ringkas perihal atau agenda kunjungan Anda..."
                    value={formState.tujuan}
                    onChange={(e) => setFormState({ ...formState, tujuan: e.target.value })}
                    required
                    rows={2}
                    className="bg-slate-950/70 border-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500 resize-none text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-300">
                    Catatan Tambahan (Opsional)
                  </Label>
                  <Input 
                    placeholder="Contoh: Membawa berkas kerja sama / Jumlah rombongan 4 orang"
                    value={formState.catatan}
                    onChange={(e) => setFormState({ ...formState, catatan: e.target.value })}
                    className="bg-slate-950/70 border-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500 text-xs sm:text-sm h-9"
                  />
                </div>

                <Button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-2.5 shadow-lg shadow-blue-600/20 transition-all mt-3 h-10 text-xs sm:text-sm cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Menyimpan Data Kunjungan...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Simpan Data Kedatangan
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 z-10 py-2">
        &copy; {new Date().getFullYear()} SIMASMUH &bull; SMA Muhammadiyah 1 Ponorogo
      </footer>
    </div>
  )
}

