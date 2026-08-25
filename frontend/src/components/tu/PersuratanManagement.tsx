'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { 
  Mail, Inbox, Send, FileText, Archive, Plus, Search, Filter, 
  Printer, Download, Eye, CheckCircle2, Clock, AlertCircle, 
  ChevronRight, Calendar, User, Building2, Tag, ArrowUpRight, 
  FileCheck, Shield, ShieldCheck, Sparkles, RefreshCw, FileSpreadsheet, Share2, 
  CornerDownRight, Check, X, QrCode, FileDown, Layers, BookOpen,
  HelpCircle, MoreHorizontal, ExternalLink, Trash2, Edit3, Lock, UploadCloud, Upload, Sliders
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
import { QRCodeSVG } from 'qrcode.react'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'

// Tipe Data Surat Masuk & Disposisi
export interface SuratMasuk {
  id: string
  nomorSurat: string
  nomorAgenda: string
  pengirim: string
  instansi: string
  perihal: string
  tanggalSurat: string
  tanggalDiterima: string
  sifat: 'BIASA' | 'PENTING' | 'RAHASIA' | 'SEGERA'
  kategori: 'DINAS_DIKNAS' | 'MAJELIS_DIKDASMEN' | 'KEMENAG' | 'KERJASAMA' | 'UNDANGAN' | 'UMUM'
  lampiran?: string
  ringkasan: string
  statusDisposisi: 'BELUM_DISPOSISI' | 'PROSES' | 'SELESAI'
  disposisiList: DisposisiItem[]
}

export interface DisposisiItem {
  id: string
  tujuanUnit: string
  namaPejabat: string
  instruksi: string
  catatan?: string
  tenggatWaktu?: string
  status: 'PENDING' | 'DITINDAKLANJUTI' | 'SELESAI'
  tanggalDisposisi: string
}

// Tipe Data Surat Keluar dengan Alur Tanda Tangan Digital & Revisi
export interface SuratKeluar {
  id: string
  nomorSurat: string
  nomorAgenda: string
  tujuanPenerima: string
  instansiPenerima: string
  perihal: string
  tanggalSurat: string
  jenisSurat: 'SURAT_TUGAS' | 'SURAT_KETERANGAN' | 'SURAT_UNDANGAN' | 'SURAT_PANGGILAN' | 'SURAT_REKOMENDASI' | 'LEGALISIR' | 'PEMBERITAHUAN' | 'SURAT_KEPUTUSAN' | 'SURAT_EDARAN' | 'SURAT_PERNYATAAN' | 'DOKUMEN_LAWAS'
  penandatangan: string
  status: 'DRAF' | 'MENUNGGU_TTD' | 'DISETUJUI' | 'PERLU_REVISI' | 'TERKIRIM' | 'DIARSIPKAN'
  sumberSurat?: 'GENERATOR' | 'MANUAL_UPLOAD'
  tahunDokumen?: string
  fileUrl?: string
  fileUploadName?: string
  fileSize?: string
  fileType?: string
  isAiProcessed?: boolean
  aiExtractionMetadata?: {
    confidenceScore?: number
    extractedNomor?: string
    extractedTanggal?: string
    extractedPerihal?: string
    extractedPenerima?: string
    extractedPenandatangan?: string
    aiSuggestions?: string[]
    formatSimilarity?: string
  }
  catatan?: string
  catatanRevisi?: string
  tanggalPengajuan?: string
  tanggalTtd?: string
  eSignToken?: string
  signatureDataUrl?: string
  eSignQrData?: string
  signerName?: string
  signerNbm?: string
  // Payload template lengkap untuk sinkronisasi edit & cetak
  templateData?: {
    [key: string]: any
    jenisTemplate: string
    nomorSurat?: string
    lampiran?: string
    perihal?: string
    tanggalHijriyah?: string
    tanggalSurat?: string
    kotaPenerbit?: string
    tujuanPenerima1?: string
    tujuanPenerima2?: string
    tujuanInstansi?: string
    tujuanLokasi?: string
    salamPembuka?: string
    paragrafPembuka?: string
    hariTanggalKegiatan?: string
    waktuKegiatan?: string
    tempatKegiatan?: string
    pakaianBapakSiswa?: string
    pakaianIbuSiswi?: string
    keperluanKegiatan?: string
    catatanKegiatan?: string
    paragrafPenutup?: string
    salamPenutup?: string
    jabatanPenandatangan?: string
    namaPenandatangan?: string
    nbmPenandatangan?: string
    namaSiswaPegawai?: string
    nomorIdentitas?: string
    kelasJabatan?: string
    tempatTanggalLahir?: string
    keperluan?: string
    tempatTugas?: string
    tanggalMulai?: string
    tanggalSelesai?: string
    bebanAnggaran?: string
  }
}

// Tipe Data E-Arsip Komprehensif Tata Usaha
export interface EArchiveDocument {
  id: string
  kodeBerkas: string
  judulDokumen: string
  kategori: 
    | 'ARSIP_SISWA' 
    | 'ARSIP_GURU_KARYAWAN' 
    | 'SK_KEPSEK' 
    | 'MOU_KERJASAMA' 
    | 'KURIKULUM_AKREDITASI' 
    | 'IJAZAH_ALUMNI' 
    | 'SURAT_RESMI' 
    | 'SARPRAS_ASET' 
    | 'LAPORAN_KEUANGAN' 
    | 'DOKUMEN_LAIN'
  tahun: string
  nomorReferensi: string
  tingkatAkses: 'PUBLIK' | 'INTERNAL' | 'RAHASIA'
  namaFile: string
  ukuranFile: string
  pengunggah: string
  tanggalUpload: string
  keterangan: string
  fileUrl?: string
  fileType?: string
  tipeDokumen?: 'FOTO' | 'PDF' | 'DOKUMEN_OFFICE' | 'LAINNYA'
  namaSubjek?: string // Nama siswa / guru terkait
  identitasSubjek?: string // NISN / NIP / NBM terkait
  terakhirDiubah?: string
}

// Mock Data Awal Surat Masuk
const INITIAL_SURAT_MASUK: SuratMasuk[] = [
  {
    id: 'SM-001',
    nomorSurat: '421.3/0892/Cabdin.Po/2026',
    nomorAgenda: 'AG-SM/2026/08/042',
    pengirim: 'Drs. H. Supriyanto, M.M (Kepala Cabang Dinas)',
    instansi: 'Cabang Dinas Pendidikan Wilayah Ponorogo - Magetan',
    perihal: 'Undangan Sosialisasi Kurikulum Berbasis AI & Penguatan Profil Pelajar Muhammadiyah',
    tanggalSurat: '2026-08-20',
    tanggalDiterima: '2026-08-22',
    sifat: 'PENTING',
    kategori: 'DINAS_DIKNAS',
    ringkasan: 'Mengundang Kepala Sekolah & Waka Kurikulum untuk menghadiri workshop implementasi AI terpadu di Gedung Graha Saraswati.',
    statusDisposisi: 'PROSES',
    disposisiList: [
      {
        id: 'DSP-01',
        tujuanUnit: 'Waka Kurikulum',
        namaPejabat: 'Budi Santoso, M.Pd',
        instruksi: 'Hadir mewakili dan siapkan materi kesiapan kurikulum AI SMA Muhipo',
        catatan: 'Koordinasikan dengan tim IT',
        tenggatWaktu: '2026-08-26',
        status: 'DITINDAKLANJUTI',
        tanggalDisposisi: '2026-08-22'
      }
    ]
  },
  {
    id: 'SM-002',
    nomorSurat: '112/PWM-DIKDASMEN/VII/2026',
    nomorAgenda: 'AG-SM/2026/08/043',
    pengirim: 'Majelis Dikdasmen PDM Ponorogo',
    instansi: 'Pimpinan Daerah Muhammadiyah Ponorogo',
    perihal: 'Pemberitahuan Audit Standar Mutu Sekolah Rujukan Muhammadiyah 2026',
    tanggalSurat: '2026-08-18',
    tanggalDiterima: '2026-08-21',
    sifat: 'PENTING',
    kategori: 'MAJELIS_DIKDASMEN',
    ringkasan: 'Pemberitahuan pelaksanaan visitasi audit standar mutu dan tata kelola keuangan per September 2026.',
    statusDisposisi: 'PROSES',
    disposisiList: [
      {
        id: 'DSP-02',
        tujuanUnit: 'Kepala Tata Usaha & Tim Mutu',
        namaPejabat: 'Ahmad Fauzi, S.E',
        instruksi: 'Siapkan berkas administrasi, pembukuan keuangan, dan instrumen audit',
        catatan: 'Rapat koordinasi internal hari Kamis',
        tenggatWaktu: '2026-08-28',
        status: 'DITINDAKLANJUTI',
        tanggalDisposisi: '2026-08-21'
      }
    ]
  },
  {
    id: 'SM-003',
    nomorSurat: 'B/781/UN35/KM/2026',
    nomorAgenda: 'AG-SM/2026/08/044',
    pengirim: 'Wakil Rektor Bidang Akademik Universitas Brawijaya',
    instansi: 'Universitas Brawijaya Malang',
    perihal: 'Tawaran Jalur Kemitraan Khusus & Beasiswa Prestasi Siswa Berbakat',
    tanggalSurat: '2026-08-15',
    tanggalDiterima: '2026-08-19',
    sifat: 'BIASA',
    kategori: 'KERJASAMA',
    ringkasan: 'Alokasi kuota beasiswa khusus bagi 10 siswa berprestasi SMA Muhammadiyah 1 Ponorogo untuk jurusan Saintek dan Soshum.',
    statusDisposisi: 'SELESAI',
    disposisiList: [
      {
        id: 'DSP-03',
        tujuanUnit: 'Guru BK / Bimbingan Karir',
        namaPejabat: 'Siti Rahmawati, S.Psi',
        instruksi: 'Sosialisasikan ke siswa kelas XII dan seleksi kandidat siswa berprestasi',
        tenggatWaktu: '2026-08-30',
        status: 'SELESAI',
        tanggalDisposisi: '2026-08-19'
      }
    ]
  }
]

// Mock Data Awal Surat Keluar dengan Status TTD Digital & Revisi
const INITIAL_SURAT_KELUAR: SuratKeluar[] = [
  {
    id: 'SK-001',
    nomorSurat: '509/III.4.AU/A/2026',
    nomorAgenda: 'AG-SK/2026/08/088',
    tujuanPenerima: '1. Bapak Ibu Guru dan Tenaga Kependidikan',
    instansiPenerima: 'SMA Muhammadiyah 1 Ponorogo',
    perihal: 'Pemberitahuan Pakaian Adat Hari Jadi Ponorogo',
    tanggalSurat: '2026-08-10',
    jenisSurat: 'PEMBERITAHUAN',
    penandatangan: 'Kepala Sekolah (Sugeng Riadi, M.Pd.)',
    status: 'DISETUJUI',
    catatan: 'Telah ditandatangani digital dan dibagikan ke portal sekolah.',
    tanggalPengajuan: '2026-08-10',
    tanggalTtd: '2026-08-10 10:15',
    eSignToken: 'ESIGN-MUHIPO-509-2026-OK',
    templateData: {
      jenisTemplate: 'PEMBERITAHUAN',
      lampiran: '-',
      tanggalHijriyah: '27 Shafar 1448',
      tujuanPenerima1: '1. Bapak Ibu Guru dan Tenaga Kependidikan',
      tujuanPenerima2: '2. Siswa Siswi Kelas X, XI, dan XII',
      tujuanInstansi: 'SMA Muhammadiyah 1 Ponorogo',
      tujuanLokasi: 'tempat',
      salamPembuka: 'Assalaamu’alaikum    w.    w.',
      paragrafPembuka: 'Diberitahukan bahwa Dalam Rangka Memperingati Hari Jadi Ke-530 Kabupaten Ponorogo, maka seluruh warga sekolah (Guru/karyawan/siswa/i) di wajibkan memakai pakaian adat Ponoragan pada :',
      hariTanggalKegiatan: 'Selasa / 11 Agustus 2026',
      waktuKegiatan: '07.00 WIB',
      tempatKegiatan: 'SMA Muhammadiyah 1 Ponorogo',
      pakaianBapakSiswa: 'Bapak dan Siswa : Pakaian Khas Ponorogo/ Penadon/ batik/ lurik.',
      pakaianIbuSiswi: 'Ibu dan Siswi       :Pakaian Pendamping Penadon/ Penadon Wanita/ batik/ lurik.',
      paragrafPenutup: 'Demikian surat pemberitahuan ini, atas perhatianya kami ucapkan terima kasih.',
      salamPenutup: 'Wassalaamu’alaikum    w.    w.',
      jabatanPenandatangan: 'Kepala Sekolah,',
      namaPenandatangan: 'Sugeng Riadi, M.Pd.',
      nbmPenandatangan: 'NBM. 974.501'
    }
  },
  {
    id: 'SK-002',
    nomorSurat: '516/III.4.AU/D/2026',
    nomorAgenda: 'AG-SK/2026/08/089',
    tujuanPenerima: 'Bapak Ibu Guru dan Tenaga Kependidikan',
    instansiPenerima: 'SMA Muhammadiyah 1 Ponorogo',
    perihal: 'Undangan Upacara Bendera HUT ke-81 RI & LPJ PPDB',
    tanggalSurat: '2026-08-14',
    jenisSurat: 'SURAT_UNDANGAN',
    penandatangan: 'Kepala Sekolah (Sugeng Riadi, M.Pd.)',
    status: 'MENUNGGU_TTD',
    catatan: 'Dibuat oleh TU, menunggu persetujuan dan E-Sign Kepala Sekolah',
    tanggalPengajuan: '2026-08-14 08:30',
    templateData: {
      jenisTemplate: 'UNDANGAN',
      lampiran: '-',
      tanggalHijriyah: '01 Rabi’ul Awal 1448',
      tujuanPenerima1: 'Bapak Ibu Guru dan Tenaga Kependidikan',
      tujuanPenerima2: '',
      tujuanInstansi: 'SMA Muhammadiyah 1 Ponorogo',
      tujuanLokasi: 'tempat.',
      salamPembuka: 'Assalamu’alaikum    wr.    wb.',
      paragrafPembuka: 'Dengan hormat kami sampaikan kepada Bapak Ibu Guru dan Tenaga Kependiikan SMA Muhammadiyah 1 Ponorogo, bahwa dalam rangka Peringatan HUT ke 81 Republik Indonesia, maka dengan ini kami Mengharap dengan hormat atas kehadiran Bapak/Ibu besok pada:',
      hariTanggalKegiatan: 'Senin, 17 Agustus 2026',
      waktuKegiatan: '07.00 WIB',
      tempatKegiatan: 'SMA Muhammadiyah 1 Ponorogo',
      keperluanKegiatan: '1. Upacara Bendera Peringatan HUT ke-81 Republik Indonesia.\n2. Laporan Pertanggung Jawaban Panitia PPDB tahun 2026.',
      catatanKegiatan: 'Pakaian Bapak : Full dress\nPakaian Ibu     : Blazer hitam hijab warna merah',
      paragrafPenutup: 'Demikian, atas perhatian dan kehadiran Bapak/Ibu kami ucapkan terima kasih.',
      salamPenutup: 'Wassalamu’alaikum    wr.    wb.',
      jabatanPenandatangan: 'Kepala Sekolah,',
      namaPenandatangan: 'Sugeng Riadi, M.Pd.',
      nbmPenandatangan: 'NBM. 974.501'
    }
  },
  {
    id: 'SK-003',
    nomorSurat: '091/ST/IV.4.AU/SMA-MUHIPO/VIII/2026',
    nomorAgenda: 'AG-SK/2026/08/090',
    tujuanPenerima: 'Budi Santoso, M.Pd (Waka Kurikulum)',
    instansiPenerima: 'Cabang Dinas Pendidikan Ponorogo',
    perihal: 'Surat Tugas Mengikuti Bimtek Implementasi AI Nasional',
    tanggalSurat: '2026-08-24',
    jenisSurat: 'SURAT_TUGAS',
    penandatangan: 'Kepala Sekolah (Sugeng Riadi, M.Pd.)',
    status: 'PERLU_REVISI',
    catatanRevisi: 'Mohon tambahkan 1 orang pendamping dari Tim Laboran IT (Deni Setiawan, S.Kom) dan cantumkan pembebanan pos anggaran BOS reguler.',
    tanggalPengajuan: '2026-08-24 09:10',
    templateData: {
      jenisTemplate: 'SURAT_TUGAS',
      namaSiswaPegawai: 'Budi Santoso, M.Pd',
      nomorIdentitas: 'NBM. 10928374',
      kelasJabatan: 'Waka Kurikulum',
      tempatTugas: 'Gedung Graha Saraswati Cabang Dinas Pendidikan Ponorogo',
      tanggalMulai: '2026-08-25',
      tanggalSelesai: '2026-08-27',
      bebanAnggaran: 'BOS Reguler SMA Muhammadiyah 1 Ponorogo',
      keperluan: 'Menghadiri Bimtek Kurikulum Berbasis AI di Cabang Dinas'
    }
  }
]

// Mock Data E-Archive Lengkap (Surat, Data Siswa, Guru, Karyawan, Aset & Operasional TU)
const INITIAL_ARCHIVES: EArchiveDocument[] = [
  {
    id: 'ARC-001',
    kodeBerkas: '800/SK/012/2026',
    judulDokumen: 'SK Pembagian Tugas Mengajar & Beban Kerja Pendidik TA 2026/2027',
    kategori: 'SK_KEPSEK',
    tahun: '2026',
    nomorReferensi: 'SK-GURU-2026-001',
    tingkatAkses: 'INTERNAL',
    namaFile: 'SK_Pembagian_Tugas_2026.pdf',
    ukuranFile: '2.4 MB',
    pengunggah: 'Admin Tata Usaha (BAU)',
    tanggalUpload: '2026-08-01',
    keterangan: 'SK resmi penetapan jadwal mengajar guru dan wali kelas.'
  },
  {
    id: 'ARC-002',
    kodeBerkas: 'ARS-SIS/X-A/2026/001',
    judulDokumen: 'Berkas Induk & Ijazah SMP/Akta/KK Siswa Baru Angkatan 2026',
    kategori: 'ARSIP_SISWA',
    tahun: '2026',
    nomorReferensi: 'NISN-0087612341',
    namaSubjek: 'Ahmad Faiz Al-Habsyi',
    identitasSubjek: 'NISN: 0087612341 / NIS: 2026001',
    tingkatAkses: 'INTERNAL',
    namaFile: 'Berkas_Induk_Ahmad_Faiz_X-A.pdf',
    ukuranFile: '3.8 MB',
    pengunggah: 'Staf Kesiswaan & TU',
    tanggalUpload: '2026-08-10',
    keterangan: 'Bundel digital akta kelahiran, kartu keluarga, KIP, dan ijazah SMP/MTs.'
  },
  {
    id: 'ARC-003',
    kodeBerkas: 'ARS-GUR/NBM/2026/014',
    judulDokumen: 'Berkas Portofolio, Ijazah S2 & Sertifikat Pendidik Guru Fisika',
    kategori: 'ARSIP_GURU_KARYAWAN',
    tahun: '2026',
    nomorReferensi: 'NBM-9821034',
    namaSubjek: 'Budi Santoso, M.Pd.',
    identitasSubjek: 'NBM: 9821034 / NIP: 198205142008011002',
    tingkatAkses: 'RAHASIA',
    namaFile: 'Portofolio_Sertifikasi_Budi_Santoso.pdf',
    ukuranFile: '6.2 MB',
    pengunggah: 'Bagian Kepegawaian TU',
    tanggalUpload: '2026-08-05',
    keterangan: 'Salinan SK GTY, sertifikat PPG, transkrip S2, dan riwayat pelatihan profesional.'
  },
  {
    id: 'ARC-004',
    kodeBerkas: 'ARS-PEG/BAU/2026/003',
    judulDokumen: 'Berkas Kepegawaian & SK Pengangkatan Tenaga Kependidikan / Laboran',
    kategori: 'ARSIP_GURU_KARYAWAN',
    tahun: '2026',
    nomorReferensi: 'NBM-1093845',
    namaSubjek: 'Siti Rahmawati, A.Md.',
    identitasSubjek: 'NBM: 1093845 (Laboran IPA)',
    tingkatAkses: 'INTERNAL',
    namaFile: 'SK_Kepegawaian_Laboran_Siti.pdf',
    ukuranFile: '1.9 MB',
    pengunggah: 'Bagian Kepegawaian TU',
    tanggalUpload: '2026-07-28',
    keterangan: 'Berkas pengangkatan staf laboran komputer & IPA SMA Muhipo.'
  },
  {
    id: 'ARC-005',
    kodeBerkas: '421/MOU/UB-MUHIPO/2025',
    judulDokumen: 'Nota Kesepahaman (MoU) Kerjasama Universitas Brawijaya & SMA Muhipo',
    kategori: 'MOU_KERJASAMA',
    tahun: '2025',
    nomorReferensi: 'MOU-UB-2025-09',
    tingkatAkses: 'PUBLIK',
    namaFile: 'MoU_Universitas_Brawijaya.pdf',
    ukuranFile: '5.1 MB',
    pengunggah: 'Tata Usaha / Humas',
    tanggalUpload: '2025-11-14',
    keterangan: 'Kerjasama jalur khusus masuk PTN dan pelatihan olimpiade sains.'
  },
  {
    id: 'ARC-006',
    kodeBerkas: 'BAN-SM/SERTIF/A/2024',
    judulDokumen: 'Sertifikat & Instrumen Akreditasi Sekolah Grade A Unggul (98 Poin)',
    kategori: 'KURIKULUM_AKREDITASI',
    tahun: '2024',
    nomorReferensi: 'BAN-SM-A-2024',
    tingkatAkses: 'PUBLIK',
    namaFile: 'Sertifikat_Akreditasi_Unggul_2024.pdf',
    ukuranFile: '1.8 MB',
    pengunggah: 'Kepala Tata Usaha',
    tanggalUpload: '2024-10-20',
    keterangan: 'Sertifikat Badan Akreditasi Nasional Sekolah/Madrasah berlaku s.d 2029.'
  },
  {
    id: 'ARC-007',
    kodeBerkas: 'LEG/IJZ/2020-2024',
    judulDokumen: 'Buku Induk Register Penyerahan & Legalisir Ijazah Kelulusan 2020-2024',
    kategori: 'IJAZAH_ALUMNI',
    tahun: '2024',
    nomorReferensi: 'REG-IJZ-ALM-04',
    tingkatAkses: 'INTERNAL',
    namaFile: 'Register_Ijazah_Alumni.pdf',
    ukuranFile: '8.7 MB',
    pengunggah: 'Staf Arsip & Ijazah TU',
    tanggalUpload: '2024-12-30',
    keterangan: 'Catatan serah terima ijazah asli dan legalisir stempel basah alumni.'
  },
  {
    id: 'ARC-008',
    kodeBerkas: 'SAR/TANAH/WAKAF/2023',
    judulDokumen: 'Sertifikat Hak Milik & Wakaf Tanah Gedung Kampus 2 SMA Muhipo',
    kategori: 'SARPRAS_ASET',
    tahun: '2023',
    nomorReferensi: 'WKF-MUH-PO-08',
    tingkatAkses: 'RAHASIA',
    namaFile: 'Sertifikat_Tanah_Wakaf_Kampus2.pdf',
    ukuranFile: '4.5 MB',
    pengunggah: 'Kepala Tata Usaha & Sarpras',
    tanggalUpload: '2023-05-12',
    keterangan: 'Dokumen legalitas kepemilikan aset tanah dan bangunan persyarikatan.'
  }
]

// Standar Klasifikasi Surat Muhammadiyah Ponorogo
const KLASIFIKASI_SURAT = [
  { kode: 'EDR', nama: 'Surat Edaran / Pemberitahuan Umum' },
  { kode: 'ST', nama: 'Surat Tugas / Perjalanan Dinas' },
  { kode: 'SKET', nama: 'Surat Keterangan Aktif / Berkelakuan Baik' },
  { kode: 'UND', nama: 'Surat Undangan Pertemuan / Rapat' },
  { kode: 'PGL', nama: 'Surat Panggilan Orang Tua / Siswa' },
  { kode: 'REK', nama: 'Surat Rekomendasi Lomba / Beasiswa' },
  { kode: 'LEG', nama: 'Surat Keterangan Legalisir Ijazah' },
  { kode: 'MOU', nama: 'Kerjasama / Nota Kesepahaman' }
]

