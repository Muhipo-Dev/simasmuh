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

export interface GenerateAssessmentExcelOptions {
  type: AssessmentExcelType
  className: string
  subjectName: string
  homeroomTeacherName?: string
  teacherName?: string
  academicYear: string
  semester: number | string
  students: Array<{
    id: string
    nis: string
    name: string
    gender?: string
    assessment?: any
  }>
}

interface ClassSheetData {
  className: string
  homeroomTeacherName?: string
  students: Array<{
    id: string
    nis: string
    name: string
    gender?: string
    assessment?: any
  }>
}

export interface GenerateTeacherMultiClassExcelOptions {
  type: AssessmentExcelType
  subjectName: string
  subjectCode?: string
  teacherName: string
  academicYear: string
  semester: number | string
  classes: ClassSheetData[]
}

/**
 * Helper untuk mengisi satu Worksheet nilai (STS, SAS, atau KD)
 */
export function populateAssessmentWorksheet(
  worksheet: ExcelJS.Worksheet,
  {
    type,
    className,
    subjectName,
    homeroomTeacherName = '-',
    teacherName = '-',
    academicYear,
    semester,
    students,
  }: GenerateAssessmentExcelOptions
) {
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
    students.forEach((s: any, idx: number) => {
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
    // FORMAT NILAI KD / FORMATIF
    worksheet.mergeCells('A5:A6')
    worksheet.getCell('A5').value = 'No'

    worksheet.mergeCells('B5:B6')
    worksheet.getCell('B5').value = 'No. Induk'

    worksheet.mergeCells('C5:C6')
    worksheet.getCell('C5').value = 'Nama'

    worksheet.mergeCells('D5:D6')
    worksheet.getCell('D5').value = 'L/P'

    worksheet.mergeCells('E4:X4')
    worksheet.getCell('E4').value = 'FORMATIF'
    worksheet.getCell('E4').font = { bold: true, size: 11, name: 'Calibri' }
    worksheet.getCell('E4').alignment = { vertical: 'middle', horizontal: 'center' }

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

    for (let r = 5; r <= 6; r++) {
      for (let c = 1; c <= 31; c++) {
        const cell = worksheet.getRow(r).getCell(c)
        cell.font = { bold: true, size: 9, name: 'Calibri' }
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
        cell.fill = headerFill
        cell.border = thinBorder
      }
    }

    worksheet.getColumn(1).width = 5   // No
    worksheet.getColumn(2).width = 12  // No. Induk
    worksheet.getColumn(3).width = 32  // Nama
    worksheet.getColumn(4).width = 5   // L/P
    for (let c = 5; c <= 29; c++) {
      worksheet.getColumn(c).width = 6 // TP & LM
    }
    worksheet.getColumn(30).width = 7  // STS
    worksheet.getColumn(31).width = 7  // SAS

    let startRow = 7
    students.forEach((s: any, idx: number) => {
      const row = worksheet.getRow(startRow + idx)
      const a = s.assessment || {}

      row.getCell(1).value = idx + 1
      row.getCell(2).value = s.nis || ''
      row.getCell(3).value = s.name || ''
      row.getCell(4).value = (s.gender || 'L').toUpperCase().startsWith('P') ? 'P' : 'L'

      row.getCell(5).value = a.lm1_tp1 ?? null
      row.getCell(6).value = a.lm1_tp2 ?? null
      row.getCell(7).value = a.lm1_tp3 ?? null
      row.getCell(8).value = a.lm1_tp4 ?? null

      row.getCell(9).value = a.lm2_tp1 ?? null
      row.getCell(10).value = a.lm2_tp2 ?? null
      row.getCell(11).value = a.lm2_tp3 ?? null
      row.getCell(12).value = a.lm2_tp4 ?? null

      row.getCell(13).value = a.lm3_tp1 ?? null
      row.getCell(14).value = a.lm3_tp2 ?? null
      row.getCell(15).value = a.lm3_tp3 ?? null
      row.getCell(16).value = a.lm3_tp4 ?? null

      row.getCell(17).value = a.lm4_tp1 ?? null
      row.getCell(18).value = a.lm4_tp2 ?? null
      row.getCell(19).value = a.lm4_tp3 ?? null
      row.getCell(20).value = a.lm4_tp4 ?? null

      row.getCell(21).value = a.lm5_tp1 ?? null
      row.getCell(22).value = a.lm5_tp2 ?? null
      row.getCell(23).value = a.lm5_tp3 ?? null
      row.getCell(24).value = a.lm5_tp4 ?? null

      row.getCell(25).value = a.sum_lm1 ?? null
      row.getCell(26).value = a.sum_lm2 ?? null
      row.getCell(27).value = a.sum_lm3 ?? null
      row.getCell(28).value = a.sum_lm4 ?? null
      row.getCell(29).value = a.sum_lm5 ?? null

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
}

/**
 * Generate Excel Multi-Sheet: 1 File Excel per Guru & Mapel, berisi beberapa Sheet Kelas
 * Contoh: Guru Istanti pengampu Bahasa Jawa di XI 7 dan X 8 -> 1 Excel berisi Sheet "XI 7" dan Sheet "X 8"
 */
export async function generateTeacherMultiClassAssessmentExcel({
  type,
  subjectName,
  subjectCode,
  teacherName,
  academicYear,
  semester,
  classes,
}: GenerateTeacherMultiClassExcelOptions): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'SIMASMUH SMA MUHIPO'
  workbook.created = new Date()

  // Iterasi setiap kelas yang diampu guru untuk mapel ini
  classes.forEach((cls) => {
    // Bersihkan nama sheet (max 31 karakter Excel dan bebas karakter dilarang)
    const rawSheetName = cls.className || 'Kelas'
    const safeSheetName = rawSheetName.replace(/[\\/?*:[\]]/g, '').slice(0, 31)

    const worksheet = workbook.addWorksheet(safeSheetName, {
      views: [{ showGridLines: true }],
    })

    populateAssessmentWorksheet(worksheet, {
      type,
      className: cls.className,
      subjectName,
      homeroomTeacherName: cls.homeroomTeacherName || '-',
      teacherName,
      academicYear,
      semester,
      students: cls.students,
    })
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * Generate Excel Single-Sheet (Legacy / Satuan Kelas)
 */
export async function generateAssessmentExcel(options: GenerateAssessmentExcelOptions): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'SIMASMUH SMA MUHIPO'
  workbook.created = new Date()

  const type = options.type
  const sheetName = type === 'sts' ? 'NILAI STS' : type === 'sas' ? 'NILAI SAS' : 'NILAI FORMATIF & SUMATIF'
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
  })

  populateAssessmentWorksheet(worksheet, options)

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
  sheetCount: number
  sheetSummaries: Array<{
    sheetName: string
    className?: string
    subjectName?: string
    academicYear?: string
    semester?: string
    studentCount: number
  }>
  parsedRows: Array<{
    sheetName?: string
    className?: string
    subjectName?: string
    academicYear?: string
    semester?: string
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

  if (!workbook.worksheets || workbook.worksheets.length === 0) {
    throw new Error('File Excel tidak memiliki lembar kerja (worksheet)')
  }

  const primarySheet = workbook.worksheets[0]

  // Cek tipe file dari header atau parameter (berdasarkan sheet pertama)
  let detectedType: AssessmentExcelType = expectedType || 'kd'
  const headerText = (primarySheet.getCell('J5').text || primarySheet.getCell('AD5').text || '').toUpperCase()
  if (headerText.includes('STS') && !primarySheet.getCell('E4').text?.toUpperCase().includes('FORMATIF')) {
    detectedType = 'sts'
  } else if (headerText.includes('SAS') && !primarySheet.getCell('E4').text?.toUpperCase().includes('FORMATIF')) {
    detectedType = 'sas'
  } else {
    detectedType = 'kd'
  }

  const parseScore = (val: any): number | null => {
    if (val === null || val === undefined || val === '') return null
    const num = parseFloat(String(val).replace(',', '.'))
    return isNaN(num) ? null : Math.min(100, Math.max(0, num))
  }

  const parsedRows: any[] = []
  const sheetSummaries: Array<{
    sheetName: string
    className?: string
    subjectName?: string
    academicYear?: string
    semester?: string
    studentCount: number
  }> = []

  // Iterasi seluruh worksheet dalam workbook (Mendukung Multi-Sheet Rombel Kelas)
  workbook.worksheets.forEach((worksheet) => {
    const sheetName = worksheet.name

    // Ekstrak metadata dari sel B2 & B3 jika ada
    const row2Text = worksheet.getCell('B2').text || ''
    const row3Text = worksheet.getCell('B3').text || ''

    let extractedClass = ''
    let extractedSemester = ''
    let extractedYear = ''
    let extractedSubject = ''

    // Parsing teks: "Kelas: X 1   |   Semester: 1 (Ganjil)   |   Tahun Ajaran: 2025/2026"
    const classMatch = row2Text.match(/Kelas:\s*([^|]+)/i)
    if (classMatch) extractedClass = classMatch[1].trim()

    const semMatch = row2Text.match(/Semester:\s*(\d+)/i)
    if (semMatch) extractedSemester = semMatch[1].trim()

    const yearMatch = row2Text.match(/Tahun Ajaran:\s*([^|]+)/i)
    if (yearMatch) extractedYear = yearMatch[1].trim()

    // Parsing teks: "Mata Pelajaran: Bahasa Jawa   |   Guru Pengampu: ...   |   Wali Kelas: ..."
    const subjMatch = row3Text.match(/Mata Pelajaran:\s*([^|]+)/i)
    if (subjMatch) extractedSubject = subjMatch[1].trim()

    let sheetStudentCount = 0

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber < 7) return

      const colNis = row.getCell(2).text?.toString().trim()
      const colName = row.getCell(3).text?.toString().trim()
      const colGender = row.getCell(4).text?.toString().trim()

      if (!colNis && !colName) return

      sheetStudentCount++

      if (detectedType === 'sts' || detectedType === 'sas') {
        const sum_lm1 = parseScore(row.getCell(5).value)
        const sum_lm2 = parseScore(row.getCell(6).value)
        const sum_lm3 = parseScore(row.getCell(7).value)
        const sum_lm4 = parseScore(row.getCell(8).value)
        const sum_lm5 = parseScore(row.getCell(9).value)
        const mainScore = parseScore(row.getCell(10).value)

        parsedRows.push({
          sheetName,
          className: extractedClass || sheetName,
          subjectName: extractedSubject,
          academicYear: extractedYear,
          semester: extractedSemester,
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
        // Nilai KD / Formatif
        parsedRows.push({
          sheetName,
          className: extractedClass || sheetName,
          subjectName: extractedSubject,
          academicYear: extractedYear,
          semester: extractedSemester,
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

    if (sheetStudentCount > 0) {
      sheetSummaries.push({
        sheetName,
        className: extractedClass || sheetName,
        subjectName: extractedSubject,
        academicYear: extractedYear,
        semester: extractedSemester,
        studentCount: sheetStudentCount,
      })
    }
  })

  return {
    type: detectedType,
    sheetCount: workbook.worksheets.length,
    sheetSummaries,
    parsedRows,
  }
}
