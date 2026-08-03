'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Sparkles, GraduationCap, Download, CheckCircle2, Send, Phone, Mail, FileText, ShieldCheck, MapPin, School, BookOpen, LogIn, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function PublicSPMBPage() {
  const [formData, setFormData] = useState({
    studentName: '',
    schoolOrigin: '',
    parentName: '',
    phone: '',
    email: '',
    majorChoice: 'MIPA'
  })
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.studentName || !formData.phone) {
      alert('Mohon isi Nama Lengkap dan No. WhatsApp.')
      return
    }
    setIsSubmitted(true)
  }

  const downloadBrochure = () => {
    // Generate a dummy brochure download or window alert
    const element = document.createElement('a')
    const file = new Blob([
      `BROSUR PENERIMAAN SISWA BARU (SPMB ONLINE 2026/2027)\n` +
      `SMA MUHAMMADIYAH 1 PONOROGO (MUHIPO)\n\n` +
      `Fasilitas Unggulan:\n` +
      `- Gedung Pembelajaran Berbasis Digital & AC\n` +
      `- Laboratorium IPA, Komputer, dan Bahasa Terintegrasi\n` +
      `- Asrama / Boarding School & Program Tahfidz\n` +
      `- Beasiswa Prestasi Akademik & Non-Akademik\n\n` +
      `Informasi Pendaftaran: https://simasmuh.sch.id/spmb`
    ], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = 'Brosur_SPMB_Online_MUHIPO_2026.txt'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      {/* Header Navbar Publik */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/pic_logo.png"
              alt="Logo SMA MUHIPO"
              width={150}
              height={50}
              priority
              className="object-contain h-9 sm:h-12 w-auto"
            />
          </Link>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-8">
            <Link href="/" className="text-slate-600 dark:text-slate-300 hover:text-[#2B50A1] dark:hover:text-blue-400 font-semibold transition-colors">Beranda</Link>
            <Link href="/profil" className="text-slate-600 dark:text-slate-300 hover:text-[#2B50A1] dark:hover:text-blue-400 font-semibold transition-colors">Profil</Link>
            <Link href="/tentang" className="text-slate-600 dark:text-slate-300 hover:text-[#2B50A1] dark:hover:text-blue-400 font-semibold transition-colors">Tentang</Link>
            <Link href="/berita" className="text-slate-600 dark:text-slate-300 hover:text-[#2B50A1] dark:hover:text-blue-400 font-semibold transition-colors">Berita</Link>
            <Link href="/spmb" className="text-[#2B50A1] dark:text-blue-400 font-bold transition-colors">SPMB Online</Link>

            <div className="flex items-center gap-4 border-l border-slate-200 dark:border-slate-800 pl-8">
              <ThemeToggle />
              <Link href="/login" className="bg-[#2B50A1] hover:bg-[#1f3c7a] dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-5 py-2.5 rounded-full font-bold text-sm flex items-center transition-all shadow-sm hover:shadow-md active:scale-95">
                <LogIn className="w-4 h-4 mr-2" />
                Login SIMASMUH
              </Link>
            </div>
          </div>

          {/* Mobile Menu */}
          <div className="lg:hidden flex items-center gap-2.5">
            <ThemeToggle size="sm" />
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button variant="ghost" size="icon" className="bg-[#2B50A1] text-white hover:bg-[#1f3c7a]">
                  <Menu className="h-5 w-5" />
                </Button>
              } />
              <DropdownMenuContent align="end" className="w-60 mt-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-2 shadow-xl rounded-xl">
                <DropdownMenuItem>
                  <Link href="/" className="w-full py-2 px-3 text-sm font-semibold">Beranda</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/profil" className="w-full py-2 px-3 text-sm font-semibold">Profil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/tentang" className="w-full py-2 px-3 text-sm font-semibold">Tentang</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/berita" className="w-full py-2 px-3 text-sm font-semibold">Berita</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/spmb" className="w-full py-2 px-3 text-sm font-bold text-[#2B50A1] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 rounded-lg">SPMB Online</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem>
                  <Link href="/login" className="w-full py-2 px-3 text-sm font-bold text-white bg-[#2B50A1] rounded-lg flex items-center justify-center">
                    <LogIn className="w-4 h-4 mr-2" />
                    Login SIMASMUH
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 w-full">
        {/* Banner Hero Coming Soon SPMB */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2B50A1] via-indigo-900 to-slate-900 p-8 sm:p-12 text-white shadow-2xl border border-white/10">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-amber-300 text-xs font-extrabold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>SPMB ONLINE 2026/2027 (d/h PPDB Online)</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Sistem Penerimaan Murid Baru Online
            </h1>
            <p className="text-blue-100/90 text-base sm:text-lg leading-relaxed font-normal max-w-2xl">
              Portal Resmi Pendaftaran Calon Siswa Baru SMA Muhammadiyah 1 Ponorogo. Dapatkan informasi brosur penerimaan dan isi formulir pra-pendaftaran awal di bawah ini.
            </p>
          </div>
        </div>

        {/* Section Utama: Form Pra-Pendaftaran + Brosur Digital */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Pra-Pendaftaran SPMB (Left Col: 7) */}
          <div className="lg:col-span-7">
            <Card className="border-slate-200 dark:border-slate-800 shadow-md dark:bg-slate-900/90 rounded-2xl overflow-hidden">
              <CardHeader className="bg-blue-50/80 dark:bg-slate-800/80 border-b border-blue-100 dark:border-slate-800 p-6">
                <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                  <GraduationCap className="w-6 h-6 text-[#2B50A1] dark:text-blue-400" />
                  Formulir Pra-Pendaftaran SPMB Online
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300 text-sm font-medium">
                  Isi formulir pra-pendaftaran di bawah ini agar Panitia SPMB dapat menghubungi Anda lebih awal saat pendaftaran resmi dibuka.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {!isSubmitted ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="studentName" className="font-bold text-slate-800 dark:text-slate-200">Nama Lengkap Calon Siswa *</Label>
                      <Input
                        id="studentName"
                        placeholder="Contoh: Muhammad Rizky"
                        value={formData.studentName}
                        onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                        required
                        className="bg-white dark:bg-slate-950 font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="schoolOrigin" className="font-bold text-slate-800 dark:text-slate-200">Asal Sekolah (SMP/MTs) *</Label>
                        <Input
                          id="schoolOrigin"
                          placeholder="Contoh: SMP Negeri 1 Ponorogo"
                          value={formData.schoolOrigin}
                          onChange={(e) => setFormData({ ...formData, schoolOrigin: e.target.value })}
                          required
                          className="bg-white dark:bg-slate-950"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="parentName" className="font-bold text-slate-800 dark:text-slate-200">Nama Orang Tua / Wali</Label>
                        <Input
                          id="parentName"
                          placeholder="Contoh: Bambang S."
                          value={formData.parentName}
                          onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                          className="bg-white dark:bg-slate-950"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="font-bold text-slate-800 dark:text-slate-200">No. WhatsApp / Telepon *</Label>
                        <Input
                          id="phone"
                          placeholder="Contoh: 081234567890"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          required
                          className="bg-white dark:bg-slate-950"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="font-bold text-slate-800 dark:text-slate-200">Email Calon Siswa / Ortu</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="email@gmail.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="bg-white dark:bg-slate-950"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="majorChoice" className="font-bold text-slate-800 dark:text-slate-200">Peminatan / Pilihan Program</Label>
                      <select
                        id="majorChoice"
                        value={formData.majorChoice}
                        onChange={(e) => setFormData({ ...formData, majorChoice: e.target.value })}
                        className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="MIPA" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Matematika & IPA (MIPA)</option>
                        <option value="IPS" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Ilmu Pengetahuan Sosial (IPS)</option>
                        <option value="TAHFIDZ" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Kelas Unggulan Tahfidz & Boarding</option>
                      </select>
                    </div>

                    <Button type="submit" className="w-full bg-[#2B50A1] hover:bg-[#1f3c7a] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-extrabold py-6 rounded-xl text-base shadow-md transition-all">
                      <Send className="w-5 h-5 mr-2" />
                      Kirim Pra-Pendaftaran SPMB
                    </Button>
                  </form>
                ) : (
                  <div className="py-8 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Pra-Pendaftaran Berhasil Dikirim!</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                      Terima kasih <strong>{formData.studentName}</strong>. Data Anda telah tercatat pada sistem SPMB Online SMA MUHIPO. Panitia pendaftaran akan menghubungi WhatsApp Anda (<strong>{formData.phone}</strong>) mengenai petunjuk gelombang pendaftaran.
                    </p>
                    <Button onClick={() => setIsSubmitted(false)} variant="outline" className="font-bold text-xs">
                      Isi Form Kembali
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Brosur Penerimaan Siswa Baru (Right Col: 5) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-slate-200 dark:border-slate-800 shadow-md dark:bg-slate-900/90 rounded-2xl overflow-hidden">
              <CardHeader className="bg-emerald-50/80 dark:bg-slate-800/80 border-b border-emerald-100 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                    <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    Brosur SPMB 2026/2027
                  </CardTitle>
                  <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs rounded-full border border-emerald-200 dark:border-emerald-800">
                    Brosur Digital
                  </span>
                </div>
                <CardDescription className="text-slate-600 dark:text-slate-300 text-sm font-medium">
                  Unduh brosur resmi penerimaan murid baru untuk mempelajari fasilitas & beasiswa.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {/* Visual Preview Brosur Card */}
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white p-6 shadow-md space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300 font-black text-lg border border-white/20">
                      M
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-base">SMA MUHAMMADIYAH 1 PONOROGO</h4>
                      <p className="text-xs text-blue-200">Brosur Resmi SPMB Online 2026/2027</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-blue-100/90 border-t border-white/10 pt-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Terakreditasi A (Unggul) & Ter sertifikasi ISO</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <School className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Program Unggulan Tahfidz, MIPA, IPS & Boarding</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>Beasiswa Prestasi & Bebas Biaya Formulir</span>
                    </div>
                  </div>

                  <Button onClick={downloadBrochure} className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold rounded-xl text-sm shadow-md transition-all">
                    <Download className="w-4 h-4 mr-2" />
                    Unduh Brosur Digital (PDF)
                  </Button>
                </div>

                {/* Kontak Layanan Panitia SPMB */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <h5 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Layanan Kontak Panitia SPMB
                  </h5>
                  <p className="text-slate-600 dark:text-slate-300 font-medium">
                    WhatsApp Panitia: <strong>0812-3456-7890 / 0857-1234-5678</strong>
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 font-medium">
                    Alamat Kampus: Jl. Soekarno Hatta No. 94, Ponorogo, Jawa Timur.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer Publik */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 shadow-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Copyright &copy; 2026 - Muhipo Dev</span>
          <span className="text-slate-400 dark:text-slate-500">SPMB Online (Sistem Penerimaan Murid Baru)</span>
        </div>
      </footer>
    </div>
  )
}
