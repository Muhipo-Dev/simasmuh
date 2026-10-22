import ExcelJS from 'exceljs'

export interface AssessmentExcelRow {
  no: number
  nis: string
  name: string
  gender: string
  // Formatif TP
  lm1_tp1?: number | null
  lm1_tp2?: number | null
  lm1_tp3?: number | null
  lm1_tp4?: number | null
  lm2_tp1?: number | null
  lm2_tp2?: number | null
  lm2_tp3?: number | null
  lm2_tp4?: number | null
  lm3_tp1?: number | null
  lm3_tp2?: number | null
  lm3_tp3?: number | null
  lm3_tp4?: number | null
  lm4_tp1?: number | null
  lm4_tp2?: number | null
  lm4_tp3?: number | null
  lm4_tp4?: number | null
  lm5_tp1?: number | null
  lm5_tp2?: number | null
  lm5_tp3?: number | null
  lm5_tp4?: number | null
  // Sumatif LM
  sum_lm1?: number | null
  sum_lm2?: number | null
  sum_lm3?: number | null
  sum_lm4?: number | null
  sum_lm5?: number | null
  // STS / SAS
  sts?: number | null
  sas?: number | null
}

export type AssessmentExcelType = 'sts' | 'sas' | 'kd'

interface GenerateAssessmentExcelOptions {
  type: AssessmentExcelType
  className: string
  subjectName?: string
  homeroomTeacherName?: string
  teacherName?: string
  academicYear?: string
  semester?: number | string
  students: Array<{
    id: string
    nis: string
    name: string
    gender?: string
    assessment?: any
  }>
}

/**
 * Generate Excel File untuk Penilaian (STS, SAS, dan Formatif/KD)
 * Mengikuti format resmi gambar:
 * Header:
 * - Wali Kelas / Guru Pengampu
 * - Tabel: No | No. Induk | Nama | L/P | SUMATIF LINGKUP MATERI (LM1-LM5) | NILAI STS / SAS
 * - Untuk KD: No | No. Induk | Nama | L/P | FORMATIF (LM1-5 TP1-4) | SUMATIF LINGKUP MATERI | STS | SAS
 */
