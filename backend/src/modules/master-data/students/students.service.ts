import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as ExcelJS from 'exceljs';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.student.findMany({
      include: { class: true, user: true },
    });
  }

  async findOne(id: string) {
    return this.prisma.student.findUnique({
      where: { id },
      include: { class: true, user: true },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.student.findFirst({
      where: { userId },
      include: { class: true },
    });
  }

  async create(data: any) {
    // Create User and Student together
    const username = data.username || data.nis;
    const plainPassword = data.password || username; // default to username (NIS)
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    return this.prisma.user.create({
      data: {
        username: username,
        email: data.nis,
        password: hashedPassword,
        name: data.name,
        role: 'SISWA',
        student: {
          create: {
            nisn: data.nisn,
            nis: data.nis,
            name: data.name,
            gender: data.gender,
            classId: data.classId,
            gelombang: data.gelombang || 'Gelombang 1',
            jalurPendaftaran: data.jalurPendaftaran || 'Mandiri',
            program: data.program || null,
          } as any,
        },
      },
      include: {
        student: true,
      },
    });
  }

  async createBulk(dataArray: any[]) {
    // Pre-hash all passwords concurrently
    const hashedDataArray = await Promise.all(
      dataArray.map(async (data) => {
        const username = data.username || data.nis || String(Math.random());
        const plainPassword = data.password || username; // Default password is username
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        return { ...data, username, password: hashedPassword };
      }),
    );

    return this.prisma.$transaction(
      hashedDataArray.map((data) => {
        return this.prisma.user.upsert({
          where: { username: data.username },
          update: {
            // Only update what is safely updatable from Excel
            name: data.name,
            password: data.password,
            student: {
              upsert: {
                update: {
                  nisn: data.nisn,
                  nis: data.nis,
                  name: data.name,
                  gender: data.gender,
                  classId: data.classId,
                  // CATATAN: program TIDAK diupdate pada upsert agar tidak override
                  // label program yang sudah diset manual oleh SUPERADMIN.
                  // Program dari Excel hanya berlaku saat CREATE pertama kali.
                },
                create: {
                  nisn: data.nisn,
                  nis: data.nis,
                  name: data.name,
                  gender: data.gender,
                  classId: data.classId,
                  // program dari Excel disimpan saat CREATE pertama kali saja
                  ...(data.program ? { program: data.program } : {}),
                },
              },
            },
          },
          create: {
            username: data.username,
            password: data.password,
            name: data.name,
            role: 'SISWA',
            student: {
              create: {
                nisn: data.nisn,
                nis: data.nis,
                name: data.name,
                gender: data.gender,
                classId: data.classId,
                ...(data.program ? { program: data.program } : {}),
              },
            },
          },
        });
      }),
      { timeout: 60000 }, // Increase timeout to 60 seconds
    );
  }

  async update(id: string, data: any) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new Error('Student not found');

    let finalPassword = data.password;
    if (finalPassword && !finalPassword.startsWith('$2')) {
      finalPassword = await bcrypt.hash(finalPassword, 10);
    }

    const updated = await (this.prisma.student as any).update({
      where: { id },
      data: {
        nisn: data.nisn,
        nis: data.nis,
        name: data.name,
        gender: data.gender,
        ...(data.gelombang !== undefined && { gelombang: data.gelombang }),
        ...(data.jalurPendaftaran !== undefined && { jalurPendaftaran: data.jalurPendaftaran }),
        ...(data.program !== undefined && { program: data.program }),
        ...(data.discountPercentage !== undefined && {
          discountPercentage: data.discountPercentage,
        }),
        ...(data.discountReason !== undefined && {
          discountReason: data.discountReason,
        }),
        ...(data.beasiswaSeragamPct !== undefined && { beasiswaSeragamPct: Number(data.beasiswaSeragamPct) }),
        ...(data.beasiswaSppPct !== undefined && { beasiswaSppPct: Number(data.beasiswaSppPct) }),
        ...(data.beasiswaDppPct !== undefined && { beasiswaDppPct: Number(data.beasiswaDppPct) }),
        ...(data.classId && { class: { connect: { id: data.classId } } }),
        ...(student.userId && {
          user: {
            update: {
              name: data.name,
              ...(data.username && { username: data.username }),
              ...(finalPassword && { password: finalPassword }),
            },
          },
        }),
      },
      include: { user: true, class: true },
    });

    if (data.discountPercentage !== undefined || data.discountReason !== undefined) {
      await this.syncStudentDiscountsToBills(
        id,
        updated.discountPercentage,
        updated.discountReason,
      );
    }

    return updated;
  }

  async updateBeasiswaKeuangan(id: string, dto: { beasiswaSeragamPct?: number; beasiswaSppPct?: number; beasiswaDppPct?: number; discountPercentage?: number; discountReason?: string }) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFoundException('Siswa tidak ditemukan');

    const updated = await (this.prisma.student as any).update({
      where: { id },
      data: {
        ...(dto.beasiswaSeragamPct !== undefined && { beasiswaSeragamPct: Math.min(100, Math.max(0, Number(dto.beasiswaSeragamPct))) }),
        ...(dto.beasiswaSppPct !== undefined && { beasiswaSppPct: Math.min(100, Math.max(0, Number(dto.beasiswaSppPct))) }),
        ...(dto.beasiswaDppPct !== undefined && { beasiswaDppPct: Math.min(100, Math.max(0, Number(dto.beasiswaDppPct))) }),
        ...(dto.discountPercentage !== undefined && { discountPercentage: Math.min(100, Math.max(0, Number(dto.discountPercentage))) }),
        ...(dto.discountReason !== undefined && { discountReason: dto.discountReason }),
      },
      include: { class: true, user: true },
    });

    await this.syncStudentDiscountsToBills(
      id,
      updated.beasiswaSppPct || updated.discountPercentage || 0,
      updated.discountReason,
    );

    return updated;
  }

  async remove(id: string) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (student) {
      if (student.userId) {
        return this.prisma.user.delete({ where: { id: student.userId } });
      } else {
        return this.prisma.student.delete({ where: { id } });
      }
    }
    return null;
  }

  /**
   * Update label `program` siswa.
   * Hanya bisa dipanggil via endpoint yang dilindungi SuperadminGuard.
   * Enum yang valid: kader, reguler, tahfidz, olahraga, MIC, enterpreneur,
   * seni budaya, soshum saintek, inklusi
   */
  async updateProgram(id: string, program: string | null) {
    let progConfig: any = null;
    if (program !== null) {
      progConfig = await this.prisma.programConfig.findUnique({
        where: { code: program },
      });
      if (!progConfig) {
        // Fallback check code case-insensitive or exact
        progConfig = await this.prisma.programConfig.findFirst({
          where: { code: { equals: program, mode: 'insensitive' } },
        });
      }
      if (!progConfig) {
        throw new Error(`Program '${program}' tidak ditemukan pada konfigurasi program.`);
      }
    }

    const student: any = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFoundException('Siswa tidak ditemukan');

    // Auto set discount from program default if no custom discount was set for student
    let autoDiscountPct = student.discountPercentage;
    let autoDiscountReason = student.discountReason;
    if (progConfig && (!student.discountPercentage || student.discountPercentage === 0)) {
      if (progConfig.defaultDiscount > 0) {
        autoDiscountPct = progConfig.defaultDiscount;
        autoDiscountReason = `Default Diskon Program ${progConfig.name}`;
      }
    }

    const updated = await (this.prisma.student as any).update({
      where: { id },
      data: {
        program: progConfig ? progConfig.code : null,
        discountPercentage: autoDiscountPct,
        discountReason: autoDiscountReason,
      },
      include: { class: true, user: true },
    });

    await this.syncStudentDiscountsToBills(
      id,
      updated.discountPercentage,
      updated.discountReason,
    );

    return updated;
  }


  /**
   * Update discount default siswa oleh bagian keuangan/superadmin dan sinkronisasi ke tagihan
   */
  async updateDiscount(
    id: string,
    discountPercentage: number,
    discountReason?: string,
  ) {
    const validPct = [0, 25, 50, 75, 100].includes(discountPercentage)
      ? discountPercentage
      : 0;

    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFoundException('Siswa tidak ditemukan');

    const updated = await (this.prisma.student as any).update({
      where: { id },
      data: {
        discountPercentage: validPct,
        discountReason: discountReason || null,
      },
      include: { class: true, user: true },
    });

    await this.syncStudentDiscountsToBills(
      id,
      updated.discountPercentage,
      updated.discountReason,
    );

    return updated;
  }

  /**
   * Mensingkronkan diskon default siswa ke seluruh tagihan siswa di role keuangan.
   */
  async syncStudentDiscountsToBills(
    studentId: string,
    discountPercentage: number,
    discountReason?: string | null,
  ) {
    const tagihans = await this.prisma.tagihan.findMany({
      where: { studentId },
    });

    const validPct = [0, 25, 50, 75, 100].includes(discountPercentage)
      ? discountPercentage
      : 0;

    for (const t of tagihans) {
      // Jika tagihan sudah lunas dengan pembayaran nyata (amountPaid > 0), jangan ubah
      if (t.amountPaid > 0 && t.status === 'LUNAS') {
        continue;
      }

      // Ambil originalAmount dari notes DISCOUNT_INFO jika ada, atau gunakan t.amount
      let originalAmount = t.amount;
      const discountMatch = t.notes?.match(/DISCOUNT_INFO:\s*(\{.*?\})/);
      if (discountMatch) {
        try {
          const discountInfo = JSON.parse(discountMatch[1]);
          originalAmount = discountInfo.originalAmount || t.amount;
        } catch {}
      }

      // Bersihkan string DISCOUNT_INFO dari notes
      let cleanNotes = (t.notes || '')
        .replace(/\s*\|\s*DISCOUNT_INFO:\s*\{.*?\}/g, '')
        .replace(/^DISCOUNT_INFO:\s*\{.*?\}/g, '')
        .trim();

      if (validPct > 0) {
        const discountAmount = Math.round(originalAmount * (validPct / 100));
        const finalAmount = originalAmount - discountAmount;
        const discountInfo = {
          originalAmount,
          discountPercentage: validPct,
          discountAmount,
          finalAmount,
          reason: discountReason || 'Diskon Default Siswa',
        };
        const updatedNotes = `${cleanNotes ? cleanNotes + ' | ' : ''}DISCOUNT_INFO: ${JSON.stringify(discountInfo)}`;

        await this.prisma.tagihan.update({
          where: { id: t.id },
          data: {
            amount: finalAmount,
            notes: updatedNotes,
            status:
              finalAmount === 0
                ? 'LUNAS'
                : t.amountPaid >= finalAmount
                  ? 'LUNAS'
                  : 'BELUM_LUNAS',
            paidDate:
              finalAmount === 0
                ? t.paidDate || new Date()
                : t.amountPaid >= finalAmount
                  ? t.paidDate
                  : null,
          },
        });
      } else {
        // Diskon 0%: kembalikan jumlah tagihan asli dan hapus catatan diskon
        await this.prisma.tagihan.update({
          where: { id: t.id },
          data: {
            amount: originalAmount,
            notes: cleanNotes || null,
            status: t.amountPaid >= originalAmount ? 'LUNAS' : 'BELUM_LUNAS',
            paidDate: t.amountPaid >= originalAmount ? t.paidDate : null,
          },
        });
      }
    }
  }

  async promoteBulk(dto: {
    fromClassId?: string;
    studentIds?: string[];
    toClassId: string;
  }) {
    const targetClass = await this.prisma.class.findUnique({
      where: { id: dto.toClassId },
    });
    if (!targetClass)
      throw new NotFoundException('Kelas tujuan tidak ditemukan');

    let whereClause: any = {};
    if (dto.studentIds && dto.studentIds.length > 0) {
      whereClause = { id: { in: dto.studentIds } };
    } else if (dto.fromClassId) {
      whereClause = { classId: dto.fromClassId };
    } else {
      throw new BadRequestException(
        'Harus memilih kelas asal atau daftar siswa',
      );
    }

    const updated = await this.prisma.student.updateMany({
      where: whereClause,
      data: {
        classId: dto.toClassId,
      },
    });

    return {
      message: `Berhasil menaikkan/memindahkan ${updated.count} siswa ke kelas ${targetClass.name}`,
      count: updated.count,
      targetClass: targetClass.name,
    };
  }

  /**
   * Generate Excel template for bulk student import
   * Includes Program column with data validation dropdown
   */
  async generateExcelTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template Import Siswa');

    // Define columns
    worksheet.columns = [
      { header: 'NISN', key: 'nisn', width: 20 },
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Nama Lengkap', key: 'name', width: 30 },
      { header: 'Gender (L/P)', key: 'gender', width: 15 },
      { header: 'Kelas ID', key: 'classId', width: 25 },
      { header: 'Program', key: 'program', width: 30 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // Add sample data row for guidance
    worksheet.addRow({
      nisn: '0012345678',
      nis: '12345',
      name: 'Contoh: Ahmad Dahlan',
      gender: 'L',
      classId: 'Masukkan ID Kelas dari sistem',
      program: 'Pilih dari dropdown',
    });

    // Style sample row
    const sampleRow = worksheet.getRow(2);
    sampleRow.font = { italic: true, color: { argb: 'FF999999' } };

    // Add data validation for Program column (column F)
    const programOptions = [
      'tahfidz',
      'saintek',
      'olahraga',
      'MIC',
      'seni budaya',
      'ai',
      'inklusi',
      'enterpreneur',
    ];

    // Apply data validation to Program column (F column, starting from row 2)
    for (let i = 2; i <= 1000; i++) {
      const cell = worksheet.getCell(`F${i}`);
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${programOptions.join(',')}"`],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Program Tidak Valid',
        error: 'Silakan pilih program dari dropdown yang tersedia.',
      };
    }

    // Add instructions sheet
    const instructionsSheet = workbook.addWorksheet('Petunjuk');
    instructionsSheet.columns = [
      { header: 'Kolom', key: 'column', width: 20 },
      { header: 'Deskripsi', key: 'description', width: 50 },
      { header: 'Contoh', key: 'example', width: 30 },
    ];

    const instructions = [
      {
        column: 'NISN',
        description: 'Nomor Induk Siswa Nasional (10 digit)',
        example: '0012345678',
      },
      {
        column: 'NIS',
        description:
          'Nomor Induk Siswa (digunakan sebagai username & password default)',
        example: '12345',
      },
      {
        column: 'Nama Lengkap',
        description: 'Nama lengkap siswa sesuai dokumen resmi',
        example: 'Ahmad Dahlan',
      },
      {
        column: 'Gender',
        description: 'Jenis kelamin (L untuk Laki-laki, P untuk Perempuan)',
        example: 'L atau P',
      },
      {
        column: 'Kelas ID',
        description:
          'ID kelas dari sistem (dapat dilihat di menu Master Data > Kelas)',
        example: 'uuid-kelas-dari-sistem',
      },
      {
        column: 'Program',
        description: 'Program unggulan siswa (pilih dari dropdown)',
        example: 'reguler, tahfidz, olahraga, dll',
      },
    ];

    instructions.forEach((instruction) => {
      instructionsSheet.addRow(instruction);
    });

    // Style instructions header
    const instructionsHeader = instructionsSheet.getRow(1);
    instructionsHeader.font = {
      bold: true,
      size: 12,
      color: { argb: 'FFFFFFFF' },
    };
    instructionsHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFED7D31' },
    };
    instructionsHeader.alignment = { vertical: 'middle', horizontal: 'center' };

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
