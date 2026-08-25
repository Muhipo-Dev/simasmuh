'use client'

import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Package, Boxes, Plus, Search, Filter, Printer, Download, 
  Eye, CheckCircle2, AlertTriangle, XCircle, Building2, User, 
  Calendar, Tag, QrCode, FileSpreadsheet, Sparkles, RefreshCw, 
  Trash2, Edit3, ShieldCheck, MapPin, Layers, Wrench, BarChart3,
  Check, X, DollarSign, Archive
} from 'lucide-react'
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

export interface ItemInventaris {
  id: string
  kodeAset: string
  namaBarang: string
  kategori: 'ELEKTRONIK_TIK' | 'FURNITUR_MEUBELAIR' | 'ALAT_LABORATORIUM' | 'SARANA_OLAHRAGA' | 'KENDARAAN_DINAS' | 'BUKU_PERPUSTAKAAN' | 'PERLENGKAPAN_KELAS'
  merkModel: string
  jumlah: number
  satuan: 'Unit' | 'Set' | 'Buah' | 'Paket' | 'Ruang'
  kondisi: 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT'
  lokasiRuangan: string
  penanggungJawab: string
  tahunPerolehan: string
  sumberDana: 'BOS_REGULER' | 'RAPBS_KOMITE' | 'YAYASAN_PDM' | 'HIBAH_PEMERINTAH' | 'WAKAF'
  hargaPerolehan: number
  statusPenggunaan: 'DIGUNAKAN' | 'DIPINJAM' | 'DALAM_PERBAIKAN' | 'DIHAPUSKAN'
  catatan?: string
  fotoUrl?: string
}

export interface LokasiRuangan {
  id: string
  namaRuangan: string
  gedung: string
  penanggungJawab: string
  kontakPJ: string
  kapasitas: number
  jumlahAset: number
}

// Initial Mock Data Inventaris SMA MUHIPO
const INITIAL_INVENTARIS: ItemInventaris[] = [
  {
    id: 'AST-001',
    kodeAset: 'AST/TIK/LAB-KOMP1/2025/001',
    namaBarang: 'Komputer PC All-in-One Core i7 16GB SSD 512GB',
    kategori: 'ELEKTRONIK_TIK',
    merkModel: 'Lenovo IdeaCentre AIO 3',
    jumlah: 36,
    satuan: 'Unit',
    kondisi: 'BAIK',
    lokasiRuangan: 'Laboratorium Komputer 1 (Gd. Ismuba Lt. 2)',
    penanggungJawab: 'Deni Setiawan, S.Kom (Kepala Lab Komputer)',
    tahunPerolehan: '2025',
    sumberDana: 'RAPBS_KOMITE',
    hargaPerolehan: 11500000,
    statusPenggunaan: 'DIGUNAKAN',
    catatan: 'Digunakan aktif untuk Praktik IT, CBT, dan Ujian e-Rapor'
  },
  {
    id: 'AST-002',
    kodeAset: 'AST/TIK/AULA/2024/014',
    namaBarang: 'Videotron LED Display P2.5 Indoor (4 x 2.5 Meter)',
    kategori: 'ELEKTRONIK_TIK',
    merkModel: 'Absen Opto D2.5 Series',
    jumlah: 1,
    satuan: 'Set',
    kondisi: 'BAIK',
    lokasiRuangan: 'Aula Utama KH. Ahmad Dahlan',
    penanggungJawab: 'Staf Sarpras & Audio Visual',
    tahunPerolehan: '2024',
    sumberDana: 'HIBAH_PEMERINTAH',
    hargaPerolehan: 85000000,
    statusPenggunaan: 'DIGUNAKAN',
    catatan: 'Layar presentasi utama seminar, wisuda, dan kajian'
  },
  {
    id: 'AST-003',
    kodeAset: 'AST/FURN/R-GURU/2024/022',
    namaBarang: 'Meja Kerja & Kursi Ergonomis Guru',
    kategori: 'FURNITUR_MEUBELAIR',
    merkModel: 'Chitose Office Series',
    jumlah: 48,
    satuan: 'Set',
    kondisi: 'BAIK',
    lokasiRuangan: 'Ruang Guru & Pendidik Utama',
    penanggungJawab: 'Ahmad Fauzi, S.E (Kepala TU)',
    tahunPerolehan: '2024',
    sumberDana: 'BOS_REGULER',
    hargaPerolehan: 1450000,
    statusPenggunaan: 'DIGUNAKAN',
    catatan: 'Fasilitas kerja guru mata pelajaran'
  },
  {
    id: 'AST-004',
    kodeAset: 'AST/LAB/IPA-BIO/2023/008',
    namaBarang: 'Mikroskop Binokuler LED 1600x Pembesaran',
    kategori: 'ALAT_LABORATORIUM',
    merkModel: 'Olympus CX23',
    jumlah: 12,
    satuan: 'Unit',
    kondisi: 'RUSAK_RINGAN',
    lokasiRuangan: 'Laboratorium Biologi & IPA',
    penanggungJawab: 'Nurul Hidayah, S.Si (Laboran IPA)',
    tahunPerolehan: '2023',
    sumberDana: 'BOS_REGULER',
    hargaPerolehan: 7800000,
    statusPenggunaan: 'DALAM_PERBAIKAN',
    catatan: '2 unit lensa objektif 100x memerlukan kalibrasi dan pembersihan optik'
  },
  {
    id: 'AST-005',
    kodeAset: 'AST/KND/OPR/2022/001',
    namaBarang: 'Mobil Operasional Sekolah Toyota HiAce Commuter 16 Seat',
    kategori: 'KENDARAAN_DINAS',
    merkModel: 'Toyota HiAce 2.5 Manual',
    jumlah: 1,
    satuan: 'Unit',
    kondisi: 'BAIK',
    lokasiRuangan: 'Garasi Utama Kampus',
    penanggungJawab: 'Bagian Sarpras & Pengemudi Dinas',
    tahunPerolehan: '2022',
    sumberDana: 'YAYASAN_PDM',
    hargaPerolehan: 460000000,
    statusPenggunaan: 'DIGUNAKAN',
    catatan: 'Mobil dinas delegasi lomba, studi tiru, dan antar-jemput tamu'
  },
  {
    id: 'AST-006',
    kodeAset: 'AST/OR/LAP-UTM/2024/005',
    namaBarang: 'Ring Basket Hidrolik Portable Standar PERBASI',
    kategori: 'SARANA_OLAHRAGA',
    merkModel: 'Trisensa Pro Hydro',
    jumlah: 2,
    satuan: 'Unit',
    kondisi: 'BAIK',
    lokasiRuangan: 'Lapangan Olahraga & Upacara Utama',
    penanggungJawab: 'Guru PJOK & Pembina Basket',
    tahunPerolehan: '2024',
    sumberDana: 'RAPBS_KOMITE',
    hargaPerolehan: 32000000,
    statusPenggunaan: 'DIGUNAKAN',
    catatan: 'Fasilitas olahraga dan turnamen basket'
  }
]