export async function generateAssessmentExcel({
  type,
  className,
  subjectName = 'Mata Pelajaran',
  homeroomTeacherName = '-',
  teacherName = '-',
  academicYear = '2025/2026',
  semester = 1,
  students,
}: GenerateAssessmentExcelOptions): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'SIMASMUH SMA MUHIPO'
  workbook.created = new Date()

  const sheetName = type === 'sts' ? 'NILAI STS' : type === 'sas' ? 'NILAI SAS' : 'NILAI FORMATIF & SUMATIF'
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
  })

  // Border & Fill Styles
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  }

  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF2F2F2' },
  }

  // Row 1: Informasi Sekolah & Kelas
  worksheet.getCell('B1').value = 'DAFTAR NILAI ASESMEN PEMBELAJARAN - SMA MUHAMMADIYAH 1 PONOROGO'
  worksheet.getCell('B1').font = { bold: true, size: 13, name: 'Calibri' }

  // Row 2: Metadata Info
  worksheet.getCell('B2').value = `Kelas: ${className}   |   Semester: ${semester} (${Number(semester) === 1 ? 'Ganjil' : 'Genap'})   |   Tahun Ajaran: ${academicYear}`
  worksheet.getCell('B2').font = { bold: true, size: 10, name: 'Calibri' }

  // Row 3: Guru Mapel & Wali Kelas
  worksheet.getCell('B3').value = `Mata Pelajaran: ${subjectName}   |   Guru Pengampu: ${teacherName}   |   Wali Kelas: ${homeroomTeacherName}`
  worksheet.getCell('B3').font = { italic: true, size: 10, name: 'Calibri' }

  if (type === 'sts' || type === 'sas') {
    // ==================== FORMAT STS & SAS ====================
    // Baris 5 & 6 adalah Header Bertingkat
    // A5:A6 -> No
    // B5:B6 -> No. Induk
    // C5:C6 -> Nama
    // D5:D6 -> L/P
    // E5:I5 -> SUMATIF LINGKUP MATERI
    // E6: LM1, F6: LM2, G6: LM3, H6: LM4, I6: LM5
    // J5:J6 -> NILAI STS (atau NILAI SAS)

    worksheet.mergeCells('A5:A6')
    worksheet.getCell('A5').value = 'No'

    worksheet.mergeCells('B5:B6')
    worksheet.getCell('B5').value = 'No. Induk'

    worksheet.mergeCells('C5:C6')
    worksheet.getCell('C5').value = 'Nama'

    worksheet.mergeCells('D5:D6')
    worksheet.getCell('D5').value = 'L/P'

    worksheet.mergeCells('E5:I5')
    worksheet.getCell('E5').value = 'SUMATIF LINGKUP MATERI'

    worksheet.getCell('E6').value = 'LM1'
    worksheet.getCell('F6').value = 'LM2'
    worksheet.getCell('G6').value = 'LM3'
    worksheet.getCell('H6').value = 'LM4'
    worksheet.getCell('I6').value = 'LM5'

    worksheet.mergeCells('J5:J6')
    worksheet.getCell('J5').value = type === 'sts' ? 'NILAI STS' : 'NILAI SAS'

    // Format & Border Header Row 5 & 6
    for (let r = 5; r <= 6; r++) {
      for (let c = 1; c <= 10; c++) {
        const cell = worksheet.getRow(r).getCell(c)
        cell.font = { bold: true, size: 10, name: 'Calibri' }
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
        cell.fill = headerFill
        cell.border = thinBorder
      }
    }

    // Lebar Kolom
    worksheet.getColumn(1).width = 6   // No
    worksheet.getColumn(2).width = 14  // No. Induk
    worksheet.getColumn(3).width = 38  // Nama
    worksheet.getColumn(4).width = 6   // L/P
    worksheet.getColumn(5).width = 8   // LM1
    worksheet.getColumn(6).width = 8   // LM2
    worksheet.getColumn(7).width = 8   // LM3
    worksheet.getColumn(8).width = 8   // LM4
    worksheet.getColumn(9).width = 8   // LM5
    worksheet.getColumn(10).width = 12 // NILAI STS/SAS

    // Isi Baris Data
    let startRow = 7
    students.forEach((s, idx) => {
      const row = worksheet.getRow(startRow + idx)
      const a = s.assessment || {}

      row.getCell(1).value = idx + 1
      row.getCell(2).value = s.nis || ''
      row.getCell(3).value = s.name || ''
      row.getCell(4).value = (s.gender || 'L').toUpperCase().startsWith('P') ? 'P' : 'L'
      row.getCell(5).value = a.sum_lm1 ?? null
      row.getCell(6).value = a.sum_lm2 ?? null
      row.getCell(7).value = a.sum_lm3 ?? null
      row.getCell(8).value = a.sum_lm4 ?? null
      row.getCell(9).value = a.sum_lm5 ?? null
      row.getCell(10).value = type === 'sts' ? (a.sts ?? null) : (a.sas ?? null)

      for (let c = 1; c <= 10; c++) {
        const cell = row.getCell(c)
        cell.font = { size: 10, name: 'Calibri' }
        cell.border = thinBorder
        if (c === 3) {
          cell.alignment = { vertical: 'middle', horizontal: 'left' }
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
        }
      }
    })
  } else {
    // ==================== FORMAT NILAI KD / FORMATIF ====================
    // Header Row 5 & 6
    // A5:A6 -> No
    // B5:B6 -> No. Induk
    // C5:C6 -> Nama
    // D5:D6 -> L/P
    // FORMATIF:
    // E5:H5 -> LM 1 (TP1..TP4)
    // I5:L5 -> LM 2 (TP1..TP4)
    // M5:P5 -> LM 3 (TP1..TP4)
    // Q5:T5 -> LM 4 (TP1..TP4)
    // U5:X5 -> LM 5 (TP1..TP4)
    // SUMATIF LINGKUP MATERI:
    // Y5:AC5 -> SUMATIF LINGKUP MATERI (Y6: LM1, Z6: LM2, AA6: LM3, AB6: LM4, AC6: LM5)
    // AD5:AD6 -> STS
    // AE5:AE6 -> SAS

    worksheet.mergeCells('A5:A6')
    worksheet.getCell('A5').value = 'No'

    worksheet.mergeCells('B5:B6')
    worksheet.getCell('B5').value = 'No. Induk'

    worksheet.mergeCells('C5:C6')
    worksheet.getCell('C5').value = 'Nama'

    worksheet.mergeCells('D5:D6')
    worksheet.getCell('D5').value = 'L/P'

    // Formatif Top Header (E4:X4 Formatif)
    worksheet.mergeCells('E4:X4')
    worksheet.getCell('E4').value = 'FORMATIF'
    worksheet.getCell('E4').font = { bold: true, size: 11, name: 'Calibri' }
    worksheet.getCell('E4').alignment = { vertical: 'middle', horizontal: 'center' }

    // Sub-header LM1..LM5
    worksheet.mergeCells('E5:H5')
    worksheet.getCell('E5').value = 'LM 1'
    worksheet.getCell('E6').value = 'TP1'
    worksheet.getCell('F6').value = 'TP2'
    worksheet.getCell('G6').value = 'TP3'
    worksheet.getCell('H6').value = 'TP4'

    worksheet.mergeCells('I5:L5')
    worksheet.getCell('I5').value = 'LM 2'
    worksheet.getCell('I6').value = 'TP1'
    worksheet.getCell('J6').value = 'TP2'
    worksheet.getCell('K6').value = 'TP3'
    worksheet.getCell('L6').value = 'TP4'

    worksheet.mergeCells('M5:P5')
    worksheet.getCell('M5').value = 'LM 3'
    worksheet.getCell('M6').value = 'TP1'
    worksheet.getCell('N6').value = 'TP2'
    worksheet.getCell('O6').value = 'TP3'
    worksheet.getCell('P6').value = 'TP4'

    worksheet.mergeCells('Q5:T5')
    worksheet.getCell('Q5').value = 'LM 4'
    worksheet.getCell('Q6').value = 'TP1'
    worksheet.getCell('R6').value = 'TP2'
    worksheet.getCell('S6').value = 'TP3'
    worksheet.getCell('T6').value = 'TP4'

    worksheet.mergeCells('U5:X5')
    worksheet.getCell('U5').value = 'LM 5'
    worksheet.getCell('U6').value = 'TP1'
    worksheet.getCell('V6').value = 'TP2'
    worksheet.getCell('W6').value = 'TP3'
    worksheet.getCell('X6').value = 'TP4'

    // Sumatif Lingkup Materi Header
    worksheet.mergeCells('Y5:AC5')
    worksheet.getCell('Y5').value = 'SUMATIF LINGKUP MATERI'
    worksheet.getCell('Y6').value = 'LM1'
    worksheet.getCell('Z6').value = 'LM2'
    worksheet.getCell('AA6').value = 'LM3'
    worksheet.getCell('AB6').value = 'LM4'
    worksheet.getCell('AC6').value = 'LM5'

    worksheet.mergeCells('AD5:AD6')
    worksheet.getCell('AD5').value = 'STS'

    worksheet.mergeCells('AE5:AE6')
    worksheet.getCell('AE5').value = 'SAS'

    // Border & Align Header
    for (let r = 4; r <= 6; r++) {
      for (let c = 1; c <= 31; c++) {
        const cell = worksheet.getRow(r).getCell(c)
        cell.font = { bold: true, size: 9, name: 'Calibri' }
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
        cell.fill = headerFill
        cell.border = thinBorder
      }
    }

    // Lebar Kolom
    worksheet.getColumn(1).width = 5   // No
    worksheet.getColumn(2).width = 12  // No. Induk
    worksheet.getColumn(3).width = 32  // Nama
    worksheet.getColumn(4).width = 5   // L/P
    for (let c = 5; c <= 29; c++) {
      worksheet.getColumn(c).width = 6 // TP & LM
    }
    worksheet.getColumn(30).width = 7  // STS
    worksheet.getColumn(31).width = 7  // SAS

    // Isi Baris Data
    let startRow = 7
    students.forEach((s, idx) => {
      const row = worksheet.getRow(startRow + idx)
      const a = s.assessment || {}

      row.getCell(1).value = idx + 1
      row.getCell(2).value = s.nis || ''
      row.getCell(3).value = s.name || ''
      row.getCell(4).value = (s.gender || 'L').toUpperCase().startsWith('P') ? 'P' : 'L'

      // LM1 TP1..4
      row.getCell(5).value = a.lm1_tp1 ?? null
      row.getCell(6).value = a.lm1_tp2 ?? null
      row.getCell(7).value = a.lm1_tp3 ?? null
      row.getCell(8).value = a.lm1_tp4 ?? null

      // LM2 TP1..4
      row.getCell(9).value = a.lm2_tp1 ?? null
      row.getCell(10).value = a.lm2_tp2 ?? null
      row.getCell(11).value = a.lm2_tp3 ?? null
      row.getCell(12).value = a.lm2_tp4 ?? null

      // LM3 TP1..4
      row.getCell(13).value = a.lm3_tp1 ?? null
      row.getCell(14).value = a.lm3_tp2 ?? null
      row.getCell(15).value = a.lm3_tp3 ?? null
      row.getCell(16).value = a.lm3_tp4 ?? null

      // LM4 TP1..4
      row.getCell(17).value = a.lm4_tp1 ?? null
      row.getCell(18).value = a.lm4_tp2 ?? null
      row.getCell(19).value = a.lm4_tp3 ?? null
      row.getCell(20).value = a.lm4_tp4 ?? null

      // LM5 TP1..4
      row.getCell(21).value = a.lm5_tp1 ?? null
      row.getCell(22).value = a.lm5_tp2 ?? null
      row.getCell(23).value = a.lm5_tp3 ?? null
      row.getCell(24).value = a.lm5_tp4 ?? null

      // Sumatif LM1..LM5
      row.getCell(25).value = a.sum_lm1 ?? null
      row.getCell(26).value = a.sum_lm2 ?? null
      row.getCell(27).value = a.sum_lm3 ?? null
      row.getCell(28).value = a.sum_lm4 ?? null
      row.getCell(29).value = a.sum_lm5 ?? null

      // STS & SAS
      row.getCell(30).value = a.sts ?? null
      row.getCell(31).value = a.sas ?? null

      for (let c = 1; c <= 31; c++) {
        const cell = row.getCell(c)
        cell.font = { size: 9, name: 'Calibri' }
        cell.border = thinBorder
        if (c === 3) {
          cell.alignment = { vertical: 'middle', horizontal: 'left' }
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
        }
      }
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * Parser Excel Import Nilai
 * Otomatis mendeteksi baris data siswa (mulai baris 7) dan mencocokkan No. Induk (NIS)
 */
export async function parseAssessmentExcel(
  file: File,
  expectedType?: AssessmentExcelType
): Promise<{
  type: AssessmentExcelType
  parsedRows: Array<{
    nis: string
    name: string
    gender?: string
    lm1_tp1?: number | null
    lm1_tp2?: number | null
    lm1_tp3?: number | null
    lm1_tp4?: number | null
    lm2_tp1?: number | null
    lm2_tp2?: number | null
    lm2_tp3?: number | null
    lm2_tp4?: number | null
    lm3_tp1?: number | null
    lm3_tp2?: number | null
    lm3_tp3?: number | null
    lm3_tp4?: number | null
    lm4_tp1?: number | null
    lm4_tp2?: number | null
    lm4_tp3?: number | null
    lm4_tp4?: number | null
    lm5_tp1?: number | null
    lm5_tp2?: number | null
    lm5_tp3?: number | null
    lm5_tp4?: number | null
    sum_lm1?: number | null
    sum_lm2?: number | null
    sum_lm3?: number | null
    sum_lm4?: number | null
    sum_lm5?: number | null
    sts?: number | null
    sas?: number | null
  }>
}> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(arrayBuffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    throw new Error('File Excel tidak memiliki lembar kerja (worksheet)')
  }

  // Cek tipe file dari header atau parameter
  let detectedType: AssessmentExcelType = expectedType || 'kd'
  const headerText = (worksheet.getCell('J5').text || worksheet.getCell('AD5').text || '').toUpperCase()
  if (headerText.includes('STS') && !worksheet.getCell('E4').text?.toUpperCase().includes('FORMATIF')) {
    detectedType = 'sts'
  } else if (headerText.includes('SAS') && !worksheet.getCell('E4').text?.toUpperCase().includes('FORMATIF')) {
    detectedType = 'sas'
  } else {
    detectedType = 'kd'
  }

  const parsedRows: any[] = []

  const parseScore = (val: any): number | null => {
    if (val === null || val === undefined || val === '') return null
    const num = parseFloat(String(val).replace(',', '.'))
    return isNaN(num) ? null : Math.min(100, Math.max(0, num))
  }

  // Mulai iterasi baris (data dimulai setelah baris ke-6)
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber < 7) return

    const colNis = row.getCell(2).text?.toString().trim()
    const colName = row.getCell(3).text?.toString().trim()
    const colGender = row.getCell(4).text?.toString().trim()

    if (!colNis && !colName) return

    if (detectedType === 'sts' || detectedType === 'sas') {
      const sum_lm1 = parseScore(row.getCell(5).value)
      const sum_lm2 = parseScore(row.getCell(6).value)
      const sum_lm3 = parseScore(row.getCell(7).value)
      const sum_lm4 = parseScore(row.getCell(8).value)
      const sum_lm5 = parseScore(row.getCell(9).value)
      const mainScore = parseScore(row.getCell(10).value)

      parsedRows.push({
        nis: colNis,
        name: colName,
        gender: colGender,
        sum_lm1,
        sum_lm2,
        sum_lm3,
        sum_lm4,
        sum_lm5,
        sts: detectedType === 'sts' ? mainScore : null,
        sas: detectedType === 'sas' ? mainScore : null,
      })
    } else {
      // Nilai KD / Formatif
      parsedRows.push({
        nis: colNis,
        name: colName,
        gender: colGender,
        // LM1
        lm1_tp1: parseScore(row.getCell(5).value),
        lm1_tp2: parseScore(row.getCell(6).value),
        lm1_tp3: parseScore(row.getCell(7).value),
        lm1_tp4: parseScore(row.getCell(8).value),
        // LM2
        lm2_tp1: parseScore(row.getCell(9).value),
        lm2_tp2: parseScore(row.getCell(10).value),
        lm2_tp3: parseScore(row.getCell(11).value),
        lm2_tp4: parseScore(row.getCell(12).value),
        // LM3
        lm3_tp1: parseScore(row.getCell(13).value),
        lm3_tp2: parseScore(row.getCell(14).value),
        lm3_tp3: parseScore(row.getCell(15).value),
        lm3_tp4: parseScore(row.getCell(16).value),
        // LM4
        lm4_tp1: parseScore(row.getCell(17).value),
        lm4_tp2: parseScore(row.getCell(18).value),
        lm4_tp3: parseScore(row.getCell(19).value),
        lm4_tp4: parseScore(row.getCell(20).value),
        // LM5
        lm5_tp1: parseScore(row.getCell(21).value),
        lm5_tp2: parseScore(row.getCell(22).value),
        lm5_tp3: parseScore(row.getCell(23).value),
        lm5_tp4: parseScore(row.getCell(24).value),
        // Sumatif LM
        sum_lm1: parseScore(row.getCell(25).value),
        sum_lm2: parseScore(row.getCell(26).value),
        sum_lm3: parseScore(row.getCell(27).value),
        sum_lm4: parseScore(row.getCell(28).value),
        sum_lm5: parseScore(row.getCell(29).value),
        // STS & SAS
        sts: parseScore(row.getCell(30).value),
        sas: parseScore(row.getCell(31).value),
      })
    }
  })

  return {
    type: detectedType,
    parsedRows,
  }
}
