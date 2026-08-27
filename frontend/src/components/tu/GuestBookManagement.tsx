'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { 
  Contact, QrCode, Copy, Download, Printer, PlusCircle, Search, 
  Filter, RefreshCw, CheckCircle2, Clock, Trash2, Pencil, Users, 
  Building2, Award, FileSpreadsheet, ExternalLink, Sparkles, Phone, Calendar
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import { getPublicApiUrl } from '@/lib/api-config'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

export type GuestEntry = {
  id: string
  namaTamu: string
  instansi: string
  kategori: 'STUDI_TIRU' | 'PEJABAT' | 'ALUMNI_IJAZAH' | 'VENDOR_UMUM' | 'ORANG_TUA' | 'LAINNYA'
  tujuan: string
  dituju: string
  tanggal: string
  waktu: string
  status: 'TIBA' | 'PROSES' | 'SELESAI'
  kontak: string
  catatan: string
  createdAt?: string
}

export function GuestBookManagement() {
  const [guests, setGuests] = useState<GuestEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedKategori, setSelectedKategori] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [qrUrl, setQrUrl] = useState<string>('')
  const qrRef = useRef<HTMLDivElement>(null)

  const [formState, setFormState] = useState({
    namaTamu: '',
    instansi: '',
    kategori: 'STUDI_TIRU' as GuestEntry['kategori'],
    tujuan: '',
    dituju: 'Tata Usaha',
    kontak: '',
    catatan: ''
  })

  const authenticatedFetch = useAuthenticatedFetch()

  // Set adaptive QR URL on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin
      setQrUrl(`${origin}/buku-tamu`)
    }
  }, [])

  // Fetch Guestbook entries from backend API
  const fetchGuests = async () => {
    setLoading(true)
    try {
      const res = await authenticatedFetch(getPublicApiUrl('/guest-book'))
      if (res.ok) {
        const json = await res.json()
        if (json.data) {
          setGuests(json.data)
        }
      }
    } catch (err) {
      console.error('Failed to fetch guestbook:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGuests()
  }, [])

  const filteredGuests = useMemo(() => {
    return guests.filter(g => {
      const matchKategori = selectedKategori === 'ALL' || g.kategori === selectedKategori
      const matchStatus = selectedStatus === 'ALL' || g.status === selectedStatus
      const q = searchQuery.toLowerCase()
      const matchSearch = 
        g.namaTamu?.toLowerCase().includes(q) ||
        g.instansi?.toLowerCase().includes(q) ||
        g.tujuan?.toLowerCase().includes(q) ||
        g.dituju?.toLowerCase().includes(q) ||
        g.kontak?.toLowerCase().includes(q)
      return matchKategori && matchStatus && matchSearch
    })
  }, [guests, selectedKategori, selectedStatus, searchQuery])

  const handleCopyLink = () => {
    if (!qrUrl) return
    navigator.clipboard.writeText(qrUrl)
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Tautan QR Statis Berhasil Disalin!',
      showConfirmButton: false,
      timer: 2000
    })
  }

  const handleDownloadQR = () => {
    const svgElement = qrRef.current?.querySelector('svg')
    if (!svgElement) return

    const svgData = new XMLSerializer().serializeToString(svgElement)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      canvas.width = 500
      canvas.height = 500
      if (ctx) {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 25, 25, 450, 450)
      }
      const pngFile = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.href = pngFile
      downloadLink.download = `QR_Buku_Tamu_SIMASMUH.png`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  const handlePrintBadge = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const fullQrUrl = qrUrl || (typeof window !== 'undefined' ? `${window.location.origin}/buku-tamu` : 'http://localhost:3000/buku-tamu')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <title>Buku Tamu Digital - SMA Muhammadiyah 1 Ponorogo</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
              background-color: #f1f5f9;
              color: #0f172a;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              padding: 10px;
            }
            /* Pembungkus Halaman A4 & Panduan Potong A6 */
            .cut-wrapper {
              position: relative;
              padding: 4px;
              border: 1.5px dashed #64748b;
              border-radius: 20px;
              background: #ffffff;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
            }
            .cut-label {
              position: absolute;
              top: -11px;
              left: 24px;
              background: #ffffff;
              padding: 0 10px;
              font-size: 10px;
              color: #475569;
              font-weight: 700;
              letter-spacing: 0.5px;
            }
            /* Kartu Display Standee A6 (105mm x 148mm) */
            .standee-container {
              width: 105mm;
              height: 148mm;
              background: #ffffff;
              border: 2px solid #1e3a8a;
              border-radius: 16px;
              overflow: hidden;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              position: relative;
            }
            /* Header Kop Sekolah */
            .header-banner {
              background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%);
              padding: 10px 14px 8px;
              color: #ffffff;
              text-align: center;
              position: relative;
              border-bottom: 3.5px solid #f59e0b;
            }
            .kop-wrapper {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
            }
            .logo-img {
              width: 36px;
              height: 36px;
              object-fit: contain;
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));
            }
            .kop-text {
              flex: 1;
              text-align: center;
            }
            .kop-instansi {
              font-size: 7.5px;
              font-weight: 700;
              letter-spacing: 0.8px;
              text-transform: uppercase;
              color: #93c5fd;
              line-height: 1.25;
              margin-bottom: 1.5px;
            }
            .kop-sekolah {
              font-size: 12.5px;
              font-weight: 900;
              letter-spacing: 0.5px;
              color: #ffffff;
              text-transform: uppercase;
              line-height: 1.15;
            }
            .kop-tagline {
              font-size: 7.5px;
              color: #e2e8f0;
              margin-top: 1.5px;
              font-weight: 500;
            }

            /* Content Body */
            .standee-body {
              padding: 12px 14px 10px;
              text-align: center;
              background: #ffffff;
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
              gap: 8px;
            }
            
            /* Bagian Atas: Judul & Greeting */
            .intro-section {
              width: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 5px;
            }
            .main-heading {
              font-size: 19px;
              font-weight: 900;
              color: #1e3a8a;
              letter-spacing: 0.8px;
              text-transform: uppercase;
              line-height: 1.1;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 3px;
              width: 100%;
            }
            .greeting-text {
              font-size: 10px;
              color: #334155;
              line-height: 1.4;
              width: 100%;
            }
            .greeting-text .welcome {
              font-weight: 800;
              color: #0f172a;
              font-size: 11px;
              display: block;
            }
            .greeting-text .instruction {
              font-weight: 500;
              color: #475569;
              display: block;
              margin-top: 2px;
            }

            /* Bagian Tengah: QR Box Frame */
            .qr-section {
              width: 100%;
              display: flex;
              justify-content: center;
            }
            .qr-frame {
              padding: 9px 12px 7px;
              background: #ffffff;
              border: 2.5px solid #2563eb;
              border-radius: 16px;
              display: flex;
              flex-direction: column;
              align-items: center;
              box-shadow: 0 6px 18px rgba(37, 99, 235, 0.12);
              width: 90%;
              max-width: 230px;
            }
            .qr-frame svg {
              display: block;
              width: 162px !important;
              height: 162px !important;
            }
            .scan-callout {
              margin-top: 6px;
              background: #1e3a8a;
              color: #ffffff;
              font-size: 9px;
              font-weight: 800;
              letter-spacing: 0.8px;
              padding: 3.5px 12px;
              border-radius: 5px;
              text-transform: uppercase;
              width: 100%;
              text-align: center;
            }

            /* Bagian Bawah: Guide Bar */
            .instruction-section {
              width: 100%;
            }
            .guide-card {
              display: flex;
              align-items: center;
              justify-content: space-between;
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 10px;
              padding: 6px 10px;
              width: 100%;
              gap: 6px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.03);
            }
            .guide-item {
              flex: 1;
              display: flex;
              align-items: center;
              gap: 5px;
              text-align: left;
            }
            .guide-item + .guide-item {
              border-left: 1px solid #cbd5e1;
              padding-left: 8px;
            }
            .guide-badge {
              width: 19px;
              height: 19px;
              background: #2563eb;
              color: #ffffff;
              font-size: 10px;
              font-weight: 900;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .guide-text {
              line-height: 1.2;
            }
            .guide-title {
              font-size: 9px;
              font-weight: 800;
              color: #1e293b;
            }
            .guide-sub {
              font-size: 7.5px;
              font-weight: 500;
              color: #64748b;
            }

            /* Footer */
            .standee-footer {
              background: #0f172a;
              color: #cbd5e1;
              padding: 6px 14px;
              font-size: 8px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-top: 1px solid #1e293b;
            }
            .footer-left {
              font-weight: 700;
              color: #f1f5f9;
            }
            .footer-right {
              color: #94a3b8;
              font-size: 7.5px;
              font-weight: 600;
            }

            @media print {
              body {
                background: #ffffff;
                padding: 0;
              }
              .cut-wrapper {
                margin: 0 auto;
                border: 1.5px dashed #94a3b8;
                box-shadow: none;
              }
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          </style>
        </head>
        <body>
          <div class="cut-wrapper">
            <div class="cut-label">✂ Garis Panduan Potong Ukuran A6 (105 x 148 mm)</div>
            
            <div class="standee-container">
              <!-- Header Banner Kop -->
              <div class="header-banner">
                <div class="kop-wrapper">
                  <img class="logo-img" src="/muhammadiyah-logo-40493.png" alt="Logo Majelis Dikdasmen" onerror="this.style.display='none'" />
                  <div class="kop-text">
                    <div class="kop-instansi">Majelis Dikdasmen & PNF PWM Jawa Timur</div>
                    <div class="kop-sekolah">SMA Muhammadiyah 1 Ponorogo</div>
                    <div class="kop-tagline">Jl. Batoro Katong No. 6B Ponorogo | Telp. (0352) 481521</div>
                  </div>
                  <img class="logo-img" src="/pic_logo.png" alt="Logo Sekolah" onerror="this.style.display='none'" />
                </div>
              </div>

              <!-- Body Isi -->
              <div class="standee-body">
                <!-- Bagian 1: Judul & Informasi Sambutan -->
                <div class="intro-section">
                  <h1 class="main-heading">BUKU TAMU DIGITAL</h1>
                  <div class="greeting-text">
                    <span class="welcome">Selamat datang di SMA Muhammadiyah 1 Ponorogo,</span>
                    <span class="instruction">Bapak/Ibu tamu dimohon untuk dapat memindai QR code di bawah ini, untuk mengisi formulir registrasi kedatangan.</span>
                  </div>
                </div>

                <!-- Bagian 2: QR Code Frame -->
                <div class="qr-section">
                  <div class="qr-frame">
                    ${qrRef.current?.innerHTML || ''}
                    <div class="scan-callout">Pindai dengan Kamera HP</div>
                  </div>
                </div>

                <!-- Bagian 3: Instruksi 3 Langkah -->
                <div class="instruction-section">
                  <div class="guide-card">
                    <div class="guide-item">
                      <div class="guide-badge">1</div>
                      <div class="guide-text">
                        <div class="guide-title">Scan QR Code</div>
                        <div class="guide-sub">Buka kamera HP</div>
                      </div>
                    </div>
                    <div class="guide-item">
                      <div class="guide-badge">2</div>
                      <div class="guide-text">
                        <div class="guide-title">Isi Identitas</div>
                        <div class="guide-sub">Nama & instansi</div>
                      </div>
                    </div>
                    <div class="guide-item">
                      <div class="guide-badge">3</div>
                      <div class="guide-text">
                        <div class="guide-title">Kirim Form</div>
                        <div class="guide-sub">Tercatat di sistem</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="standee-footer">
                <div class="footer-left">SIMASMUH — SMA Muhammadiyah 1 Ponorogo</div>
                <div class="footer-right">&copy; ${new Date().getFullYear()}</div>
              </div>
            </div>
          </div>

          <script>
            window.onload = function() { 
              setTimeout(function() {
                window.print(); 
                window.close();
              }, 350);
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleAddGuest = async () => {
    if (!formState.namaTamu || !formState.instansi || !formState.tujuan) {
      Swal.fire('Form Belum Lengkap', 'Nama Tamu, Instansi, dan Keperluan wajib diisi.', 'warning')
      return
    }

    try {
      const res = await authenticatedFetch(getPublicApiUrl('/guest-book'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState)
      })

      const json = await res.json()

      if (res.ok) {
        setIsAddModalOpen(false)
        setFormState({
          namaTamu: '',
          instansi: '',
          kategori: 'STUDI_TIRU',
          tujuan: '',
          dituju: 'Tata Usaha',
          kontak: '',
          catatan: ''
        })
        fetchGuests()
        Swal.fire({
          icon: 'success',
          title: 'Tamu Berhasil Ditambahkan',
          text: `Data kedatangan "${json.data?.namaTamu}" telah dicatat.`,
          timer: 2000,
          showConfirmButton: false
        })
      } else {
        throw new Error(json.message || 'Gagal menyimpan data tamu.')
      }
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Terjadi kesalahan sistem.', 'error')
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: GuestEntry['status']) => {
    try {
      const res = await authenticatedFetch(getPublicApiUrl(`/guest-book/${id}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        setGuests(guests.map(g => g.id === id ? { ...g, status: newStatus } : g))
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `Status Tamu Diperbarui: ${newStatus}`,
          showConfirmButton: false,
          timer: 1500
        })
      }
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const handleDelete = async (id: string, nama: string) => {
    const confirm = await Swal.fire({
      title: 'Hapus Entri Tamu?',
      text: `Apakah Anda yakin ingin menghapus data kedatangan "${nama}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Data',
      cancelButtonText: 'Batal'
    })

    if (confirm.isConfirmed) {
      try {
        const res = await authenticatedFetch(getPublicApiUrl(`/guest-book/${id}`), {
          method: 'DELETE'
        })
        if (res.ok) {
          setGuests(guests.filter(g => g.id !== id))
          Swal.fire('Terhapus', 'Data tamu berhasil dihapus.', 'success')
        }
      } catch (err) {
        Swal.fire('Error', 'Gagal menghapus data tamu.', 'error')
      }
    }
  }

  const handleExportExcel = () => {
    if (filteredGuests.length === 0) return
    const exportData = filteredGuests.map((g, idx) => ({
      No: idx + 1,
      'Nama Tamu': g.namaTamu,
      'Instansi / Asal': g.instansi,
      Kategori: g.kategori,
      'Keperluan / Tujuan': g.tujuan,
      'Person / Dituju': g.dituju,
      Waktu: g.waktu || '-',
      Status: g.status,
      Kontak: g.kontak || '-',
      Catatan: g.catatan || '-'
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Log Buku Tamu')
    XLSX.writeFile(wb, `Buku_Tamu_SIMASMUH_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div className="space-y-6">
      {/* Header Banner & Static QR Code Generator */}
      <Card className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white border-blue-800 shadow-xl overflow-hidden relative">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <CardContent className="p-6 relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Sistem Buku Tamu Otomatis QR</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center md:justify-start gap-2">
              <Contact className="w-7 h-7 text-blue-400" />
              <span>Buku Tamu Digital Tata Usaha</span>
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
              Gunakan QR Code di samping untuk ditempatkan pada Meja Resepsionis / Front Desk. Tamu dapat memindai QR code ini untuk mengisi formulir kedatangan secara mandiri.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-2">
              <Button 
                onClick={handleCopyLink} 
                variant="secondary"
                size="sm"
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs gap-1.5"
              >
                <Copy className="w-3.5 h-3.5 text-blue-400" />
                Salin Tautan Form QR
              </Button>
              <Button 
                onClick={handleDownloadQR} 
                variant="secondary"
                size="sm"
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                Unduh Gambar QR Code
              </Button>
              <Button 
                onClick={handlePrintBadge} 
                variant="secondary"
                size="sm"
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-purple-400" />
                Cetak Display Resepsionis
              </Button>
            </div>
          </div>

          {/* QR Code Canvas Card */}
          <div className="bg-white p-4 rounded-2xl shadow-2xl flex flex-col items-center justify-center border-4 border-blue-500/30 text-slate-900 shrink-0">
            <div ref={qrRef} className="p-2 bg-white rounded-lg">
              <QRCodeSVG 
                value={qrUrl || 'http://localhost:3000/buku-tamu'} 
                size={140}
                level="H"
                includeMargin={true}
              />
            </div>
            <div className="mt-2 text-center">
              <span className="text-[11px] font-extrabold text-blue-700 tracking-wider uppercase block">Pindai Formulir Tamu</span>
              <span className="text-[10px] text-slate-500 font-mono block max-w-[160px] truncate">{qrUrl}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 dark:bg-slate-900 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total Tamu Registrasi</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{guests.length}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Tercatat di Log Tata Usaha</p>
            </div>
            <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100 dark:bg-slate-900 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Studi Tiru / Banding</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {guests.filter(g => g.kategori === 'STUDI_TIRU').length}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Rombongan Kunjungan</p>
            </div>
            <div className="w-12 h-12 bg-purple-600 text-white rounded-xl flex items-center justify-center shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100 dark:bg-slate-900 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Sedang Diproses</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {guests.filter(g => g.status === 'PROSES' || g.status === 'TIBA').length}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Status Aktif Tiba / Bertemu</p>
            </div>
            <div className="w-12 h-12 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-md">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100 dark:bg-slate-900 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Selesai Berkunjung</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {guests.filter(g => g.status === 'SELESAI').length}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Kunjungan Selesai</p>
            </div>
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Panel */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-md">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Data & Log Kedatangan Tamu</span>
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300">
                  {filteredGuests.length} Entri
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Pencatatan riwayat tamu dari Formulir QR & Registrasi Manual Staf TU.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
                size="sm"
              >
                <PlusCircle className="w-4 h-4" />
                Tambah Manual
              </Button>

              <Button 
                onClick={handleExportExcel}
                variant="outline"
                size="sm"
                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950 text-xs gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Ekspor Excel
              </Button>

              <Button 
                onClick={fetchGuests}
                variant="outline"
                size="sm"
                className="text-slate-600 text-xs"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                placeholder="Cari nama, instansi, keperluan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <Select value={selectedKategori} onValueChange={(val) => { if (val) setSelectedKategori(val) }}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Kategori</SelectItem>
                <SelectItem value="STUDI_TIRU">Studi Tiru / Banding</SelectItem>
                <SelectItem value="PEJABAT">Dinas / Pejabat</SelectItem>
                <SelectItem value="ALUMNI_IJAZAH">Alumni / Legalisir</SelectItem>
                <SelectItem value="VENDOR_UMUM">Vendor / Umum</SelectItem>
                <SelectItem value="ORANG_TUA">Orang Tua / Wali</SelectItem>
                <SelectItem value="LAINNYA">Lainnya</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={(val) => { if (val) setSelectedStatus(val) }}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                <SelectItem value="TIBA">Tiba</SelectItem>
                <SelectItem value="PROSES">Dalam Proses</SelectItem>
                <SelectItem value="SELESAI">Selesai</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="text-xs">Memuat data log buku tamu...</p>
            </div>
          ) : filteredGuests.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <Contact className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold">Belum Ada Data Kedatangan Tamu</p>
              <p className="text-xs text-slate-500">Silakan gunakan form QR atau tombol Tambah Manual untuk mencatat kedatangan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs">No</TableHead>
                    <TableHead className="text-xs">Nama Tamu & Instansi</TableHead>
                    <TableHead className="text-xs">Kategori & Dituju</TableHead>
                    <TableHead className="text-xs">Keperluan / Tujuan</TableHead>
                    <TableHead className="text-xs">Waktu Kedatangan</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGuests.map((g, idx) => (
                    <TableRow key={g.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 text-xs">
                      <TableCell className="text-center font-medium text-slate-500">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="font-bold text-slate-900 dark:text-white">{g.namaTamu}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {g.instansi}
                        </div>
                        {g.kontak && (
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5" />
                            {g.kontak}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {g.kategori}
                        </Badge>
                        <div className="text-[11px] text-slate-500 mt-1">
                          <span className="font-medium">Dituju:</span> {g.dituju}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-slate-800 dark:text-slate-200 line-clamp-2">{g.tujuan}</p>
                        {g.catatan && (
                          <span className="text-[10px] text-slate-400 italic block mt-0.5">Ket: {g.catatan}</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="font-semibold text-slate-700 dark:text-slate-300">{g.waktu || '09:00 WIB'}</div>
                        <div className="text-[10px] text-slate-400">
                          {g.createdAt ? new Date(g.createdAt).toLocaleDateString('id-ID') : new Date().toLocaleDateString('id-ID')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={g.status}
                          onValueChange={(val) => { if (val) handleUpdateStatus(g.id, val as GuestEntry['status']) }}
                        >
                          <SelectTrigger className={`h-7 text-[11px] font-semibold border-0 ${
                            g.status === 'TIBA' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                            g.status === 'PROSES' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                            'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          }`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TIBA">Tiba</SelectItem>
                            <SelectItem value="PROSES">Proses Bertemu</SelectItem>
                            <SelectItem value="SELESAI">Selesai</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          onClick={() => handleDelete(g.id, g.namaTamu)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Add Guest Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <PlusCircle className="w-5 h-5 text-blue-600" />
              <span>Tambah Data Tamu Manual</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Formulir pencatatan kedatangan tamu secara langsung oleh petugas Tata Usaha.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Nama Tamu / Rombongan *</Label>
              <Input 
                placeholder="Nama lengkap tamu..."
                value={formState.namaTamu}
                onChange={(e) => setFormState({ ...formState, namaTamu: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Instansi / Asal Tamu *</Label>
              <Input 
                placeholder="Nama sekolah / instansi / umum..."
                value={formState.instansi}
                onChange={(e) => setFormState({ ...formState, instansi: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Kategori Tamu</Label>
                <Select 
                  value={formState.kategori}
                  onValueChange={(val) => { if (val) setFormState({ ...formState, kategori: val as GuestEntry['kategori'] }) }}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STUDI_TIRU">Studi Tiru / Banding</SelectItem>
                    <SelectItem value="PEJABAT">Dinas / Pejabat</SelectItem>
                    <SelectItem value="ALUMNI_IJAZAH">Alumni / Legalisir</SelectItem>
                    <SelectItem value="VENDOR_UMUM">Vendor / Umum</SelectItem>
                    <SelectItem value="ORANG_TUA">Orang Tua / Wali</SelectItem>
                    <SelectItem value="LAINNYA">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Person / Dituju</Label>
                <Input 
                  placeholder="Tata Usaha / Kepala..."
                  value={formState.dituju}
                  onChange={(e) => setFormState({ ...formState, dituju: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Nomor WhatsApp / Kontak</Label>
              <Input 
                placeholder="0812..."
                value={formState.kontak}
                onChange={(e) => setFormState({ ...formState, kontak: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Tujuan / Keperluan *</Label>
              <Textarea 
                placeholder="Maksud kedatangan..."
                value={formState.tujuan}
                onChange={(e) => setFormState({ ...formState, tujuan: e.target.value })}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Catatan Tambahan (Opsional)</Label>
              <Input 
                placeholder="Catatan..."
                value={formState.catatan}
                onChange={(e) => setFormState({ ...formState, catatan: e.target.value })}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleAddGuest} className="bg-blue-600 hover:bg-blue-700 text-white">
              Simpan Data Tamu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
