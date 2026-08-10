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

// Warna per program untuk header kolom (opsional estetika)
const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E40AF' }, // biru tua
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
  // Sheet 1: Template utama untuk import
  // ───────────────────────────────────────────────────────────────────
  const sheet = workbook.addWorksheet('Data Siswa', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
  })

  // Definisi kolom
  sheet.columns = [
    { header: 'NISN',       key: 'nisn',     width: 16 },
    { header: 'NIS',        key: 'nis',      width: 14 },
    { header: 'Nama Siswa', key: 'name',     width: 32 },
    { header: 'L/P',        key: 'gender',   width: 8  },
    { header: 'Kelas',      key: 'kelas',    width: 16 },
    { header: 'Username',   key: 'username', width: 18 },
    { header: 'Password',   key: 'password', width: 18 },
    { header: 'Program',    key: 'program',  width: 34 },
  ]

  // Styling baris header (baris 1)
  const headerRow = sheet.getRow(1)
  headerRow.eachCell((cell, colNumber) => {
    cell.font = HEADER_FONT
    cell.fill = colNumber === 8 ? PROGRAM_HEADER_FILL : HEADER_FILL
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = {
      top:    { style: 'medium', color: { argb: 'FF334155' } },
      left:   { style: 'thin',   color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FF334155' } },
      right:  { style: 'thin',   color: { argb: 'FF334155' } },
    }
  })
  headerRow.height = 28

  // Freeze header row
  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }]

  // ── Contoh data (baris 2 & 3) ────────────────────────────────────
  const exampleRows = [
    {
      nisn:     '0012345678',
      nis:      '2401001',
      name:     'Ahmad Dahlan Putra',
      gender:   'L',
      kelas:    'X IPA 1',
      username: 'ahmad.dahlan',
      password: 'password123',
      program:  'tahfidz',
    },
    {
      nisn:     '0087654321',
      nis:      '2401002',
      name:     'Siti Aisyah Rahmawati',
      gender:   'P',
      kelas:    'X IPS 2',
      username: 'siti.aisyah',
      password: 'password123',
      program:  'reguler',
    },
  ]

  exampleRows.forEach((data) => {
    const row = sheet.addRow(data)
    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: 'middle', horizontal: colNumber === 3 ? 'left' : 'center' }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' },
      }
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left:   { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right:  { style: 'thin', color: { argb: 'FFE2E8F0' } },
      }
    })
    row.height = 22
  })

  // ── Data Validation — Kolom L/P (kolom D = index 4) ─────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(sheet as any).dataValidations.add('D2:D10000', {
    type: 'list',
    allowBlank: true,
    formulae: ['"L,P"'],
    showErrorMessage: true,
    errorStyle: 'stop',
    errorTitle: 'Nilai Tidak Valid',
    error: 'Masukkan L (Laki-laki) atau P (Perempuan).',
    showInputMessage: true,
    promptTitle: 'Jenis Kelamin',
    prompt: 'Pilih L untuk Laki-laki atau P untuk Perempuan.',
  })

  // ── Data Validation — Kolom Program (kolom H = index 8) ─────────
  // ExcelJS formulae untuk list harus berupa string dengan nilai dipisahkan koma
  // Panjang total string formulae untuk list inline dibatasi ~255 karakter di Excel
  // Karena ada nilai panjang ("Muhipo Internasional Class MIC"), kita pakai sheet tersembunyi
  // sebagai sumber referensi untuk menghindari batas karakter.

  // Sheet 2: Hidden sheet sebagai sumber dropdown program
  const refSheet = workbook.addWorksheet('_ProgramRef', {
    state: 'veryHidden', // disembunyikan dari user
  })
  refSheet.getColumn(1).width = 35
  PROGRAM_OPTIONS.forEach((val, idx) => {
    refSheet.getCell(idx + 1, 1).value = val
  })

  // Referensi ke sheet _ProgramRef: '_ProgramRef'!$A$1:$A$9
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(sheet as any).dataValidations.add('H2:H10000', {
    type: 'list',
    allowBlank: true,
    formulae: [`'_ProgramRef'!$A$1:$A$${PROGRAM_OPTIONS.length}`],
    showErrorMessage: true,
    errorStyle: 'warning', // warning (bukan stop) agar tidak memblokir jika ada typo
    errorTitle: 'Program Tidak Dikenal',
    error:
      'Nilai yang Anda masukkan tidak ada dalam daftar program.\nOpsi: ' +
      PROGRAM_OPTIONS.join(', '),
    showInputMessage: true,
    promptTitle: '📌 Program Unggulan',
    prompt:
      'Klik dropdown untuk memilih program.\nOpsi tersedia:\n' +
      PROGRAM_OPTIONS.map((p) => `• ${p}`).join('\n'),
  })

  // ── Highlight kolom Program (opsional): background ungu muda ──────
  for (let row = 2; row <= 10000; row++) {
    const cell = sheet.getCell(row, 8)
    // Hanya set jika belum ada value (untuk menghindari override contoh)
    if (row > 3) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF5F3FF' }, // ungu sangat muda
      }
    }
  }

  // ── Catatan / Petunjuk di baris setelah data ─────────────────────
  const noteRow = sheet.getRow(4)
  noteRow.getCell(1).value =
    '⚠ Isi data siswa mulai baris ini. Baris 2-3 adalah contoh, hapus sebelum upload.'
  noteRow.getCell(1).font = { italic: true, color: { argb: 'FF94A3B8' }, size: 9 }
  sheet.mergeCells('A4:H4')
  noteRow.height = 18

  // ───────────────────────────────────────────────────────────────────
  // Sheet 3: Panduan (visible, informasi untuk pengguna)
  // ───────────────────────────────────────────────────────────────────
  const guideSheet = workbook.addWorksheet('📋 Panduan')
  guideSheet.columns = [{ key: 'col', width: 60 }]

  const guideLines = [
    ['PANDUAN IMPORT DATA SISWA — SIMASMUH', true, 'FF1E40AF'],
    ['', false, null],
    ['KOLOM WAJIB:', true, 'FF334155'],
    ['  NISN       — Nomor Induk Siswa Nasional (10 digit)', false, null],
    ['  NIS        — Nomor Induk Siswa (unik per sekolah)', false, null],
    ['  Nama Siswa — Nama lengkap siswa', false, null],
    ['  L/P        — Jenis kelamin: L (Laki-laki) / P (Perempuan)', false, null],
    ['  Kelas      — Nama kelas sesuai sistem (contoh: X IPA 1)', false, null],
    ['', false, null],
    ['KOLOM OPSIONAL:', true, 'FF334155'],
    ['  Username   — Username login (kosongkan = otomatis dari NIS)', false, null],
    ['  Password   — Password login (kosongkan = otomatis dari NIS)', false, null],
    ['  Program    — Label program unggulan siswa (lihat daftar di bawah)', false, null],
    ['', false, null],
    ['DAFTAR OPSI PROGRAM UNGGULAN:', true, 'FF6D28D9'],
    ...PROGRAM_OPTIONS.map((p, i) => [`  ${i + 1}. ${p}`, false, null] as [string, boolean, string | null]),
    ['', false, null],
    ['CATATAN PENTING:', true, 'FF991B1B'],
    ['  • Hapus baris contoh (baris 2 dan 3) sebelum upload.', false, null],
    ['  • Nama kelas harus persis sama dengan yang ada di sistem.', false, null],
    ['  • Field Program bersifat opsional — bisa dikosongkan.', false, null],
    ['  • Hanya SUPERADMIN yang dapat mengubah label Program setelah import.', false, null],
    ['  • Batas upload: 20 siswa per batch (otomatis dibagi sistem).', false, null],
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

  // ───────────────────────────────────────────────────────────────────
  // Generate buffer dan kirim sebagai response
  // ───────────────────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="template_import_siswa.xlsx"',
      'Cache-Control': 'no-store',
    },
  })
}
