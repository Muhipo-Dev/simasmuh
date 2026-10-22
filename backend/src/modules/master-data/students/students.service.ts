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

  async findAll(filter?: { classId?: string }) {
    const where: any = {};
    if (filter?.classId && filter.classId !== 'ALL') {
      where.classId = filter.classId;
    }
    return this.prisma.student.findMany({
      where,
      include: {
        class: true,
        user: true,
        grades: {
          include: {
            subject: true,
          },
        },
        parentRelations: {
          include: {
            parent: {
              include: {
                user: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.student.findUnique({
      where: { id },
      include: {
        class: true,
        user: true,
        grades: {
          include: {
            subject: true,
          },
        },
      },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.student.findFirst({
      where: {
        OR: [
          { userId },
          { user: { id: userId } },
          { user: { username: userId } },
          { nis: userId },
          { nisn: userId },
        ],
      },
      include: {
        class: {
          include: {
            homeroomTeacher: {
              include: {
                user: true,
              },
            },
          },
        },
        user: true,
        grades: {
          include: {
            subject: true,
          },
        },
        parentRelations: {
          include: {
            parent: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });
  }

  async create(data: any) {
    // Create User and Student together: NIS is mandatory school ID and default username/password
    const username = data.nis;
    // NISN bersifat murni opsional; jangan copy paste dari NIS
    const nisn = data.nisn && data.nisn.trim() !== '' && data.nisn.trim() !== data.nis?.trim() ? data.nisn.trim() : null;
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
            nisn: nisn,
            nis: data.nis,
            name: data.name,
            gender: data.gender,
            classId: data.classId,
            gelombang: data.gelombang || 'Gelombang 1',
            jalurPendaftaran: data.jalurPendaftaran || 'Mandiri',
            program: data.program || null,
            bioData: data.bioData
              ? typeof data.bioData === 'string'
                ? data.bioData
                : JSON.stringify(data.bioData)
              : null,
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
        const username = data.nis || data.username || String(Math.random());
        // NISN murni opsional dan tidak di-copy dari NIS
        const nisn = data.nisn && data.nisn.trim() !== '' && data.nisn.trim() !== data.nis?.trim() ? data.nisn.trim() : null;
        const plainPassword = data.password || username; // Default password is username (NIS)
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        return { ...data, username, nisn, password: hashedPassword };
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
                where: { nis: data.nis },
                update: {
                  nisn: data.nisn,
                  nis: data.nis,
                  name: data.name,
                  gender: data.gender,
                  classId: data.classId,
                  ...(data.bioData
                    ? {
                        bioData:
                          typeof data.bioData === 'string'
                            ? data.bioData
                            : JSON.stringify(data.bioData),
                      }
                    : {}),
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
                  ...(data.bioData
                    ? {
                        bioData:
                          typeof data.bioData === 'string'
                            ? data.bioData
                            : JSON.stringify(data.bioData),
                      }
                    : {}),
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
                ...(data.bioData
                  ? {
                      bioData:
                        typeof data.bioData === 'string'
                          ? data.bioData
                          : JSON.stringify(data.bioData),
                    }
                  : {}),
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

    // NISN bersifat opsional dan tidak di-copy dari NIS
    let newNisn: string | null | undefined = student.nisn;
    if (data.nisn !== undefined) {
      if (data.nisn && data.nisn.trim() !== '' && data.nisn.trim() !== (data.nis || student.nis)?.trim()) {
        newNisn = data.nisn.trim();
      } else {
        newNisn = null;
      }
    }

    const updated = await (this.prisma.student as any).update({
      where: { id },
      data: {
        nisn: newNisn,
        nis: data.nis,
        name: data.name,
        gender: data.gender,
        ...(data.bioData !== undefined && {
          bioData:
            typeof data.bioData === 'string'
              ? data.bioData
              : JSON.stringify(data.bioData),
        }),
        ...(data.gelombang !== undefined && { gelombang: data.gelombang }),
        ...(data.jalurPendaftaran !== undefined && {
          jalurPendaftaran: data.jalurPendaftaran,
        }),
        ...(data.program !== undefined && { program: data.program }),
        ...(data.beasiswaPercentage !== undefined && {
          beasiswaPercentage: data.beasiswaPercentage,
        }),
        ...(data.beasiswaReason !== undefined && {
          beasiswaReason: data.beasiswaReason,
        }),
        ...(data.beasiswaSeragamPct !== undefined && {
          beasiswaSeragamPct: Number(data.beasiswaSeragamPct),
        }),
        ...(data.beasiswaSppPct !== undefined && {
          beasiswaSppPct: Number(data.beasiswaSppPct),
        }),
        ...(data.beasiswaDppPct !== undefined && {
          beasiswaDppPct: Number(data.beasiswaDppPct),
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive === true || data.isActive === 'true' }),
        ...(data.classId && { class: { connect: { id: data.classId } } }),
        ...(student.userId && {
          user: {
            update: {
              name: data.name,
              username: data.nis,
              ...(data.isActive !== undefined && { isActive: data.isActive === true || data.isActive === 'true' }),
              ...(finalPassword && { password: finalPassword }),
            },
          },
        }),
      },
      include: { user: true, class: true },
    });

    if (
      data.beasiswaPercentage !== undefined ||
      data.beasiswaReason !== undefined
    ) {
      await this.syncStudentBeasiswaToBills(
        id,
        updated.beasiswaPercentage,
        updated.beasiswaReason,
      );
    }

    return updated;
  }

  async updateBeasiswaKeuangan(
    id: string,
    dto: {
      beasiswaSeragamPct?: number;
      beasiswaSppPct?: number;
      beasiswaDppPct?: number;
      beasiswaPercentage?: number;
      beasiswaReason?: string;
    },
  ) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFoundException('Siswa tidak ditemukan');

    const updated = await (this.prisma.student as any).update({
      where: { id },
      data: {
        ...(dto.beasiswaSeragamPct !== undefined && {
          beasiswaSeragamPct: Math.min(
            100,
            Math.max(0, Number(dto.beasiswaSeragamPct)),
          ),
        }),
        ...(dto.beasiswaSppPct !== undefined && {
          beasiswaSppPct: Math.min(
            100,
            Math.max(0, Number(dto.beasiswaSppPct)),
          ),
        }),
        ...(dto.beasiswaDppPct !== undefined && {
          beasiswaDppPct: Math.min(
            100,
            Math.max(0, Number(dto.beasiswaDppPct)),
          ),
        }),
        ...(dto.beasiswaPercentage !== undefined && {
          beasiswaPercentage: Math.min(
            100,
            Math.max(0, Number(dto.beasiswaPercentage)),
          ),
        }),
        ...(dto.beasiswaReason !== undefined && {
          beasiswaReason: dto.beasiswaReason,
        }),
      },
      include: { class: true, user: true },
    });

    await this.syncStudentBeasiswaToBills(
      id,
      updated.beasiswaPercentage,
      updated.beasiswaReason,
    );

    return updated;
  }

  async bulkUpdateBeasiswa(dto: {
    studentIds: string[];
    beasiswaSeragamPct?: number;
    beasiswaSppPct?: number;
    beasiswaDppPct?: number;
    beasiswaPercentage?: number;
    beasiswaReason?: string;
  }) {
    if (!dto.studentIds || !Array.isArray(dto.studentIds) || dto.studentIds.length === 0) {
      throw new BadRequestException('Daftar siswa wajib dipilih');
    }

    const updateData: any = {};
    if (dto.beasiswaSeragamPct !== undefined) {
      updateData.beasiswaSeragamPct = Math.min(100, Math.max(0, Number(dto.beasiswaSeragamPct)));
    }
    if (dto.beasiswaSppPct !== undefined) {
      updateData.beasiswaSppPct = Math.min(100, Math.max(0, Number(dto.beasiswaSppPct)));
    }
    if (dto.beasiswaDppPct !== undefined) {
      updateData.beasiswaDppPct = Math.min(100, Math.max(0, Number(dto.beasiswaDppPct)));
    }
    if (dto.beasiswaPercentage !== undefined) {
      updateData.beasiswaPercentage = Math.min(100, Math.max(0, Number(dto.beasiswaPercentage)));
    }
    if (dto.beasiswaReason !== undefined) {
      updateData.beasiswaReason = dto.beasiswaReason;
    }

    const updated = await (this.prisma.student as any).updateMany({
      where: { id: { in: dto.studentIds } },
      data: updateData,
    });

    // Sinkronkan ke seluruh tagihan siswa yang dipilih
    for (const studentId of dto.studentIds) {
      await this.syncStudentBeasiswaToBills(
        studentId,
        dto.beasiswaPercentage,
        dto.beasiswaReason,
      );
    }

    return {
      success: true,
      count: updated.count,
      message: `Berhasil mengatur beasiswa untuk ${updated.count} siswa terpilih.`,
    };
  }

  /**
   * Reset pengaturan beasiswa siswa menjadi 0% dan mengembalikan tagihan siswa ke nominal awal
   */
  async resetBeasiswa(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      throw new NotFoundException('Data siswa tidak ditemukan.');
    }

    const updated = await (this.prisma.student as any).update({
      where: { id: studentId },
      data: {
        beasiswaSeragamPct: 0,
        beasiswaSppPct: 0,
        beasiswaDppPct: 0,
        beasiswaPercentage: 0,
        beasiswaReason: null,
      },
    });

    await this.syncStudentBeasiswaToBills(studentId, 0, null);

    return {
      success: true,
      message: `Beasiswa siswa ${student.name} berhasil direset ke 0%.`,
      student: updated,
    };
  }

  /**
   * Reset beasiswa massal untuk beberapa siswa terpilih
   */
  async bulkResetBeasiswa(studentIds: string[]) {
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      throw new BadRequestException('Daftar siswa wajib dipilih.');
    }

    const updated = await (this.prisma.student as any).updateMany({
      where: { id: { in: studentIds } },
      data: {
        beasiswaSeragamPct: 0,
        beasiswaSppPct: 0,
        beasiswaDppPct: 0,
        beasiswaPercentage: 0,
        beasiswaReason: null,
      },
    });

    for (const studentId of studentIds) {
      await this.syncStudentBeasiswaToBills(studentId, 0, null);
    }

    return {
      success: true,
      count: updated.count,
      message: `Berhasil mereset beasiswa untuk ${updated.count} siswa terpilih. Seluruh tagihan dikembalikan ke nominal awal.`,
    };
  }

  async remove(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!student) return null;

    const userId = student.userId;

    return this.prisma.$transaction(async (tx) => {
      // 1. Bersihkan relasi langsung tabel Student
      await tx.attendance.deleteMany({ where: { studentId: id } });
      await tx.grade.deleteMany({ where: { studentId: id } });
      await tx.paymentProof.deleteMany({ where: { studentId: id } });
      await tx.payment.deleteMany({ where: { studentId: id } });
      await tx.virtualAccountTransaction.deleteMany({ where: { studentId: id } });
      await tx.tagihan.deleteMany({ where: { studentId: id } });
      await tx.parentStudent.deleteMany({ where: { studentId: id } });
      await tx.characterAssessment.deleteMany({ where: { studentId: id } });

      // 2. Hapus entitas Student
      await tx.student.delete({ where: { id } });

      // 3. Hapus entitas User jika ada
      if (userId) {
        await tx.dailyAttendance.deleteMany({ where: { userId } });
        await tx.presensiKegiatan.deleteMany({ where: { userId } });
        await tx.staffJournal.deleteMany({ where: { userId } });
        await tx.izinKeluar.deleteMany({ where: { userId } });
        await tx.userSession.deleteMany({ where: { userId } });
        await tx.notification.deleteMany({
          where: { OR: [{ userId }, { senderId: userId }] },
        });
        await tx.systemLog.deleteMany({ where: { userId } });

        await tx.user.delete({ where: { id: userId } });
      }

      return { success: true, message: 'Data siswa berhasil dihapus' };
    });
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
        throw new Error(
          `Program '${program}' tidak ditemukan pada konfigurasi program.`,
        );
      }
    }

    const student: any = await this.prisma.student.findUnique({
      where: { id },
    });
    if (!student) throw new NotFoundException('Siswa tidak ditemukan');

    // Auto set beasiswa from program default if no custom beasiswa was set for student
    let autoBeasiswaPct = student.beasiswaPercentage;
    let autoBeasiswaReason = student.beasiswaReason;
    if (
      progConfig &&
      (!student.beasiswaPercentage || student.beasiswaPercentage === 0)
    ) {
      if (progConfig.defaultBeasiswa > 0) {
        autoBeasiswaPct = progConfig.defaultBeasiswa;
        autoBeasiswaReason = `Default Beasiswa Program ${progConfig.name}`;
      }
    }

    const updated = await (this.prisma.student as any).update({
      where: { id },
      data: {
        program: progConfig ? progConfig.code : null,
        beasiswaPercentage: autoBeasiswaPct,
        beasiswaReason: autoBeasiswaReason,
      },
      include: { class: true, user: true },
    });

    await this.syncStudentBeasiswaToBills(
      id,
      updated.beasiswaPercentage,
      updated.beasiswaReason,
    );

    return updated;
  }

  /**
   * Update beasiswa default siswa oleh bagian keuangan/superadmin dan sinkronisasi ke tagihan
   */
  async updateBeasiswa(
    id: string,
    beasiswaPercentage: number,
    beasiswaReason?: string,
  ) {
    const validPct = [0, 25, 50, 75, 100].includes(beasiswaPercentage)
      ? beasiswaPercentage
      : 0;

    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFoundException('Siswa tidak ditemukan');

    const updated = await (this.prisma.student as any).update({
      where: { id },
      data: {
        beasiswaPercentage: validPct,
        beasiswaReason: beasiswaReason || null,
      },
      include: { class: true, user: true },
    });

    await this.syncStudentBeasiswaToBills(
      id,
      updated.beasiswaPercentage,
      updated.beasiswaReason,
    );

    return updated;
  }

  /**
   * Mensingkronkan beasiswa default siswa ke seluruh tagihan siswa di role keuangan.
   */
  async syncStudentBeasiswaToBills(
    studentId: string,
    beasiswaPercentage?: number,
    beasiswaReason?: string | null,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) return;

    const tagihans = await this.prisma.tagihan.findMany({
      where: { studentId },
    });

    const sppPct = student.beasiswaSppPct || 0;
    const dppPct = student.beasiswaDppPct || 0;
    const seragamPct = student.beasiswaSeragamPct || 0;
    const reason = student.beasiswaReason || beasiswaReason || 'Beasiswa';

    for (const t of tagihans) {
      // Jika tagihan sudah lunas dengan pembayaran nyata (amountPaid > 0), jangan ubah
      if (t.amountPaid > 0 && t.status === 'LUNAS') {
        continue;
      }

      // Ambil originalAmount dari notes DISCOUNT_INFO atau BEASISWA_INFO jika ada, atau gunakan t.amount
      let originalAmount = t.amount;
      const beasiswaMatch = t.notes?.match(/BEASISWA_INFO:\s*(\{.*?\})/);
      const discountMatch = t.notes?.match(/DISCOUNT_INFO:\s*(\{.*?\})/);
      if (beasiswaMatch) {
        try {
          const beasiswaInfo = JSON.parse(beasiswaMatch[1]);
          originalAmount = beasiswaInfo.originalAmount || t.amount;
        } catch {}
      } else if (discountMatch) {
        try {
          const discountInfo = JSON.parse(discountMatch[1]);
          originalAmount = discountInfo.originalAmount || t.amount;
        } catch {}
      }

      // Bersihkan string DISCOUNT_INFO dan BEASISWA_INFO dari notes
      const cleanNotes = (t.notes || '')
        .replace(/\s*\|\s*BEASISWA_INFO:\s*\{.*?\}/g, '')
        .replace(/^BEASISWA_INFO:\s*\{.*?\}/g, '')
        .replace(/\s*\|\s*DISCOUNT_INFO:\s*\{.*?\}/g, '')
        .replace(/^DISCOUNT_INFO:\s*\{.*?\}/g, '')
        .trim();

      // Tentukan persentase potongan berdasarkan jenis tagihan
      let pct = 0;
      const typeUpper = (t.type || '').toUpperCase();
      if (typeUpper === 'SPP') {
        pct = sppPct;
      } else if (typeUpper === 'DPP') {
        pct = dppPct;
      } else if (typeUpper === 'SERAGAM') {
        pct = seragamPct;
      }

      if (pct > 0) {
        const beasiswaAmount = Math.round(originalAmount * (pct / 100));
        const finalAmount = originalAmount - beasiswaAmount;
        const beasiswaInfo = {
          originalAmount,
          beasiswaPercentage: pct,
          beasiswaAmount,
          finalAmount,
          reason,
        };
        const updatedNotes = `${cleanNotes ? cleanNotes + ' | ' : ''}BEASISWA_INFO: ${JSON.stringify(beasiswaInfo)}`;

        const isAlreadyDraft = t.status === 'DRAFT';
        await this.prisma.tagihan.update({
          where: { id: t.id },
          data: {
            amount: finalAmount,
            notes: updatedNotes,
            status:
              finalAmount === 0
                ? (isAlreadyDraft ? 'DRAFT' : 'LUNAS')
                : t.amountPaid >= finalAmount
                  ? 'LUNAS'
                  : isAlreadyDraft
                    ? 'DRAFT'
                    : 'BELUM_LUNAS',
            paidDate:
              finalAmount === 0
                ? (isAlreadyDraft ? null : t.paidDate || new Date())
                : t.amountPaid >= finalAmount
                  ? t.paidDate
                  : null,
          },
        });
      } else {
        // Potongan 0%: kembalikan jumlah tagihan asli dan hapus catatan diskon
        const isAlreadyDraft = t.status === 'DRAFT';
        await this.prisma.tagihan.update({
          where: { id: t.id },
          data: {
            amount: originalAmount,
            notes: cleanNotes || null,
            status: isAlreadyDraft
              ? 'DRAFT'
              : t.amountPaid >= originalAmount
                ? 'LUNAS'
                : 'BELUM_LUNAS',
            paidDate: isAlreadyDraft ? null : t.amountPaid >= originalAmount ? t.paidDate : null,
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
      { header: 'Nama Siswa', key: 'name', width: 30 },
      { header: 'L/P', key: 'gender', width: 15 },
      { header: 'Kelas', key: 'className', width: 25 },
      { header: 'Username', key: 'username', width: 20 },
      { header: 'Password', key: 'password', width: 20 },
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
      className: 'X 1',
      username: 'ahmad123',
      password: 'password123',
      program: 'tahfidz',
    });

    // Style sample row
    const sampleRow = worksheet.getRow(2);
    sampleRow.font = { italic: true, color: { argb: 'FF999999' } };

    // Add data validation for Program column (column H)
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

    // Apply data validation to Program column (H column, starting from row 2)
    for (let i = 2; i <= 1000; i++) {
      const cell = worksheet.getCell(`H${i}`);
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
          'Nomor Induk Siswa (digunakan sebagai username & password default jika kosong)',
        example: '12345',
      },
      {
        column: 'Nama Siswa',
        description: 'Nama lengkap siswa sesuai dokumen resmi',
        example: 'Ahmad Dahlan',
      },
      {
        column: 'L/P',
        description: 'Jenis kelamin (L untuk Laki-laki, P untuk Perempuan)',
        example: 'L atau P',
      },
      {
        column: 'Kelas',
        description: 'Nama kelas sesuai dengan kelas yang ada di sistem (Format: Romawi spasi Angka)',
        example: 'X 1',
      },
      {
        column: 'Username',
        description: 'Username untuk login siswa (opsional)',
        example: 'ahmad123',
      },
      {
        column: 'Password',
        description: 'Password untuk login siswa (opsional)',
        example: 'password123',
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

  /**
   * Import pengaturan beasiswa siswa dari data file Excel (berdasarkan NIS dan Nama)
   */
  async importBeasiswa(
    items: Array<{
      nis?: string;
      nisn?: string;
      name?: string;
      beasiswaSeragamPct?: number;
      beasiswaSppPct?: number;
      beasiswaDppPct?: number;
      beasiswaReason?: string;
    }>,
  ) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Data import beasiswa tidak boleh kosong.');
    }

    const allStudents = await this.prisma.student.findMany({
      select: { id: true, nis: true, nisn: true, name: true },
    });

    // Lookup index
    const byNis = new Map<string, string>();
    const byNisn = new Map<string, string>();
    const byName = new Map<string, string>();

    for (const s of allStudents) {
      if (s.nis) byNis.set(s.nis.trim().toLowerCase(), s.id);
      if (s.nisn) byNisn.set(s.nisn.trim().toLowerCase(), s.id);
      if (s.name) byName.set(s.name.trim().toLowerCase(), s.id);
    }

    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      const rowNum = i + 2; // Asumsi baris 1 header di excel

      const cleanNis = (row.nis !== undefined && row.nis !== null ? String(row.nis) : '').trim().toLowerCase();
      const cleanNisn = (row.nisn !== undefined && row.nisn !== null ? String(row.nisn) : '').trim().toLowerCase();
      const cleanName = (row.name !== undefined && row.name !== null ? String(row.name) : '').trim().toLowerCase();

      let targetStudentId: string | undefined;

      if (cleanNis && byNis.has(cleanNis)) {
        targetStudentId = byNis.get(cleanNis);
      } else if (cleanNisn && byNisn.has(cleanNisn)) {
        targetStudentId = byNisn.get(cleanNisn);
      } else if (cleanName && byName.has(cleanName)) {
        targetStudentId = byName.get(cleanName);
      }

      if (!targetStudentId) {
        errors.push(`Baris ${rowNum}: Siswa tidak ditemukan (NIS: ${row.nis || '-'}, Nama: ${row.name || '-'})`);
        continue;
      }

      const seragamPct = Math.min(100, Math.max(0, Number(row.beasiswaSeragamPct || 0)));
      const sppPct = Math.min(100, Math.max(0, Number(row.beasiswaSppPct || 0)));
      const dppPct = Math.min(100, Math.max(0, Number(row.beasiswaDppPct || 0)));
      const reason = row.beasiswaReason ? String(row.beasiswaReason).trim() : 'Beasiswa Excel';

      try {
        await (this.prisma.student as any).update({
          where: { id: targetStudentId },
          data: {
            beasiswaSeragamPct: seragamPct,
            beasiswaSppPct: sppPct,
            beasiswaDppPct: dppPct,
            beasiswaPercentage: sppPct,
            beasiswaReason: reason,
          },
        });

        // Sinkronkan ke seluruh tagihan siswa
        await this.syncStudentBeasiswaToBills(targetStudentId, sppPct, reason);
        successCount++;
      } catch (err: any) {
        errors.push(`Baris ${rowNum} (${row.name || row.nis}): Gagal update - ${err.message}`);
      }
    }

    return {
      success: true,
      count: successCount,
      total: items.length,
      errors,
      message: `Berhasil mengimpor beasiswa untuk ${successCount} siswa.${errors.length > 0 ? ` (${errors.length} dilewati)` : ''}`,
    };
  }

  /**
   * Generate Excel template beasiswa yang sudah sinkron dengan data master siswa SIMASMUH
   */
  async generateBeasiswaTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SIMASMUH';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Set Beasiswa Siswa', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
    });

    worksheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'NIS *', key: 'nis', width: 14 },
      { header: 'Nama Siswa *', key: 'name', width: 34 },
      { header: 'Kelas', key: 'className', width: 14 },
      { header: 'Jalur', key: 'jalur', width: 14 },
      { header: 'Beasiswa Seragam (%)', key: 'seragamPct', width: 22 },
      { header: 'Beasiswa SPP (%)', key: 'sppPct', width: 20 },
      { header: 'Beasiswa DPP (%)', key: 'dppPct', width: 20 },
      { header: 'Alasan / Catatan Beasiswa', key: 'reason', width: 34 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }, // Navy Blue Resmi SIMASMUH
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 26;

    // Ambil data siswa aktif master SIMASMUH
    const activeStudents = await this.prisma.student.findMany({
      where: { isActive: true },
      include: { class: true },
      orderBy: [
        { class: { name: 'asc' } },
        { name: 'asc' },
      ],
    });

    activeStudents.forEach((student, index) => {
      const row = worksheet.addRow({
        no: index + 1,
        nis: student.nis || '',
        name: student.name || '',
        className: student.class?.name || '',
        jalur: student.jalurPendaftaran || 'Reguler',
        seragamPct: student.beasiswaSeragamPct || 0,
        sppPct: student.beasiswaSppPct || student.beasiswaPercentage || 0,
        dppPct: student.beasiswaDppPct || 0,
        reason: student.beasiswaReason || '',
      });

      row.alignment = { vertical: 'middle' };
      row.getCell('no').alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('nis').alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('className').alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('jalur').alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('seragamPct').alignment = { vertical: 'middle', horizontal: 'right' };
      row.getCell('sppPct').alignment = { vertical: 'middle', horizontal: 'right' };
      row.getCell('dppPct').alignment = { vertical: 'middle', horizontal: 'right' };
    });

    // Lembar Petunjuk Pengisian
    const guideSheet = workbook.addWorksheet('Petunjuk');
    guideSheet.columns = [
      { header: 'Parameter', key: 'param', width: 25 },
      { header: 'Keterangan Penting', key: 'desc', width: 65 },
    ];

    const guideHeader = guideSheet.getRow(1);
    guideHeader.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    guideHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD97706' }, // Amber
    };
    guideHeader.height = 24;

    const guides = [
      {
        param: 'Sinkronisasi Data Siswa',
        desc: 'Sheet "Set Beasiswa Siswa" sudah terisi otomatis seluruh data siswa aktif dari master SIMASMUH berdasarkan Nama dan NIS.',
      },
      {
        param: 'Kolom NIS & Nama Siswa',
        desc: 'Jangan mengubah NIS atau Nama Siswa agar sistem dapat mencocokkan siswa dengan akurat.',
      },
      {
        param: 'Beasiswa Seragam (%)',
        desc: 'Diisi angka persentase 0 - 100. Berlaku untuk jalur non-Mandiri. Isi 0 jika tidak ada beasiswa.',
      },
      {
        param: 'Beasiswa SPP (%)',
        desc: 'Diisi angka persentase 0 - 100. Diskon akan otomatis disinkronkan ke tagihan bulanan SPP yang belum lunas.',
      },
      {
        param: 'Beasiswa DPP (%)',
        desc: 'Diisi angka persentase 0 - 100. Diskon akan otomatis disinkronkan ke tagihan DPP siswa.',
      },
      {
        param: 'Alasan / Catatan Beasiswa',
        desc: 'Contoh: Beasiswa Prestasi, Beasiswa Kader Muhammadiyah, Program Tahfidz, Bantuan Lazismu, dll.',
      },
    ];

    guides.forEach((g) => guideSheet.addRow(g));

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async toggleActive(id: string, isActive: boolean) {
    const student = await this.prisma.student.findUnique({
      where: { id },
    });
    if (!student) {
      throw new NotFoundException('Data siswa tidak ditemukan');
    }

    const updated = await this.prisma.student.update({
      where: { id },
      data: { isActive },
      include: { user: true, class: true },
    });

    if (student.userId) {
      await this.prisma.user.update({
        where: { id: student.userId },
        data: { isActive },
      });
    }

    return updated;
  }

  async bulkToggleActive(ids: string[], isActive: boolean) {
    let successCount = 0;
    for (const id of ids) {
      try {
        await this.toggleActive(id, isActive);
        successCount++;
      } catch {}
    }
    return { success: true, count: successCount, total: ids.length, isActive };
  }

  async setStudentStatus(
    id: string,
    status: 'AKTIF' | 'NONAKTIF' | 'LULUS' | 'ALUMNI' | 'KELUAR',
    details?: {
      tglKeluar?: string;
      noIjazah?: string;
      alasan?: string;
      tamatBelajar?: string;
    },
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id },
    });
    if (!student) {
      throw new NotFoundException('Data siswa tidak ditemukan');
    }

    let parsedBio: any = {};
    if (student.bioData) {
      try {
        parsedBio =
          typeof student.bioData === 'string'
            ? JSON.parse(student.bioData)
            : student.bioData;
      } catch {
        parsedBio = {};
      }
    }

    const isActive = status === 'AKTIF';

    if (status === 'AKTIF') {
      parsedBio.alasanMeninggalkan = '';
      parsedBio.tamatBelajar = '';
      parsedBio.tglMeninggalkanSekolah = '';
    } else if (status === 'LULUS' || status === 'ALUMNI') {
      parsedBio.tamatBelajar =
        details?.tamatBelajar || 'Tamat Belajar / Lulus';
      parsedBio.alasanMeninggalkan = 'Lulus';
      if (details?.noIjazah) parsedBio.noIjazahLulus = details.noIjazah;
      if (details?.tglKeluar) {
        parsedBio.tglMeninggalkanSekolah = details.tglKeluar;
      } else if (!parsedBio.tglMeninggalkanSekolah) {
        parsedBio.tglMeninggalkanSekolah = new Date().toISOString().split('T')[0];
      }
    } else if (status === 'KELUAR') {
      parsedBio.alasanMeninggalkan =
        details?.alasan || 'Pindah / Keluar Sekolah';
      if (details?.tglKeluar) {
        parsedBio.tglMeninggalkanSekolah = details.tglKeluar;
      } else if (!parsedBio.tglMeninggalkanSekolah) {
        parsedBio.tglMeninggalkanSekolah = new Date().toISOString().split('T')[0];
      }
    }

    const updated = await this.prisma.student.update({
      where: { id },
      data: {
        isActive,
        bioData: JSON.stringify(parsedBio),
      },
      include: { user: true, class: true },
    });

    // Siswa yang berstatus LULUS, ALUMNI, atau KELUAR tetap diizinkan login (user.isActive = true)
    // agar dapat mengakses histori riwayat pembayaran, absensi, dan data pribadi mereka.
    const userIsActive =
      status === 'AKTIF' ||
      status === 'LULUS' ||
      status === 'ALUMNI' ||
      status === 'KELUAR';

    if (student.userId) {
      await this.prisma.user.update({
        where: { id: student.userId },
        data: { isActive: userIsActive },
      });
    }

    return updated;
  }

  async bulkSetStudentStatus(
    ids: string[],
    status: 'AKTIF' | 'NONAKTIF' | 'LULUS' | 'ALUMNI' | 'KELUAR',
    details?: {
      tglKeluar?: string;
      noIjazah?: string;
      alasan?: string;
      tamatBelajar?: string;
    },
  ) {
    let successCount = 0;
    for (const id of ids) {
      try {
        await this.setStudentStatus(id, status, details);
        successCount++;
      } catch {}
    }
    return {
      success: true,
      count: successCount,
      total: ids.length,
      status,
    };
  }
}