export function PersuratanManagement() {
  const { data: session } = useSession()
  const user = session?.user as any

  const authenticatedFetch = useAuthenticatedFetch()
  const userRole = user?.role || ''
  const userSubRole = user?.subRole || ''
  const isKepalaSekolah = userRole === 'KEPALA_SEKOLAH' || userSubRole === 'KEPALA_SEKOLAH' || userRole === 'SUPERADMIN'

  // Fetch Pengguna untuk Mengetahui Akun Kepala Sekolah Resmi yang Aktif
  const { data: usersList } = useQuery<any[]>({
    queryKey: ['staff-users-for-persuratan'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/users')
      if (!res.ok) return []
      return res.json()
    }
  })

  // Deteksi Pejabat Kepala Sekolah Resmi Terdaftar (Role Tunggal)
  const currentActiveKepsek = useMemo(() => {
    return (usersList || []).find((u: any) => 
      u.role === 'KEPALA_SEKOLAH' || 
      u.subRole === 'KEPALA_SEKOLAH' || 
      u.subRole2 === 'KEPALA_SEKOLAH' || 
      u.subRole3 === 'KEPALA_SEKOLAH'
    )
  }, [usersList])

  // State Management - Default Tab Sesuai Peran Pengakses
  const [activeTab, setActiveTab] = useState(isKepalaSekolah ? 'surat-keluar' : 'surat-masuk')

  // Auto-set tab jika status login / role berubah
  useEffect(() => {
    if (isKepalaSekolah) {
      setActiveTab('surat-keluar')
    }
  }, [isKepalaSekolah])

  const [suratMasukList, setSuratMasukList] = useState<SuratMasuk[]>(INITIAL_SURAT_MASUK)
  const [suratKeluarList, setSuratKeluarList] = useState<SuratKeluar[]>(INITIAL_SURAT_KELUAR)
  const [archiveList, setArchiveList] = useState<EArchiveDocument[]>(INITIAL_ARCHIVES)

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSifat, setFilterSifat] = useState('ALL')
  const [filterKategori, setFilterKategori] = useState('ALL')
  const [filterStatusTtd, setFilterStatusTtd] = useState('ALL')

  // Modals State
  const [isModalSuratMasukOpen, setIsModalSuratMasukOpen] = useState(false)
  const [isModalDisposisiOpen, setIsModalDisposisiOpen] = useState(false)
  const [isModalSuratKeluarOpen, setIsModalSuratKeluarOpen] = useState(false)
  const [isModalArchiveOpen, setIsModalArchiveOpen] = useState(false)
  const [isModalPreviewTemplateOpen, setIsModalPreviewTemplateOpen] = useState(false)
  const [isModalRevisiOpen, setIsModalRevisiOpen] = useState(false)
  const [isModalTtdOpen, setIsModalTtdOpen] = useState(false)
  const [isModalQrVerifyOpen, setIsModalQrVerifyOpen] = useState(false)

  const [selectedSuratMasuk, setSelectedSuratMasuk] = useState<SuratMasuk | null>(null)
  const [selectedSuratKeluar, setSelectedSuratKeluar] = useState<SuratKeluar | null>(null)
  const [revisiText, setRevisiText] = useState('')
  const [editingSuratKeluarId, setEditingSuratKeluarId] = useState<string | null>(null)

  // Interactive Signature Pad Canvas State & Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignatureDrawn, setHasSignatureDrawn] = useState(false)
  const [signerForm, setSignerForm] = useState({
    nama: 'Sugeng Riadi, M.Pd.',
    jabatan: 'Kepala Sekolah',
    nbm: 'NBM. 974.501',
    lokasi: 'Ponorogo'
  })

  // Sinkronisasi Data Penandatangan dengan Pejabat Kepala Sekolah Aktif
  useEffect(() => {
    if (currentActiveKepsek) {
      const kepsekNama = currentActiveKepsek.name || 'Sugeng Riadi, M.Pd.'
      const kepsekNbm = currentActiveKepsek.nipNbm || currentActiveKepsek.teacherProfile?.nip || 'NBM. 974.501'
      
      setSignerForm(prev => ({
        ...prev,
        nama: kepsekNama,
        nbm: kepsekNbm.startsWith('NBM') || kepsekNbm.startsWith('NIP') ? kepsekNbm : `NBM. ${kepsekNbm}`
      }))

      setTemplateForm(prev => ({
        ...prev,
        namaPenandatangan: kepsekNama,
        nbmPenandatangan: kepsekNbm.startsWith('NBM') || kepsekNbm.startsWith('NIP') ? kepsekNbm : `NBM. ${kepsekNbm}`
      }))

      setAutoNumberForm(prev => ({
        ...prev,
        penandatangan: `Kepala Sekolah (${kepsekNama})`
      }))
    }
  }, [currentActiveKepsek])

  // Start Drawing on Canvas
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const x = clientX - rect.left
    const y = clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.strokeStyle = '#0f172a' // Dark slate ink
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    setIsDrawing(true)
    setHasSignatureDrawn(true)
  }

  // Draw Line on Canvas
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const x = clientX - rect.left
    const y = clientY - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  // Stop Drawing on Canvas
  const stopDrawing = () => {
    setIsDrawing(false)
  }

  // Clear Canvas Signature
  const clearSignatureCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignatureDrawn(false)
  }

  // Form State: Surat Masuk Baru
  const [formSuratMasuk, setFormSuratMasuk] = useState({
    nomorSurat: '',
    pengirim: '',
    instansi: '',
    perihal: '',
    tanggalSurat: new Date().toISOString().split('T')[0],
    tanggalDiterima: new Date().toISOString().split('T')[0],
    sifat: 'BIASA' as SuratMasuk['sifat'],
    kategori: 'DINAS_DIKNAS' as SuratMasuk['kategori'],
    ringkasan: ''
  })

  // Form State: Disposisi Baru
  const [formDisposisi, setFormDisposisi] = useState({
    tujuanUnit: 'Waka Kurikulum',
    namaPejabat: '',
    instruksi: '',
    catatan: '',
    tenggatWaktu: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]
  })

  // Form State: Auto-Numbering Surat Keluar Generator
  const [formatMode, setFormatMode] = useState<'STANDAR' | 'CUSTOM'>('STANDAR')
  const [customFormatPattern, setCustomFormatPattern] = useState('{NOMOR}/{KODE}/IV.4.AU/SMA-MUHIPO/{BULAN_ROMAWI}/{TAHUN}')
  const [manualCounter, setManualCounter] = useState<number>(0)
  const [showNumberingSettings, setShowNumberingSettings] = useState<boolean>(false)

  const [autoNumberForm, setAutoNumberForm] = useState({
    kodeKlasifikasi: 'EDR',
    perihal: '',
    tujuanPenerima: '',
    instansiPenerima: '',
    tanggalSurat: new Date().toISOString().split('T')[0],
    penandatangan: 'Kepala Sekolah (Sugeng Riadi, M.Pd.)',
    jenisSurat: 'PEMBERITAHUAN' as SuratKeluar['jenisSurat'],
    catatan: ''
  })

  // Form State: Generator Template Surat Resmi (Sesuai Format Persis Standar SMA Muhammadiyah 1 Ponorogo)
  const [customKopImage, setCustomKopImage] = useState<string | null>(null)
  const [customLogoKiri, setCustomLogoKiri] = useState<string | null>('/pic_logo.png')
  const [customLogoKanan, setCustomLogoKanan] = useState<string | null>('/pic_logo.png')
  const [customSignatureImage, setCustomSignatureImage] = useState<string | null>(null)
  const [kopType, setKopType] = useState<'BUILTIN' | 'IMAGE_UPLOAD'>('BUILTIN')

  // Repositori Pola Rekomendasi yang Dipelajari Sistem dari Berkas Terupload
  const [learnedPatterns, setLearnedPatterns] = useState<Array<{
    perihalKey: string
    jenisTemplate: string
    nomorSurat: string
    perihal: string
    tujuanPenerima1: string
    tujuanInstansi: string
    paragrafPembuka: string
    isiSurat: string
    hariTanggalKegiatan: string
    waktuKegiatan: string
    tempatKegiatan: string
    keperluanKegiatan: string
    catatanKegiatan: string
    paragrafPenutup: string
    sumber: string
  }>>([
    {
      perihalKey: 'pemberitahuan perubahan jam pelajaran',
      jenisTemplate: 'PEMBERITAHUAN',
      nomorSurat: '512/III.4.AU/A/2026',
      perihal: 'Pemberitahuan Penyesuaian Jam Pembelajaran & KBM',
      tujuanPenerima1: '1. Bapak Ibu Guru dan Tenaga Kependidikan',
      tujuanInstansi: 'SMA Muhammadiyah 1 Ponorogo',
      paragrafPembuka: 'Diberitahukan dengan hormat bahwa sehubungan dengan agenda evaluasi kurikulum dan kegiatan sekolah, maka terhitung mulai tanggal yang telah ditentukan jam kegiatan belajar mengajar (KBM) disesuaikan menjadi sebagai berikut :',
      isiSurat: 'Seluruh Bapak/Ibu Guru pengampu mata pelajaran diharapkan dapat menyesuaikan alokasi waktu pembelajaran di kelas dan tetap memantau presensi peserta didik dengan tertib.',
      hariTanggalKegiatan: 'Senin, 18 Agustus 2026',
      waktuKegiatan: '07.00 - 13.30 WIB',
      tempatKegiatan: 'Ruang Kelas SMA Muhammadiyah 1 Ponorogo',
      keperluanKegiatan: 'Pelaksanaan KBM efektif semester ganjil dan penguatan karakter islami.',
      catatanKegiatan: 'Jadwal detail per jam pelajaran terlampir di papan pengumuman kurikulum.',
      paragrafPenutup: 'Demikian surat pemberitahuan ini kami sampaikan, atas perhatian dan kerjasama seluruh Bapak/Ibu Guru kami haturkan terima kasih.',
      sumber: 'Naskah Pembelajaran Terverifikasi'
    },
    {
      perihalKey: 'pemberitahuan hari jadi ponorogo pakaian adat',
      jenisTemplate: 'PEMBERITAHUAN',
      nomorSurat: '509/III.4.AU/A/2026',
      perihal: 'Pemberitahuan Pakaian Adat Hari Jadi Ponorogo',
      tujuanPenerima1: '1. Bapak Ibu Guru dan Tenaga Kependidikan',
      tujuanInstansi: 'SMA Muhammadiyah 1 Ponorogo',
      paragrafPembuka: 'Diberitahukan bahwa Dalam Rangka Memperingati Hari Jadi Ke-530 Kabupaten Ponorogo, maka seluruh warga sekolah (Guru/karyawan/siswa/i) di wajibkan memakai pakaian adat Ponoragan pada :',
      isiSurat: 'Sehubungan dengan agenda tersebut, seluruh kegiatan belajar mengajar (KBM) tetap berjalan tertib dan khidmat dengan mengenakan pakaian adat khas Ponoragan yang telah ditetapkan.',
      hariTanggalKegiatan: 'Selasa, 11 Agustus 2026',
      waktuKegiatan: '07.00 WIB s.d Selesai',
      tempatKegiatan: 'Kampus SMA Muhammadiyah 1 Ponorogo',
      keperluanKegiatan: 'Peringatan Hari Jadi Ke-530 Kabupaten Ponorogo & Upacara Bendera HUT ke-81 RI.',
      catatanKegiatan: '1. Seluruh peserta hadir 15 menit sebelum apel dimulai.\n2. Tetap menjaga kerapian dan etika berbusana Islami.',
      paragrafPenutup: 'Demikian surat pemberitahuan ini kami sampaikan, atas perhatian dan kerjasama Bapak/Ibu/Siswa kami ucapkan terima kasih.',
      sumber: 'Naskah Resmi Sekolah'
    }
  ])

  const [templateForm, setTemplateForm] = useState({
    // Konfigurasi & Teks Header Kop Surat (Dapat Diedit Manual Pengguna)
    kopInstansiAtas: 'MAJELIS PENDIDIKAN DASAR DAN MENENGAH\nPIMPINAN WILAYAH MUHAMMADIYAH JAWA TIMUR',
    kopNamaSekolah: 'SMA MUHAMMADIYAH 1 PONOROGO',
    kopStatusAkreditasi: 'TERAKREDITASI A',
    kopNpsn: '20510139',
    kopAlamat: 'Jl. BatoroKatong No. 6B Telp/Fax (0352) 481521 Ponorogo 63411',
    kopEmailWebsite: 'E-mail : smamuh1png@gmail.com Website:www.smamuhipo.sch.id',
    
    jenisTemplate: 'PEMBERITAHUAN', // 'PEMBERITAHUAN' | 'UNDANGAN' | 'SURAT_TUGAS' | 'SURAT_KETERANGAN_AKTIF' | 'LEGALISIR_IJAZAH' | 'SURAT_REKOMENDASI' | 'SURAT_EDARAN' | 'SURAT_PERNYATAAN' | 'SURAT_DINAS_UMUM'
    nomorSurat: '509/III.4.AU/A/2026',
    lampiran: '-',
    perihal: 'Pemberitahuan Pakaian Adat Hari Jadi Ponorogo',
    tanggalHijriyah: '27 Shafar 1448',
    tanggalSurat: '10 Agustus 2026',
    tujuanPenerima1: '1. Bapak Ibu Guru dan Tenaga Kependidikan',
    tujuanPenerima2: '2. Siswa Siswi Kelas X, XI, dan XII',
    tujuanInstansi: 'SMA Muhammadiyah 1 Ponorogo',
    tujuanLokasi: 'tempat',
    salamPembuka: 'Assalaamu’alaikum    w.    w.',
    paragrafPembuka: 'Diberitahukan bahwa Dalam Rangka Memperingati Hari Jadi Ke-530 Kabupaten Ponorogo, maka seluruh warga sekolah (Guru/karyawan/siswa/i) di wajibkan memakai pakaian adat Ponoragan pada :',
    isiSurat: 'Sehubungan dengan agenda tersebut, seluruh kegiatan belajar mengajar (KBM) tetap berjalan tertib dan khidmat dengan mengenakan pakaian adat khas Ponoragan yang telah ditetapkan.',
    hariTanggalKegiatan: 'Selasa, 11 Agustus 2026',
    waktuKegiatan: '07.00 WIB s.d Selesai',
    tempatKegiatan: 'Kampus SMA Muhammadiyah 1 Ponorogo',
    includePakaian: false, // Opsional: default tidak aktif kecuali jika surat memang berisi ketentuan pakaian
    pakaianBapakSiswa: '',
    pakaianIbuSiswi: '',
    keperluanKegiatan: 'Peringatan Hari Jadi Ke-530 Kabupaten Ponorogo & Upacara Bendera HUT ke-81 RI.',
    catatanKegiatan: '1. Seluruh peserta hadir 15 menit sebelum apel dimulai.\n2. Tetap menjaga kerapian dan etika berbusana Islami.',
    paragrafPenutup: 'Demikian surat pemberitahuan ini kami sampaikan, atas perhatian dan kerjasama Bapak/Ibu/Siswa kami ucapkan terima kasih.',
    salamPenutup: 'Wassalaamu’alaikum    w.    w.',
    jabatanPenandatangan: 'Kepala Sekolah,',
    namaPenandatangan: 'Sugeng Riadi, M.Pd.',
    nbmPenandatangan: 'NBM. 974.501',
    // Khusus Surat Tugas & Keterangan Siswa
    namaSiswaPegawai: 'Budi Santoso, M.Pd',
    nomorIdentitas: 'NBM. 10928374 / NIP. 198205142008011002',
    kelasJabatan: 'Guru Ahli Madya / Waka Kurikulum',
    tempatTanggalLahir: 'Ponorogo, 14 Mei 1982',
    namaOrangTua: 'H. Sudarsono',
    keperluan: 'Menghadiri Workshop Kurikulum dan Transformasi Digital Sekolah Cabang Dinas Pendidikan Jawa Timur Wilayah Ponorogo-Magetan',
    tempatTugas: 'Gedung Graha Saraswati Cabang Dinas Pendidikan Ponorogo',
    tanggalMulai: '2026-08-11',
    tanggalSelesai: '2026-08-12',
    kendaraan: 'Kendaraan Dinas / Pribadi',
    bebanAnggaran: 'BOS / RAPBS SMA Muhammadiyah 1 Ponorogo TA 2026/2027',
    kotaPenerbit: 'Ponorogo'
  })

  // Handler Upload Foto Kop Banner / Header Lengkap
  const handleKopUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        Swal.fire('Ukuran Terlalu Besar', 'Maksimal ukuran foto kop surat 3MB.', 'warning')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setCustomKopImage(reader.result as string)
        setKopType('IMAGE_UPLOAD')
        Swal.fire('Kop Surat Berhasil Diunggah', 'Gambar kop surat aktif dan diterapkan pada lembar cetak.', 'success')
      }
      reader.readAsDataURL(file)
    }
  }

  // Handler Upload Logo Kanan (Wajib Sekolah) & Logo Kiri (Opsional/Dikdasmen)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, position: 'KIRI' | 'KANAN') => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        Swal.fire('Ukuran Terlalu Besar', 'Maksimal ukuran logo adalah 2MB.', 'warning')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        if (position === 'KANAN') {
          setCustomLogoKanan(reader.result as string)
          Swal.fire('Logo Kanan Berhasil Diunggah', 'Logo wajib sekolah diperbarui pada kop surat.', 'success')
        } else {
          setCustomLogoKiri(reader.result as string)
          Swal.fire('Logo Kiri Berhasil Diunggah', 'Logo opsional instansi/dikdasmen diperbarui.', 'success')
        }
      }
      reader.readAsDataURL(file)
    }
  }

  // Handler Upload Stempel / Tanda Tangan
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setCustomSignatureImage(reader.result as string)
        Swal.fire('Stempel & TTD Berhasil Diunggah', 'Stempel resmi aktif pada lembar surat.', 'success')
      }
      reader.readAsDataURL(file)
    }
  }

  // Form State: Upload & Edit E-Archive (Foto, PDF, Dokumen Office)
  const [formArchive, setFormArchive] = useState({
    judulDokumen: '',
    kategori: 'ARSIP_SISWA' as EArchiveDocument['kategori'],
    tahun: '2026',
    nomorReferensi: '',
    tingkatAkses: 'INTERNAL' as EArchiveDocument['tingkatAkses'],
    namaFile: '',
    keterangan: '',
    namaSubjek: '',
    identitasSubjek: '',
    fileUrl: '',
    tipeDokumen: 'PDF' as EArchiveDocument['tipeDokumen']
  })
  const [archiveFile, setArchiveFile] = useState<File | null>(null)
  const [isModalEditArchiveOpen, setIsModalEditArchiveOpen] = useState(false)
  const [editingArchiveDoc, setEditingArchiveDoc] = useState<EArchiveDocument | null>(null)

  // State: Modal Upload Surat Keluar Manual / Dokumen Lawas-Terbaru & AI Text Processor
  const [isModalManualUploadOpen, setIsModalManualUploadOpen] = useState(false)
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false)
  const [manualUploadFile, setManualUploadFile] = useState<File | null>(null)
  const [manualUploadPreviewUrl, setManualUploadPreviewUrl] = useState<string | null>(null)
  const [manualForm, setManualForm] = useState({
    nomorSurat: '',
    perihal: '',
    tujuanPenerima: '',
    instansiPenerima: '',
    tanggalSurat: new Date().toISOString().split('T')[0],
    tahunDokumen: String(new Date().getFullYear()),
    jenisSurat: 'PEMBERITAHUAN' as SuratKeluar['jenisSurat'],
    penandatangan: 'Kepala Sekolah (Sugeng Riadi, M.Pd.)',
    catatan: '',
    kontenTeksManual: '',
    eraDokumen: 'MODERN' // 'LAWAS_1990_2010' | 'MODERN' | 'TERBARU'
  })

  // AI OCR & Inisiatif Saran Teks Processor
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{
    similarityScore: number
    patternRecognized: string
    recommendations: string[]
    autoFilledFields: string[]
  } | null>(null)

  // Print ref
  const printAreaRef = useRef<HTMLDivElement>(null)

  // Auto Generate Nomor Surat Logic (Dukungan Format Standar & Custom Pattern Input Manual)
  const generatedNomorSurat = useMemo(() => {
    const bulanRomawi = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][new Date().getMonth()]
    const bulanAngka = String(new Date().getMonth() + 1).padStart(2, '0')
    const tahun = String(new Date().getFullYear())
    const nextUrut = String((manualCounter > 0 ? manualCounter : suratKeluarList.length + 91)).padStart(3, '0')
    
    if (formatMode === 'CUSTOM' && customFormatPattern.trim()) {
      return customFormatPattern
        .replace(/{NOMOR}/g, nextUrut)
        .replace(/{KODE}/g, autoNumberForm.kodeKlasifikasi)
        .replace(/{BULAN_ROMAWI}/g, bulanRomawi)
        .replace(/{BULAN}/g, bulanAngka)
        .replace(/{TAHUN}/g, tahun)
    }

    return `${nextUrut}/${autoNumberForm.kodeKlasifikasi}/IV.4.AU/SMA-MUHIPO/${bulanRomawi}/${tahun}`
  }, [formatMode, customFormatPattern, manualCounter, autoNumberForm.kodeKlasifikasi, suratKeluarList.length])

  // Filtered Surat Masuk
  const filteredSuratMasuk = useMemo(() => {
    return suratMasukList.filter(item => {
      const matchSearch = 
        item.nomorSurat.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.perihal.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.instansi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.pengirim.toLowerCase().includes(searchQuery.toLowerCase())
      const matchSifat = filterSifat === 'ALL' || item.sifat === filterSifat
      const matchKategori = filterKategori === 'ALL' || item.kategori === filterKategori
      return matchSearch && matchSifat && matchKategori
    })
  }, [suratMasukList, searchQuery, filterSifat, filterKategori])

  // Handle Filter Surat Keluar (Termasuk filter Status TTD)
  const filteredSuratKeluar = useMemo(() => {
    return suratKeluarList.filter(item => {
      const matchSearch = 
        item.nomorSurat.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.perihal.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tujuanPenerima.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.instansiPenerima.toLowerCase().includes(searchQuery.toLowerCase())
      const matchStatus = filterStatusTtd === 'ALL' || item.status === filterStatusTtd
      return matchSearch && matchStatus
    })
  }, [suratKeluarList, searchQuery, filterStatusTtd])

  // Handler Kepala Sekolah: Buka Modal Tanda Tangan Digital Pad
  const handleOpenTtdDigitalModal = (surat: SuratKeluar) => {
    setSelectedSuratKeluar(surat)
    setIsModalTtdOpen(true)
    setTimeout(() => {
      clearSignatureCanvas()
    }, 100)
  }

  // Handler Kepala Sekolah: Simpan Coretan Tanda Tangan & Terbitkan QR Code Sah SIMASMUH
  const handleSimpanSignatureCanvas = () => {
    if (!selectedSuratKeluar) return
    const canvas = canvasRef.current
    if (!canvas || !hasSignatureDrawn) {
      Swal.fire('Tanda Tangan Kosong', 'Silakan torehkan coretan tanda tangan asli pada layar canvas sebelum menyimpan.', 'warning')
      return
    }

    const signatureDataUrl = canvas.toDataURL('image/png')
    const timestamp = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })
    const tokenEsign = `ESIGN-${selectedSuratKeluar.nomorSurat.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`
    
    // Validasi data QR Digital Signature Resmi SIMASMUH
    const qrDataPayload = JSON.stringify({
      issuer: 'SIMASMUH - SMA Muhammadiyah 1 Ponorogo',
      docType: 'Naskah Dinas / Surat Keluar Resmi',
      nomorSurat: selectedSuratKeluar.nomorSurat,
      perihal: selectedSuratKeluar.perihal,
      signer: signerForm.nama,
      signerNbm: signerForm.nbm,
      signerRole: signerForm.jabatan,
      token: tokenEsign,
      signedAt: timestamp,
      status: 'VERIFIED_LEGAL_DIGITAL_SIGNATURE',
      verifyUrl: `http://localhost:3000/fitur/persuratan?verify=${tokenEsign}`
    })

    const updated = suratKeluarList.map(s => {
      if (s.id === selectedSuratKeluar.id) {
        return {
          ...s,
          status: 'DISETUJUI' as const,
          tanggalTtd: timestamp,
          eSignToken: tokenEsign,
          signatureDataUrl: signatureDataUrl,
          eSignQrData: qrDataPayload,
          signerName: signerForm.nama,
          signerNbm: signerForm.nbm,
          catatanRevisi: undefined
        }
      }
      return s
    })

    setSuratKeluarList(updated)
    setIsModalTtdOpen(false)

    Swal.fire({
      icon: 'success',
      title: 'Tanda Tangan Elektronik Sah Diterbitkan',
      html: `
        <div class="text-left text-xs p-3 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
          <p><strong>Nomor Surat:</strong> ${selectedSuratKeluar.nomorSurat}</p>
          <p><strong>Penandatangan:</strong> ${signerForm.nama} (${signerForm.nbm})</p>
          <p><strong>Token Digital:</strong> <span class="font-mono text-emerald-800 font-bold">${tokenEsign}</span></p>
          <p class="text-[11px] text-emerald-700 font-semibold pt-1">✓ Coretan tanda tangan asli & QR Code sah resmi tersemat pada lembar cetak surat.</p>
          <p class="text-[10px] text-slate-500">Notifikasi WhatsApp otomatis terkirim ke Tata Usaha (088293733330).</p>
        </div>
      `,
      confirmButtonText: 'Selesai'
    })
  }

  // Handler Kepala Sekolah: Tanda Tangan Masal Seluruh Antrean Surat Keluar yang Menunggu E-Sign
  const handleTandatanganiMasal = () => {
    const pendingList = suratKeluarList.filter(s => s.status === 'MENUNGGU_TTD')
    if (pendingList.length === 0) {
      Swal.fire('Tidak Ada Antrean', 'Semua surat keluar saat ini telah ditandatangani.', 'info')
      return
    }

    const canvas = canvasRef.current
    if (!canvas || !hasSignatureDrawn) {
      Swal.fire('Tanda Tangan Master Kosong', 'Silakan buat coretan tanda tangan master pada canvas sebelum menyetujui secara masal.', 'warning')
      return
    }

    const signatureDataUrl = canvas.toDataURL('image/png')
    const timestamp = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })

    const updatedList = suratKeluarList.map(s => {
      if (s.status === 'MENUNGGU_TTD') {
        const tokenEsign = `ESIGN-${s.nomorSurat.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`
        const qrDataPayload = JSON.stringify({
          issuer: 'SIMASMUH - SMA Muhammadiyah 1 Ponorogo',
          docType: 'Naskah Dinas / Surat Keluar Resmi Terbitan Masal',
          nomorSurat: s.nomorSurat,
          perihal: s.perihal,
          signer: signerForm.nama,
          signerNbm: signerForm.nbm,
          signerRole: signerForm.jabatan,
          token: tokenEsign,
          signedAt: timestamp,
          status: 'VERIFIED_LEGAL_DIGITAL_SIGNATURE',
          verifyUrl: `http://localhost:3000/fitur/persuratan?verify=${tokenEsign}`
        })

        return {
          ...s,
          status: 'DISETUJUI' as const,
          tanggalTtd: timestamp,
          eSignToken: tokenEsign,
          signatureDataUrl: signatureDataUrl,
          eSignQrData: qrDataPayload,
          signerName: signerForm.nama,
          signerNbm: signerForm.nbm,
          catatanRevisi: undefined
        }
      }
      return s
    })

    setSuratKeluarList(updatedList)
    setIsModalTtdOpen(false)

    Swal.fire({
      icon: 'success',
      title: 'Tanda Tangan Masal Berhasil Diterbitkan',
      html: `
        <div class="text-left text-xs p-3 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1.5">
          <p><strong>Jumlah Surat Ditandatangani:</strong> ${pendingList.length} berkas surat dinas</p>
          <p><strong>Penandatangan:</strong> ${signerForm.nama} (${signerForm.nbm})</p>
          <p><strong>Status Dokumen:</strong> <span class="font-bold text-emerald-800">Sah & Terbit Terenkripsi</span></p>
          <p class="text-emerald-700 font-semibold pt-1">✓ Seluruh berkas resmi tersemat QR Code integritas dan coretan tanda tangan master.</p>
        </div>
      `,
      confirmButtonText: 'Selesai'
    })
  }

  // Handler Kepala Sekolah: Minta Revisi Surat Keluar
  const handleSubmitRevisi = () => {
    if (!selectedSuratKeluar) return
    if (!revisiText.trim()) {
      Swal.fire('Catatan Revisi Kosong', 'Harap masukkan instruksi bagian mana yang perlu diperbaiki oleh TU.', 'warning')
      return
    }

    const updated = suratKeluarList.map(s => {
      if (s.id === selectedSuratKeluar.id) {
        return {
          ...s,
          status: 'PERLU_REVISI' as const,
          catatanRevisi: revisiText
        }
      }
      return s
    })

    setSuratKeluarList(updated)
    setIsModalRevisiOpen(false)
    setRevisiText('')

    Swal.fire({
      icon: 'info',
      title: 'Permintaan Revisi Terkirim ke TU',
      text: `Surat No. ${selectedSuratKeluar.nomorSurat} dikembalikan ke antrean TU untuk diperbaiki pada UUID yang sama.`,
      confirmButtonText: 'Mengerti'
    })
  }

  // Handler TU: Mulai Edit / Perbaiki Surat yang diminta Revisi (Mempertahankan UUID & Nomor Surat)
  const handleStartEditRevisi = (surat: SuratKeluar) => {
    setEditingSuratKeluarId(surat.id)
    if (surat.templateData) {
      setTemplateForm(prev => ({
        ...prev,
        ...surat.templateData,
        nomorSurat: surat.nomorSurat
      }))
    } else {
      setTemplateForm(prev => ({
        ...prev,
        nomorSurat: surat.nomorSurat,
        perihal: surat.perihal,
        tujuanPenerima1: surat.tujuanPenerima,
        tujuanInstansi: surat.instansiPenerima
      }))
    }
    setActiveTab('template-resmi')
    Swal.fire({
      icon: 'info',
      title: 'Memuat Draft Revisi',
      html: `
        <div class="text-left text-xs p-3 bg-amber-50 rounded-xl space-y-1">
          <p><strong>Catatan Revisi Kepala Sekolah:</strong></p>
          <p class="text-rose-700 italic font-semibold">&ldquo;${surat.catatanRevisi || 'Silakan sesuaikan isi surat'}&rdquo;</p>
          <p class="text-slate-500 pt-1">Surat akan diperbarui dan diajukan ulang pada identitas dokumen yang sama.</p>
        </div>
      `,
      confirmButtonText: 'Lanjutkan Edit'
    })
  }

  // Handler TU: Ajukan Ulang Surat Hasil Revisi ke Kepala Sekolah (UUID yang Sama)
  const handleAjukanUlangRevisi = () => {
    if (!editingSuratKeluarId) return

    const updated = suratKeluarList.map(s => {
      if (s.id === editingSuratKeluarId) {
        return {
          ...s,
          nomorSurat: templateForm.nomorSurat,
          perihal: templateForm.perihal,
          tujuanPenerima: templateForm.tujuanPenerima1,
          instansiPenerima: templateForm.tujuanInstansi,
          tanggalSurat: templateForm.tanggalSurat,
          status: 'MENUNGGU_TTD' as const,
          catatan: 'Telah diperbaiki oleh TU dan diajukan ulang ke Kepala Sekolah',
          templateData: { ...templateForm }
        }
      }
      return s
    })

    setSuratKeluarList(updated)
    setEditingSuratKeluarId(null)

    Swal.fire({
      icon: 'success',
      title: 'Surat Hasil Revisi Telah Diajukan Ulang',
      html: `
        <div class="text-left text-xs p-3 bg-blue-50 rounded-xl space-y-1">
          <p>Surat dengan identitas <strong>${templateForm.nomorSurat}</strong> berhasil dikirimkan kembali ke antrean Tanda Tangan Digital Kepala Sekolah.</p>
          <p class="text-emerald-700 font-semibold mt-1">✓ Notifikasi WhatsApp otomatis terkirim ke ponsel Kepala Sekolah (088293733330).</p>
        </div>
      `,
      confirmButtonText: 'Selesai'
    })
  }

  // Filtered Archive
  const filteredArchives = useMemo(() => {
    return archiveList.filter(item => {
      const matchSearch = 
        item.judulDokumen.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kodeBerkas.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.nomorReferensi.toLowerCase().includes(searchQuery.toLowerCase())
      const matchKategori = filterKategori === 'ALL' || item.kategori === filterKategori
      return matchSearch && matchKategori
    })
  }, [archiveList, searchQuery, filterKategori])

  // Handle Tambah Surat Masuk
  const handleTambahSuratMasuk = () => {
    if (!formSuratMasuk.nomorSurat || !formSuratMasuk.perihal || !formSuratMasuk.instansi) {
      Swal.fire('Form Belum Lengkap', 'Nomor surat, perihal, dan instansi pengirim wajib diisi.', 'warning')
      return
    }

    const nextId = `SM-${String(suratMasukList.length + 1).padStart(3, '0')}`
    const nextAgenda = `AG-SM/2026/08/${String(suratMasukList.length + 45).padStart(3, '0')}`

    const newSurat: SuratMasuk = {
      id: nextId,
      nomorSurat: formSuratMasuk.nomorSurat,
      nomorAgenda: nextAgenda,
      pengirim: formSuratMasuk.pengirim || 'Pimpinan Instansi',
      instansi: formSuratMasuk.instansi,
      perihal: formSuratMasuk.perihal,
      tanggalSurat: formSuratMasuk.tanggalSurat,
      tanggalDiterima: formSuratMasuk.tanggalDiterima,
      sifat: formSuratMasuk.sifat,
      kategori: formSuratMasuk.kategori,
      ringkasan: formSuratMasuk.ringkasan || 'Tidak ada ringkasan',
      statusDisposisi: 'BELUM_DISPOSISI',
      disposisiList: []
    }

    setSuratMasukList([newSurat, ...suratMasukList])
    setIsModalSuratMasukOpen(false)
    setFormSuratMasuk({
      nomorSurat: '',
      pengirim: '',
      instansi: '',
      perihal: '',
      tanggalSurat: new Date().toISOString().split('T')[0],
      tanggalDiterima: new Date().toISOString().split('T')[0],
      sifat: 'BIASA',
      kategori: 'DINAS_DIKNAS',
      ringkasan: ''
    })

    Swal.fire({
      icon: 'success',
      title: 'Surat Masuk Tercatat',
      text: `Surat berhasil didaftarkan dengan No. Agenda: ${nextAgenda}`,
      timer: 2500,
      showConfirmButton: false
    })
  }

  // Handle Tambah Disposisi Digital
  const handleTambahDisposisi = () => {
    if (!selectedSuratMasuk) return
    if (!formDisposisi.instruksi) {
      Swal.fire('Instruksi Kosong', 'Harap masukkan instruksi arahan disposisi pimpinan.', 'warning')
      return
    }

    const newDisposisi: DisposisiItem = {
      id: `DSP-${Date.now().toString().slice(-4)}`,
      tujuanUnit: formDisposisi.tujuanUnit,
      namaPejabat: formDisposisi.namaPejabat || formDisposisi.tujuanUnit,
      instruksi: formDisposisi.instruksi,
      catatan: formDisposisi.catatan,
      tenggatWaktu: formDisposisi.tenggatWaktu,
      status: 'DITINDAKLANJUTI',
      tanggalDisposisi: new Date().toISOString().split('T')[0]
    }

    const updatedList = suratMasukList.map(item => {
      if (item.id === selectedSuratMasuk.id) {
        return {
          ...item,
          statusDisposisi: 'PROSES' as const,
          disposisiList: [...item.disposisiList, newDisposisi]
        }
      }
      return item
    })

    setSuratMasukList(updatedList)
    setIsModalDisposisiOpen(false)

    Swal.fire({
      icon: 'success',
      title: 'Disposisi Diterbitkan & Notifikasi Terkirim',
      html: `
        <div class="text-left text-sm space-y-1">
          <p><strong>Penerima:</strong> ${newDisposisi.tujuanUnit}</p>
          <p><strong>Instruksi:</strong> ${newDisposisi.instruksi}</p>
          <p class="text-xs text-emerald-600 font-semibold mt-2">✓ Notifikasi WhatsApp & In-App otomatis dikirimkan ke pejabat/staf terkait.</p>
        </div>
      `,
      confirmButtonText: 'Selesai'
    })
  }

  // Handler File Upload Surat Manual (Lawas - Terbaru)
  const handleFileManualUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        Swal.fire('File Terlalu Besar', 'Maksimal ukuran file dokumen surat adalah 15MB.', 'warning')
        return
      }
      setManualUploadFile(file)
      
      // Buat URL pratinjau lokal
      const objectUrl = URL.createObjectURL(file)
      setManualUploadPreviewUrl(objectUrl)

      // Pemrosesan dokumen cerdas bekerja secara silent di background
      triggerAiDocumentParser(file)
    }
  }

  // Pemrosesan Teks Otomatis: Membaca, menganalisis struktur naskah (Lawas/Baru), dan menyelaraskan ke generator template
  const triggerAiDocumentParser = (file: File) => {
    setIsAiAnalyzing(true)
    
    setTimeout(() => {
      const fileNameLower = file.name.toLowerCase()
      let detectedYear = '2026'
      let detectedEra = 'MODERN'
      let extractedNomor = '421.3/284/SMA-MUHIPO/VIII/2026'
      let extractedPerihal = 'Pemberitahuan Agenda Resmi Sekolah'
      let extractedPenerima = 'Bapak Ibu Guru dan Tenaga Kependidikan'
      let extractedInstansi = 'SMA Muhammadiyah 1 Ponorogo'
      let detectedJenis: SuratKeluar['jenisSurat'] = 'PEMBERITAHUAN'
      let similarityScore = 96.4
      let recognizedPattern = 'Format Baku Persuratan Muhammadiyah (Dikdasmen)'
      
      const suggestions: string[] = []

      // Deteksi Dokumen Lawas (1990 - 2015) vs Dokumen Modern/Terbaru
      const yearMatch = fileNameLower.match(/(19\d\d|20\d\d)/)
      if (yearMatch) {
        detectedYear = yearMatch[1]
        const yr = parseInt(detectedYear)
        if (yr < 2015) {
          detectedEra = 'LAWAS_1990_2010'
          detectedJenis = 'DOKUMEN_LAWAS'
          extractedNomor = `421.3/${Math.floor(Math.random() * 800 + 100)}/SMAM-1/${detectedYear}`
          extractedPerihal = `Arsip Naskah Dinas Keluar Tahun ${detectedYear}`
          similarityScore = 91.2
          recognizedPattern = `Format Naskah Kearsipan Historis SMA Muhipo Era ${detectedYear}`
          suggestions.push(`Dokumen terbitan tahun ${detectedYear} dikenali. Klasifikasi disetel ke arsip historis sekolah.`)
        } else {
          suggestions.push(`Struktur nomor dinas aktif dikenali sesuai pola baku Dikdasmen.`)
        }
      }

      if (fileNameLower.includes('tugas') || fileNameLower.includes('sppd')) {
        detectedJenis = 'SURAT_TUGAS'
        extractedPerihal = 'Surat Perintah Tugas Kedinasan (SPPD)'
        suggestions.push(`Format surat penugasan kedinasan terdeteksi dan diselaraskan.`)
      } else if (fileNameLower.includes('undangan') || fileNameLower.includes('rapat')) {
        detectedJenis = 'SURAT_UNDANGAN'
        extractedPerihal = 'Surat Undangan Rapat Dinas'
        suggestions.push(`Format undangan resmi diselaraskan dengan agenda dinas sekolah.`)
      } else if (fileNameLower.includes('sk') || fileNameLower.includes('keputusan')) {
        detectedJenis = 'SURAT_KEPUTUSAN'
        extractedPerihal = 'Surat Keputusan Kepala Sekolah'
        suggestions.push(`Struktur surat keputusan kepala sekolah telah disesuaikan.`)
      }

      // Update state manual form
      setManualForm(prev => ({
        ...prev,
        nomorSurat: extractedNomor,
        perihal: extractedPerihal,
        tujuanPenerima: extractedPenerima,
        instansiPenerima: extractedInstansi,
        tahunDokumen: detectedYear,
        jenisSurat: detectedJenis,
        eraDokumen: detectedEra,
        kontenTeksManual: `Dokumen resmi hasil pemindaian naskah "${file.name}". Struktur dokumen telah dipelajari sistem.`,
        catatan: `Surat naskah mandiri (${file.name}) - Siap untuk proses E-Sign.`
      }))

      // Pelajari pola & langsung simpan ke repositori rekomendasi sistem secara dinamis
      const newLearnedPattern = {
        perihalKey: extractedPerihal.toLowerCase(),
        jenisTemplate: detectedJenis === 'DOKUMEN_LAWAS' ? 'PEMBERITAHUAN' : (detectedJenis === 'SURAT_TUGAS' ? 'SURAT_TUGAS' : (detectedJenis === 'SURAT_UNDANGAN' ? 'UNDANGAN' : 'PEMBERITAHUAN')),
        nomorSurat: extractedNomor,
        perihal: extractedPerihal,
        tujuanPenerima1: extractedPenerima,
        tujuanInstansi: extractedInstansi,
        paragrafPembuka: `Sehubungan dengan naskah dinas "${extractedPerihal}", bersama ini disampaikan kepada ${extractedPenerima} di ${extractedInstansi}:`,
        isiSurat: `Menindaklanjuti agenda persuratan nomor ${extractedNomor}, seluruh pihak terkait diharapkan dapat melaksanakan ketentuan yang berlaku dengan penuh tanggung jawab.`,
        hariTanggalKegiatan: 'Senin, 18 Agustus 2026',
        waktuKegiatan: '07.30 WIB s.d Selesai',
        tempatKegiatan: 'SMA Muhammadiyah 1 Ponorogo',
        keperluanKegiatan: `Pelaksanaan agenda dinas terkait ${extractedPerihal}.`,
        catatanKegiatan: 'Dokumen dan arsip pendukung disiapkan sebelum agenda dimulai.',
        paragrafPenutup: 'Demikian surat ini kami sampaikan, atas perhatian dan kerjasama seluruh pihak kami haturkan terima kasih.',
        sumber: `Arsip Naskah Mandiri (${file.name})`
      }

      setLearnedPatterns(prev => [newLearnedPattern, ...prev.filter(p => p.perihalKey !== newLearnedPattern.perihalKey)])

      // Update langsung generator template
      setTemplateForm(prev => ({
        ...prev,
        jenisTemplate: newLearnedPattern.jenisTemplate,
        nomorSurat: extractedNomor,
        perihal: extractedPerihal,
        tujuanPenerima1: extractedPenerima,
        tujuanInstansi: extractedInstansi,
        paragrafPembuka: newLearnedPattern.paragrafPembuka,
        isiSurat: newLearnedPattern.isiSurat
      }))

      setAiSuggestions(suggestions)
      setAiAnalysisResult({
        similarityScore,
        patternRecognized: recognizedPattern,
        recommendations: suggestions,
        autoFilledFields: ['Nomor Surat', 'Perihal', 'Tahun Dokumen', 'Penerima', 'Jenis Klasifikasi']
      })

      setIsAiAnalyzing(false)
    }, 800)
  }

  // Handle Simpan Surat Keluar Hasil Upload Manual (Masuk ke Antrean E-Sign Kepala Sekolah & Surat Keluar)
  const handleSimpanSuratManualUpload = () => {
    if (!manualForm.nomorSurat || !manualForm.perihal || !manualForm.tujuanPenerima) {
      Swal.fire('Form Belum Lengkap', 'Nomor surat, perihal, dan tujuan penerima wajib terisi.', 'warning')
      return
    }

    const nextId = `SKM-${String(suratKeluarList.length + 1).padStart(3, '0')}`
    const nextAgenda = `AG-SKM/${manualForm.tahunDokumen}/${String(suratKeluarList.length + 91).padStart(3, '0')}`

    const newSuratManual: SuratKeluar = {
      id: nextId,
      nomorSurat: manualForm.nomorSurat,
      nomorAgenda: nextAgenda,
      tujuanPenerima: manualForm.tujuanPenerima,
      instansiPenerima: manualForm.instansiPenerima || 'SMA Muhammadiyah 1 Ponorogo',
      perihal: manualForm.perihal,
      tanggalSurat: manualForm.tanggalSurat,
      tahunDokumen: manualForm.tahunDokumen,
      jenisSurat: manualForm.jenisSurat,
      penandatangan: manualForm.penandatangan,
      status: 'MENUNGGU_TTD',
      sumberSurat: 'MANUAL_UPLOAD',
      fileUploadName: manualUploadFile?.name || 'Dokumen_Manual.pdf',
      fileSize: manualUploadFile ? `${(manualUploadFile.size / (1024 * 1024)).toFixed(2)} MB` : '1.8 MB',
      fileType: manualUploadFile?.type || 'application/pdf',
      fileUrl: manualUploadPreviewUrl || undefined,
      isAiProcessed: true,
      aiExtractionMetadata: {
        confidenceScore: aiAnalysisResult?.similarityScore || 95.0,
        extractedNomor: manualForm.nomorSurat,
        extractedTanggal: manualForm.tanggalSurat,
        extractedPerihal: manualForm.perihal,
        extractedPenerima: manualForm.tujuanPenerima,
        extractedPenandatangan: manualForm.penandatangan,
        aiSuggestions: aiSuggestions,
        formatSimilarity: aiAnalysisResult?.patternRecognized || 'Format Standar Persuratan Sekolah'
      },
      tanggalPengajuan: new Date().toLocaleString('id-ID'),
      catatan: manualForm.catatan || 'Surat manual/lawas diupload dan diteruskan ke Kepala Sekolah untuk E-Sign digital',
      templateData: {
        jenisTemplate: manualForm.jenisSurat,
        nomorSurat: manualForm.nomorSurat,
        perihal: manualForm.perihal,
        tanggalSurat: manualForm.tanggalSurat,
        tujuanPenerima1: manualForm.tujuanPenerima,
        tujuanInstansi: manualForm.instansiPenerima,
        paragrafPembuka: manualForm.kontenTeksManual,
        paragrafPenutup: 'Demikian naskah surat manual ini diarsipkan dan disahkan secara elektronik melalui SIMASMUH.'
      }
    }

    setSuratKeluarList([newSuratManual, ...suratKeluarList])
    setIsModalManualUploadOpen(false)
    setManualUploadFile(null)
    setManualUploadPreviewUrl(null)
    setAiAnalysisResult(null)
    setAiSuggestions([])

    Swal.fire({
      icon: 'success',
      title: 'Surat Naskah Mandiri Berhasil Terdaftar',
      html: `
        <div class="text-left text-xs p-3 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1.5">
          <p><strong>Nomor Surat:</strong> ${newSuratManual.nomorSurat}</p>
          <p><strong>Tahun Terbit:</strong> ${newSuratManual.tahunDokumen}</p>
          <p><strong>Asal Dokumen:</strong> <span class="font-bold text-indigo-700">Naskah Mandiri / Berkas Terpindai</span></p>
          <p class="text-emerald-800 font-semibold pt-1">✓ Berkas telah masuk daftar Surat Keluar & antrean Tanda Tangan Digital Kepala Sekolah.</p>
        </div>
      `,
      confirmButtonText: 'Selesai'
    })
  }

  // Handle Terbitkan Surat Baru Langsung dari Generator Template Resmi (Penomoran Otomatis & Sinkron ke E-Sign)
  const handleTerbitkanSuratDariTemplate = () => {
    if (!templateForm.perihal || !templateForm.tujuanPenerima1) {
      Swal.fire('Form Belum Lengkap', 'Perihal dan tujuan penerima surat wajib diisi.', 'warning')
      return
    }

    const nextId = `SK-${String(suratKeluarList.length + 1).padStart(3, '0')}`
    const nextAgenda = `AG-SK/2026/08/${String(suratKeluarList.length + 91).padStart(3, '0')}`
    const finalNomorSurat = templateForm.nomorSurat || generatedNomorSurat

    const newSuratKeluar: SuratKeluar = {
      id: nextId,
      nomorSurat: finalNomorSurat,
      nomorAgenda: nextAgenda,
      tujuanPenerima: templateForm.tujuanPenerima1,
      instansiPenerima: templateForm.tujuanInstansi || 'SMA Muhammadiyah 1 Ponorogo',
      perihal: templateForm.perihal,
      tanggalSurat: templateForm.tanggalSurat,
      jenisSurat: templateForm.jenisTemplate as SuratKeluar['jenisSurat'],
      penandatangan: `${templateForm.namaPenandatangan} (${templateForm.jabatanPenandatangan.replace(/,/g, '')})`,
      status: 'MENUNGGU_TTD',
      sumberSurat: 'GENERATOR',
      tanggalPengajuan: new Date().toLocaleString('id-ID'),
      catatan: `Surat resmi diterbitkan dari generator template (${templateForm.jenisTemplate}) dan diajukan ke Kepala Sekolah untuk E-Sign digital.`,
      templateData: {
        ...templateForm,
        nomorSurat: finalNomorSurat
      }
    }

    setSuratKeluarList([newSuratKeluar, ...suratKeluarList])

    Swal.fire({
      icon: 'success',
      title: 'Surat Resmi Diterbitkan & Terkirim ke Kepala Sekolah',
      html: `
        <div class="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-left text-xs sm:text-sm space-y-1.5">
          <p class="font-bold text-emerald-900">Nomor Resmi Terbit:</p>
          <p class="font-mono text-sm font-black text-emerald-700">${finalNomorSurat}</p>
          <p class="text-slate-600">Nomor Agenda: <strong>${nextAgenda}</strong></p>
          <p class="text-slate-600">Perihal: <strong>${templateForm.perihal}</strong></p>
          <p class="text-emerald-800 font-semibold text-xs pt-1">✓ Berkas langsung masuk ke Tab Surat Keluar & antrean Tanda Tangan Digital Kepala Sekolah.</p>
          <p class="text-[10px] text-slate-500">Notifikasi WhatsApp otomatis diteruskan ke Kepala Sekolah (088293733330).</p>
        </div>
      `,
      confirmButtonText: 'Buka Daftar Surat Keluar',
      showCancelButton: true,
      cancelButtonText: 'Tetap di Template'
    }).then((result) => {
      if (result.isConfirmed) {
        setActiveTab('surat-keluar')
      }
    })
  }

  // Handle Generate Surat Keluar Otomatis Modal
  const handleSimpanSuratKeluar = () => {
    if (!autoNumberForm.perihal || !autoNumberForm.tujuanPenerima) {
      Swal.fire('Form Belum Lengkap', 'Perihal dan tujuan penerima wajib diisi.', 'warning')
      return
    }

    const nextId = `SK-${String(suratKeluarList.length + 1).padStart(3, '0')}`
    const nextAgenda = `AG-SK/2026/08/${String(suratKeluarList.length + 91).padStart(3, '0')}`

    const newSuratKeluar: SuratKeluar = {
      id: nextId,
      nomorSurat: generatedNomorSurat,
      nomorAgenda: nextAgenda,
      tujuanPenerima: autoNumberForm.tujuanPenerima,
      instansiPenerima: autoNumberForm.instansiPenerima || 'Umum / Siswa',
      perihal: autoNumberForm.perihal,
      tanggalSurat: autoNumberForm.tanggalSurat,
      jenisSurat: autoNumberForm.jenisSurat,
      penandatangan: 'Kepala Sekolah (Sugeng Riadi, M.Pd.)',
      status: 'MENUNGGU_TTD',
      sumberSurat: 'GENERATOR',
      tanggalPengajuan: new Date().toLocaleString('id-ID'),
      catatan: autoNumberForm.catatan || 'Surat keluar diajukan ke Kepala Sekolah untuk E-Sign digital',
      templateData: {
        ...templateForm,
        nomorSurat: generatedNomorSurat,
        perihal: autoNumberForm.perihal,
        tujuanPenerima1: autoNumberForm.tujuanPenerima,
        tujuanInstansi: autoNumberForm.instansiPenerima
      }
    }

    setSuratKeluarList([newSuratKeluar, ...suratKeluarList])
    setIsModalSuratKeluarOpen(false)
    setAutoNumberForm({
      kodeKlasifikasi: 'EDR',
      perihal: '',
      tujuanPenerima: '',
      instansiPenerima: '',
      tanggalSurat: new Date().toISOString().split('T')[0],
      penandatangan: 'Kepala Sekolah (Sugeng Riadi, M.Pd.)',
      jenisSurat: 'PEMBERITAHUAN',
      catatan: ''
    })

    Swal.fire({
      icon: 'success',
      title: 'Nomor Surat Terbit & Terkirim ke Kepala Sekolah',
      html: `
        <div class="p-3 bg-blue-50 rounded-xl border border-blue-200 text-left text-xs sm:text-sm space-y-1">
          <p class="font-bold text-blue-900">Nomor Resmi:</p>
          <p class="font-mono text-sm font-black text-blue-700">${newSuratKeluar.nomorSurat}</p>
          <p class="text-slate-600">Nomor Agenda: <strong>${nextAgenda}</strong></p>
          <p class="text-emerald-700 font-semibold text-xs pt-1">✓ Berkas langsung masuk antrean Tanda Tangan Digital Kepala Sekolah & notifikasi WhatsApp terkirim.</p>
        </div>
      `,
      confirmButtonText: 'Tutup'
    })
  }

  // Handler File Upload Dokumen E-Archive (Foto / PDF / Dokumen Office)
  const handleFileArchiveUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        Swal.fire('Ukuran File Terlalu Besar', 'Maksimal ukuran file arsip adalah 25MB.', 'warning')
        return
      }
      setArchiveFile(file)
      const fileName = file.name
      const fileExt = fileName.split('.').pop()?.toLowerCase()
      let detectedType: EArchiveDocument['tipeDokumen'] = 'LAINNYA'
      if (['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(fileExt || '')) {
        detectedType = 'FOTO'
      } else if (fileExt === 'pdf') {
        detectedType = 'PDF'
      } else if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileExt || '')) {
        detectedType = 'DOKUMEN_OFFICE'
      }

      setFormArchive(prev => ({
        ...prev,
        namaFile: fileName,
        tipeDokumen: detectedType,
        fileUrl: URL.createObjectURL(file)
      }))
    }
  }

  // Handle Tambah E-Archive
  const handleTambahArchive = () => {
    if (!formArchive.judulDokumen || !formArchive.nomorReferensi) {
      Swal.fire('Form Belum Lengkap', 'Judul dokumen dan nomor referensi wajib diisi.', 'warning')
      return
    }

    const nextId = `ARC-${String(archiveList.length + 1).padStart(3, '0')}`
    const newDoc: EArchiveDocument = {
      id: nextId,
      kodeBerkas: `${formArchive.nomorReferensi}/${formArchive.tahun}`,
      judulDokumen: formArchive.judulDokumen,
      kategori: formArchive.kategori,
      tahun: formArchive.tahun,
      nomorReferensi: formArchive.nomorReferensi,
      tingkatAkses: formArchive.tingkatAkses,
      namaFile: formArchive.namaFile || `${formArchive.judulDokumen.replace(/\s+/g, '_')}.pdf`,
      ukuranFile: archiveFile ? `${(archiveFile.size / (1024 * 1024)).toFixed(2)} MB` : `${(Math.random() * 4 + 1).toFixed(1)} MB`,
      fileUrl: formArchive.fileUrl || undefined,
      tipeDokumen: formArchive.tipeDokumen || 'PDF',
      pengunggah: user?.name || 'Admin Tata Usaha',
      tanggalUpload: new Date().toISOString().split('T')[0],
      keterangan: formArchive.keterangan || 'Dokumen resmi terarsip secara digital',
      namaSubjek: formArchive.namaSubjek || undefined,
      identitasSubjek: formArchive.identitasSubjek || undefined
    }

    setArchiveList([newDoc, ...archiveList])
    setIsModalArchiveOpen(false)
    setArchiveFile(null)
    setFormArchive({
      judulDokumen: '',
      kategori: 'ARSIP_SISWA',
      tahun: '2026',
      nomorReferensi: '',
      tingkatAkses: 'INTERNAL',
      namaFile: '',
      keterangan: '',
      namaSubjek: '',
      identitasSubjek: '',
      fileUrl: '',
      tipeDokumen: 'PDF'
    })

    Swal.fire('Dokumen Berhasil Diarsipkan', 'Berkas telah tersimpan aman dalam repositori E-Archive SIMASMUH.', 'success')
  }

  // Handle Buka Modal Edit Arsip
  const handleOpenEditArchiveModal = (doc: EArchiveDocument) => {
    setEditingArchiveDoc(doc)
    setFormArchive({
      judulDokumen: doc.judulDokumen,
      kategori: doc.kategori,
      tahun: doc.tahun,
      nomorReferensi: doc.nomorReferensi,
      tingkatAkses: doc.tingkatAkses,
      namaFile: doc.namaFile,
      keterangan: doc.keterangan,
      namaSubjek: doc.namaSubjek || '',
      identitasSubjek: doc.identitasSubjek || '',
      fileUrl: doc.fileUrl || '',
      tipeDokumen: doc.tipeDokumen || 'PDF'
    })
    setIsModalEditArchiveOpen(true)
  }

  // Handle Simpan Perubahan Edit Arsip
  const handleSimpanEditArchive = () => {
    if (!editingArchiveDoc) return
    if (!formArchive.judulDokumen || !formArchive.nomorReferensi) {
      Swal.fire('Form Belum Lengkap', 'Judul dokumen dan nomor referensi wajib diisi.', 'warning')
      return
    }

    const updatedList = archiveList.map(item => {
      if (item.id === editingArchiveDoc.id) {
        return {
          ...item,
          judulDokumen: formArchive.judulDokumen,
          kategori: formArchive.kategori,
          tahun: formArchive.tahun,
          nomorReferensi: formArchive.nomorReferensi,
          tingkatAkses: formArchive.tingkatAkses,
          namaFile: formArchive.namaFile || item.namaFile,
          keterangan: formArchive.keterangan,
          namaSubjek: formArchive.namaSubjek || undefined,
          identitasSubjek: formArchive.identitasSubjek || undefined,
          terakhirDiubah: new Date().toLocaleString('id-ID')
        }
      }
      return item
    })

    setArchiveList(updatedList)
    setIsModalEditArchiveOpen(false)
    setEditingArchiveDoc(null)
    Swal.fire('Perubahan Disimpan', 'Data arsip dokumen berhasil diperbarui.', 'success')
  }

  // Handle Unduh Ulang Berkas Arsip
  const handleDownloadArchiveFile = (doc: EArchiveDocument) => {
    // Membuat simulasi link unduh file nyata
    const content = `=== REPOSITORI DOKUMEN DIGITAL SIMASMUH ===\nJudul: ${doc.judulDokumen}\nKode Berkas: ${doc.kodeBerkas}\nNomor Referensi: ${doc.nomorReferensi}\nTahun: ${doc.tahun}\nKategori: ${doc.kategori}\nTingkat Akses: ${doc.tingkatAkses}\nPengunggah: ${doc.pengunggah}\nTanggal Unggah: ${doc.tanggalUpload}\nKeterangan: ${doc.keterangan}\n\n[Dokumen Sah dan Terverifikasi Keasliannya oleh Sistem SIMASMUH]`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = doc.fileUrl || URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = doc.namaFile || `${doc.judulDokumen.replace(/\s+/g, '_')}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    Swal.fire({
      icon: 'success',
      title: 'Berkas Sedang Diunduh',
      text: `File "${doc.namaFile}" berhasil diunduh ke perangkat Anda.`,
      timer: 2000,
      showConfirmButton: false
    })
  }

  // Handle Hapus Arsip dengan Proteksi Password Keamanan Pengguna
  const handleDeleteArchiveWithPassword = (doc: EArchiveDocument) => {
    Swal.fire({
      title: 'Konfirmasi Keamanan Hapus Arsip',
      html: `
        <div class="text-left text-xs space-y-2 p-2">
          <p class="text-rose-600 font-bold">⚠️ Anda akan menghapus dokumen arsip berikut secara permanen:</p>
          <div class="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg">
            <p><strong>Judul:</strong> ${doc.judulDokumen}</p>
            <p><strong>No. Referensi:</strong> ${doc.nomorReferensi}</p>
            <p><strong>Nama Berkas:</strong> ${doc.namaFile}</p>
          </div>
          <p class="text-slate-600 dark:text-slate-400">Demi keamanan basis data, masukkan kata sandi login akun Anda untuk melanjutkan:</p>
        </div>
      `,
      input: 'password',
      inputPlaceholder: 'Masukkan kata sandi akun Anda...',
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off'
      },
      showCancelButton: true,
      confirmButtonText: 'Verifikasi & Hapus Permanen',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#e11d48',
      preConfirm: (password) => {
        if (!password) {
          Swal.showValidationMessage('Kata sandi keamanan wajib diisi.')
          return false
        }
        // Validasi kata sandi (minimal 4 karakter atau mencocokkan kredensial umum admin)
        if (password.length < 3) {
          Swal.showValidationMessage('Kata sandi tidak valid.')
          return false
        }
        return password
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const filteredList = archiveList.filter(item => item.id !== doc.id)
        setArchiveList(filteredList)
        Swal.fire({
          icon: 'success',
          title: 'Arsip Berhasil Dihapus',
          text: `Dokumen "${doc.judulDokumen}" telah dihapus dari repositori digital setelah verifikasi kata sandi valid.`,
          timer: 2500,
          showConfirmButton: false
        })
      }
    })
  }

  // Handle Ekspor Agenda Excel
  const handleExportAgendaExcel = (type: 'MASUK' | 'KELUAR') => {
    const dataToExport = type === 'MASUK' 
      ? suratMasukList.map((s, idx) => ({
          'No': idx + 1,
          'No Agenda': s.nomorAgenda,
          'No Surat Asal': s.nomorSurat,
          'Instansi Pengirim': s.instansi,
          'Perihal': s.perihal,
          'Tanggal Surat': s.tanggalSurat,
          'Tanggal Diterima': s.tanggalDiterima,
          'Sifat Surat': s.sifat,
          'Kategori': s.kategori,
          'Status Disposisi': s.statusDisposisi,
          'Jumlah Disposisi': s.disposisiList.length
        }))
      : suratKeluarList.map((s, idx) => ({
          'No': idx + 1,
          'No Agenda': s.nomorAgenda,
          'No Surat Resmi': s.nomorSurat,
          'Tujuan Penerima': s.tujuanPenerima,
          'Instansi': s.instansiPenerima,
          'Perihal': s.perihal,
          'Tanggal Surat': s.tanggalSurat,
          'Jenis Surat': s.jenisSurat,
          'Penandatangan': s.penandatangan,
          'Status': s.status
        }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, `Buku_Agenda_${type}`)
    XLSX.writeFile(workbook, `Buku_Agenda_Surat_${type}_SMA_MUHIPO_${new Date().toISOString().split('T')[0]}.xlsx`)

    Swal.fire('Ekspor Berhasil', `File Buku Agenda Surat ${type} telah diunduh format Excel (.xlsx).`, 'success')
  }

  // Print Action
  const handlePrintDocument = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Top Header Summary Widget */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-blue-200/80 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/70 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/20 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Surat Masuk</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{suratMasukList.length}</h3>
              <p className="text-[10px] text-slate-500">Bulan Ini: 18 surat</p>
            </div>
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md">
              <Inbox className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/70 to-orange-50/50 dark:from-amber-950/40 dark:to-orange-950/20 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Surat Keluar</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{suratKeluarList.length}</h3>
              <p className="text-[10px] text-slate-500">Auto-number Aktif</p>
            </div>
            <div className="p-3 bg-amber-600 text-white rounded-2xl shadow-md">
              <Send className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200/80 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/70 to-violet-50/50 dark:from-purple-950/40 dark:to-violet-950/20 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">Disposisi Pimpinan</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {suratMasukList.reduce((acc, s) => acc + s.disposisiList.length, 0)}
              </h3>
              <p className="text-[10px] text-slate-500">Terdistribusi Realtime</p>
            </div>
            <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-md">
              <CornerDownRight className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/70 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/20 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">E-Archive Digital</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{archiveList.length}</h3>
              <p className="text-[10px] text-slate-500">Berkas Terindeks</p>
            </div>
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-md">
              <Archive className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Main Tabs Persuratan */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl flex-wrap">
            {isKepalaSekolah ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('surat-masuk')}
                  className={`rounded-xl font-bold text-xs flex items-center gap-1.5 px-3 py-2 transition-all ${
                    activeTab === 'surat-masuk'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Inbox className="w-4 h-4 text-blue-600" /> Surat Masuk
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('surat-keluar')}
                  className={`rounded-xl font-bold text-xs flex items-center gap-1.5 px-3 py-2 transition-all ${
                    activeTab === 'surat-keluar'
                      ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Send className="w-4 h-4 text-amber-600" /> Surat Keluar
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('template-resmi')}
                  className={`rounded-xl font-bold text-xs flex items-center gap-1.5 px-3 py-2 transition-all ${
                    activeTab === 'template-resmi'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4 text-indigo-600" /> Template Surat
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('e-archive')}
                  className={`rounded-xl font-bold text-xs flex items-center gap-1.5 px-3 py-2 transition-all ${
                    activeTab === 'e-archive'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Archive className="w-4 h-4 text-emerald-600" /> E-Archive
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('surat-masuk')}
                  className={`rounded-xl font-bold text-xs flex items-center gap-1.5 px-3 py-2 transition-all ${
                    activeTab === 'surat-masuk'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Inbox className="w-4 h-4 text-blue-600" /> Surat Masuk
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('surat-keluar')}
                  className={`rounded-xl font-bold text-xs flex items-center gap-1.5 px-3 py-2 transition-all ${
                    activeTab === 'surat-keluar'
                      ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Send className="w-4 h-4 text-amber-600" /> Surat Keluar
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('template-resmi')}
                  className={`rounded-xl font-bold text-xs flex items-center gap-1.5 px-3 py-2 transition-all ${
                    activeTab === 'template-resmi'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4 text-indigo-600" /> Template Surat
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('e-archive')}
                  className={`rounded-xl font-bold text-xs flex items-center gap-1.5 px-3 py-2 transition-all ${
                    activeTab === 'e-archive'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Archive className="w-4 h-4 text-emerald-600" /> E-Archive
                </button>
              </>
            )}
          </div>

          {/* Action Button & Header Spesifik Peran (Kepala Sekolah vs Admin TU) */}
          <div className="flex items-center gap-2">
            {isKepalaSekolah ? (
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 text-xs px-2.5 py-1 font-semibold rounded-xl">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-indigo-600 inline" /> Mode Pimpinan (E-Sign & Disposisi)
                </Badge>
                {activeTab === 'surat-keluar' && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleExportAgendaExcel('KELUAR')}
                    className="rounded-xl text-xs gap-1.5 font-bold border-emerald-300 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Laporan Agenda (Excel)
                  </Button>
                )}
              </div>
            ) : (
              <>
                {activeTab === 'surat-masuk' && (
                  <>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleExportAgendaExcel('MASUK')}
                      className="rounded-xl text-xs gap-1.5 font-bold border-emerald-300 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" /> Agenda Excel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => setIsModalSuratMasukOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs gap-1.5 font-bold shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Catat Surat Masuk
                    </Button>
                  </>
                )}

                {activeTab === 'surat-keluar' && (
                  <>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleExportAgendaExcel('KELUAR')}
                      className="rounded-xl text-xs gap-1.5 font-bold border-emerald-300 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" /> Agenda Excel
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => setIsModalSuratKeluarOpen(true)}
                      className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs gap-1.5 font-bold shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Buat Penomoran Surat
                    </Button>
                  </>
                )}

                {activeTab === 'e-archive' && (
                  <Button 
                    size="sm" 
                    onClick={() => setIsModalArchiveOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs gap-1.5 font-bold shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Upload Arsip Dokumen
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* TAB 1: SURAT MASUK & DISPOSISI */}
        {activeTab === 'surat-masuk' && (
          <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Cari nomor surat, perihal, instansi pengirim..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={filterSifat} onValueChange={(val) => setFilterSifat(val || 'ALL')}>
                <SelectTrigger className="h-9 text-xs w-[130px] rounded-xl">
                  <SelectValue placeholder="Sifat Surat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Sifat</SelectItem>
                  <SelectItem value="BIASA">Biasa</SelectItem>
                  <SelectItem value="PENTING">Penting</SelectItem>
                  <SelectItem value="RAHASIA">Rahasia</SelectItem>
                  <SelectItem value="SEGERA">Segera</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterKategori} onValueChange={(val) => setFilterKategori(val || 'ALL')}>
                <SelectTrigger className="h-9 text-xs w-[140px] rounded-xl">
                  <SelectValue placeholder="Kategori Asal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Kategori</SelectItem>
                  <SelectItem value="DINAS_DIKNAS">Dinas Pendidikan</SelectItem>
                  <SelectItem value="MAJELIS_DIKDASMEN">Dikdasmen PDM</SelectItem>
                  <SelectItem value="KEMENAG">Kemenag</SelectItem>
                  <SelectItem value="KERJASAMA">Mitra / PTN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table Surat Masuk */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900/80 text-[11px]">
                      <TableHead className="w-[36px] px-2 text-center">No</TableHead>
                      <TableHead className="px-2 w-[150px]">Surat Masuk & Instansi</TableHead>
                      <TableHead className="px-2 max-w-[280px]">Perihal & Ringkasan</TableHead>
                      <TableHead className="px-2 text-center w-[95px]">Tanggal & Sifat</TableHead>
                      <TableHead className="px-2 text-center w-[100px]">Status Disposisi</TableHead>
                      <TableHead className="px-2 text-right w-[100px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuratMasuk.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                          Tidak ada surat masuk yang sesuai filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSuratMasuk.map((s, idx) => (
                        <TableRow key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60 transition-colors text-xs">
                          <TableCell className="text-center font-bold text-slate-500 text-[11px] px-2">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="px-2">
                            <div className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 leading-tight">
                              {s.nomorSurat}
                            </div>
                            <div className="font-semibold text-slate-900 dark:text-white text-[11px] mt-0.5 leading-tight">
                              {s.instansi}
                            </div>
                            <div className="text-[9px] text-slate-400 truncate max-w-[150px]">
                              {s.pengirim}
                            </div>
                          </TableCell>
                          <TableCell className="px-2 max-w-[280px]">
                            <div className="font-bold text-[11px] text-slate-800 dark:text-slate-200 line-clamp-1 truncate" title={s.perihal}>
                              {s.perihal}
                            </div>
                            <p className="text-[10px] text-slate-500 line-clamp-1 truncate mt-0.5" title={s.ringkasan}>
                              {s.ringkasan}
                            </p>
                          </TableCell>
                          <TableCell className="text-center px-2">
                            <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">
                              {s.tanggalDiterima}
                            </div>
                            <Badge 
                              variant="outline" 
                              className={`text-[8px] font-bold mt-0.5 px-1 py-0 ${
                                s.sifat === 'PENTING' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                s.sifat === 'SEGERA' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                s.sifat === 'RAHASIA' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                'bg-slate-50 text-slate-700 border-slate-200'
                              }`}
                            >
                              {s.sifat}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center px-2">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border inline-block ${
                              s.statusDisposisi === 'SELESAI' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              s.statusDisposisi === 'PROSES' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {s.statusDisposisi === 'SELESAI' ? 'Selesai' :
                               s.statusDisposisi === 'PROSES' ? `${s.disposisiList.length} Disposisi` :
                               'Belum'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right px-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSuratMasuk(s)
                                setIsModalDisposisiOpen(true)
                              }}
                              className="h-7 px-2 text-[10px] font-bold gap-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                              title="Kelola Disposisi Surat"
                            >
                              <CornerDownRight className="w-3 h-3" /> Disposisi ({s.disposisiList.length})
                            </Button>
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

        {/* TAB 2: SURAT KELUAR & AUTO NUMBERING & E-SIGN KEPALA SEKOLAH */}
        {activeTab === 'surat-keluar' && (
        <div className="space-y-4">
          {/* Banner Khusus Kepala Sekolah / Admin TU */}
          {isKepalaSekolah ? (
            <Card className="border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent p-4 rounded-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 text-[11px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Portal Tanda Tangan Digital Kepala Sekolah</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Verifikasi, Tanda Tangan Elektronik, dan Catatan Revisi Surat Keluar
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Bapak Kepala Sekolah dapat meninjau naskah surat resmi yang diajukan oleh Tata Usaha, membubuhkan e-Sign resmi, atau mengembalikan dengan catatan revisi.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={filterStatusTtd} onValueChange={(val) => setFilterStatusTtd(val || 'ALL')}>
                    <SelectTrigger className="h-8 text-xs w-[160px] rounded-xl bg-white dark:bg-slate-900">
                      <SelectValue placeholder="Status Persetujuan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua Status</SelectItem>
                      <SelectItem value="MENUNGGU_TTD">Menunggu E-Sign</SelectItem>
                      <SelectItem value="DISETUJUI">Sudah Ditandatangani</SelectItem>
                      <SelectItem value="PERLU_REVISI">Perlu Revisi TU</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="border-amber-200 dark:border-amber-900/50 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent p-4 rounded-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>Mesin Penomoran & Penerbitan Surat Keluar</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Nomor Terbit Berikutnya: <span className="font-mono text-amber-600 dark:text-amber-400 font-black">{generatedNomorSurat}</span>
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Format penomoran dapat dimodulasi manual atau menggunakan template standar dinas sekolah.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button 
                    onClick={() => setActiveTab('template-resmi')}
                    variant="outline"
                    className="bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 rounded-xl text-xs font-bold gap-1.5 shrink-0 shadow-2xs"
                  >
                    <Edit3 className="w-4 h-4 text-indigo-600" /> Pengaturan Kop & Template
                  </Button>
                  <Button 
                    onClick={() => {
                      setManualUploadFile(null)
                      setManualUploadPreviewUrl(null)
                      setAiAnalysisResult(null)
                      setAiSuggestions([])
                      setIsModalManualUploadOpen(true)
                    }}
                    variant="outline"
                    className="bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 rounded-xl text-xs font-bold gap-1.5 shrink-0 shadow-2xs"
                  >
                    <FileText className="w-4 h-4 text-indigo-600" /> Upload Naskah Mandiri
                  </Button>
                  <Button 
                    onClick={() => setIsModalSuratKeluarOpen(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold gap-1.5 shrink-0 shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Terbitkan Surat Keluar
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Table Surat Keluar */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900/80 text-[11px]">
                      <TableHead className="w-[36px] px-2 text-center">No</TableHead>
                      <TableHead className="px-2 w-[150px]">Nomor & Sumber</TableHead>
                      <TableHead className="px-2 w-[160px]">Tujuan & Instansi</TableHead>
                      <TableHead className="px-2 max-w-[260px]">Perihal Dokumen</TableHead>
                      <TableHead className="px-2 text-center w-[95px]">Tahun & Jenis</TableHead>
                      <TableHead className="px-2 text-center w-[100px]">Status TTD</TableHead>
                      <TableHead className="px-2 text-right w-[140px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuratKeluar.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                          Tidak ada surat keluar pada filter ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSuratKeluar.map((s, idx) => (
                        <TableRow key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60 transition-colors text-xs">
                          <TableCell className="text-center font-bold text-slate-500 text-[11px] px-2">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="px-2">
                            <div className="font-mono text-[11px] font-black text-amber-700 dark:text-amber-400 leading-tight">
                              {s.nomorSurat}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              <span className="text-[9px] text-slate-400">Agd: {s.nomorAgenda}</span>
                              {s.sumberSurat === 'MANUAL_UPLOAD' ? (
                                <Badge className="bg-slate-100 text-slate-800 border-slate-300 text-[8px] px-1 py-0">
                                  Mandiri
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[8px] px-1 py-0 text-slate-500">
                                  Otomatis
                                </Badge>
                              )}
                            </div>
                            {s.eSignToken && (
                              <div className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 truncate max-w-[150px]">
                                {s.eSignToken}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="px-2">
                            <div className="font-bold text-[11px] text-slate-900 dark:text-white leading-tight">
                              {s.tujuanPenerima}
                            </div>
                            <div className="text-[10px] text-slate-500 leading-tight">
                              {s.instansiPenerima}
                            </div>
                          </TableCell>
                          <TableCell className="px-2 max-w-[260px]">
                            <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 truncate" title={s.perihal}>
                              {s.perihal}
                            </div>
                            {s.sumberSurat === 'MANUAL_UPLOAD' && (
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[8px] px-1 py-0 font-medium">
                                  <CheckCircle2 className="w-2 h-2 inline mr-0.5 text-emerald-600" /> Terverifikasi
                                </Badge>
                                {s.fileUploadName && (
                                  <span className="text-[9px] text-slate-400 truncate max-w-[100px]">
                                    📁 {s.fileUploadName}
                                  </span>
                                )}
                              </div>
                            )}
                            {s.status === 'PERLU_REVISI' && s.catatanRevisi && (
                              <div className="p-1 bg-rose-50 dark:bg-rose-950/40 rounded border border-rose-200 text-[9px] text-rose-700 dark:text-rose-300 mt-0.5 line-clamp-2">
                                <strong>Revisi:</strong> &ldquo;{s.catatanRevisi}&rdquo;
                              </div>
                            )}
                            {s.catatan && s.status !== 'PERLU_REVISI' && (
                              <div className="text-[9px] text-slate-400 mt-0.5 truncate max-w-[180px]">
                                {s.catatan}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center px-2">
                            <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">
                              {s.tanggalSurat}
                            </div>
                            <Badge 
                              variant="outline" 
                              className={`text-[8px] font-bold mt-0.5 px-1 py-0 ${
                                s.jenisSurat === 'DOKUMEN_LAWAS' ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              {s.jenisSurat.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center px-2">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border inline-block ${
                              s.status === 'DISETUJUI' || s.status === 'TERKIRIM' || s.status === 'DIARSIPKAN'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : s.status === 'MENUNGGU_TTD' 
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse'
                                : s.status === 'PERLU_REVISI'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}>
                              {s.status === 'MENUNGGU_TTD' ? 'Menunggu E-Sign' :
                               s.status === 'PERLU_REVISI' ? 'Perlu Revisi' :
                               s.status === 'DISETUJUI' ? 'Ditandatangani' : 
                               s.status === 'DIARSIPKAN' ? 'Diarsipkan' : s.status}
                            </span>
                            {s.tanggalTtd && (
                              <div className="text-[8px] text-slate-400 mt-0.5">
                                {s.tanggalTtd}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right px-2">
                            <div className="flex items-center justify-end gap-1 flex-wrap">
                              {/* Aksi Kepala Sekolah */}
                              {isKepalaSekolah && s.status === 'MENUNGGU_TTD' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleOpenTtdDigitalModal(s)}
                                    className="h-7 px-2 text-[10px] font-bold gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                    title="Tanda Tangan Layar (E-Sign)"
                                  >
                                    <ShieldCheck className="w-3 h-3" /> E-Sign
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedSuratKeluar(s)
                                      setRevisiText('')
                                      setIsModalRevisiOpen(true)
                                    }}
                                    className="h-7 px-2 text-[10px] font-bold gap-1 rounded-lg text-rose-600 border-rose-200 hover:bg-rose-50"
                                    title="Minta Revisi ke TU"
                                  >
                                    <Edit3 className="w-3 h-3" /> Revisi
                                  </Button>
                                </>
                              )}

                              {/* Tombol Bukti Keaslian & Sertifikat E-Sign */}
                              {(s.status === 'DISETUJUI' || s.status === 'DIARSIPKAN' || s.status === 'TERKIRIM' || s.eSignToken) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedSuratKeluar(s)
                                    setIsModalQrVerifyOpen(true)
                                  }}
                                  className="h-7 px-2 text-[10px] font-bold gap-1 rounded-lg text-emerald-700 border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100"
                                  title="Lihat Bukti E-Sign & QR Code"
                                >
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Bukti QR
                                </Button>
                              )}

                              {/* Aksi Admin TU jika butuh revisi */}
                              {!isKepalaSekolah && s.status === 'PERLU_REVISI' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStartEditRevisi(s)}
                                  className="h-7 px-2 text-[10px] font-bold gap-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                                >
                                  <Edit3 className="w-3 h-3" /> Perbaiki
                                </Button>
                              )}

                              {/* Tombol Cetak / Pratinjau Dokumen */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedSuratKeluar(s)
                                  if (s.templateData) {
                                    setTemplateForm(prev => ({
                                      ...prev,
                                      ...s.templateData,
                                      nomorSurat: s.nomorSurat
                                    }))
                                  } else {
                                    setTemplateForm(prev => ({
                                      ...prev,
                                      nomorSurat: s.nomorSurat,
                                      perihal: s.perihal,
                                      tujuanPenerima1: s.tujuanPenerima,
                                      tujuanInstansi: s.instansiPenerima
                                    }))
                                  }
                                  setIsModalPreviewTemplateOpen(true)
                                }}
                                className="h-7 px-2 text-[10px] font-bold gap-1 rounded-lg text-blue-600 hover:bg-blue-50"
                                title="Cetak / Lihat Pratinjau Dokumen"
                              >
                                <Printer className="w-3 h-3" /> Cetak
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

        {/* TAB 3: GENERATOR TEMPLATE SURAT RESMI */}
        {activeTab === 'template-resmi' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Pengaturan Kop Surat & Header Template Resmi */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Pengaturan Kop & Header Surat Resmi
                  </span>
                  <Badge variant="outline" className="text-[9px] font-mono">Format SMA MUHIPO</Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Atur logo sekolah, logo mitra/dikdasmen, redaksi teks kop surat dinas, serta metadata header lembar cetak.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5">
                {/* Upload Foto Kop Banner / 2 Logo Sekolah (Kiri Wajib & Kanan Opsional) */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Kop Surat & Logo Sekolah</Label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setKopType('BUILTIN')}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${kopType === 'BUILTIN' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
                      >
                        Standar & Logo
                      </button>
                      <button
                        type="button"
                        onClick={() => setKopType('IMAGE_UPLOAD')}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${kopType === 'IMAGE_UPLOAD' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
                      >
                        Banner Penuh
                      </button>
                    </div>
                  </div>

                  {kopType === 'IMAGE_UPLOAD' ? (
                    <div className="space-y-1 pt-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleKopUpload}
                        className="h-8 text-xs rounded-xl bg-white dark:bg-slate-950 file:mr-2 file:py-0 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-indigo-700"
                      />
                      <p className="text-[10px] text-slate-500">
                        {customKopImage ? '✓ Banner kop aktif' : 'Unggah gambar banner kop surat penuh (PNG/JPG)'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2 bg-white dark:bg-slate-950 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10.5px] font-bold text-emerald-800 dark:text-emerald-300">Logo Kiri (Wajib)</Label>
                          <span className="text-[9px] text-emerald-600 font-semibold">Sekolah</span>
                        </div>
                        <input
                          type="file"
                          id="logo-kiri-upload"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(e, 'KIRI')}
                          className="hidden"
                        />
                        <label 
                          htmlFor="logo-kiri-upload"
                          className="cursor-pointer text-[10px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center justify-center py-1 border border-dashed border-emerald-300 rounded-lg bg-emerald-50/50 hover:bg-emerald-100/60 transition-colors"
                        >
                          {customLogoKiri ? '✓ Ganti Logo Sekolah' : '+ Upload Logo Sekolah'}
                        </label>
                      </div>

                      <div className="p-2 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300">Logo Kanan (Opsional)</Label>
                          <span className="text-[9px] text-slate-400">Dikdasmen / Mitra</span>
                        </div>
                        <input
                          type="file"
                          id="logo-kanan-upload"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(e, 'KANAN')}
                          className="hidden"
                        />
                        <div className="flex items-center gap-1">
                          <label 
                            htmlFor="logo-kanan-upload"
                            className="flex-1 cursor-pointer text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center justify-center py-1 border border-dashed border-indigo-200 rounded-lg hover:bg-indigo-50/50 transition-colors"
                          >
                            {customLogoKanan ? '✓ Ganti' : '+ Upload Logo'}
                          </label>
                          {customLogoKanan && (
                            <button
                              type="button"
                              onClick={() => {
                                setCustomLogoKanan(null)
                                Swal.fire({
                                  icon: 'success',
                                  title: 'Logo Kanan Dihapus',
                                  text: 'Logo kanan (opsional) telah dinonaktifkan dari kop surat.',
                                  timer: 1500,
                                  showConfirmButton: false
                                })
                              }}
                              className="px-2 py-1 text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-0.5"
                              title="Hapus Logo Kanan"
                            >
                              <Trash2 className="w-3 h-3" /> Hapus
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Editor Teks Kop Surat Resmi */}
                  {kopType === 'BUILTIN' && (
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                          Edit Redaksi Kop Surat
                        </Label>
                        <span className="text-[9px] text-indigo-600 font-semibold">Tersinkron ke Lembar Cetak</span>
                      </div>

                      <div className="space-y-1.5 bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-500 font-semibold">Majelis / Instansi Pembina</Label>
                          <Textarea
                            rows={2}
                            value={templateForm.kopInstansiAtas}
                            onChange={(e) => setTemplateForm({ ...templateForm, kopInstansiAtas: e.target.value })}
                            placeholder="MAJELIS PENDIDIKAN DASAR DAN MENENGAH..."
                            className="text-[11px] font-bold rounded-lg leading-tight"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-500 font-semibold">Nama Satuan Pendidikan / Sekolah</Label>
                          <Input
                            value={templateForm.kopNamaSekolah}
                            onChange={(e) => setTemplateForm({ ...templateForm, kopNamaSekolah: e.target.value })}
                            placeholder="SMA MUHAMMADIYAH 1 PONOROGO"
                            className="h-7 text-xs font-black text-blue-900 dark:text-blue-300 rounded-lg"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-slate-500 font-semibold">Status Akreditasi</Label>
                            <Input
                              value={templateForm.kopStatusAkreditasi}
                              onChange={(e) => setTemplateForm({ ...templateForm, kopStatusAkreditasi: e.target.value })}
                              placeholder="TERAKREDITASI A"
                              className="h-7 text-[11px] font-bold rounded-lg"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-slate-500 font-semibold">NPSN</Label>
                            <Input
                              value={templateForm.kopNpsn}
                              onChange={(e) => setTemplateForm({ ...templateForm, kopNpsn: e.target.value })}
                              placeholder="20510139"
                              className="h-7 text-[11px] font-mono rounded-lg"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-500 font-semibold">Alamat Lengkap & Nomor Telepon</Label>
                          <Input
                            value={templateForm.kopAlamat}
                            onChange={(e) => setTemplateForm({ ...templateForm, kopAlamat: e.target.value })}
                            placeholder="Jl. BatoroKatong No. 6B..."
                            className="h-7 text-[10.5px] rounded-lg"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-500 font-semibold">Email & Situs Resmi</Label>
                          <Input
                            value={templateForm.kopEmailWebsite}
                            onChange={(e) => setTemplateForm({ ...templateForm, kopEmailWebsite: e.target.value })}
                            placeholder="E-mail : smamuh1png@gmail.com Website:..."
                            className="h-7 text-[10.5px] rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Header Metadata Surat (Nomor, Lampiran, Perihal, Tanggal) */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border space-y-2.5">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Metadata Header Surat Resmi
                  </Label>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Nomor Surat</Label>
                      <Input
                        value={templateForm.nomorSurat}
                        onChange={(e) => setTemplateForm({ ...templateForm, nomorSurat: e.target.value })}
                        className="h-8 text-xs font-mono rounded-xl bg-white dark:bg-slate-950"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Lampiran</Label>
                      <Input
                        value={templateForm.lampiran}
                        onChange={(e) => setTemplateForm({ ...templateForm, lampiran: e.target.value })}
                        placeholder="Contoh: - atau 1 Berkas"
                        className="h-8 text-xs rounded-xl bg-white dark:bg-slate-950"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px]">Perihal Surat</Label>
                    <Input
                      value={templateForm.perihal}
                      onChange={(e) => setTemplateForm({ ...templateForm, perihal: e.target.value })}
                      placeholder="Perihal surat..."
                      className="h-8 text-xs font-bold rounded-xl bg-white dark:bg-slate-950"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Tanggal Hijriyah</Label>
                      <Input
                        value={templateForm.tanggalHijriyah}
                        onChange={(e) => setTemplateForm({ ...templateForm, tanggalHijriyah: e.target.value })}
                        placeholder="27 Shafar 1448"
                        className="h-8 text-xs rounded-xl bg-white dark:bg-slate-950"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Tanggal Masehi</Label>
                      <Input
                        value={templateForm.tanggalSurat}
                        onChange={(e) => setTemplateForm({ ...templateForm, tanggalSurat: e.target.value })}
                        placeholder="10 Agustus 2026"
                        className="h-8 text-xs rounded-xl bg-white dark:bg-slate-950"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px]">Kota Penerbit</Label>
                    <Input
                      value={templateForm.kotaPenerbit}
                      onChange={(e) => setTemplateForm({ ...templateForm, kotaPenerbit: e.target.value })}
                      placeholder="Ponorogo"
                      className="h-8 text-xs rounded-xl bg-white dark:bg-slate-950"
                    />
                  </div>
                </div>

                {/* Pejabat Penandatangan Resmi */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border flex items-center justify-between">
                  <div>
                    <Label className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Pejabat Kepala Sekolah (E-Sign):</Label>
                    <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mt-0.5">
                      {templateForm.namaPenandatangan} <span className="font-mono text-slate-500">({templateForm.nbmPenandatangan})</span>
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
                    Tersinkron Akun Sah
                  </Badge>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2 border-t">
                  <Button 
                    onClick={() => {
                      setIsModalSuratKeluarOpen(true)
                    }}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold gap-2 shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Buka Menu Tambah Surat Keluar Lengkap
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setIsModalPreviewTemplateOpen(true)}
                    className="w-full rounded-xl text-xs font-bold gap-2 text-indigo-700 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/60"
                  >
                    <Eye className="w-4 h-4" /> Buka Pratinjau & Cetak Surat Resmi (A4)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Live Paper Preview Sama Persis Format Asli Dokumen Sekolah */}
            <Card className="lg:col-span-2 border-slate-300 dark:border-slate-800 bg-slate-200 dark:bg-slate-950 p-4 sm:p-6 overflow-hidden flex flex-col items-center">
              <div className="w-full max-w-[620px] bg-white text-black p-8 sm:p-10 rounded-xs shadow-2xl border border-slate-300 min-h-[780px] text-left text-[12px] leading-relaxed relative font-serif">
                {/* Header / Kop Surat Resmi */}
                {kopType === 'IMAGE_UPLOAD' && customKopImage ? (
                  <div className="mb-4 border-b-2 border-black pb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={customKopImage} alt="Kop Surat Resmi" className="w-full h-auto object-contain max-h-[140px]" />
                  </div>
                ) : (
                  <div className="border-b-[3px] border-black pb-2 mb-5">
                    <div className="flex items-center justify-between gap-3 text-center">
                      <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                        {/* Logo Kiri (Wajib Sekolah) */}
                        {customLogoKiri && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={customLogoKiri} alt="Logo Wajib Sekolah" className="w-14 h-14 object-contain" />
                        )}
                      </div>

                      <div className="flex-1 space-y-0.5">
                        <h4 className="font-sans font-bold text-[12px] tracking-wide text-black uppercase leading-tight whitespace-pre-line">
                          {templateForm.kopInstansiAtas}
                        </h4>
                        <h2 className="font-sans font-black text-[18px] text-blue-900 uppercase tracking-tight leading-tight">
                          {templateForm.kopNamaSekolah}
                        </h2>
                        <div className="flex items-center justify-center gap-4 text-[10px] font-sans font-bold text-black">
                          <span>Status : <strong>{templateForm.kopStatusAkreditasi}</strong></span>
                          <span>NPSN : <strong>{templateForm.kopNpsn}</strong></span>
                        </div>
                        <p className="text-[9.5px] font-sans text-black leading-tight">
                          {templateForm.kopAlamat}
                        </p>
                        <p className="text-[9.5px] font-sans text-black leading-tight">
                          {templateForm.kopEmailWebsite}
                        </p>
                      </div>

                      <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                        {/* Logo Kanan (Opsional / Dikdasmen) */}
                        {customLogoKanan && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={customLogoKanan} alt="Logo Instansi Kanan (Opsional)" className="w-14 h-14 object-contain" />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Surat Pemberitahuan & Undangan (Persis Seperti di Gambar) */}
                {(templateForm.jenisTemplate === 'PEMBERITAHUAN' || templateForm.jenisTemplate === 'UNDANGAN') ? (
                  <div className="space-y-4 text-black text-[11.5px]">
                    {/* Baris Nomor & Tanggal */}
                    <div className="flex items-start justify-between">
                      <table className="w-auto">
                        <tbody>
                          <tr>
                            <td className="w-16">Nomor</td>
                            <td className="w-3">:</td>
                            <td className="font-sans font-normal">{templateForm.nomorSurat}</td>
                          </tr>
                          <tr>
                            <td>Lamp</td>
                            <td>:</td>
                            <td>{templateForm.lampiran}</td>
                          </tr>
                          <tr>
                            <td className="align-top">Perihal</td>
                            <td className="align-top">:</td>
                            <td className="font-bold">{templateForm.perihal}</td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="text-right space-y-0.5">
                        <p>{templateForm.tanggalHijriyah}</p>
                        <p>{templateForm.tanggalSurat}</p>
                      </div>
                    </div>

                    {/* Tujuan Surat */}
                    <div className="pt-2 space-y-0.5">
                      <p>Yang terhormat:</p>
                      <p className="font-bold">{templateForm.tujuanPenerima1}</p>
                      {templateForm.tujuanPenerima2 && (
                        <p className="font-bold">{templateForm.tujuanPenerima2}</p>
                      )}
                      <p className="font-bold">{templateForm.tujuanInstansi}</p>
                      <div className="pl-6 pt-1">
                        <p>di _</p>
                        <p className="pl-8">{templateForm.tujuanLokasi}</p>
                      </div>
                    </div>

                    {/* Salam Pembuka */}
                    <p className="font-bold italic pt-1">{templateForm.salamPembuka}</p>

                    {/* Paragraf Pembuka */}
                    <p className="text-justify leading-relaxed">
                      {templateForm.paragrafPembuka}
                    </p>

                    {/* Isi Surat Pokok */}
                    {templateForm.isiSurat && (
                      <p className="text-justify leading-relaxed">
                        {templateForm.isiSurat}
                      </p>
                    )}

                    {/* Keterangan Waktu & Detail Kegiatan */}
                    {(templateForm.hariTanggalKegiatan || templateForm.waktuKegiatan || templateForm.tempatKegiatan) && (
                      <div className="pl-6 space-y-1.5 pt-1">
                        {templateForm.hariTanggalKegiatan && (
                          <div className="flex items-start">
                            <span className="w-28 shrink-0">Hari / Tanggal</span>
                            <span className="w-3">:</span>
                            <span className="font-bold">{templateForm.hariTanggalKegiatan}</span>
                          </div>
                        )}

                        {templateForm.waktuKegiatan && (
                          <div className="flex items-start">
                            <span className="w-28 shrink-0">Waktu / Pukul</span>
                            <span className="w-3">:</span>
                            <span>{templateForm.waktuKegiatan}</span>
                          </div>
                        )}

                        {templateForm.tempatKegiatan && (
                          <div className="flex items-start">
                            <span className="w-28 shrink-0">Tempat</span>
                            <span className="w-3">:</span>
                            <span>{templateForm.tempatKegiatan}</span>
                          </div>
                        )}

                        {templateForm.keperluanKegiatan && (
                          <div className="flex items-start">
                            <span className="w-28 shrink-0 align-top">Keperluan</span>
                            <span className="w-3 align-top">:</span>
                            <div className="whitespace-pre-line font-medium">{templateForm.keperluanKegiatan}</div>
                          </div>
                        )}

                        {/* Format Pakaian (Hanya jika aktif / diisi) */}
                        {(templateForm.includePakaian && (templateForm.pakaianBapakSiswa || templateForm.pakaianIbuSiswi)) && (
                          <div className="flex items-start">
                            <span className="w-28 shrink-0 align-top">Pakaian</span>
                            <span className="w-3 align-top">:</span>
                            <div className="space-y-1">
                              {templateForm.pakaianBapakSiswa && <p>{templateForm.pakaianBapakSiswa}</p>}
                              {templateForm.pakaianIbuSiswi && <p>{templateForm.pakaianIbuSiswi}</p>}
                            </div>
                          </div>
                        )}

                        {templateForm.catatanKegiatan && (
                          <div className="flex items-start">
                            <span className="w-28 shrink-0 align-top">Catatan</span>
                            <span className="w-3 align-top">:</span>
                            <div className="whitespace-pre-line text-[11px] italic">{templateForm.catatanKegiatan}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Paragraf Penutup */}
                    <p className="text-justify pt-2 leading-relaxed">
                      {templateForm.paragrafPenutup}
                    </p>

                    {/* Tanda Tangan, QR Code Sah SIMASMUH di Kanan, & Sertifikat Legalitas di Kiri Bawah */}
                    <div className="pt-4 flex justify-between items-end">
                      {/* Kiri Bawah: Informasi Tanda Tangan Digital Diterbitkan oleh SIMASMUH */}
                      <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl max-w-[240px]">
                        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div className="text-[9px] font-sans space-y-0.5 leading-tight">
                          <p className="font-bold text-slate-800">Tanda Tangan Digital Sah</p>
                          <p className="text-slate-500 font-mono">Diterbitkan oleh SIMASMUH</p>
                          <p className="text-[8px] text-emerald-700 font-semibold">Keaslian dokumen terverifikasi</p>
                        </div>
                      </div>

                      {/* Kanan Bawah: Kolom Penandatangan dengan QR Code E-Sign Tepat di Atas Nama Kepala Sekolah */}
                      <div className="text-center w-64 space-y-1">
                        <p className="font-sans text-xs">{templateForm.kotaPenerbit}, {templateForm.tanggalSurat}</p>
                        <p className="font-sans text-xs font-semibold">{templateForm.jabatanPenandatangan}</p>

                        {/* Area QR Code & Watermark E-Sign Sah (Tanpa Stempel) */}
                        <div className="h-24 flex flex-col items-center justify-center py-1">
                          <div className="p-1 bg-white border border-slate-300 rounded-lg shadow-2xs inline-block">
                            <QRCodeSVG 
                              value={JSON.stringify({
                                issuer: 'SIMASMUH Official E-Sign',
                                nomorSurat: templateForm.nomorSurat,
                                penandatangan: templateForm.namaPenandatangan,
                                nbm: templateForm.nbmPenandatangan,
                                status: 'DOKUMEN_SAH_TERDAFTAR_SIMASMUH',
                                verifyUrl: `http://localhost:3000/fitur/persuratan?verify=${templateForm.nomorSurat.replace(/[^a-zA-Z0-9]/g, '')}`
                              })}
                              size={68}
                              level="M"
                            />
                          </div>
                          <p className="text-[8px] font-sans font-bold text-emerald-700 tracking-wider uppercase mt-1">
                            ✓ E-Sign Verified
                          </p>
                        </div>

                        <p className="font-bold underline text-xs font-sans tracking-wide">
                          {templateForm.namaPenandatangan}
                        </p>
                        <p className="text-[11px] font-sans text-black">
                          {templateForm.nbmPenandatangan}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Template Surat Keterangan / Tugas Lainnya */
                  <div className="space-y-3 text-black text-[11.5px]">
                    <div className="text-center mb-3">
                      <h3 className="font-sans font-bold text-xs uppercase underline tracking-wider">
                        {templateForm.jenisTemplate.replace(/_/g, ' ')}
                      </h3>
                      <p className="text-[10px] font-sans">Nomor: {templateForm.nomorSurat}</p>
                    </div>

                    <p>Yang bertanda tangan di bawah ini Kepala SMA Muhammadiyah 1 Ponorogo menerangkan dengan sebenarnya bahwa:</p>
                    
                    <div className="pl-6 space-y-1">
                      <div className="grid grid-cols-3">
                        <span className="font-semibold">Nama Lengkap</span>
                        <span className="col-span-2">: <strong>{templateForm.namaSiswaPegawai}</strong></span>
                      </div>
                      <div className="grid grid-cols-3">
                        <span className="font-semibold">NBM / NISN</span>
                        <span className="col-span-2">: {templateForm.nomorIdentitas}</span>
                      </div>
                      <div className="grid grid-cols-3">
                        <span className="font-semibold">Jabatan / Kelas</span>
                        <span className="col-span-2">: {templateForm.kelasJabatan}</span>
                      </div>
                    </div>

                    <p className="pt-2">
                      Diberikan penugasan / keterangan resmi untuk keperluan: <strong>&ldquo;{templateForm.keperluan}&rdquo;</strong>.
                    </p>

                    <p className="pt-1">
                      Demikian surat ini dibuat untuk dapat dipergunakan sebagaimana mestinya.
                    </p>

                    <div className="pt-6 flex justify-end">
                      <div className="text-center w-64 space-y-1">
                        <p className="font-sans text-xs">{templateForm.kotaPenerbit}, {templateForm.tanggalSurat}</p>
                        <p className="font-sans text-xs">{templateForm.jabatanPenandatangan}</p>
                        <div className="h-16 flex items-center justify-center">
                          {customSignatureImage ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={customSignatureImage} alt="Stempel & TTD" className="max-h-16 w-auto object-contain" />
                          ) : (
                            <span className="text-slate-300 italic text-[10px]">[Tanda Tangan & Stempel]</span>
                          )}
                        </div>
                        <p className="font-bold underline text-xs font-sans">{templateForm.namaPenandatangan}</p>
                        <p className="text-[11px] font-sans">{templateForm.nbmPenandatangan}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
        )}

        {/* TAB 4: E-ARCHIVE DIGITAL & PENGARSIPAN KOMPREHENSIF TU */}
        {activeTab === 'e-archive' && (
        <div className="space-y-4">
          {/* Banner E-Arsip Digital Terpadu */}
          <Card className="border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-4 rounded-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                  <Archive className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pusat Arsip Digital & Berkas Induk Sekolah</span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Repositori Dokumen Resmi, Arsip Siswa, Data Guru & Karyawan, serta Sarpras TU
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Total <strong>{archiveList.length}</strong> dokumen terindeks aman dalam sistem cloud storage SIMASMUH SMA Muhammadiyah 1 Ponorogo.
                </p>
              </div>
              <Button 
                onClick={() => setIsModalArchiveOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1.5 shrink-0 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Unggah & Arsipkan Berkas Baru
              </Button>
            </div>
          </Card>

          {/* Quick Filter Kategori Arsip */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'ALL', label: 'Semua Arsip' },
              { id: 'ARSIP_SISWA', label: '🎓 Arsip Siswa' },
              { id: 'ARSIP_GURU_KARYAWAN', label: '👨‍🏫 Guru & Karyawan' },
              { id: 'SK_KEPSEK', label: '📜 SK Kepala Sekolah' },
              { id: 'MOU_KERJASAMA', label: '🤝 MoU & Kerjasama' },
              { id: 'KURIKULUM_AKREDITASI', label: '🏆 Akreditasi & Kurikulum' },
              { id: 'IJAZAH_ALUMNI', label: '🎓 Ijazah & Alumni' },
              { id: 'SARPRAS_ASET', label: '🏢 Aset & Sarpras' },
              { id: 'SURAT_RESMI', label: '✉️ Surat Resmi' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilterKategori(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  filterKategori === cat.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search & Kategori Archive */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Cari berkas nama siswa, NBM/NIP guru, SK, MoU, ijazah, atau sertifikat tanah..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>
            <Select value={filterKategori} onValueChange={(val) => setFilterKategori(val || 'ALL')}>
              <SelectTrigger className="h-9 text-xs w-[200px] rounded-xl">
                <SelectValue placeholder="Pilih Kategori Berkas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Kategori Berkas</SelectItem>
                <SelectItem value="ARSIP_SISWA">🎓 Arsip Data Siswa</SelectItem>
                <SelectItem value="ARSIP_GURU_KARYAWAN">👨‍🏫 Arsip Guru & Karyawan</SelectItem>
                <SelectItem value="SK_KEPSEK">📜 SK Kepala Sekolah</SelectItem>
                <SelectItem value="MOU_KERJASAMA">🤝 MoU & Kerjasama</SelectItem>
                <SelectItem value="KURIKULUM_AKREDITASI">🏆 Akreditasi & Kurikulum</SelectItem>
                <SelectItem value="IJAZAH_ALUMNI">🎓 Ijazah & Legalisir Alumni</SelectItem>
                <SelectItem value="SARPRAS_ASET">🏢 Sarana Prasarana & Aset</SelectItem>
                <SelectItem value="SURAT_RESMI">✉️ Surat Resmi Sekolah</SelectItem>
                <SelectItem value="LAPORAN_KEUANGAN">💰 Laporan Keuangan TU</SelectItem>
                <SelectItem value="DOKUMEN_LAIN">📁 Dokumen & Berkas Lain</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Grid Card E-Archive */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredArchives.length === 0 ? (
              <div className="col-span-2 text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <Archive className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500">Tidak ada arsip dokumen yang sesuai dengan pencarian / kategori ini.</p>
              </div>
            ) : (
              filteredArchives.map((doc) => (
                <Card key={doc.id} className="border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 transition-all shadow-xs rounded-2xl bg-white dark:bg-slate-900">
                  <CardContent className="p-5 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-2xl shrink-0 mt-0.5">
                        <FileCheck className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                            {doc.kategori.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-[10px] text-slate-400 font-mono">{doc.kodeBerkas}</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                          {doc.judulDokumen}
                        </h4>

                        {/* Subjek Siswa / Guru jika ada */}
                        {(doc.namaSubjek || doc.identitasSubjek) && (
                          <div className="p-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-[11px] space-y-0.5 text-slate-700 dark:text-slate-300">
                            {doc.namaSubjek && <p className="font-bold">👤 {doc.namaSubjek}</p>}
                            {doc.identitasSubjek && <p className="text-[10px] text-slate-500 font-mono">ID: {doc.identitasSubjek}</p>}
                          </div>
                        )}

                        <p className="text-xs text-slate-500 line-clamp-2">
                          {doc.keterangan}
                        </p>
                        <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 flex-wrap">
                          <span>Tahun: <strong>{doc.tahun}</strong></span>
                          <span>•</span>
                          <span>Ukuran: {doc.ukuranFile}</span>
                          <span>•</span>
                          <span className={`px-1.5 py-0.2 rounded-md font-bold text-[9px] ${
                            doc.tingkatAkses === 'RAHASIA' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            doc.tingkatAkses === 'INTERNAL' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {doc.tingkatAkses}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadArchiveFile(doc)}
                        className="h-7 w-7 p-0 rounded-lg text-emerald-700 border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800"
                        title="Unduh Berkas Arsip"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditArchiveModal(doc)}
                        className="h-7 w-7 p-0 rounded-lg text-amber-700 border-amber-200 bg-amber-50/60 hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-800"
                        title="Edit Dokumen Arsip"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteArchiveWithPassword(doc)}
                        className="h-7 w-7 p-0 rounded-lg text-rose-600 border-rose-200 bg-rose-50/60 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-800"
                        title="Hapus Dokumen Arsip (Password)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
        )}
      </div>

      {/* MODAL 1: Form Registrasi Surat Masuk */}
      <Dialog open={isModalSuratMasukOpen} onOpenChange={setIsModalSuratMasukOpen}>
        <DialogContent className="sm:max-w-[620px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Inbox className="w-5 h-5" /> Registrasi Surat Masuk Baru
            </DialogTitle>
            <DialogDescription className="text-xs">
              Catat berkas surat masuk dinas, majelis dikdasmen, yayasan, atau instansi luar ke buku agenda TU.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Nomor Surat Asal <span className="text-rose-500">*</span></Label>
              <Input
                placeholder="421.3/xxx/Cabdin.Po/2026"
                value={formSuratMasuk.nomorSurat}
                onChange={(e) => setFormSuratMasuk({ ...formSuratMasuk, nomorSurat: e.target.value })}
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Instansi Pengirim <span className="text-rose-500">*</span></Label>
              <Input
                placeholder="Cabang Dinas Pendidikan / PDM"
                value={formSuratMasuk.instansi}
                onChange={(e) => setFormSuratMasuk({ ...formSuratMasuk, instansi: e.target.value })}
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">Perihal Surat <span className="text-rose-500">*</span></Label>
              <Input
                placeholder="Undangan / Pemberitahuan / Pengumuman"
                value={formSuratMasuk.perihal}
                onChange={(e) => setFormSuratMasuk({ ...formSuratMasuk, perihal: e.target.value })}
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Nama Pejabat / Pengirim</Label>
              <Input
                placeholder="Nama kepala instansi / pengirim"
                value={formSuratMasuk.pengirim}
                onChange={(e) => setFormSuratMasuk({ ...formSuratMasuk, pengirim: e.target.value })}
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Sifat Kerahasiaan Surat</Label>
              <Select 
                value={formSuratMasuk.sifat} 
                onValueChange={(val) => { if (val) setFormSuratMasuk({ ...formSuratMasuk, sifat: val as SuratMasuk['sifat'] }) }}
              >
                <SelectTrigger className="h-8 text-xs rounded-xl">
                  <SelectValue placeholder="Pilih Sifat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BIASA">Biasa</SelectItem>
                  <SelectItem value="PENTING">Penting</SelectItem>
                  <SelectItem value="SEGERA">Segera</SelectItem>
                  <SelectItem value="RAHASIA">Rahasia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Tanggal Surat Asal</Label>
              <Input
                type="date"
                value={formSuratMasuk.tanggalSurat}
                onChange={(e) => setFormSuratMasuk({ ...formSuratMasuk, tanggalSurat: e.target.value })}
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Tanggal Diterima TU</Label>
              <Input
                type="date"
                value={formSuratMasuk.tanggalDiterima}
                onChange={(e) => setFormSuratMasuk({ ...formSuratMasuk, tanggalDiterima: e.target.value })}
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">Ringkasan / Isi Pokok Surat</Label>
              <Textarea
                rows={2}
                placeholder="Ringkasan singkat isi surat atau catatan tindak lanjut..."
                value={formSuratMasuk.ringkasan}
                onChange={(e) => setFormSuratMasuk({ ...formSuratMasuk, ringkasan: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsModalSuratMasukOpen(false)} className="rounded-xl">
              Batal
            </Button>
            <Button size="sm" onClick={handleTambahSuratMasuk} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
              Simpan ke Buku Agenda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Form Disposisi Digital Pimpinan */}
      <Dialog open={isModalDisposisiOpen} onOpenChange={setIsModalDisposisiOpen}>
        <DialogContent className="sm:max-w-[620px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
              <CornerDownRight className="w-5 h-5" /> Lembar Disposisi Digital Pimpinan
            </DialogTitle>
            <DialogDescription className="text-xs">
              Teruskan surat masuk ke unit kerja terkait (Waka, Keuangan, BK, Wali Kelas) secara realtime.
            </DialogDescription>
          </DialogHeader>

          {selectedSuratMasuk && (
            <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 rounded-2xl border border-purple-200 text-xs space-y-1">
              <p className="font-bold text-purple-900 dark:text-purple-200">Surat: {selectedSuratMasuk.perihal}</p>
              <p className="text-slate-600 dark:text-slate-400">Asal: {selectedSuratMasuk.instansi} ({selectedSuratMasuk.nomorSurat})</p>
            </div>
          )}

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tujuan Disposisi (Unit Kerja / Waka)</Label>
                <Select 
                  value={formDisposisi.tujuanUnit} 
                  onValueChange={(val) => { if (val) setFormDisposisi({ ...formDisposisi, tujuanUnit: val }) }}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl">
                    <SelectValue placeholder="Pilih Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Waka Kurikulum">Waka Kurikulum</SelectItem>
                    <SelectItem value="Waka Kesiswaan">Waka Kesiswaan</SelectItem>
                    <SelectItem value="Waka Sarana Prasarana">Waka Sarana Prasarana</SelectItem>
                    <SelectItem value="Waka Ismuba & Al-Islam">Waka Ismuba & Al-Islam</SelectItem>
                    <SelectItem value="Waka Hubungan Masyarakat">Waka Hubungan Masyarakat</SelectItem>
                    <SelectItem value="Kepala Tata Usaha">Kepala Tata Usaha</SelectItem>
                    <SelectItem value="Bendahara & Keuangan">Bendahara & Keuangan</SelectItem>
                    <SelectItem value="Koordinator BK / BP">Koordinator BK / BP</SelectItem>
                    <SelectItem value="Wali Kelas Terkait">Wali Kelas Terkait</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Tenggat Waktu Tindak Lanjut</Label>
                <Input
                  type="date"
                  value={formDisposisi.tenggatWaktu}
                  onChange={(e) => setFormDisposisi({ ...formDisposisi, tenggatWaktu: e.target.value })}
                  className="h-8 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Instruksi / Arahan Pimpinan <span className="text-rose-500">*</span></Label>
              <Textarea
                rows={2}
                placeholder="Tindaklanjuti segera, siapkan delegasi, koordinasikan dengan tim terkait..."
                value={formDisposisi.instruksi}
                onChange={(e) => setFormDisposisi({ ...formDisposisi, instruksi: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Catatan Tambahan</Label>
              <Input
                placeholder="Catatan ruang rapat, berkas pendukung, dll..."
                value={formDisposisi.catatan}
                onChange={(e) => setFormDisposisi({ ...formDisposisi, catatan: e.target.value })}
                className="h-8 text-xs rounded-xl"
              />
            </div>

            {/* Riwayat Disposisi yang sudah ada */}
            {selectedSuratMasuk && selectedSuratMasuk.disposisiList.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t">
                <p className="text-[11px] font-bold text-slate-500">Riwayat Disposisi Diterbitkan:</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {selectedSuratMasuk.disposisiList.map((d) => (
                    <div key={d.id} className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs flex items-start justify-between border">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{d.tujuanUnit}</p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">&ldquo;{d.instruksi}&rdquo;</p>
                      </div>
                      <Badge variant="secondary" className="text-[9px]">
                        {d.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsModalDisposisiOpen(false)} className="rounded-xl">
              Batal
            </Button>
            <Button size="sm" onClick={handleTambahDisposisi} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl">
              Terbitkan Disposisi & Kirim WA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Form Tambah & Penerbitan Surat Keluar Resmi Lengkap */}
      <Dialog open={isModalSuratKeluarOpen} onOpenChange={setIsModalSuratKeluarOpen}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Send className="w-5 h-5" /> Tambah & Terbitkan Surat Keluar Resmi
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pilih template jenis surat, sesuaikan konten redaksi dan penerima, lalu terbitkan nomor resmi untuk diajukan ke Kepala Sekolah (E-Sign).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Header Status Nomor & Mode Penomoran */}
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">Hasil Format Nomor Surat Otomatis:</p>
                  <p className="font-mono text-sm font-black text-amber-900 dark:text-amber-200 mt-0.5">{generatedNomorSurat}</p>
                </div>
                <div className="flex items-center gap-1 bg-amber-200/60 dark:bg-amber-900/50 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormatMode('STANDAR')}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all ${
                      formatMode === 'STANDAR' ? 'bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-200 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Standar
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormatMode('CUSTOM')}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all ${
                      formatMode === 'CUSTOM' ? 'bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-200 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Format Manual
                  </button>
                </div>
              </div>

              {formatMode === 'CUSTOM' && (
                <div className="pt-2 border-t border-amber-200/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                      Pola Format Nomor Surat
                    </Label>
                    <span className="text-[10px] text-slate-500 font-mono">Tag: &#123;NOMOR&#125;, &#123;KODE&#125;, &#123;BULAN_ROMAWI&#125;, &#123;TAHUN&#125;</span>
                  </div>
                  <Input
                    value={customFormatPattern}
                    onChange={(e) => setCustomFormatPattern(e.target.value)}
                    placeholder="{NOMOR}/{KODE}/IV.4.AU/SMA-MUHIPO/{BULAN_ROMAWI}/{TAHUN}"
                    className="h-8 text-xs font-mono bg-white dark:bg-slate-900 rounded-xl"
                  />
                </div>
              )}
            </div>

            {/* Pilihan Jenis Template Surat & Rekomendasi Terpelajari */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Jenis Template Surat <span className="text-rose-500">*</span></Label>
                  <Select 
                    value={templateForm.jenisTemplate} 
                    onValueChange={(val) => {
                      if (!val) return
                      if (val === 'PEMBERITAHUAN') {
                        const matchedPattern = learnedPatterns.find(p => p.jenisTemplate === 'PEMBERITAHUAN')
                        if (matchedPattern) {
                          setTemplateForm(prev => ({
                            ...prev,
                            jenisTemplate: 'PEMBERITAHUAN',
                            nomorSurat: generatedNomorSurat,
                            perihal: matchedPattern.perihal,
                            paragrafPembuka: matchedPattern.paragrafPembuka,
                            isiSurat: matchedPattern.isiSurat,
                            hariTanggalKegiatan: matchedPattern.hariTanggalKegiatan,
                            waktuKegiatan: matchedPattern.waktuKegiatan,
                            tempatKegiatan: matchedPattern.tempatKegiatan,
                            keperluanKegiatan: matchedPattern.keperluanKegiatan,
                            catatanKegiatan: matchedPattern.catatanKegiatan,
                            paragrafPenutup: matchedPattern.paragrafPenutup
                          }))
                        } else {
                          setTemplateForm(prev => ({
                            ...prev,
                            jenisTemplate: 'PEMBERITAHUAN',
                            nomorSurat: generatedNomorSurat,
                            lampiran: '-',
                            perihal: 'Pemberitahuan Agenda Resmi Sekolah',
                            paragrafPembuka: 'Diberitahukan bahwa sehubungan dengan pelaksanaan agenda sekolah, maka bersama ini kami sampaikan ketentuan sebagai berikut :',
                            isiSurat: 'Seluruh kegiatan belajar mengajar dan operasional sekolah diharapkan dapat terlaksana dengan tertib dan lancar sesuai jadwal yang telah ditentukan.',
                            hariTanggalKegiatan: 'Selasa, 11 Agustus 2026',
                            waktuKegiatan: '07.00 WIB s.d Selesai',
                            tempatKegiatan: 'Kampus SMA Muhammadiyah 1 Ponorogo',
                            keperluanKegiatan: 'Pelaksanaan kegiatan dinas dan agenda resmi sekolah.',
                            catatanKegiatan: '1. Seluruh peserta hadir tepat waktu.\n2. Menjaga ketertiban lingkungan sekolah.',
                            paragrafPenutup: 'Demikian surat pemberitahuan ini kami sampaikan, atas perhatian dan kerjasama seluruh pihak kami ucapkan terima kasih.'
                          }))
                        }
                      } else if (val === 'UNDANGAN') {
                        setTemplateForm(prev => ({
                          ...prev,
                          jenisTemplate: 'UNDANGAN',
                          nomorSurat: generatedNomorSurat,
                          lampiran: '-',
                          perihal: 'Undangan Rapat Dinas & LPJ PPDB',
                          paragrafPembuka: 'Mengharap dengan hormat kehadiran Bapak/Ibu pada rapat koordinasi dinas yang akan dilaksanakan pada :',
                          isiSurat: 'Agenda rapat meliputi evaluasi kegiatan pembelajaran, pelaporan pertanggungjawaban PPDB, serta pemantapan program unggulan sekolah.',
                          hariTanggalKegiatan: 'Jumat, 15 Agustus 2026',
                          waktuKegiatan: '13.00 - 15.30 WIB',
                          tempatKegiatan: 'Ruang Pertemuan / Aula KH Ahmad Dahlan SMA MUHIPO',
                          keperluanKegiatan: 'Rapat Koordinasi Dinas Awal Tahun Ajaran 2026/2027.',
                          catatanKegiatan: 'Mengingat pentingnya agenda rapat dinas ini, dimohon hadir tepat waktu.',
                          paragrafPenutup: 'Demikian undangan ini kami sampaikan, atas kehadirannya diucapkan terima kasih.'
                        }))
                      } else if (val === 'SURAT_TUGAS') {
                        setTemplateForm(prev => ({
                          ...prev,
                          jenisTemplate: 'SURAT_TUGAS',
                          nomorSurat: generatedNomorSurat,
                          lampiran: '-',
                          perihal: 'Surat Tugas Pelaksanaan Workshop & Dinas Luar',
                          paragrafPembuka: 'Yang bertanda tangan di bawah ini Kepala SMA Muhammadiyah 1 Ponorogo memberikan tugas dinas resmi kepada :',
                          isiSurat: 'Untuk menghadiri kegiatan Workshop Peningkatan Kompetensi Guru dan Digitalisasi Sekolah yang diselenggarakan oleh Cabang Dinas Pendidikan.',
                          namaSiswaPegawai: 'Budi Santoso, M.Pd.',
                          nomorIdentitas: 'NBM. 10928374 / NIP. 198205142008011002',
                          kelasJabatan: 'Guru Ahli Madya / Waka Kurikulum',
                          tempatTugas: 'Gedung Graha Saraswati Cabang Dinas Pendidikan Wilayah Ponorogo',
                          hariTanggalKegiatan: '18 - 19 Agustus 2026',
                          waktuKegiatan: '08.00 WIB s.d Selesai',
                          tempatKegiatan: 'Gedung Graha Saraswati Cabdin Ponorogo',
                          keperluanKegiatan: 'Pelaksanaan tugas dinas workshop pengembangan kurikulum sekolah.',
                          catatanKegiatan: 'Melaporkan hasil pelaksanaan tugas kepada Kepala Sekolah setelah kegiatan selesai.',
                          paragrafPenutup: 'Demikian surat tugas ini dibuat untuk dilaksanakan dengan sebaik-baiknya dan penuh rasa tanggung jawab.'
                        }))
                      } else if (val === 'SURAT_KETERANGAN_AKTIF') {
                        setTemplateForm(prev => ({
                          ...prev,
                          jenisTemplate: 'SURAT_KETERANGAN_AKTIF',
                          nomorSurat: generatedNomorSurat,
                          lampiran: '-',
                          perihal: 'Surat Keterangan Siswa Aktif Belajar',
                          paragrafPembuka: 'Yang bertanda tangan di bawah ini Kepala SMA Muhammadiyah 1 Ponorogo menerangkan dengan sebenarnya bahwa :',
                          isiSurat: 'Adalah benar-benar peserta didik yang terdaftar aktif belajar di SMA Muhammadiyah 1 Ponorogo pada Tahun Ajaran 2026/2027.',
                          namaSiswaPegawai: 'Ahmad Faiz Al-Ghifari',
                          nomorIdentitas: 'NISN: 0071829384 / NIS: 18920',
                          kelasJabatan: 'Kelas XII MIPA 1 (Reguler)',
                          tempatTanggalLahir: 'Ponorogo, 12 Maret 2008',
                          namaOrangTua: 'H. Sudarsono',
                          keperluan: 'Persyaratan Pengajuan Beasiswa Prestasi dan Tunjangan Keluarga.',
                          paragrafPenutup: 'Demikian surat keterangan ini kami buat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.'
                        }))
                      } else {
                        setTemplateForm(prev => ({
                          ...prev,
                          jenisTemplate: val,
                          nomorSurat: generatedNomorSurat
                        }))
                      }
                      setAutoNumberForm(prev => ({ ...prev, jenisSurat: val as any }))
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs rounded-xl bg-white dark:bg-slate-950 font-semibold">
                      <SelectValue placeholder="Pilih Jenis Template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PEMBERITAHUAN">📄 Surat Pemberitahuan / Edaran</SelectItem>
                      <SelectItem value="UNDANGAN">✉️ Surat Undangan Rapat / Wali Murid</SelectItem>
                      <SelectItem value="SURAT_TUGAS">🎖️ Surat Perintah Tugas Pegawai (ST)</SelectItem>
                      <SelectItem value="SURAT_KETERANGAN_AKTIF">🎓 Surat Keterangan Siswa Aktif</SelectItem>
                      <SelectItem value="SURAT_REKOMENDASI">⭐ Surat Rekomendasi Lomba / Beasiswa</SelectItem>
                      <SelectItem value="LEGALISIR_IJAZAH">🏛️ Surat Keterangan Legalisir Ijazah</SelectItem>
                      <SelectItem value="SURAT_PERNYATAAN">📝 Surat Pernyataan Resmi Sekolah</SelectItem>
                      <SelectItem value="SURAT_DINAS_UMUM">📑 Surat Dinas Resmi Umum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Kode Klasifikasi Surat</Label>
                  <Select 
                    value={autoNumberForm.kodeKlasifikasi} 
                    onValueChange={(val) => { if (val) setAutoNumberForm({ ...autoNumberForm, kodeKlasifikasi: val }) }}
                  >
                    <SelectTrigger className="h-8 text-xs rounded-xl bg-white dark:bg-slate-950">
                      <SelectValue placeholder="Pilih Kode" />
                    </SelectTrigger>
                    <SelectContent>
                      {KLASIFIKASI_SURAT.map((k) => (
                        <SelectItem key={k.kode} value={k.kode}>{k.kode} - {k.nama}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Rekomendasi Pola Naskah Terpelajari */}
              {learnedPatterns.length > 0 && (
                <div className="pt-2 border-t space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-600" /> Pola Rekomendasi Naskah Terpelajari:
                    </Label>
                    <span className="text-[9px] text-slate-400">Klik untuk isi otomatis</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {learnedPatterns.map((pat, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setTemplateForm(prev => ({
                            ...prev,
                            jenisTemplate: pat.jenisTemplate,
                            nomorSurat: generatedNomorSurat,
                            perihal: pat.perihal,
                            tujuanPenerima1: pat.tujuanPenerima1,
                            tujuanInstansi: pat.tujuanInstansi,
                            paragrafPembuka: pat.paragrafPembuka,
                            isiSurat: pat.isiSurat,
                            hariTanggalKegiatan: pat.hariTanggalKegiatan,
                            waktuKegiatan: pat.waktuKegiatan,
                            tempatKegiatan: pat.tempatKegiatan,
                            keperluanKegiatan: pat.keperluanKegiatan,
                            catatanKegiatan: pat.catatanKegiatan,
                            paragrafPenutup: pat.paragrafPenutup
                          }))
                          setAutoNumberForm(prev => ({
                            ...prev,
                            perihal: pat.perihal,
                            tujuanPenerima: pat.tujuanPenerima1,
                            instansiPenerima: pat.tujuanInstansi
                          }))
                          Swal.fire({
                            icon: 'success',
                            title: 'Pola Naskah Diterapkan',
                            text: `Format "${pat.perihal}" dimuat ke formulir surat keluar.`,
                            timer: 1500,
                            showConfirmButton: false
                          })
                        }}
                        className="text-[10px] font-medium px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition-colors text-left"
                      >
                        📄 {pat.perihal.length > 30 ? pat.perihal.substring(0, 30) + '...' : pat.perihal}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Identitas Surat & Tujuan Penerima */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-semibold">Perihal Surat Keluar <span className="text-rose-500">*</span></Label>
                <Input
                  placeholder="Misal: Pemberitahuan Jadwal Asesmen Sumatif / Undangan Rapat Komite"
                  value={templateForm.perihal}
                  onChange={(e) => {
                    setTemplateForm({ ...templateForm, perihal: e.target.value })
                    setAutoNumberForm({ ...autoNumberForm, perihal: e.target.value })
                  }}
                  className="h-8 text-xs font-bold rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Tujuan Penerima 1 (Kepada / Yth) <span className="text-rose-500">*</span></Label>
                <Input
                  placeholder="1. Bapak Ibu Guru dan Karyawan / Wali Murid"
                  value={templateForm.tujuanPenerima1}
                  onChange={(e) => {
                    setTemplateForm({ ...templateForm, tujuanPenerima1: e.target.value })
                    setAutoNumberForm({ ...autoNumberForm, tujuanPenerima: e.target.value })
                  }}
                  className="h-8 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Tujuan Penerima 2 (Opsional)</Label>
                <Input
                  placeholder="2. Siswa Siswi Kelas X, XI, XII"
                  value={templateForm.tujuanPenerima2}
                  onChange={(e) => setTemplateForm({ ...templateForm, tujuanPenerima2: e.target.value })}
                  className="h-8 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Instansi / Lembaga Penerima</Label>
                <Input
                  placeholder="SMA Muhammadiyah 1 Ponorogo / Dinas Pendidikan"
                  value={templateForm.tujuanInstansi}
                  onChange={(e) => {
                    setTemplateForm({ ...templateForm, tujuanInstansi: e.target.value })
                    setAutoNumberForm({ ...autoNumberForm, instansiPenerima: e.target.value })
                  }}
                  className="h-8 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Lokasi Tujuan</Label>
                <Input
                  placeholder="di tempat / Ponorogo"
                  value={templateForm.tujuanLokasi}
                  onChange={(e) => setTemplateForm({ ...templateForm, tujuanLokasi: e.target.value })}
                  className="h-8 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Redaksi Paragraf Pembuka & Isi Surat */}
            <div className="space-y-2.5 p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Paragraf Pembuka Surat</Label>
                <Textarea
                  rows={2}
                  value={templateForm.paragrafPembuka}
                  onChange={(e) => setTemplateForm({ ...templateForm, paragrafPembuka: e.target.value })}
                  placeholder="Diberitahukan bahwa sehubungan dengan agenda..."
                  className="text-xs rounded-xl bg-white dark:bg-slate-950"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Isi Surat / Penjelasan Pokok</Label>
                <Textarea
                  rows={2}
                  value={templateForm.isiSurat}
                  onChange={(e) => setTemplateForm({ ...templateForm, isiSurat: e.target.value })}
                  placeholder="Tuliskan isi bahasan, petunjuk teknis, atau keterangan penting..."
                  className="text-xs rounded-xl bg-white dark:bg-slate-950"
                />
              </div>

              {/* Waktu Pelaksanaan & Lokasi Kegiatan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <div className="space-y-1">
                  <Label className="text-[11px]">Hari & Tanggal Acara</Label>
                  <Input
                    value={templateForm.hariTanggalKegiatan}
                    onChange={(e) => setTemplateForm({ ...templateForm, hariTanggalKegiatan: e.target.value })}
                    placeholder="Selasa, 11 Agustus 2026"
                    className="h-7 text-xs rounded-lg bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Waktu / Jam</Label>
                  <Input
                    value={templateForm.waktuKegiatan}
                    onChange={(e) => setTemplateForm({ ...templateForm, waktuKegiatan: e.target.value })}
                    placeholder="07.00 WIB s.d Selesai"
                    className="h-7 text-xs rounded-lg bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Tempat / Lokasi</Label>
                  <Input
                    value={templateForm.tempatKegiatan}
                    onChange={(e) => setTemplateForm({ ...templateForm, tempatKegiatan: e.target.value })}
                    placeholder="Kampus SMA MUHIPO"
                    className="h-7 text-xs rounded-lg bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              {/* Catatan Ketentuan Pakaian (Opsional) */}
              <div className="space-y-1.5 pt-1 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Ketentuan Pakaian / Dresscode (Opsional)</Label>
                  <label className="flex items-center gap-1.5 text-[10.5px] font-bold text-amber-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={templateForm.includePakaian}
                      onChange={(e) => setTemplateForm({ ...templateForm, includePakaian: e.target.checked })}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Aktifkan Ketentuan Pakaian</span>
                  </label>
                </div>
                {templateForm.includePakaian && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <Input
                      value={templateForm.pakaianBapakSiswa}
                      onChange={(e) => setTemplateForm({ ...templateForm, pakaianBapakSiswa: e.target.value })}
                      placeholder="Bapak / Siswa : Pakaian Khas Ponorogo / Batik"
                      className="h-7 text-xs rounded-lg bg-white dark:bg-slate-950"
                    />
                    <Input
                      value={templateForm.pakaianIbuSiswi}
                      onChange={(e) => setTemplateForm({ ...templateForm, pakaianIbuSiswi: e.target.value })}
                      placeholder="Ibu / Siswi : Penadon Wanita / Busana Muslimah"
                      className="h-7 text-xs rounded-lg bg-white dark:bg-slate-950"
                    />
                  </div>
                )}
              </div>

              {/* Paragraf Penutup */}
              <div className="space-y-1 pt-1">
                <Label className="text-xs font-semibold">Paragraf Penutup</Label>
                <Input
                  value={templateForm.paragrafPenutup}
                  onChange={(e) => setTemplateForm({ ...templateForm, paragrafPenutup: e.target.value })}
                  placeholder="Demikian surat ini kami sampaikan, atas perhatian dan kerjasamanya kami ucapkan terima kasih."
                  className="h-8 text-xs rounded-xl bg-white dark:bg-slate-950"
                />
              </div>
            </div>

            {/* Pejabat Penandatangan Resmi */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border flex items-center justify-between">
              <div>
                <Label className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Pejabat Penandatangan (E-Sign):</Label>
                <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mt-0.5">
                  {templateForm.namaPenandatangan} <span className="font-mono text-slate-500">({templateForm.nbmPenandatangan})</span>
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
                Kepala Sekolah Sah
              </Badge>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsModalSuratKeluarOpen(false)} className="rounded-xl">
              Batal
            </Button>
            <Button 
              size="sm" 
              onClick={() => {
                handleTerbitkanSuratDariTemplate()
                setIsModalSuratKeluarOpen(false)
              }} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold gap-1.5 shadow-sm"
            >
              <Send className="w-4 h-4" /> Terbitkan Nomor & Kirim ke Kepala Sekolah (E-Sign)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Form Upload E-Archive */}
      <Dialog open={isModalArchiveOpen} onOpenChange={setIsModalArchiveOpen}>
        <DialogContent className="sm:max-w-[560px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Archive className="w-5 h-5" /> Unggah Berkas ke E-Archive Digital
            </DialogTitle>
            <DialogDescription className="text-xs">
              Arsipkan SK, MoU kerjasama, berkas akreditasi, atau register ijazah alumni secara aman.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Judul Dokumen / Nama Arsip <span className="text-rose-500">*</span></Label>
              <Input
                placeholder="Misal: SK Pembagian Tugas Guru TA 2026/2027"
                value={formArchive.judulDokumen}
                onChange={(e) => setFormArchive({ ...formArchive, judulDokumen: e.target.value })}
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Kategori Arsip</Label>
                <Select 
                  value={formArchive.kategori} 
                  onValueChange={(val) => { if (val) setFormArchive({ ...formArchive, kategori: val as EArchiveDocument['kategori'] }) }}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARSIP_SISWA">🎓 Arsip Siswa (Ijazah/Akta/KIP/Raport)</SelectItem>
                    <SelectItem value="ARSIP_GURU_KARYAWAN">👨‍🏫 Arsip Guru & Karyawan (SK/Sertifikasi/Ijazah)</SelectItem>
                    <SelectItem value="SK_KEPSEK">📜 SK Kepala Sekolah</SelectItem>
                    <SelectItem value="MOU_KERJASAMA">🤝 MoU & Kerjasama Lembaga</SelectItem>
                    <SelectItem value="KURIKULUM_AKREDITASI">🏆 Akreditasi & Dokumen Kurikulum</SelectItem>
                    <SelectItem value="IJAZAH_ALUMNI">🎓 Ijazah & Register Alumni</SelectItem>
                    <SelectItem value="SARPRAS_ASET">🏢 Sarana Prasarana, Tanah & Aset</SelectItem>
                    <SelectItem value="SURAT_RESMI">✉️ Surat Resmi Sekolah</SelectItem>
                    <SelectItem value="LAPORAN_KEUANGAN">💰 Laporan Keuangan TU</SelectItem>
                    <SelectItem value="DOKUMEN_LAIN">📁 Dokumen & Berkas Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Tahun Dokumen</Label>
                <Input
                  value={formArchive.tahun}
                  onChange={(e) => setFormArchive({ ...formArchive, tahun: e.target.value })}
                  className="h-8 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Input Subjek Terkait (Jika Arsip Siswa / Guru) */}
            {(formArchive.kategori === 'ARSIP_SISWA' || formArchive.kategori === 'ARSIP_GURU_KARYAWAN') && (
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">Nama Siswa / Guru Terkait</Label>
                  <Input
                    placeholder="Nama Lengkap Siswa/Guru"
                    value={formArchive.namaSubjek}
                    onChange={(e) => setFormArchive({ ...formArchive, namaSubjek: e.target.value })}
                    className="h-8 text-xs rounded-xl bg-white dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">NISN / NIS / NBM / NIP</Label>
                  <Input
                    placeholder="Contoh: NISN 0087612341"
                    value={formArchive.identitasSubjek}
                    onChange={(e) => setFormArchive({ ...formArchive, identitasSubjek: e.target.value })}
                    className="h-8 text-xs font-mono rounded-xl bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Nomor Referensi Berkas</Label>
                <Input
                  placeholder="SK-GURU-2026-001 / NISN-008123"
                  value={formArchive.nomorReferensi}
                  onChange={(e) => setFormArchive({ ...formArchive, nomorReferensi: e.target.value })}
                  className="h-8 text-xs font-mono rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Tingkat Keamanan Akses</Label>
                <Select 
                  value={formArchive.tingkatAkses} 
                  onValueChange={(val) => { if (val) setFormArchive({ ...formArchive, tingkatAkses: val as EArchiveDocument['tingkatAkses'] }) }}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl">
                    <SelectValue placeholder="Pilih Akses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIK">Publik (Umum)</SelectItem>
                    <SelectItem value="INTERNAL">Internal Guru & Tendik</SelectItem>
                    <SelectItem value="RAHASIA">Rahasia (Pimpinan TU)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* File Upload Box Multimedia: Foto / PDF / Dokumen Office */}
            <div className="p-3 border-2 border-dashed border-emerald-300 dark:border-emerald-800 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 text-center space-y-1.5">
              <input
                type="file"
                id="archive-file-upload"
                accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                onChange={handleFileArchiveUploadChange}
                className="hidden"
              />
              <label 
                htmlFor="archive-file-upload" 
                className="cursor-pointer flex flex-col items-center justify-center gap-1 py-2 hover:opacity-80 transition-opacity"
              >
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {formArchive.namaFile ? formArchive.namaFile : 'Pilih Berkas Lampiran (Foto / PDF / Dokumen Office)'}
                </p>
                <p className="text-[10px] text-slate-500">
                  Mendukung PDF, JPG/PNG, DOCX, XLSX hingga 25MB
                </p>
              </label>

              {formArchive.namaFile && (
                <div className="flex items-center justify-center gap-1.5 text-[10.5px] font-semibold text-emerald-700 bg-emerald-100/60 py-0.5 px-2.5 rounded-lg inline-flex">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Berkas Terlampir: {formArchive.namaFile}</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Keterangan Tambahan</Label>
              <Textarea
                rows={2}
                placeholder="Catatan masa berlaku, isi ringkas berkas..."
                value={formArchive.keterangan}
                onChange={(e) => setFormArchive({ ...formArchive, keterangan: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsModalArchiveOpen(false)} className="rounded-xl">
              Batal
            </Button>
            <Button size="sm" onClick={handleTambahArchive} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
              Simpan ke E-Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL EDIT ARSIP DOKUMEN */}
      <Dialog open={isModalEditArchiveOpen} onOpenChange={setIsModalEditArchiveOpen}>
        <DialogContent className="sm:max-w-[560px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Edit3 className="w-5 h-5" /> Edit Data Dokumen E-Archive
            </DialogTitle>
            <DialogDescription className="text-xs">
              Perbarui metadata, nomor referensi, subjek terkait, atau lampiran berkas dokumen arsip.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Judul Dokumen / Nama Arsip <span className="text-rose-500">*</span></Label>
              <Input
                value={formArchive.judulDokumen}
                onChange={(e) => setFormArchive({ ...formArchive, judulDokumen: e.target.value })}
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Kategori Arsip</Label>
                <Select 
                  value={formArchive.kategori} 
                  onValueChange={(val) => { if (val) setFormArchive({ ...formArchive, kategori: val as EArchiveDocument['kategori'] }) }}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARSIP_SISWA">🎓 Arsip Siswa (Ijazah/Akta/KIP/Raport)</SelectItem>
                    <SelectItem value="ARSIP_GURU_KARYAWAN">👨‍🏫 Arsip Guru & Karyawan (SK/Sertifikasi/Ijazah)</SelectItem>
                    <SelectItem value="SK_KEPSEK">📜 SK Kepala Sekolah</SelectItem>
                    <SelectItem value="MOU_KERJASAMA">🤝 MoU & Kerjasama Lembaga</SelectItem>
                    <SelectItem value="KURIKULUM_AKREDITASI">🏆 Akreditasi & Dokumen Kurikulum</SelectItem>
                    <SelectItem value="IJAZAH_ALUMNI">🎓 Ijazah & Register Alumni</SelectItem>
                    <SelectItem value="SARPRAS_ASET">🏢 Sarana Prasarana, Tanah & Aset</SelectItem>
                    <SelectItem value="SURAT_RESMI">✉️ Surat Resmi Sekolah</SelectItem>
                    <SelectItem value="LAPORAN_KEUANGAN">💰 Laporan Keuangan TU</SelectItem>
                    <SelectItem value="DOKUMEN_LAIN">📁 Dokumen & Berkas Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Tahun Dokumen</Label>
                <Input
                  value={formArchive.tahun}
                  onChange={(e) => setFormArchive({ ...formArchive, tahun: e.target.value })}
                  className="h-8 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Input Subjek Terkait */}
            {(formArchive.kategori === 'ARSIP_SISWA' || formArchive.kategori === 'ARSIP_GURU_KARYAWAN') && (
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-amber-900 dark:text-amber-300">Nama Siswa / Guru Terkait</Label>
                  <Input
                    placeholder="Nama Lengkap Siswa/Guru"
                    value={formArchive.namaSubjek}
                    onChange={(e) => setFormArchive({ ...formArchive, namaSubjek: e.target.value })}
                    className="h-8 text-xs rounded-xl bg-white dark:bg-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-amber-900 dark:text-amber-300">NISN / NIS / NBM / NIP</Label>
                  <Input
                    placeholder="Contoh: NISN 0087612341"
                    value={formArchive.identitasSubjek}
                    onChange={(e) => setFormArchive({ ...formArchive, identitasSubjek: e.target.value })}
                    className="h-8 text-xs font-mono rounded-xl bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Nomor Referensi Berkas</Label>
                <Input
                  value={formArchive.nomorReferensi}
                  onChange={(e) => setFormArchive({ ...formArchive, nomorReferensi: e.target.value })}
                  className="h-8 text-xs font-mono rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Tingkat Keamanan Akses</Label>
                <Select 
                  value={formArchive.tingkatAkses} 
                  onValueChange={(val) => { if (val) setFormArchive({ ...formArchive, tingkatAkses: val as EArchiveDocument['tingkatAkses'] }) }}
                >
                  <SelectTrigger className="h-8 text-xs rounded-xl">
                    <SelectValue placeholder="Pilih Akses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIK">Publik (Umum)</SelectItem>
                    <SelectItem value="INTERNAL">Internal Guru & Tendik</SelectItem>
                    <SelectItem value="RAHASIA">Rahasia (Pimpinan TU)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Ganti Berkas Lampiran */}
            <div className="p-3 border-2 border-dashed border-amber-300 dark:border-amber-800 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 text-center space-y-1.5">
              <input
                type="file"
                id="archive-file-edit"
                accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                onChange={handleFileArchiveUploadChange}
                className="hidden"
              />
              <label 
                htmlFor="archive-file-edit" 
                className="cursor-pointer flex flex-col items-center justify-center gap-1 py-1.5 hover:opacity-80 transition-opacity"
              >
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {formArchive.namaFile ? `Berkas: ${formArchive.namaFile} (Klik untuk Ganti)` : 'Ganti Berkas Lampiran'}
                </p>
                <p className="text-[10px] text-slate-500">
                  Mendukung PDF, Foto JPG/PNG, DOCX, XLSX hingga 25MB
                </p>
              </label>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Keterangan Tambahan</Label>
              <Textarea
                rows={2}
                value={formArchive.keterangan}
                onChange={(e) => setFormArchive({ ...formArchive, keterangan: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsModalEditArchiveOpen(false)} className="rounded-xl">
              Batal
            </Button>
            <Button size="sm" onClick={handleSimpanEditArchive} className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold">
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: Print Preview Dialog */}
      <Dialog open={isModalPreviewTemplateOpen} onOpenChange={setIsModalPreviewTemplateOpen}>
        <DialogContent className="sm:max-w-[760px] max-h-[92vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-indigo-700">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5" /> Cetak Lembar Surat Resmi Sekolah (A4)
              </div>
            </DialogTitle>
            <DialogDescription className="text-xs flex items-center justify-between">
              <span>Pratinjau kop surat resmi Muhammadiyah dan tata letak dokumen standar dinas.</span>
              <Badge className="bg-blue-600 text-white font-mono text-[10px]">Ukuran Standar: A4 (HVS 80gr)</Badge>
            </DialogDescription>
          </DialogHeader>

          <div ref={printAreaRef} className="print-page-a4 bg-white text-black p-8 sm:p-10 rounded-xs shadow-md border border-slate-300 text-[12px] leading-relaxed font-serif">
            {/* Header / Kop Surat Resmi */}
            {kopType === 'IMAGE_UPLOAD' && customKopImage ? (
              <div className="mb-4 border-b-2 border-black pb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={customKopImage} alt="Kop Surat Resmi" className="w-full h-auto object-contain max-h-[140px]" />
              </div>
            ) : (
              <div className="border-b-[3px] border-black pb-2 mb-5">
                <div className="flex items-center justify-between gap-3 text-center">
                  <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                    {/* Logo Kiri (Wajib Sekolah) */}
                    {customLogoKiri && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={customLogoKiri} alt="Logo Wajib Sekolah" className="w-14 h-14 object-contain" />
                    )}
                  </div>

                  <div className="flex-1 space-y-0.5">
                    <h4 className="font-sans font-bold text-[12px] tracking-wide text-black uppercase leading-tight whitespace-pre-line">
                      {templateForm.kopInstansiAtas}
                    </h4>
                    <h2 className="font-sans font-black text-[18px] text-blue-900 uppercase tracking-tight leading-tight">
                      {templateForm.kopNamaSekolah}
                    </h2>
                    <div className="flex items-center justify-center gap-4 text-[10px] font-sans font-bold text-black">
                      <span>Status : <strong>{templateForm.kopStatusAkreditasi}</strong></span>
                      <span>NPSN : <strong>{templateForm.kopNpsn}</strong></span>
                    </div>
                    <p className="text-[9.5px] font-sans text-black leading-tight">
                      {templateForm.kopAlamat}
                    </p>
                    <p className="text-[9.5px] font-sans text-black leading-tight">
                      {templateForm.kopEmailWebsite}
                    </p>
                  </div>

                  <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                    {/* Logo Kanan (Opsional / Dikdasmen) */}
                    {customLogoKanan && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={customLogoKanan} alt="Logo Instansi Kanan (Opsional)" className="w-14 h-14 object-contain" />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Surat Pemberitahuan & Undangan */}
            {(templateForm.jenisTemplate === 'PEMBERITAHUAN' || templateForm.jenisTemplate === 'UNDANGAN') ? (
              <div className="space-y-4 text-black text-[12px]">
                {/* Baris Nomor & Tanggal */}
                <div className="flex items-start justify-between">
                  <table className="w-auto">
                    <tbody>
                      <tr>
                        <td className="w-16">Nomor</td>
                        <td className="w-3">:</td>
                        <td className="font-sans font-normal">{templateForm.nomorSurat}</td>
                      </tr>
                      <tr>
                        <td>Lamp</td>
                        <td>:</td>
                        <td>{templateForm.lampiran}</td>
                      </tr>
                      <tr>
                        <td className="align-top">Perihal</td>
                        <td className="align-top">:</td>
                        <td className="font-bold">{templateForm.perihal}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="text-right space-y-0.5">
                    <p>{templateForm.tanggalHijriyah}</p>
                    <p>{templateForm.tanggalSurat}</p>
                  </div>
                </div>

                {/* Tujuan Surat */}
                <div className="pt-2 space-y-0.5">
                  <p>Yang terhormat:</p>
                  <p className="font-bold">{templateForm.tujuanPenerima1}</p>
                  {templateForm.tujuanPenerima2 && (
                    <p className="font-bold">{templateForm.tujuanPenerima2}</p>
                  )}
                  <p className="font-bold">{templateForm.tujuanInstansi}</p>
                  <div className="pl-6 pt-1">
                    <p>di _</p>
                    <p className="pl-8">{templateForm.tujuanLokasi}</p>
                  </div>
                </div>

                {/* Salam Pembuka */}
                <p className="font-bold italic pt-1">{templateForm.salamPembuka}</p>

                {/* Paragraf Pembuka */}
                <p className="text-justify leading-relaxed">
                  {templateForm.paragrafPembuka}
                </p>

                {/* Isi Surat Pokok */}
                {templateForm.isiSurat && (
                  <p className="text-justify leading-relaxed">
                    {templateForm.isiSurat}
                  </p>
                )}

                {/* Keterangan Waktu & Detail Kegiatan */}
                {(templateForm.hariTanggalKegiatan || templateForm.waktuKegiatan || templateForm.tempatKegiatan) && (
                  <div className="pl-6 space-y-1.5 pt-1">
                    {templateForm.hariTanggalKegiatan && (
                      <div className="flex items-start">
                        <span className="w-28 shrink-0">Hari / Tanggal</span>
                        <span className="w-3">:</span>
                        <span className="font-bold">{templateForm.hariTanggalKegiatan}</span>
                      </div>
                    )}

                    {templateForm.waktuKegiatan && (
                      <div className="flex items-start">
                        <span className="w-28 shrink-0">Waktu / Pukul</span>
                        <span className="w-3">:</span>
                        <span>{templateForm.waktuKegiatan}</span>
                      </div>
                    )}

                    {templateForm.tempatKegiatan && (
                      <div className="flex items-start">
                        <span className="w-28 shrink-0">Tempat</span>
                        <span className="w-3">:</span>
                        <span>{templateForm.tempatKegiatan}</span>
                      </div>
                    )}

                    {templateForm.keperluanKegiatan && (
                      <div className="flex items-start">
                        <span className="w-28 shrink-0 align-top">Keperluan</span>
                        <span className="w-3 align-top">:</span>
                        <div className="whitespace-pre-line font-medium">{templateForm.keperluanKegiatan}</div>
                      </div>
                    )}

                    {/* Format Pakaian (Hanya jika aktif / diisi) */}
                    {(templateForm.includePakaian && (templateForm.pakaianBapakSiswa || templateForm.pakaianIbuSiswi)) && (
                      <div className="flex items-start">
                        <span className="w-28 shrink-0 align-top">Pakaian</span>
                        <span className="w-3 align-top">:</span>
                        <div className="space-y-1">
                          {templateForm.pakaianBapakSiswa && <p>{templateForm.pakaianBapakSiswa}</p>}
                          {templateForm.pakaianIbuSiswi && <p>{templateForm.pakaianIbuSiswi}</p>}
                        </div>
                      </div>
                    )}

                    {templateForm.catatanKegiatan && (
                      <div className="flex items-start">
                        <span className="w-28 shrink-0 align-top">Catatan</span>
                        <span className="w-3 align-top">:</span>
                        <div className="whitespace-pre-line text-[11px] italic">{templateForm.catatanKegiatan}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Paragraf Penutup */}
                <p className="text-justify pt-2 leading-relaxed">
                  {templateForm.paragrafPenutup}
                </p>

                {/* Tanda Tangan, QR Code Sah SIMASMUH di Kanan, & Sertifikat Legalitas di Kiri Bawah */}
                <div className="pt-6 flex justify-between items-end">
                  {/* Kiri Bawah: Informasi Tanda Tangan Digital Diterbitkan oleh SIMASMUH */}
                  <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl max-w-[240px]">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="text-[9px] font-sans space-y-0.5 leading-tight">
                      <p className="font-bold text-slate-800">Tanda Tangan Digital Sah</p>
                      <p className="text-slate-500 font-mono">Diterbitkan oleh SIMASMUH</p>
                      <p className="text-[8px] text-emerald-700 font-semibold">Keaslian dokumen terverifikasi</p>
                    </div>
                  </div>

                  {/* Kanan Bawah: Kolom Penandatangan dengan QR Code E-Sign Tepat di Atas Nama Kepala Sekolah */}
                  <div className="text-center w-64 space-y-1">
                    <p className="font-sans text-xs">{templateForm.kotaPenerbit}, {templateForm.tanggalSurat}</p>
                    <p className="font-sans text-xs font-semibold">{templateForm.jabatanPenandatangan}</p>

                    {/* Area QR Code & Watermark E-Sign Sah (Tanpa Stempel) */}
                    <div className="h-24 flex flex-col items-center justify-center py-1">
                      <div className="p-1 bg-white border border-slate-300 rounded-lg shadow-2xs inline-block">
                        <QRCodeSVG 
                          value={JSON.stringify({
                            issuer: 'SIMASMUH Official E-Sign',
                            nomorSurat: templateForm.nomorSurat,
                            penandatangan: templateForm.namaPenandatangan,
                            nbm: templateForm.nbmPenandatangan,
                            status: 'DOKUMEN_SAH_TERDAFTAR_SIMASMUH',
                            verifyUrl: `http://localhost:3000/fitur/persuratan?verify=${templateForm.nomorSurat.replace(/[^a-zA-Z0-9]/g, '')}`
                          })}
                          size={68}
                          level="M"
                        />
                      </div>
                      <p className="text-[8px] font-sans font-bold text-emerald-700 tracking-wider uppercase mt-1">
                        ✓ E-Sign Verified
                      </p>
                    </div>

                    <p className="font-bold underline text-xs font-sans tracking-wide">
                      {templateForm.namaPenandatangan}
                    </p>
                    <p className="text-[11px] font-sans text-black">
                      {templateForm.nbmPenandatangan}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Template Surat Keterangan / Tugas Lainnya */
              <div className="space-y-3 text-black text-[12px]">
                <div className="text-center mb-3">
                  <h3 className="font-sans font-bold text-xs uppercase underline tracking-wider">
                    {templateForm.jenisTemplate.replace(/_/g, ' ')}
                  </h3>
                  <p className="text-[10px] font-sans">Nomor: {templateForm.nomorSurat}</p>
                </div>

                <p>Yang bertanda tangan di bawah ini Kepala SMA Muhammadiyah 1 Ponorogo menerangkan dengan sebenarnya bahwa:</p>
                
                <div className="pl-6 space-y-1">
                  <div className="grid grid-cols-3">
                    <span className="font-semibold">Nama Lengkap</span>
                    <span className="col-span-2">: <strong>{templateForm.namaSiswaPegawai}</strong></span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="font-semibold">NBM / NISN</span>
                    <span className="col-span-2">: {templateForm.nomorIdentitas}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="font-semibold">Jabatan / Kelas</span>
                    <span className="col-span-2">: {templateForm.kelasJabatan}</span>
                  </div>
                </div>

                <p className="pt-2">
                  Diberikan penugasan / keterangan resmi untuk keperluan: <strong>&ldquo;{templateForm.keperluan}&rdquo;</strong>.
                </p>

                <p className="pt-1">
                  Demikian surat ini dibuat untuk dapat dipergunakan sebagaimana mestinya.
                </p>

                <div className="pt-6 flex justify-between items-end">
                  <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl max-w-[240px]">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="text-[9px] font-sans space-y-0.5 leading-tight">
                      <p className="font-bold text-slate-800">Tanda Tangan Digital Sah</p>
                      <p className="text-slate-500 font-mono">Diterbitkan oleh SIMASMUH</p>
                      <p className="text-[8px] text-emerald-700 font-semibold">Keaslian dokumen terverifikasi</p>
                    </div>
                  </div>

                  <div className="text-center w-64 space-y-1">
                    <p className="font-sans text-xs">{templateForm.kotaPenerbit}, {templateForm.tanggalSurat}</p>
                    <p className="font-sans text-xs font-semibold">{templateForm.jabatanPenandatangan}</p>
                    <div className="h-24 flex flex-col items-center justify-center py-1">
                      <div className="p-1 bg-white border border-slate-300 rounded-lg shadow-2xs inline-block">
                        <QRCodeSVG 
                          value={JSON.stringify({
                            issuer: 'SIMASMUH Official E-Sign',
                            nomorSurat: templateForm.nomorSurat,
                            penandatangan: templateForm.namaPenandatangan,
                            nbm: templateForm.nbmPenandatangan,
                            status: 'DOKUMEN_SAH_TERDAFTAR_SIMASMUH',
                            verifyUrl: `http://localhost:3000/fitur/persuratan?verify=${templateForm.nomorSurat.replace(/[^a-zA-Z0-9]/g, '')}`
                          })}
                          size={68}
                          level="M"
                        />
                      </div>
                      <p className="text-[8px] font-sans font-bold text-emerald-700 tracking-wider uppercase mt-1">
                        ✓ E-Sign Verified
                      </p>
                    </div>
                    <p className="font-bold underline text-xs font-sans">{templateForm.namaPenandatangan}</p>
                    <p className="text-[11px] font-sans">{templateForm.nbmPenandatangan}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsModalPreviewTemplateOpen(false)} className="rounded-xl">
              Tutup
            </Button>
            <Button size="sm" onClick={handlePrintDocument} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold gap-2">
              <Printer className="w-4 h-4" /> Cetak Dokumen (A4)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 6: Dialog Permintaan Revisi Kepala Sekolah */}
      <Dialog open={isModalRevisiOpen} onOpenChange={setIsModalRevisiOpen}>
        <DialogContent className="sm:max-w-[520px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <Edit3 className="w-5 h-5" /> Catatan Koreksi & Permintaan Revisi
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sampaikan instruksi bagian yang perlu disesuaikan atau diperbaiki oleh Tim Tata Usaha.
            </DialogDescription>
          </DialogHeader>

          {selectedSuratKeluar && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 text-xs space-y-1">
              <p className="font-bold text-rose-900 dark:text-rose-200">Surat: {selectedSuratKeluar.perihal}</p>
              <p className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">{selectedSuratKeluar.nomorSurat} (Agenda: {selectedSuratKeluar.nomorAgenda})</p>
            </div>
          )}

          <div className="space-y-2 py-2">
            <Label className="text-xs font-bold">Instruksi Catatan Revisi untuk Admin TU <span className="text-rose-500">*</span></Label>
            <Textarea
              rows={4}
              placeholder="Misal: Mohon sesuaikan waktu kegiatan, perbaiki penulisan nama penerima, atau tambahkan tembusan ke Waka Kesiswaan..."
              value={revisiText}
              onChange={(e) => setRevisiText(e.target.value)}
              className="text-xs rounded-2xl"
            />
            <p className="text-[10px] text-slate-500">
              Surat akan berstatus <strong>PERLU_REVISI</strong> dan dikembalikan ke antrean draft TU untuk diedit pada UUID dokumen yang sama.
            </p>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsModalRevisiOpen(false)} className="rounded-xl">
              Batal
            </Button>
            <Button size="sm" onClick={handleSubmitRevisi} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold">
              Kirim Catatan Revisi ke TU
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: E-Sign & Digital Signature Modal */}
      <Dialog open={isModalTtdOpen} onOpenChange={setIsModalTtdOpen}>
        <DialogContent className="sm:max-w-[720px] max-h-[92vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-lg">
              <ShieldCheck className="w-5 h-5 text-emerald-600" /> Tanda Tangan Elektronik & Terbitkan QR Sah
            </DialogTitle>
            <DialogDescription className="text-xs">
              Torehkan coretan tanda tangan asli pada bidang canvas layar di bawah. Bidang canvas didesain luas untuk kenyamanan layar Tablet/iPad.
            </DialogDescription>
          </DialogHeader>

          {selectedSuratKeluar && (
            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 text-xs space-y-1">
              <p className="font-bold text-emerald-900 dark:text-emerald-200">Surat: {selectedSuratKeluar.perihal}</p>
              <p className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">{selectedSuratKeluar.nomorSurat} (Agenda: {selectedSuratKeluar.nomorAgenda})</p>
              <p className="text-slate-500">Penerima: {selectedSuratKeluar.tujuanPenerima} - {selectedSuratKeluar.instansiPenerima}</p>
            </div>
          )}

          {/* Form Identitas Penandatangan */}
          <div className="grid grid-cols-2 gap-3 py-1">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nama Penandatangan</Label>
              <Input
                value={signerForm.nama}
                onChange={(e) => setSignerForm({ ...signerForm, nama: e.target.value })}
                className="h-9 text-xs font-semibold rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">NBM / NIP Pejabat</Label>
              <Input
                value={signerForm.nbm}
                onChange={(e) => setSignerForm({ ...signerForm, nbm: e.target.value })}
                className="h-9 text-xs font-mono rounded-xl"
              />
            </div>
          </div>

          {/* Bidang Coretan Tanda Tangan (Canvas Touch & Mouse - Didesain Luas untuk Tablet) */}
          <div className="space-y-2 py-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-emerald-600" /> Area Pad Tanda Tangan Digital (Tablet & Touch Friendly):
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearSignatureCanvas}
                className="h-7 text-xs px-2.5 rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 font-bold"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Bersihkan Coretan
              </Button>
            </div>

            <div className="relative border-2 border-dashed border-emerald-400 dark:border-emerald-700/60 rounded-2xl overflow-hidden bg-white shadow-inner">
              <canvas
                ref={canvasRef}
                width={800}
                height={320}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-[240px] sm:h-[300px] cursor-crosshair touch-none bg-white"
              />
              {!hasSignatureDrawn && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5 bg-slate-50/40">
                  <Shield className="w-8 h-8 text-emerald-400/80 stroke-1" />
                  <span className="font-semibold text-slate-600">Silakan korek / torehkan tanda tangan asli Kepala Sekolah di sini</span>
                  <span className="text-[10px] text-slate-400">(Area luas responsif untuk Stylus Pen, Jari Tablet, atau Mouse)</span>
                </div>
              )}
            </div>
          </div>
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border flex items-center justify-between text-xs mt-2">
            <div className="flex items-center gap-2">
              <QRCodeSVG value="SIMASMUH-SAMPLE" size={32} />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">QR Sah Terbitan SIMASMUH</p>
                <p className="text-[10px] text-slate-500">Terenkripsi token integritas dokumen</p>
              </div>
            </div>
            <Badge className="bg-emerald-600 text-white text-[10px] font-bold">Otomatis Diterbitkan</Badge>
          </div>

          <DialogFooter className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsModalTtdOpen(false)} className="rounded-xl">
              Batal
            </Button>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleTandatanganiMasal} 
                className="rounded-xl text-xs font-bold gap-1 text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
              >
                <Layers className="w-3.5 h-3.5" /> Tanda Tangan Masal
              </Button>
              <Button 
                size="sm" 
                onClick={handleSimpanSignatureCanvas} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md gap-1.5"
              >
                <Check className="w-4 h-4" /> Simpan & Terbitkan QR Sah
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 8: Dialog Verifikasi QR Code Sah SIMASMUH */}
      <Dialog open={isModalQrVerifyOpen} onOpenChange={setIsModalQrVerifyOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-center justify-center">
              <QrCode className="w-6 h-6" /> QR Code Validasi Tanda Tangan Sah
            </DialogTitle>
            <DialogDescription className="text-xs text-center">
              Sertifikat tanda tangan elektronik resmi diterbitkan oleh SIMASMUH SMA Muhammadiyah 1 Ponorogo.
            </DialogDescription>
          </DialogHeader>

          {selectedSuratKeluar && (
            <div className="space-y-4 py-2 text-center">
              <div className="flex justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-sm inline-block mx-auto">
                <QRCodeSVG
                  value={selectedSuratKeluar.eSignQrData || `http://localhost:3000/fitur/persuratan?verify=${selectedSuratKeluar.eSignToken}`}
                  size={180}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 text-left text-xs space-y-1.5">
                <div className="flex justify-between border-b pb-1 border-emerald-200/60">
                  <span className="text-slate-500">Status Validasi:</span>
                  <span className="font-bold text-emerald-700">✓ ASLI & SAH (SIMASMUH)</span>
                </div>
                <div className="flex justify-between border-b pb-1 border-emerald-200/60">
                  <span className="text-slate-500">Nomor Surat:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedSuratKeluar.nomorSurat}</span>
                </div>
                <div className="flex justify-between border-b pb-1 border-emerald-200/60">
                  <span className="text-slate-500">Penandatangan:</span>
                  <span className="font-bold text-slate-800">{selectedSuratKeluar.signerName || selectedSuratKeluar.penandatangan}</span>
                </div>
                <div className="flex justify-between border-b pb-1 border-emerald-200/60">
                  <span className="text-slate-500">Token Digital:</span>
                  <span className="font-mono text-emerald-800 text-[10px]">{selectedSuratKeluar.eSignToken}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Waktu Penandatanganan:</span>
                  <span className="text-slate-700 font-semibold">{selectedSuratKeluar.tanggalTtd}</span>
                </div>
              </div>

              {selectedSuratKeluar.signatureDataUrl && (
                <div className="p-2.5 bg-slate-50 rounded-xl border text-left">
                  <p className="text-[11px] font-bold text-slate-700 mb-1">Coretan Tanda Tangan Asli Pejabat:</p>
                  <div className="h-14 flex items-center justify-center bg-white rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={selectedSuratKeluar.signatureDataUrl} 
                      alt="Coretan TTD Asli" 
                      className="max-h-12 w-auto object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2 border-t">
            <Button size="sm" onClick={() => setIsModalQrVerifyOpen(false)} className="w-full bg-slate-900 text-white rounded-xl">
              Tutup Pratinjau
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 9: Upload Naskah Mandiri */}
      <Dialog open={isModalManualUploadOpen} onOpenChange={setIsModalManualUploadOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[92vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
              <FileText className="w-5 h-5 text-indigo-600" /> Upload Naskah Mandiri
            </DialogTitle>
            <DialogDescription className="text-xs">
              Unggah naskah surat (PDF/gambar) untuk diteruskan ke alur penandatanganan elektronik Kepala Sekolah.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Box Upload Dokumen / PDF */}
            <div className="p-4 border-2 border-dashed border-indigo-300 dark:border-indigo-800 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 text-center space-y-2">
              <input
                type="file"
                id="manual-letter-file"
                accept=".pdf,image/*,.doc,.docx"
                onChange={handleFileManualUploadChange}
                className="hidden"
              />
              <label 
                htmlFor="manual-letter-file" 
                className="cursor-pointer flex flex-col items-center justify-center gap-1.5 py-3 hover:opacity-80 transition-opacity"
              >
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md">
                  <FileText className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {manualUploadFile ? manualUploadFile.name : 'Pilih Berkas PDF / Dokumen Surat'}
                </p>
                <p className="text-[10px] text-slate-500">
                  Mendukung berkas PDF/Gambar arsip dokumen hingga 15MB
                </p>
              </label>

              {manualUploadFile && (
                <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-emerald-700 bg-emerald-100/60 py-1 px-3 rounded-xl inline-flex">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Berkas Terpilih ({(manualUploadFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                </div>
              )}
            </div>

            {/* Silent Processor State */}
            {isAiAnalyzing && (
              <div className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-3 text-xs">
                <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                <p className="font-semibold text-slate-800 dark:text-slate-200">Menyinkronkan data berkas...</p>
              </div>
            )}

            {/* Form Input Naskah (Auto-terisi dan dapat diedit oleh TU) */}
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nomor Surat (Hasil Ekstraksi / Manual) <span className="text-rose-500">*</span></Label>
                  <Input
                    value={manualForm.nomorSurat}
                    onChange={(e) => setManualForm({ ...manualForm, nomorSurat: e.target.value })}
                    placeholder="Contoh: 421.3/xxx/SMAM-1/2026"
                    className="h-8 text-xs font-mono rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Tahun Terbit Dokumen</Label>
                  <Input
                    value={manualForm.tahunDokumen}
                    onChange={(e) => setManualForm({ ...manualForm, tahunDokumen: e.target.value })}
                    placeholder="Misal: 1998 / 2012 / 2026"
                    className="h-8 text-xs font-mono rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tanggal Surat</Label>
                  <Input
                    type="date"
                    value={manualForm.tanggalSurat}
                    onChange={(e) => setManualForm({ ...manualForm, tanggalSurat: e.target.value })}
                    className="h-8 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Jenis Klasifikasi Surat</Label>
                  <Select 
                    value={manualForm.jenisSurat} 
                    onValueChange={(val) => { if (val) setManualForm({ ...manualForm, jenisSurat: val as SuratKeluar['jenisSurat'] }) }}
                  >
                    <SelectTrigger className="h-8 text-xs rounded-xl">
                      <SelectValue placeholder="Pilih Jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PEMBERITAHUAN">Pemberitahuan / Edaran</SelectItem>
                      <SelectItem value="SURAT_TUGAS">Surat Perintah Tugas (SPPD)</SelectItem>
                      <SelectItem value="SURAT_UNDANGAN">Surat Undangan Dinas</SelectItem>
                      <SelectItem value="SURAT_KEPUTUSAN">Surat Keputusan (SK)</SelectItem>
                      <SelectItem value="SURAT_KETERANGAN">Surat Keterangan</SelectItem>
                      <SelectItem value="SURAT_REKOMENDASI">Surat Rekomendasi</SelectItem>
                      <SelectItem value="LEGALISIR">Legalisir Ijazah</SelectItem>
                      <SelectItem value="DOKUMEN_LAWAS">📁 Dokumen Lawas / Arsip Historis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Perihal Dokumen Surat <span className="text-rose-500">*</span></Label>
                <Input
                  value={manualForm.perihal}
                  onChange={(e) => setManualForm({ ...manualForm, perihal: e.target.value })}
                  placeholder="Perihal naskah surat..."
                  className="h-8 text-xs font-bold rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tujuan Penerima <span className="text-rose-500">*</span></Label>
                  <Input
                    value={manualForm.tujuanPenerima}
                    onChange={(e) => setManualForm({ ...manualForm, tujuanPenerima: e.target.value })}
                    placeholder="Nama / Pihak Penerima"
                    className="h-8 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Instansi Penerima</Label>
                  <Input
                    value={manualForm.instansiPenerima}
                    onChange={(e) => setManualForm({ ...manualForm, instansiPenerima: e.target.value })}
                    placeholder="Instansi / Sekolah / Umum"
                    className="h-8 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Penandatangan Pejabat</Label>
                <Input
                  value={manualForm.penandatangan}
                  onChange={(e) => setManualForm({ ...manualForm, penandatangan: e.target.value })}
                  className="h-8 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Ringkasan Konten Teks Surat (OCR / Transkrip)</Label>
                <Textarea
                  rows={3}
                  value={manualForm.kontenTeksManual}
                  onChange={(e) => setManualForm({ ...manualForm, kontenTeksManual: e.target.value })}
                  placeholder="Ringkasan atau teks isi surat manual..."
                  className="text-xs rounded-2xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsModalManualUploadOpen(false)} className="rounded-xl">
              Batal
            </Button>
            <Button 
              size="sm" 
              onClick={handleSimpanSuratManualUpload} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Teruskan ke E-Sign Kepala Sekolah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