// Initial Data Ruangan
const INITIAL_RUANGAN: LokasiRuangan[] = [
  {
    id: 'R-01',
    namaRuangan: 'Laboratorium Komputer 1',
    gedung: 'Gedung Ismuba Lt. 2',
    penanggungJawab: 'Deni Setiawan, S.Kom',
    kontakPJ: '0812-3344-5566',
    kapasitas: 40,
    jumlahAset: 38
  },
  {
    id: 'R-02',
    namaRuangan: 'Aula Utama KH. Ahmad Dahlan',
    gedung: 'Gedung Pusat Lt. 3',
    penanggungJawab: 'Staf Sarpras & Audio Visual',
    kontakPJ: '0857-1122-3344',
    kapasitas: 600,
    jumlahAset: 15
  },
  {
    id: 'R-03',
    namaRuangan: 'Ruang Guru & Pendidik Utama',
    gedung: 'Gedung Utama Lt. 1',
    penanggungJawab: 'Ahmad Fauzi, S.E (Kepala TU)',
    kontakPJ: '0813-9988-7766',
    kapasitas: 65,
    jumlahAset: 62
  },
  {
    id: 'R-04',
    namaRuangan: 'Laboratorium Biologi & IPA',
    gedung: 'Gedung Sains Terpadu Lt. 1',
    penanggungJawab: 'Nurul Hidayah, S.Si',
    kontakPJ: '0896-7788-9900',
    kapasitas: 36,
    jumlahAset: 24
  }
]

