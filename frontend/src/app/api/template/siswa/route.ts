import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'

// Daftar program unggulan yang valid (harus sinkron dengan backend dan frontend)
const PROGRAM_OPTIONS = [
  'tahfidz',
  'saintek',
  'olahraga',
  'MIC',
  'seni budaya',
  'ai',
  'inklusi',
  'enterpreneur',
]

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E40AF' }, // biru tua (wajib)
}

const OPTIONAL_HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF475569' }, // abu-abu slate (opsional)
}

const PROGRAM_HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF6D28D9' }, // ungu
}

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 11,
}

export async function GET() {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'SIMASMUH'
  workbook.created = new Date()

  // ───────────────────────────────────────────────────────────────────
  // Sheet 1: Template utama untuk import (Buku Induk Siswa Seksi 1-5)
  // ───────────────────────────────────────────────────────────────────
  const sheet = workbook.addWorksheet('Data Siswa', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
  })

  // Definisi kolom lengkap Seksi 1 s/d 5 (Username & Password dihilangkan karena terhubung otomatis ke NIS)
  sheet.columns = [
    // 1. Data Pokok & Akun (WAJIB: NIS, Nama Siswa, L/P, Kelas)
    { header: 'NIS *', key: 'nis', width: 16 },
    { header: 'Nama Siswa *', key: 'name', width: 32 },
    { header: 'L/P *', key: 'gender', width: 8 },
    { header: 'Kelas *', key: 'kelas', width: 16 },
    { header: 'NISN', key: 'nisn', width: 16 },
    { header: 'Program', key: 'program', width: 20 },
    { header: 'Gelombang', key: 'gelombang', width: 18 },
    { header: 'Jalur Pendaftaran', key: 'jalurPendaftaran', width: 20 },

    // 2. Diri dan Tempat Tinggal (OPSIONAL)
    { header: 'Nama Panggilan', key: 'namaPanggilan', width: 18 },
    { header: 'Tempat Lahir', key: 'tempatLahir', width: 18 },
    { header: 'Tanggal Lahir', key: 'tglLahir', width: 15 },
    { header: 'Agama', key: 'agama', width: 12 },
    { header: 'Kewarganegaraan', key: 'kewarganegaraan', width: 16 },
    { header: 'Anak Ke', key: 'anakKe', width: 10 },
    { header: 'Jml Saudara Kandung', key: 'jmlSaudaraKandung', width: 18 },
    { header: 'Jml Saudara Tiri', key: 'jmlSaudaraTiri', width: 16 },
    { header: 'Jml Saudara Angkat', key: 'jmlSaudaraAngkat', width: 16 },
    { header: 'Status Yatim', key: 'statusYatim', width: 20 },
    { header: 'Bahasa', key: 'bahasa', width: 16 },
    { header: 'Alamat', key: 'alamat', width: 35 },
    { header: 'No Telp', key: 'telp', width: 16 },
    { header: 'Tinggal Dengan', key: 'tinggalDengan', width: 16 },
    { header: 'Jarak Sekolah', key: 'jarakSekolah', width: 14 },

    // 3. Kesehatan dan Pendidikan (OPSIONAL)
    { header: 'Gol Darah', key: 'golDarah', width: 12 },
    { header: 'Tinggi Badan', key: 'tinggiBadan', width: 12 },
    { header: 'Berat Badan', key: 'beratBadan', width: 12 },
    { header: 'Penyakit Pernah', key: 'penyakitPernah', width: 22 },
    { header: 'Kelainan Jasmani', key: 'kelainanJasmani', width: 20 },
    { header: 'Lulusan Dari', key: 'lulusanDari', width: 20 },
    { header: 'Alamat Sekolah Asal', key: 'alamatSekolah', width: 25 },
    { header: 'No STTB', key: 'noSttb', width: 18 },
    { header: 'Tgl STTB', key: 'tglSttb', width: 15 },
    { header: 'Lama Belajar', key: 'lamaBelajar', width: 12 },
    { header: 'No SKHUN', key: 'noSkhun', width: 18 },
    { header: 'Tgl SKHUN', key: 'tglSkhun', width: 15 },
    { header: 'Pindahan Dari Sekolah', key: 'pindahanDariSekolah', width: 24 },
    { header: 'Alasan Pindah', key: 'alasanPindah', width: 20 },
    { header: 'Diterima Di Kelas', key: 'diterimaDiKelas', width: 18 },
    { header: 'Tgl Diterima', key: 'tglDiterima', width: 15 },

    // 4. Orang Tua dan Wali (OPSIONAL)
    { header: 'Nama Ayah', key: 'namaAyah', width: 24 },
    { header: 'TTL Ayah', key: 'ttlAyah', width: 20 },
    { header: 'Agama Ayah', key: 'agamaAyah', width: 14 },
    { header: 'Pendidikan Ayah', key: 'pendidikanAyah', width: 16 },
    { header: 'Pekerjaan Ayah', key: 'pekerjaanAyah', width: 18 },
    { header: 'Penghasilan Ayah', key: 'penghasilanAyah', width: 18 },
    { header: 'Alamat Ayah', key: 'alamatAyah', width: 30 },
    { header: 'Telp Ayah', key: 'telpAyah', width: 16 },
    { header: 'Status Ayah', key: 'statusAyah', width: 16 },

    { header: 'Nama Ibu', key: 'namaIbu', width: 24 },
    { header: 'TTL Ibu', key: 'ttlIbu', width: 20 },
    { header: 'Agama Ibu', key: 'agamaIbu', width: 14 },
    { header: 'Pendidikan Ibu', key: 'pendidikanIbu', width: 16 },
    { header: 'Pekerjaan Ibu', key: 'pekerjaanIbu', width: 18 },
    { header: 'Penghasilan Ibu', key: 'penghasilanIbu', width: 18 },
    { header: 'Alamat Ibu', key: 'alamatIbu', width: 30 },
    { header: 'Telp Ibu', key: 'telpIbu', width: 16 },
    { header: 'Status Ibu', key: 'statusIbu', width: 16 },

    { header: 'Nama Wali', key: 'namaWali', width: 24 },
    { header: 'TTL Wali', key: 'ttlWali', width: 20 },
    { header: 'Pekerjaan Wali', key: 'pekerjaanWali', width: 18 },
    { header: 'Penghasilan Wali', key: 'penghasilanWali', width: 18 },
    { header: 'Alamat Wali', key: 'alamatWali', width: 30 },

    // 5. Kegemaran dan Pasca Sekolah (OPSIONAL)
    { header: 'Kesenian', key: 'kesenian', width: 18 },
    { header: 'Olah Raga', key: 'olahRaga', width: 18 },
    { header: 'Kemasyarakatan', key: 'kemasyarakatan', width: 18 },
    { header: 'Hobi Lain', key: 'kegemaranLain', width: 18 },

    { header: 'Menerima Beasiswa', key: 'menerimaBeasiswa', width: 22 },
    { header: 'Tgl Meninggalkan Sekolah', key: 'tglMeninggalkanSekolah', width: 22 },
    { header: 'Alasan Meninggalkan', key: 'alasanMeninggalkan', width: 20 },
    { header: 'Kelas Meninggalkan', key: 'kelasMeninggalkan', width: 18 },
    { header: 'No Surat Meninggalkan', key: 'noSuratMeninggalkan', width: 22 },
    { header: 'Tamat Belajar', key: 'tamatBelajar', width: 16 },
    { header: 'STTB Nomor', key: 'sttbNomor', width: 18 },
    { header: 'Tgl Ijazah', key: 'tglIjazah', width: 15 },

    { header: 'Melanjutkan Di', key: 'melanjutkanDi', width: 22 },
    { header: 'Bekerja', key: 'bekerja', width: 18 },
    { header: 'Nama Perusahaan', key: 'namaPerusahaan', width: 22 },
    { header: 'Penghasilan Kerja', key: 'penghasilanKerja', width: 18 },
  ]

  // Styling header
  const headerRow = sheet.getRow(1)
  headerRow.eachCell((cell, colNumber) => {
    cell.font = HEADER_FONT
    // Highlight kolom wajib (col 1-4) dengan biru tua, program (col 6) dengan ungu, sisanya abu-abu
    cell.fill = colNumber <= 4 ? HEADER_FILL : (colNumber === 6 ? PROGRAM_HEADER_FILL : OPTIONAL_HEADER_FILL)
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF334155' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } },
    }
  })
  headerRow.height = 28
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }]

  // Sample row 2
  const exampleRows = [
    {
      nis: '2401001',
      name: 'Ahmad Dahlan Putra',
      gender: 'L',
      kelas: 'X IPA 1',
      nisn: '0012345678',
      program: 'tahfidz',
      gelombang: 'Gelombang 1',
      jalurPendaftaran: 'Mandiri',

      namaPanggilan: 'Dahlan',
      tempatLahir: 'Yogyakarta',
      tglLahir: '2008-08-01',
      agama: 'Islam',
      kewarganegaraan: 'Indonesia',
      anakKe: '1',
      jmlSaudaraKandung: '2',
      jmlSaudaraTiri: '0',
      jmlSaudaraAngkat: '0',
      statusYatim: 'Orang Tua Lengkap',
      bahasa: 'Indonesia',
      alamat: 'Jl. K.H. Ahmad Dahlan No. 1, Yogyakarta',
      telp: '081234567890',
      tinggalDengan: 'Orang Tua',
      jarakSekolah: '2 km',

      golDarah: 'O',
      tinggiBadan: '168',
      beratBadan: '58',
      penyakitPernah: 'Tidak Ada',
      kelainanJasmani: '-',
      lulusanDari: 'SMP N 1 Yogyakarta',
      alamatSekolah: 'Yogyakarta',
      noSttb: 'DN-04/1234567',
      tglSttb: '2024-06-15',
      lamaBelajar: '3',
      noSkhun: '123456789',
      tglSkhun: '2024-06-15',
      pindahanDariSekolah: '-',
      alasanPindah: '-',
      diterimaDiKelas: 'X IPA 1',
      tglDiterima: '2024-07-15',

      namaAyah: 'K.H. Abu Bakar',
      ttlAyah: 'Yogyakarta, 15-05-1975',
      agamaAyah: 'Islam',
      pendidikanAyah: 'S1',
      pekerjaanAyah: 'Wiraswasta',
      penghasilanAyah: '5.000.000',
      alamatAyah: 'Jl. K.H. Ahmad Dahlan No. 1',
      telpAyah: '081234567891',
      statusAyah: 'Masih Hidup',

      namaIbu: 'Siti Aminah',
      ttlIbu: 'Yogyakarta, 20-08-1978',
      agamaIbu: 'Islam',
      pendidikanIbu: 'S1',
      pekerjaanIbu: 'Ibu Rumah Tangga',
      penghasilanIbu: '0',
      alamatIbu: 'Jl. K.H. Ahmad Dahlan No. 1',
      telpIbu: '081234567892',
      statusIbu: 'Masih Hidup',

      namaWali: '-',
      ttlWali: '-',
      pekerjaanWali: '-',
      penghasilanWali: '-',
      alamatWali: '-',

      kesenian: 'Musik',
      olahRaga: 'Futsal',
      kemasyarakatan: 'IPM',
      kegemaranLain: 'Membaca',

      menerimaBeasiswa: 'Beasiswa Prestasi 2024',
      tglMeninggalkanSekolah: '',
      alasanMeninggalkan: '',
      kelasMeninggalkan: '',
      noSuratMeninggalkan: '',
      tamatBelajar: 'Tamat',
      sttbNomor: 'DN-04/9999999',
      tglIjazah: '2027-06-15',

      melanjutkanDi: 'Universitas Ahmad Dahlan',
      bekerja: '-',
      namaPerusahaan: '-',
      penghasilanKerja: '-',
    },
  ]

  exampleRows.forEach((data) => {
    const row = sheet.addRow(data)
    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: 'middle', horizontal: colNumber === 2 ? 'left' : 'center' }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' },
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      }
    })
    row.height = 22
  })

  // Data Validation L/P (Kolom C = index 3)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(sheet as any).dataValidations.add('C2:C10000', {
    type: 'list',
    allowBlank: true,
    formulae: ['"L,P"'],
    showErrorMessage: true,
    errorStyle: 'stop',
    errorTitle: 'Nilai Tidak Valid',
    error: 'Masukkan L (Laki-laki) atau P (Perempuan).',
  })

  // Program Ref Sheet
  const refSheet = workbook.addWorksheet('_ProgramRef', {
    state: 'veryHidden',
  })
  refSheet.getColumn(1).width = 35
  PROGRAM_OPTIONS.forEach((val, idx) => {
    refSheet.getCell(idx + 1, 1).value = val
  })

  // Data Validation Program (Kolom F = index 6)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(sheet as any).dataValidations.add('F2:F10000', {
    type: 'list',
    allowBlank: true,
    formulae: [`'_ProgramRef'!$A$1:$A$${PROGRAM_OPTIONS.length}`],
    showErrorMessage: true,
    errorStyle: 'warning',
    errorTitle: 'Program Tidak Dikenal',
    error: 'Nilai yang Anda masukkan tidak ada dalam daftar program.',
  })

  // Sheet Panduan (Instructions)
  const guideSheet = workbook.addWorksheet('📋 Panduan Import')
  guideSheet.columns = [{ key: 'col', width: 75 }]

  const guideLines = [
    ['PANDUAN IMPORT DATA SISWA — SIMASMUH', true, 'FF1E40AF'],
    ['', false, null],
    ['AKUN & KREDENSIAL AUTOMATIS:', true, 'FF1E40AF'],
    ['  • Username & Password login akun siswa di-generate otomatis dari NIS.', false, null],
    ['  • Kolom Username & Password telah dihilangkan dari Excel demi kemudahan import.', false, null],
    ['', false, null],
    ['KOLOM WAJIB (SEKSI 1: DATA POKOK SISWA):', true, 'FF1E40AF'],
    ['  1. NIS *          — Nomor Induk Siswa (Harus Unik per Siswa, digunakan untuk Login)', false, null],
    ['  2. Nama Siswa *   — Nama Lengkap Siswa', false, null],
    ['  3. L/P *          — Jenis Kelamin (L = Laki-Laki, P = Perempuan)', false, null],
    ['  4. Kelas *        — Nama Kelas Sesuai Sistem (Contoh: X IPA 1)', false, null],
    ['', false, null],
    ['KOLOM OPSIONAL (SEKSI 1 S.D 5 BUKU INDUK):', true, 'FF475569'],
    ['  • NISN, Program Unggulan, Gelombang, Jalur Pendaftaran', false, null],
    ['  • Seksi 2: Data Diri & Tempat Tinggal (Tempat/Tgl Lahir, Agama, Alamat, No Telp, dll.)', false, null],
    ['  • Seksi 3: Kesehatan & Pendidikan (Gol. Darah, Tinggi/Berat, Sekolah Asal, STTB, dll.)', false, null],
    ['  • Seksi 4: Orang Tua & Wali (Nama Ayah/Ibu/Wali, Pekerjaan, Penghasilan, HP, dll.)', false, null],
    ['  • Seksi 5: Kegemaran & Pasca Sekolah (Hobi, Beasiswa, Ijazah, Rencana Kuliah/Kerja)', false, null],
    ['', false, null],
    ['CATATAN PENTING:', true, 'FF991B1B'],
    ['  • Seluruh kolom Seksi 2 s.d. 5 bersifat OPSIONAL — bisa dikosongkan dan diisi bertahap.', false, null],
    ['  • Hapus baris contoh (baris 2) sebelum mengunggah file ke sistem.', false, null],
  ]

  guideLines.forEach(([text, bold, color]) => {
    const row = guideSheet.addRow([text])
    const cell = row.getCell(1)
    cell.font = {
      bold: bold as boolean,
      color: color ? { argb: color as string } : { argb: 'FF334155' },
      size: bold ? 12 : 10,
    }
    cell.alignment = { vertical: 'middle', wrapText: true }
    row.height = bold ? 22 : 16
  })

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template_import_siswa.xlsx"',
      'Cache-Control': 'no-store',
    },
  })
}