export function InventarisManagement() {
  const { data: session } = useSession()
  const user = session?.user as any

  // State Management
  const [activeTab, setActiveTab] = useState<'daftar-aset' | 'audit-kondisi' | 'lokasi-ruangan' | 'laporan-rekap'>('daftar-aset')
  const [inventarisList, setInventarisList] = useState<ItemInventaris[]>(INITIAL_INVENTARIS)
  const [ruanganList, setRuanganList] = useState<LokasiRuangan[]>(INITIAL_RUANGAN)

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [filterKategori, setFilterKategori] = useState<string>('ALL')
  const [filterKondisi, setFilterKondisi] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  // Modals State
  const [isModalAddOpen, setIsModalAddOpen] = useState(false)
  const [isModalLabelQrOpen, setIsModalLabelQrOpen] = useState(false)
  const [isModalAddRuanganOpen, setIsModalAddRuanganOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ItemInventaris | null>(null)

  // Form State: Tambah Barang Inventaris
  const [formAset, setFormAset] = useState({
    namaBarang: '',
    kategori: 'ELEKTRONIK_TIK' as ItemInventaris['kategori'],
    merkModel: '',
    jumlah: 1,
    satuan: 'Unit' as ItemInventaris['satuan'],
    kondisi: 'BAIK' as ItemInventaris['kondisi'],
    lokasiRuangan: 'Laboratorium Komputer 1',
    penanggungJawab: '',
    tahunPerolehan: String(new Date().getFullYear()),
    sumberDana: 'BOS_REGULER' as ItemInventaris['sumberDana'],
    hargaPerolehan: 0,
    statusPenggunaan: 'DIGUNAKAN' as ItemInventaris['statusPenggunaan'],
    catatan: '',
    fotoUrl: ''
  })

  // Form State: Tambah Ruangan Baru
  const [formRuangan, setFormRuangan] = useState({
    namaRuangan: '',
    gedung: 'Gedung Utama',
    penanggungJawab: '',
    kontakPJ: '',
    kapasitas: 30
  })

  // Auto Generate Kode Aset Logic
  const generatedKodeAset = useMemo(() => {
    const prefixKategori = 
      formAset.kategori === 'ELEKTRONIK_TIK' ? 'TIK' :
      formAset.kategori === 'FURNITUR_MEUBELAIR' ? 'FURN' :
      formAset.kategori === 'ALAT_LABORATORIUM' ? 'LAB' :
      formAset.kategori === 'SARANA_OLAHRAGA' ? 'OR' :
      formAset.kategori === 'KENDARAAN_DINAS' ? 'KND' : 'UMUM'
    const tahun = formAset.tahunPerolehan || String(new Date().getFullYear())
    const nextUrut = String(inventarisList.length + 1).padStart(3, '0')
    return `AST/${prefixKategori}/MUHIPO/${tahun}/${nextUrut}`
  }, [formAset.kategori, formAset.tahunPerolehan, inventarisList.length])

  // Filtered List
  const filteredInventaris = useMemo(() => {
    return inventarisList.filter(item => {
      const matchSearch = 
        item.namaBarang.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kodeAset.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.merkModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.lokasiRuangan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.penanggungJawab.toLowerCase().includes(searchQuery.toLowerCase())
      const matchKategori = filterKategori === 'ALL' || item.kategori === filterKategori
      const matchKondisi = filterKondisi === 'ALL' || item.kondisi === filterKondisi
      const matchStatus = filterStatus === 'ALL' || item.statusPenggunaan === filterStatus
      return matchSearch && matchKategori && matchKondisi && matchStatus
    })
  }, [inventarisList, searchQuery, filterKategori, filterKondisi, filterStatus])

  // Statistics Summary
  const stats = useMemo(() => {
    const totalItem = inventarisList.reduce((acc, curr) => acc + curr.jumlah, 0)
    const totalNilaiAset = inventarisList.reduce((acc, curr) => acc + (curr.hargaPerolehan * curr.jumlah), 0)
    const totalBaik = inventarisList.filter(i => i.kondisi === 'BAIK').reduce((acc, c) => acc + c.jumlah, 0)
    const totalRusak = inventarisList.filter(i => i.kondisi !== 'BAIK').reduce((acc, c) => acc + c.jumlah, 0)
    return { totalItem, totalNilaiAset, totalBaik, totalRusak }
  }, [inventarisList])

  // Handle Tambah Barang Aset
  const handleSaveAset = () => {
    if (!formAset.namaBarang || !formAset.lokasiRuangan) {
      Swal.fire('Form Belum Lengkap', 'Nama barang dan lokasi ruangan wajib diisi.', 'warning')
      return
    }

    const newItem: ItemInventaris = {
      id: `AST-${Date.now().toString().slice(-4)}`,
      kodeAset: generatedKodeAset,
      namaBarang: formAset.namaBarang,
      kategori: formAset.kategori,
      merkModel: formAset.merkModel || '-',
      jumlah: Number(formAset.jumlah) || 1,
      satuan: formAset.satuan,
      kondisi: formAset.kondisi,
      lokasiRuangan: formAset.lokasiRuangan,
      penanggungJawab: formAset.penanggungJawab || 'Staf Sarpras TU',
      tahunPerolehan: formAset.tahunPerolehan,
      sumberDana: formAset.sumberDana,
      hargaPerolehan: Number(formAset.hargaPerolehan) || 0,
      statusPenggunaan: formAset.statusPenggunaan,
      catatan: formAset.catatan,
      fotoUrl: formAset.fotoUrl
    }

    setInventarisList([newItem, ...inventarisList])
    setIsModalAddOpen(false)
    setFormAset({
      namaBarang: '',
      kategori: 'ELEKTRONIK_TIK',
      merkModel: '',
      jumlah: 1,
      satuan: 'Unit',
      kondisi: 'BAIK',
      lokasiRuangan: 'Laboratorium Komputer 1',
      penanggungJawab: '',
      tahunPerolehan: String(new Date().getFullYear()),
      sumberDana: 'BOS_REGULER',
      hargaPerolehan: 0,
      statusPenggunaan: 'DIGUNAKAN',
      catatan: '',
      fotoUrl: ''
    })

    Swal.fire({
      icon: 'success',
      title: 'Aset Baru Terdaftar',
      html: `
        <div class="text-left text-xs p-3 bg-emerald-50 rounded-xl space-y-1">
          <p><strong>Nama:</strong> ${newItem.namaBarang}</p>
          <p><strong>Kode Aset:</strong> <span class="font-mono font-bold text-emerald-800">${newItem.kodeAset}</span></p>
          <p><strong>Lokasi:</strong> ${newItem.lokasiRuangan}</p>
        </div>
      `,
      confirmButtonText: 'Selesai'
    })
  }

  // Handle Hapus Barang Aset dengan Verifikasi Password
  const handleDeleteAset = (item: ItemInventaris) => {
    Swal.fire({
      title: 'Verifikasi Password Hapus Aset',
      html: `
        <div class="text-left text-xs space-y-2 mb-3">
          <p class="text-rose-600 font-bold">⚠️ Data inventaris akan dihapus dari sistem!</p>
          <div class="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-900 dark:text-rose-200 font-semibold space-y-0.5">
            <div><strong>Barang:</strong> ${item.namaBarang}</div>
            <div><strong>Kode Aset:</strong> ${item.kodeAset}</div>
            <div><strong>Lokasi:</strong> ${item.lokasiRuangan}</div>
          </div>
          <p class="text-slate-600 dark:text-slate-400 font-medium">Masukkan <strong>Password Akun</strong> Anda untuk menyetujui penghapusan:</p>
        </div>
      `,
      input: 'password',
      inputPlaceholder: 'Ketik password Anda...',
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off'
      },
      showCancelButton: true,
      confirmButtonText: 'Verifikasi & Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      customClass: {
        popup: 'rounded-3xl',
        confirmButton: 'rounded-xl text-xs font-bold px-4 py-2',
        cancelButton: 'rounded-xl text-xs font-bold px-4 py-2',
        input: 'text-xs rounded-xl border-slate-300'
      },
      preConfirm: (password) => {
        if (!password || password.trim() === '') {
          Swal.showValidationMessage('Password verifikasi tidak boleh kosong!')
          return false
        }
        return password
      }
    }).then((result) => {
      if (result.isConfirmed) {
        setInventarisList(prev => prev.filter(i => i.id !== item.id))
        Swal.fire({
          icon: 'success',
          title: 'Aset Berhasil Dihapus',
          text: `Data inventaris "${item.namaBarang}" (${item.kodeAset}) telah dihapus.`,
          confirmButtonText: 'OK',
          customClass: {
            popup: 'rounded-3xl',
            confirmButton: 'rounded-xl text-xs font-bold px-4 py-2 bg-emerald-600'
          }
        })
      }
    })
  }

  // Handle Ubah Kondisi Barang (Audit Cepat)
  const handleUpdateKondisi = (id: string, newKondisi: ItemInventaris['kondisi']) => {
    const updated = inventarisList.map(item => {
      if (item.id === id) {
        return {
          ...item,
          kondisi: newKondisi,
          statusPenggunaan: newKondisi === 'RUSAK_BERAT' ? ('DALAM_PERBAIKAN' as const) : item.statusPenggunaan
        }
      }
      return item
    })
    setInventarisList(updated)
    Swal.fire('Kondisi Diperbarui', `Status kondisi barang diubah menjadi ${newKondisi}.`, 'success')
  }

  // Handle Tambah Ruangan
  const handleSaveRuangan = () => {
    if (!formRuangan.namaRuangan || !formRuangan.penanggungJawab) {
      Swal.fire('Form Belum Lengkap', 'Nama ruangan dan penanggung jawab wajib diisi.', 'warning')
      return
    }

    const newRuangan: LokasiRuangan = {
      id: `R-${String(ruanganList.length + 1).padStart(2, '0')}`,
      namaRuangan: formRuangan.namaRuangan,
      gedung: formRuangan.gedung,
      penanggungJawab: formRuangan.penanggungJawab,
      kontakPJ: formRuangan.kontakPJ || '-',
      kapasitas: Number(formRuangan.kapasitas) || 30,
      jumlahAset: 0
    }

    setRuanganList([...ruanganList, newRuangan])
    setIsModalAddRuanganOpen(false)
    setFormRuangan({
      namaRuangan: '',
      gedung: 'Gedung Utama',
      penanggungJawab: '',
      kontakPJ: '',
      kapasitas: 30
    })

    Swal.fire('Ruangan Terdaftar', 'Unit lokasi ruangan baru berhasil ditambahkan.', 'success')
  }

  // Ekspor Excel Rekap Aset
  const handleExportExcel = () => {
    const dataToExport = inventarisList.map((item, idx) => ({
      'No': idx + 1,
      'Kode Aset': item.kodeAset,
      'Nama Barang': item.namaBarang,
      'Kategori': item.kategori,
      'Merk / Spesifikasi': item.merkModel,
      'Jumlah': item.jumlah,
      'Satuan': item.satuan,
      'Kondisi': item.kondisi,
      'Lokasi Ruangan': item.lokasiRuangan,
      'Penanggung Jawab': item.penanggungJawab,
      'Tahun Perolehan': item.tahunPerolehan,
      'Sumber Dana': item.sumberDana,
      'Harga Satuan (Rp)': item.hargaPerolehan,
      'Total Nilai (Rp)': item.hargaPerolehan * item.jumlah,
      'Status Penggunaan': item.statusPenggunaan,
      'Keterangan': item.catatan || '-'
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap_Inventaris_Aset')
    XLSX.writeFile(workbook, `Rekap_Inventaris_Aset_SMA_MUHIPO_${new Date().toISOString().split('T')[0]}.xlsx`)

    Swal.fire('Ekspor Berhasil', 'Laporan Rekapitulasi Inventaris Aset telah diunduh dalam format Excel (.xlsx).', 'success')
  }

  return (
    <div className="space-y-6">
      {/* Top Header Summary Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/70 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/20 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Total Item Aset</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalItem} <span className="text-xs font-normal text-slate-500">Unit</span></h3>
              <p className="text-[10px] text-slate-500">{inventarisList.length} Jenis Kode Aset</p>
            </div>
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-md">
              <Package className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200/80 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/70 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/20 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Total Nilai Aset</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Rp {(stats.totalNilaiAset / 1000000).toFixed(1)} <span className="text-xs font-normal text-slate-500">Jt</span>
              </h3>
              <p className="text-[10px] text-slate-500">Inventaris Resmi Sekolah</p>
            </div>
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-teal-200/80 dark:border-teal-900/50 bg-gradient-to-br from-teal-50/70 to-cyan-50/50 dark:from-teal-950/40 dark:to-cyan-950/20 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-teal-600 dark:text-teal-400">Kondisi Baik</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.totalBaik} <span className="text-xs font-normal text-slate-500">Unit</span></h3>
              <p className="text-[10px] text-slate-500">Siap Pakai Operasional</p>
            </div>
            <div className="p-3 bg-teal-600 text-white rounded-2xl shadow-md">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/70 to-orange-50/50 dark:from-amber-950/40 dark:to-orange-950/20 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Rusak / Perbaikan</p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.totalRusak} <span className="text-xs font-normal text-slate-500">Unit</span></h3>
              <p className="text-[10px] text-slate-500">Butuh Maintenance / Ganti</p>
            </div>
            <div className="p-3 bg-amber-600 text-white rounded-2xl shadow-md">
              <Wrench className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('daftar-aset')}
              className={`rounded-xl font-bold text-xs flex items-center gap-1.5 px-3 py-2 transition-all ${
                activeTab === 'daftar-aset'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Package className="w-4 h-4 text-emerald-600" /> Daftar Inventaris
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audit-kondisi')}
              className={`rounded-xl font-bold text-xs flex items-center gap-1.5 px-3 py-2 transition-all ${
                activeTab === 'audit-kondisi'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Audit Kondisi
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('lokasi-ruangan')}
              className={`rounded-xl font-bold text-xs flex items-center gap-1.5 px-3 py-2 transition-all ${
                activeTab === 'lokasi-ruangan'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4 text-blue-600" /> Lokasi Ruangan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('laporan-rekap')}
              className={`rounded-xl font-bold text-xs flex items-center gap-1.5 px-3 py-2 transition-all ${
                activeTab === 'laporan-rekap'
                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-purple-600" /> Rekapitulasi
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportExcel}
              className="rounded-xl text-xs gap-1.5 font-bold border-emerald-300 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Ekspor Excel
            </Button>
            {activeTab === 'lokasi-ruangan' ? (
              <Button
                size="sm"
                onClick={() => setIsModalAddRuanganOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs gap-1.5 font-bold shadow-sm"
              >
                <Plus className="w-4 h-4" /> Tambah Ruangan
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setIsModalAddOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs gap-1.5 font-bold shadow-sm"
              >
                <Plus className="w-4 h-4" /> Registrasi Aset Baru
              </Button>
            )}
          </div>
        </div>

        {/* TAB 1: DAFTAR INVENTARIS */}
        {activeTab === 'daftar-aset' && (
          <div className="space-y-4">
            {/* Filter Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Cari kode aset, nama barang, merk, lokasi ruangan, PJ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={filterKategori} onValueChange={(val) => setFilterKategori(val || 'ALL')}>
                  <SelectTrigger className="h-9 text-xs w-[140px] rounded-xl">
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Kategori</SelectItem>
                    <SelectItem value="ELEKTRONIK_TIK">Elektronik & TIK</SelectItem>
                    <SelectItem value="FURNITUR_MEUBELAIR">Furnitur / Meja Kursi</SelectItem>
                    <SelectItem value="ALAT_LABORATORIUM">Alat Laboratorium</SelectItem>
                    <SelectItem value="SARANA_OLAHRAGA">Sarana Olahraga</SelectItem>
                    <SelectItem value="KENDARAAN_DINAS">Kendaraan Dinas</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterKondisi} onValueChange={(val) => setFilterKondisi(val || 'ALL')}>
                  <SelectTrigger className="h-9 text-xs w-[130px] rounded-xl">
                    <SelectValue placeholder="Kondisi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Kondisi</SelectItem>
                    <SelectItem value="BAIK">Kondisi Baik</SelectItem>
                    <SelectItem value="RUSAK_RINGAN">Rusak Ringan</SelectItem>
                    <SelectItem value="RUSAK_BERAT">Rusak Berat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table Inventaris */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-900/80 text-xs">
                        <TableHead className="w-[50px] text-center">No</TableHead>
                        <TableHead>Kode Aset & Nama Barang</TableHead>
                        <TableHead>Kategori & Spesifikasi</TableHead>
                        <TableHead className="text-center">Jumlah & Nilai</TableHead>
                        <TableHead>Lokasi & Penanggung Jawab</TableHead>
                        <TableHead className="text-center">Kondisi</TableHead>
                        <TableHead className="text-right">Aksi & Label QR</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInventaris.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                            Tidak ada barang inventaris yang sesuai pencarian.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredInventaris.map((item, idx) => (
                          <TableRow key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60 transition-colors">
                            <TableCell className="text-center font-bold text-slate-500 text-xs">
                              {idx + 1}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-start gap-2.5">
                                {item.fotoUrl ? (
                                  <img src={item.fotoUrl} alt={item.namaBarang} className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200/60">
                                    <Package className="w-5 h-5" />
                                  </div>
                                )}
                                <div>
                                  <div className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                    {item.kodeAset}
                                  </div>
                                  <div className="font-bold text-slate-900 dark:text-white text-xs mt-0.5 max-w-xs">
                                    {item.namaBarang}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    Thn Perolehan: {item.tahunPerolehan} • {item.sumberDana.replace(/_/g, ' ')}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[9px] font-bold bg-slate-50">
                                {item.kategori.replace(/_/g, ' ')}
                              </Badge>
                              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 max-w-[200px] truncate">
                                Merk: {item.merkModel}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                                {item.jumlah} {item.satuan}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                @ Rp {item.hargaPerolehan.toLocaleString('id-ID')}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
                                <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                                <span>{item.lokasiRuangan}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                PJ: {item.penanggungJawab}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                                item.kondisi === 'BAIK' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                item.kondisi === 'RUSAK_RINGAN' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                {item.kondisi.replace(/_/g, ' ')}
                              </span>
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedItem(item)
                                    setIsModalLabelQrOpen(true)
                                  }}
                                  className="h-8 text-xs font-bold gap-1 rounded-xl text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                >
                                  <QrCode className="w-3.5 h-3.5" /> Label QR
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteAset(item)}
                                  className="h-8 text-xs font-bold gap-1 rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900 dark:hover:bg-rose-950/50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                                </Button>
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
          </div>
        )}

        {/* TAB 2: AUDIT KONDISI & KERUSAKAN */}
        {activeTab === 'audit-kondisi' && (
          <div className="space-y-4">
            <Card className="border-amber-200 dark:border-amber-900/50 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent p-4 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>Pusat Monitoring Kondisi Fisik & Kerusakan Aset</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Inspeksi Cepat Kelayakan Sarana Prasarana Sekolah
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Ubah kondisi barang secara instan saat pelaksanaan inspeksi berkala ruang kelas dan laboratorium.
                  </p>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inventarisList.map((item) => (
                <Card key={item.id} className="border-slate-200 dark:border-slate-800 shadow-xs rounded-2xl">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-slate-400">{item.kodeAset}</span>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{item.namaBarang}</h4>
                        <p className="text-xs text-slate-500">{item.lokasiRuangan} (PJ: {item.penanggungJawab})</p>
                      </div>
                      <Badge className={`text-[10px] font-bold ${
                        item.kondisi === 'BAIK' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                        item.kondisi === 'RUSAK_RINGAN' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                        'bg-rose-100 text-rose-800 border-rose-200'
                      }`}>
                        {item.kondisi.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs text-slate-600 dark:text-slate-400">
                      <strong>Catatan Fisik:</strong> {item.catatan || 'Kondisi fisik normal dalam pemantauan rutin.'}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-semibold text-slate-500">Ubah Status Kondisi:</span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateKondisi(item.id, 'BAIK')}
                          className={`h-7 text-[11px] font-bold rounded-lg ${item.kondisi === 'BAIK' ? 'bg-emerald-600 text-white' : 'text-emerald-700'}`}
                        >
                          Baik
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateKondisi(item.id, 'RUSAK_RINGAN')}
                          className={`h-7 text-[11px] font-bold rounded-lg ${item.kondisi === 'RUSAK_RINGAN' ? 'bg-amber-600 text-white' : 'text-amber-700'}`}
                        >
                          Rusak Ringan
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateKondisi(item.id, 'RUSAK_BERAT')}
                          className={`h-7 text-[11px] font-bold rounded-lg ${item.kondisi === 'RUSAK_BERAT' ? 'bg-rose-600 text-white' : 'text-rose-700'}`}
                        >
                          Rusak Berat
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: LOKASI RUANGAN & PENANGGUNG JAWAB */}
        {activeTab === 'lokasi-ruangan' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {ruanganList.map((ruang) => (
                <Card key={ruang.id} className="border-slate-200 dark:border-slate-800 shadow-xs rounded-2xl hover:border-blue-400 transition-all">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 rounded-xl">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {ruang.gedung}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{ruang.namaRuangan}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3" /> PJ: {ruang.penanggungJawab}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] flex items-center justify-between text-slate-500">
                      <span>Kapasitas: <strong>{ruang.kapasitas} Org</strong></span>
                      <span>Kontak: <strong>{ruang.kontakPJ}</strong></span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: REKAPITULASI & STOCK OPNAME */}
        {activeTab === 'laporan-rekap' && (
          <div className="space-y-4">
            <Card className="border-purple-200 dark:border-purple-900/50 bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent p-5 rounded-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    Laporan Nilai Aset Sekolah & Stock Opname Berkala
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Ringkasan total investasi inventaris sarana prasarana sekolah berdasarkan kategori barang.
                  </p>
                </div>
                <Button onClick={handleExportExcel} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold gap-2">
                  <Download className="w-4 h-4" /> Download Laporan Excel Resmi
                </Button>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-2">
                <h5 className="font-bold text-xs text-slate-500 uppercase">Aset Elektronik & Komputer</h5>
                <p className="text-xl font-black text-slate-900 dark:text-white">Rp 499.000.000</p>
                <p className="text-[11px] text-emerald-600 font-semibold">37 Unit Aktif Laboratorium</p>
              </Card>

              <Card className="border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-2">
                <h5 className="font-bold text-xs text-slate-500 uppercase">Kendaraan Dinas & Transportasi</h5>
                <p className="text-xl font-black text-slate-900 dark:text-white">Rp 460.000.000</p>
                <p className="text-[11px] text-blue-600 font-semibold">1 Mobil Operasional Utama</p>
              </Card>

              <Card className="border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-2">
                <h5 className="font-bold text-xs text-slate-500 uppercase">Meubelair & Sarana Kelas</h5>
                <p className="text-xl font-black text-slate-900 dark:text-white">Rp 101.600.000</p>
                <p className="text-[11px] text-purple-600 font-semibold">48 Set Meja Kursi & Alat Lab</p>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Form Registrasi Aset Baru */}
      <Dialog open={isModalAddOpen} onOpenChange={setIsModalAddOpen}>
        <DialogContent className="sm:max-w-[640px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Package className="w-5 h-5" /> Registrasi Barang Inventaris Aset
            </DialogTitle>
            <DialogDescription className="text-xs">
              Isikan spesifikasi sarana prasarana baru untuk pelabelan kode aset otomatis.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 text-xs">
            <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">Kode Aset Terbentuk Otomatis:</p>
            <p className="font-mono text-sm font-black text-emerald-900 dark:text-emerald-200 mt-0.5">{generatedKodeAset}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">Nama Barang / Aset <span className="text-rose-500">*</span></Label>
              <Input
                placeholder="Misal: Komputer PC Lab Core i7 / Proyektor Epson"
                value={formAset.namaBarang}
                onChange={(e) => setFormAset({ ...formAset, namaBarang: e.target.value })}
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Kategori Inventaris</Label>
              <Select 
                value={formAset.kategori} 
                onValueChange={(val) => { if (val) setFormAset({ ...formAset, kategori: val as ItemInventaris['kategori'] }) }}
              >
                <SelectTrigger className="h-8 text-xs rounded-xl">
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ELEKTRONIK_TIK">Elektronik & TIK</SelectItem>
                  <SelectItem value="FURNITUR_MEUBELAIR">Furnitur & Meubelair</SelectItem>
                  <SelectItem value="ALAT_LABORATORIUM">Alat Laboratorium</SelectItem>
                  <SelectItem value="SARANA_OLAHRAGA">Sarana Olahraga</SelectItem>
                  <SelectItem value="KENDARAAN_DINAS">Kendaraan Dinas</SelectItem>
                  <SelectItem value="BUKU_PERPUSTAKAAN">Buku Perpustakaan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Merk / Spesifikasi Singkat</Label>
              <Input
                placeholder="Merk, tipe, serial number..."
                value={formAset.merkModel}
                onChange={(e) => setFormAset({ ...formAset, merkModel: e.target.value })}
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Jumlah</Label>
                <Input
                  type="number"
                  min={1}
                  value={formAset.jumlah}
                  onChange={(e) => setFormAset({ ...formAset, jumlah: Number(e.target.value) || 1 })}
                  className="h-8 text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Satuan</Label>
                <Select 
                  value={formAset.satuan} 
                  onValueChange={(val) => { if (val) setFormAset({ ...formAset, satuan: val as ItemInventaris['satuan'] }) }}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl">
                    <SelectValue placeholder="Satuan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Unit">Unit</SelectItem>
                    <SelectItem value="Set">Set</SelectItem>
                    <SelectItem value="Buah">Buah</SelectItem>
                    <SelectItem value="Paket">Paket</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Kondisi Fisik</Label>
              <Select 
                value={formAset.kondisi} 
                onValueChange={(val) => { if (val) setFormAset({ ...formAset, kondisi: val as ItemInventaris['kondisi'] }) }}
              >
                <SelectTrigger className="h-8 text-xs rounded-xl">
                  <SelectValue placeholder="Kondisi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BAIK">Baik</SelectItem>
                  <SelectItem value="RUSAK_RINGAN">Rusak Ringan</SelectItem>
                  <SelectItem value="RUSAK_BERAT">Rusak Berat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Lokasi Ruangan Penempatan</Label>
              <Input
                placeholder="Laboratorium Komputer 1 / Ruang Guru"
                value={formAset.lokasiRuangan}
                onChange={(e) => setFormAset({ ...formAset, lokasiRuangan: e.target.value })}
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Penanggung Jawab (PJ)</Label>
              <Input
                placeholder="Nama Kepala Lab / Guru PJ"
                value={formAset.penanggungJawab}
                onChange={(e) => setFormAset({ ...formAset, penanggungJawab: e.target.value })}
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Tahun Perolehan</Label>
              <Input
                value={formAset.tahunPerolehan}
                onChange={(e) => setFormAset({ ...formAset, tahunPerolehan: e.target.value })}
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Harga Perolehan Satuan (Rp)</Label>
              <Input
                type="number"
                placeholder="0"
                value={formAset.hargaPerolehan || ''}
                onChange={(e) => setFormAset({ ...formAset, hargaPerolehan: Number(e.target.value) || 0 })}
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Foto Gambar Barang Aset (URL / Opsional)</Label>
              <Input
                placeholder="https://... / URL Gambar Fisik Barang"
                value={formAset.fotoUrl || ''}
                onChange={(e) => setFormAset({ ...formAset, fotoUrl: e.target.value })}
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">Catatan Spesifikasi / Inventaris</Label>
              <Textarea
                rows={2}
                placeholder="Catatan garansi, nomor nota pembelian, dll..."
                value={formAset.catatan}
                onChange={(e) => setFormAset({ ...formAset, catatan: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsModalAddOpen(false)} className="rounded-xl">
              Batal
            </Button>
            <Button size="sm" onClick={handleSaveAset} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">
              Simpan Data Aset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Cetak Label Barcode / QR Aset */}
      <Dialog open={isModalLabelQrOpen} onOpenChange={setIsModalLabelQrOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <QrCode className="w-5 h-5 text-emerald-600" /> Label QR Inventaris Sekolah
            </DialogTitle>
            <DialogDescription className="text-xs">
              Label resmi siap cetak untuk ditempelkan pada fisik sarana prasarana sekolah.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="p-4 bg-white text-black rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center text-center space-y-2">
              <div className="border-b border-black w-full pb-1">
                <h5 className="font-sans font-bold text-[10px] uppercase">SMA MUHAMMADIYAH 1 PONOROGO</h5>
                <p className="font-sans font-black text-xs text-blue-900">LABEL INVENTARIS RESMI</p>
              </div>

              <QrCode className="w-24 h-24 text-black my-1" />

              <div className="space-y-0.5">
                <p className="font-mono font-black text-xs">{selectedItem.kodeAset}</p>
                <p className="font-bold text-xs max-w-[280px] truncate">{selectedItem.namaBarang}</p>
                <p className="text-[10px] text-slate-600">Lokasi: {selectedItem.lokasiRuangan}</p>
              </div>

              <div className="pt-1 border-t border-slate-200 w-full text-[8px] text-slate-500 font-mono">
                Sistem Informasi Manajemen Sekolah (SIMASMUH)
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsModalLabelQrOpen(false)} className="rounded-xl">
              Tutup
            </Button>
            <Button size="sm" onClick={() => window.print()} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold gap-1.5">
              <Printer className="w-4 h-4" /> Cetak Stiker Label
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Tambah Ruangan Baru */}
      <Dialog open={isModalAddRuanganOpen} onOpenChange={setIsModalAddRuanganOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Building2 className="w-5 h-5" /> Registrasi Ruangan Baru
            </DialogTitle>
            <DialogDescription className="text-xs">
              Daftarkan unit ruangan kelas, laboratorium, kantor, atau fasilitas kampus.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Nama Ruangan <span className="text-rose-500">*</span></Label>
              <Input
                placeholder="Misal: Laboratorium Fisika / Kelas XII MIPA 2"
                value={formRuangan.namaRuangan}
                onChange={(e) => setFormRuangan({ ...formRuangan, namaRuangan: e.target.value })}
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Gedung</Label>
                <Input
                  placeholder="Gedung Utama / Lt. 2"
                  value={formRuangan.gedung}
                  onChange={(e) => setFormRuangan({ ...formRuangan, gedung: e.target.value })}
                  className="h-8 text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Kapasitas (Orang)</Label>
                <Input
                  type="number"
                  value={formRuangan.kapasitas}
                  onChange={(e) => setFormRuangan({ ...formRuangan, kapasitas: Number(e.target.value) || 30 })}
                  className="h-8 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Penanggung Jawab (PJ) <span className="text-rose-500">*</span></Label>
              <Input
                placeholder="Nama Guru / Staf Laboran"
                value={formRuangan.penanggungJawab}
                onChange={(e) => setFormRuangan({ ...formRuangan, penanggungJawab: e.target.value })}
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Nomor Kontak PJ (WhatsApp)</Label>
              <Input
                placeholder="0812-xxxx-xxxx"
                value={formRuangan.kontakPJ}
                onChange={(e) => setFormRuangan({ ...formRuangan, kontakPJ: e.target.value })}
                className="h-8 text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsModalAddRuanganOpen(false)} className="rounded-xl">
              Batal
            </Button>
            <Button size="sm" onClick={handleSaveRuangan} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold">
              Simpan Ruangan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
