import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../core/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  // ============================================================
  // PAYROLL SUMMARY (existing feature)
  // ============================================================
  async getPayrollSummary(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    const staffList = await this.prisma.user.findMany({
      where: { role: { not: 'SISWA' } },
      select: {
        id: true,
        name: true,
        role: true,
        subRole: true,
        subRole2: true,
        subRole3: true,
      },
      orderBy: { name: 'asc' },
    });

    const attendances = await this.prisma.dailyAttendance.findMany({
      where: { date: { gte: startDate, lte: endDate }, status: 'HADIR' },
    });

    const izinKeluars = await this.prisma.izinKeluar.findMany({
      where: { date: { gte: startDate, lte: endDate }, status: 'DISETUJUI' },
    });

    return staffList.map((staff) => {
      const staffAttendances = attendances.filter((a) => a.userId === staff.id);
      const uniqueIzinDates = new Set(
        izinKeluars
          .filter((i) => i.userId === staff.id)
          .map((i) => i.date.toISOString().split('T')[0]),
      );
      const roles = [staff.role, staff.subRole, staff.subRole2, staff.subRole3]
        .filter(Boolean)
        .join(', ');
      return {
        id: staff.id,
        name: staff.name,
        roles,
        totalHadir: staffAttendances.length,
        totalIzin: uniqueIzinDates.size,
        estimasiPenghasilan: 0,
      };
    });
  }

  // ============================================================
  // TAGIHAN SISWA
  // ============================================================

  /** Daftar semua siswa beserta ringkasan tagihan mereka */
  async getStudentsWithTagihan(classId?: string) {
    const students = await this.prisma.student.findMany({
      where: classId ? { classId } : undefined,
      include: {
        class: { select: { name: true } },
        tagihans: {
          orderBy: { createdAt: 'desc' },
          include: { payments: { orderBy: { paymentDate: 'desc' } } },
        },
      },
      orderBy: [{ class: { name: 'asc' } }, { name: 'asc' }],
    });

    return students.map((s) => {
      const totalTagihan = s.tagihans.reduce((sum, t) => sum + t.amount, 0);
      const totalLunas = s.tagihans.reduce((sum, t) => sum + (t.amountPaid || (t.status === 'LUNAS' ? t.amount : 0)), 0);
      const sisaTagihan = Math.max(0, totalTagihan - totalLunas);
      const belumLunasCount = s.tagihans.filter(
        (t) => t.status !== 'LUNAS',
      ).length;
      const sppTagihan = s.tagihans.filter(
        (t) => t.type === 'SPP' && t.status === 'LUNAS',
      );
      return {
        id: s.id,
        nisn: s.nisn,
        nis: s.nis,
        name: s.name,
        gender: s.gender,
        className: s.class.name,
        totalTagihan,
        totalLunas,
        sisaTagihan,
        belumLunasCount,
        sppLunasCount: sppTagihan.length,
        tagihanCount: s.tagihans.length,
      };
    });
  }

  /** Detail tagihan untuk satu siswa */
  async getStudentTagihan(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: { select: { name: true } },
        tagihans: {
          orderBy: { createdAt: 'desc' },
          include: { payments: { orderBy: { paymentDate: 'desc' } } },
        },
      },
    });
    if (!student) throw new NotFoundException('Siswa tidak ditemukan');
    return student;
  }

  private parseDueDate(dueDateStr?: string | null): Date | null {
    if (!dueDateStr) return null;
    if (typeof dueDateStr === 'string') {
      const trimmed = dueDateStr.trim();
      if (!trimmed) return null;
      const ddmmyyyy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
      if (ddmmyyyy) {
        return new Date(
          parseInt(ddmmyyyy[3], 10),
          parseInt(ddmmyyyy[2], 10) - 1,
          parseInt(ddmmyyyy[1], 10),
        );
      }
      const yyyymmdd = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
      if (yyyymmdd) {
        return new Date(
          parseInt(yyyymmdd[1], 10),
          parseInt(yyyymmdd[2], 10) - 1,
          parseInt(yyyymmdd[3], 10),
        );
      }
    }
    const parsed = new Date(dueDateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  /** Tambah tagihan baru dengan server-side discount calculation */
  async addTagihan(
    studentId: string,
    dto: {
      type: string;
      amount: number;
      month?: number;
      year?: number;
      dueDate?: string;
      notes?: string;
      discountPercentage?: number;
      discountReason?: string;
    },
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Siswa tidak ditemukan');

    let originalAmount = dto.amount;
    let finalAmount = dto.amount;
    let notes = dto.notes ?? null;

    if (dto.discountPercentage && dto.discountPercentage > 0) {
      const validPct = [25, 50, 75, 100].includes(dto.discountPercentage) ? dto.discountPercentage : 0;
      if (validPct > 0) {
        const discountAmount = Math.round(originalAmount * (validPct / 100));
        finalAmount = originalAmount - discountAmount;
        const discountInfo = {
          originalAmount,
          discountPercentage: validPct,
          discountAmount,
          finalAmount,
          reason: dto.discountReason || '-',
        };
        notes = `${notes ? notes + ' | ' : ''}DISCOUNT_INFO: ${JSON.stringify(discountInfo)}`;
      }
    }

    const tagihan = await this.prisma.tagihan.create({
      data: {
        studentId,
        type: dto.type,
        amount: finalAmount,
        month: dto.month ?? null,
        year: dto.year ?? null,
        dueDate: this.parseDueDate(dto.dueDate),
        status: finalAmount === 0 ? 'LUNAS' : 'BELUM_LUNAS',
        paidDate: finalAmount === 0 ? new Date() : null,
        notes,
      },
    });

    // Emit event for notification
    this.eventEmitter.emit('tagihan.created', {
      tagihanId: tagihan.id,
      studentId: tagihan.studentId,
      isBulk: false,
    });

    return tagihan;
  }

  /** Edit tagihan dengan diskon */
  async updateTagihan(
    tagihanId: string,
    dto: {
      type?: string;
      amount?: number;
      month?: number;
      year?: number;
      dueDate?: string;
      notes?: string;
      discountPercentage?: number;
      discountReason?: string;
    },
  ) {
    const existing = await this.prisma.tagihan.findUnique({ where: { id: tagihanId } });
    if (!existing) throw new NotFoundException('Tagihan tidak ditemukan');

    let baseAmount = dto.amount !== undefined ? dto.amount : existing.amount;
    // Extract original amount if exists in notes
    const discountMatch = existing.notes?.match(/DISCOUNT_INFO:\s*(\{.*?\})/);
    if (discountMatch && dto.amount === undefined) {
      try {
        const discountInfo = JSON.parse(discountMatch[1]);
        baseAmount = discountInfo.originalAmount || existing.amount;
      } catch {}
    }

    let cleanNotes = (dto.notes !== undefined ? dto.notes : existing.notes) || '';
    cleanNotes = cleanNotes.replace(/\s*\|\s*DISCOUNT_INFO:\s*\{.*?\}/g, '').replace(/^DISCOUNT_INFO:\s*\{.*?\}/g, '').trim();

    let finalAmount = baseAmount;
    if (dto.discountPercentage !== undefined) {
      if (dto.discountPercentage > 0) {
        const validPct = [25, 50, 75, 100].includes(dto.discountPercentage) ? dto.discountPercentage : 0;
        if (validPct > 0) {
          const discountAmount = Math.round(baseAmount * (validPct / 100));
          finalAmount = baseAmount - discountAmount;
          const discountInfo = {
            originalAmount: baseAmount,
            discountPercentage: validPct,
            discountAmount,
            finalAmount,
            reason: dto.discountReason || '-',
          };
          cleanNotes = `${cleanNotes ? cleanNotes + ' | ' : ''}DISCOUNT_INFO: ${JSON.stringify(discountInfo)}`;
        }
      }
    } else if (discountMatch && dto.amount !== undefined) {
      // If amount updated but discount not specified, re-apply old discount percentage if available
      try {
        const oldInfo = JSON.parse(discountMatch[1]);
        const validPct = oldInfo.discountPercentage;
        const discountAmount = Math.round(baseAmount * (validPct / 100));
        finalAmount = baseAmount - discountAmount;
        const discountInfo = {
          originalAmount: baseAmount,
          discountPercentage: validPct,
          discountAmount,
          finalAmount,
          reason: dto.discountReason || oldInfo.reason || '-',
        };
        cleanNotes = `${cleanNotes ? cleanNotes + ' | ' : ''}DISCOUNT_INFO: ${JSON.stringify(discountInfo)}`;
      } catch {}
    }

    return this.prisma.tagihan.update({
      where: { id: tagihanId },
      data: {
        ...(dto.type && { type: dto.type }),
        amount: finalAmount,
        ...(dto.month !== undefined && { month: dto.month }),
        ...(dto.year !== undefined && { year: dto.year }),
        ...(dto.dueDate !== undefined && {
          dueDate: this.parseDueDate(dto.dueDate),
        }),
        notes: cleanNotes || null,
        ...(finalAmount === 0 ? { status: 'LUNAS', paidDate: new Date() } : {}),
      },
    });
  }

  /** Tandai tagihan sebagai LUNAS atau bayar angsuran */
  async lunasiTagihan(
    tagihanId: string,
    dto?: { amountPaid?: number; paymentAmount?: number; notes?: string },
  ) {
    const tagihan = await this.prisma.tagihan.findUnique({
      where: { id: tagihanId },
    });
    if (!tagihan) throw new NotFoundException('Tagihan tidak ditemukan');

    const currentPaid = tagihan.amountPaid || (tagihan.status === 'LUNAS' ? tagihan.amount : 0);
    const remainingAmount = tagihan.amount - currentPaid;

    if (remainingAmount <= 0) {
      throw new BadRequestException('Tagihan ini sudah lunas');
    }

    const payAmount = dto?.paymentAmount ?? dto?.amountPaid ?? remainingAmount;

    // Check Infaq business rule
    if (tagihan.type.toLowerCase() === 'infaq' && payAmount < remainingAmount) {
      throw new BadRequestException(
        'Tagihan Infaq tidak dapat diangsur. Pembayaran harus lunas sekaligus.',
      );
    }

    if (payAmount <= 0) {
      throw new BadRequestException('Nominal pembayaran harus lebih besar dari 0');
    }

    if (payAmount > remainingAmount) {
      throw new BadRequestException(
        `Nominal pembayaran (Rp ${payAmount.toLocaleString('id-ID')}) melebihi sisa tagihan (Rp ${remainingAmount.toLocaleString('id-ID')})`,
      );
    }

    const newAmountPaid = currentPaid + payAmount;
    const isLunas = newAmountPaid >= tagihan.amount;
    const newStatus = isLunas ? 'LUNAS' : newAmountPaid > 0 ? 'ANGSURAN' : 'BELUM_LUNAS';

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.tagihan.update({
        where: { id: tagihanId },
        data: {
          amountPaid: newAmountPaid,
          status: newStatus,
          paidDate: isLunas ? new Date() : tagihan.paidDate,
        },
      });

      await tx.payment.create({
        data: {
          studentId: tagihan.studentId,
          tagihanId: tagihan.id,
          type: tagihan.type,
          amount: payAmount,
          month: tagihan.month,
          year: tagihan.year,
          notes: dto?.notes || (isLunas ? 'Pembayaran Lunas' : 'Pembayaran Angsuran'),
        },
      });

      return updated;
    });
  }

  /** Batalkan status LUNAS / reset angsuran */
  async batalLunasiTagihan(tagihanId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.payment.deleteMany({
        where: { tagihanId },
      });
      return tx.tagihan.update({
        where: { id: tagihanId },
        data: { amountPaid: 0, status: 'BELUM_LUNAS', paidDate: null },
      });
    });
  }

  /** Hapus tagihan */
  async deleteTagihan(tagihanId: string) {
    return this.prisma.tagihan.delete({ where: { id: tagihanId } });
  }

  /** Tambah tagihan massal (untuk satu kelas sekaligus) dengan opsi diskon */
  async addTagihanMassal(dto: {
    classId: string;
    type: string;
    amount: number;
    month?: number;
    year?: number;
    dueDate?: string;
    notes?: string;
    discountPercentage?: number;
    discountReason?: string;
  }) {
    const students = await this.prisma.student.findMany({
      where: { classId: dto.classId },
      select: { id: true },
    });
    if (!students.length)
      throw new NotFoundException('Tidak ada siswa di kelas ini');

    let originalAmount = dto.amount;
    let finalAmount = dto.amount;
    let baseNotes = dto.notes ?? null;

    if (dto.discountPercentage && dto.discountPercentage > 0) {
      const validPct = [25, 50, 75, 100].includes(dto.discountPercentage) ? dto.discountPercentage : 0;
      if (validPct > 0) {
        const discountAmount = Math.round(originalAmount * (validPct / 100));
        finalAmount = originalAmount - discountAmount;
        const discountInfo = {
          originalAmount,
          discountPercentage: validPct,
          discountAmount,
          finalAmount,
          reason: dto.discountReason || '-',
        };
        baseNotes = `${baseNotes ? baseNotes + ' | ' : ''}DISCOUNT_INFO: ${JSON.stringify(discountInfo)}`;
      }
    }

    const records = students.map((s) => ({
      studentId: s.id,
      type: dto.type,
      amount: finalAmount,
      month: dto.month ?? null,
      year: dto.year ?? null,
      dueDate: this.parseDueDate(dto.dueDate),
      status: finalAmount === 0 ? 'LUNAS' : 'BELUM_LUNAS',
      paidDate: finalAmount === 0 ? new Date() : null,
      notes: baseNotes,
    }));

    const result = await this.prisma.tagihan.createMany({ data: records });

    // Emit event for bulk tagihan notification
    this.eventEmitter.emit('tagihan.created', {
      tagihanId: null, // Not applicable for bulk
      studentId: null, // Not applicable for bulk
      isBulk: true,
      bulkData: {
        classId: dto.classId,
        tagihanType: dto.type,
        amount: finalAmount,
        count: students.length,
      },
    });

    return result;
  }

  // ============================================================
  // SPP MASS INPUT PER CLASS (Server-Side Calculation)
  // ============================================================
  async massInputSPP(dto: {
    classId: string;
    amount: number;
    month: number;
    year: number;
    dueDate?: string;
    notes?: string;
  }) {
    const students = await this.prisma.student.findMany({
      where: { classId: dto.classId },
      include: { class: true, user: true },
    });

    if (!students.length) {
      throw new NotFoundException('Tidak ada siswa di kelas ini');
    }

    const results: any[] = [];
    const dueDate = this.parseDueDate(dto.dueDate);

    for (const student of students) {
      // Check if SPP for this month/year already exists
      const existingSPP = await this.prisma.tagihan.findFirst({
        where: {
          studentId: student.id,
          type: 'SPP',
          month: dto.month,
          year: dto.year,
        },
      });

      if (existingSPP) {
        // Skip if already exists
        results.push({
          studentId: student.id,
          studentName: student.name,
          status: 'SKIPPED',
          reason: 'SPP for this month already exists',
        });
        continue;
      }

      // SERVER-SIDE CALCULATION: Apply program-based SPP rate
      const programRates: Record<string, number> = {
        kader: 1.0,
        reguler: 1.0,
        tahfidz: 1.2,
        olahraga: 1.1,
        MIC: 2.0,
        enterpreneur: 1.3,
        'seni budaya': 1.1,
        'soshum saintek': 1.5,
        inklusi: 0.8,
      };

      const multiplier = programRates[student.program || 'reguler'] || 1.0;
      const calculatedAmount = Math.round(dto.amount * multiplier);

      // Create tagihan with SERVER-CALCULATED amount
      const tagihan = await this.prisma.tagihan.create({
        data: {
          studentId: student.id,
          type: 'SPP',
          amount: calculatedAmount,
          month: dto.month,
          year: dto.year,
          dueDate,
          status: 'BELUM_LUNAS',
          notes:
            dto.notes ||
            `SPP ${dto.month}/${dto.year} - Program: ${student.program || 'reguler'}`,
        },
      });

      results.push({
        studentId: student.id,
        studentName: student.name,
        program: student.program || 'reguler',
        baseAmount: dto.amount,
        multiplier,
        finalAmount: calculatedAmount,
        status: 'CREATED',
        tagihanId: tagihan.id,
      });
    }

    this.logger.log(
      `Mass SPP input completed for class ${dto.classId}: ${results.length} students processed`,
    );

    return {
      classId: dto.classId,
      month: dto.month,
      year: dto.year,
      totalStudents: students.length,
      processed: results.length,
      results,
    };
  }

  // ============================================================
  // DPP INPUT PER ANGKATAN (Server-Side Calculation with Kader Discount)
  // ============================================================
  async inputDPPByAngkatan(dto: {
    gradeLevel: number;
    baseAmount: number;
    dueDate?: string;
    notes?: string;
  }) {
    const students = await this.prisma.student.findMany({
      where: {
        class: { gradeLevel: dto.gradeLevel },
      },
      include: { class: true },
    });

    if (!students.length) {
      throw new NotFoundException(
        `Tidak ada siswa di angkatan kelas ${dto.gradeLevel}`,
      );
    }

    const results: any[] = [];
    const dueDate = this.parseDueDate(dto.dueDate);

    for (const student of students) {
      // Check if DPP already exists for this student
      const existingDPP = await this.prisma.tagihan.findFirst({
        where: {
          studentId: student.id,
          type: 'DPP',
          year: new Date().getFullYear(),
        },
      });

      if (existingDPP) {
        results.push({
          studentId: student.id,
          studentName: student.name,
          status: 'SKIPPED',
          reason: 'DPP already exists for this year',
        });
        continue;
      }

      // SERVER-SIDE CALCULATION: Apply automatic discount for kader program
      let finalAmount = dto.baseAmount;
      let discountPercentage = 0;
      let discountAmount = 0;

      if (student.program === 'kader') {
        // Kader program automatically gets 100% discount (RP 0 final payable amount)
        discountPercentage = 100;
        discountAmount = dto.baseAmount;
        finalAmount = 0;
      }

      // Create tagihan with SERVER-CALCULATED amount
      const tagihan = await this.prisma.tagihan.create({
        data: {
          studentId: student.id,
          type: 'DPP',
          amount: finalAmount,
          year: new Date().getFullYear(),
          dueDate,
          status: finalAmount === 0 ? 'LUNAS' : 'BELUM_LUNAS',
          paidDate: finalAmount === 0 ? new Date() : null,
          notes:
            dto.notes ||
            `DPP Angkatan ${dto.gradeLevel} - Program: ${student.program || 'reguler'}`,
        },
      });

      // Store discount info in notes as JSON (temporary workaround until schema update)
      if (discountPercentage > 0) {
        await this.prisma.tagihan.update({
          where: { id: tagihan.id },
          data: {
            notes: `${tagihan.notes} | DISCOUNT_INFO: ${JSON.stringify({
              originalAmount: dto.baseAmount,
              discountPercentage,
              discountAmount,
              finalAmount,
            })}`,
          },
        });
      }

      results.push({
        studentId: student.id,
        studentName: student.name,
        program: student.program || 'reguler',
        originalAmount: dto.baseAmount,
        discountPercentage,
        discountAmount,
        finalAmount,
        status: 'CREATED',
        tagihanId: tagihan.id,
      });
    }

    this.logger.log(
      `DPP input completed for grade level ${dto.gradeLevel}: ${results.length} students processed`,
    );

    return {
      gradeLevel: dto.gradeLevel,
      baseAmount: dto.baseAmount,
      totalStudents: students.length,
      processed: results.length,
      results,
    };
  }

  // ============================================================
  // DISCOUNT MANAGEMENT (Server-Side Only)
  // ============================================================
  async applyDiscount(
    tagihanId: string,
    discountPercentage: 25 | 50 | 75 | 100,
    reason?: string,
  ) {
    const tagihan = await this.prisma.tagihan.findUnique({
      where: { id: tagihanId },
      include: { student: true },
    });

    if (!tagihan) {
      throw new NotFoundException('Tagihan tidak ditemukan');
    }

    if (tagihan.status === 'LUNAS') {
      throw new Error(
        'Tidak dapat memberikan diskon pada tagihan yang sudah lunas',
      );
    }

    // Parse existing discount info from notes if present
    let originalAmount = tagihan.amount;
    const discountMatch = tagihan.notes?.match(/DISCOUNT_INFO:\s*(\{.*?\})/);
    if (discountMatch) {
      try {
        const discountInfo = JSON.parse(discountMatch[1]);
        originalAmount = discountInfo.originalAmount || tagihan.amount;
      } catch {
        // If parsing fails, use current amount as original
      }
    }

    // SERVER-SIDE CALCULATION: Calculate discounted amount
    const discountAmount = Math.round(
      originalAmount * (discountPercentage / 100),
    );
    const finalAmount = originalAmount - discountAmount;

    // Update tagihan with SERVER-CALCULATED values stored in notes
    const discountInfo = {
      originalAmount,
      discountPercentage,
      discountAmount,
      finalAmount,
      reason: reason || '-',
    };

    const updated = await this.prisma.tagihan.update({
      where: { id: tagihanId },
      data: {
        amount: finalAmount,
        notes: `${tagihan.notes || ''} | DISCOUNT_INFO: ${JSON.stringify(discountInfo)}`,
      },
    });

    this.logger.log(
      `Discount ${discountPercentage}% applied to tagihan ${tagihanId} for student ${tagihan.student.name}`,
    );

    return {
      tagihanId: updated.id,
      originalAmount,
      discountPercentage,
      discountAmount,
      finalAmount: updated.amount,
      reason,
    };
  }

  async removeDiscount(tagihanId: string) {
    const tagihan = await this.prisma.tagihan.findUnique({
      where: { id: tagihanId },
    });

    if (!tagihan) {
      throw new NotFoundException('Tagihan tidak ditemukan');
    }

    // Parse discount info from notes
    const discountMatch = tagihan.notes?.match(/DISCOUNT_INFO:\s*(\{.*?\})/);
    if (!discountMatch) {
      throw new Error('Tagihan ini tidak memiliki diskon yang dapat dihapus');
    }

    let originalAmount = tagihan.amount;
    try {
      const discountInfo = JSON.parse(discountMatch[1]);
      originalAmount = discountInfo.originalAmount || tagihan.amount;
    } catch {
      throw new Error('Gagal memparse informasi diskon');
    }

    // Restore original amount (SERVER-SIDE)
    const updated = await this.prisma.tagihan.update({
      where: { id: tagihanId },
      data: {
        amount: originalAmount,
        notes: tagihan.notes
          ?.replace(/\s*\|\s*DISCOUNT_INFO:\s*\{.*?\}/g, '')
          .trim(),
      },
    });

    this.logger.log(`Discount removed from tagihan ${tagihanId}`);

    return {
      tagihanId: updated.id,
      restoredAmount: updated.amount,
    };
  }

  async getStudentDiscounts(studentId: string) {
    const tagihans = await this.prisma.tagihan.findMany({
      where: {
        studentId,
        notes: { contains: 'DISCOUNT_INFO' },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tagihans.map((t) => {
      const discountMatch = t.notes?.match(/DISCOUNT_INFO:\s*(\{.*?\})/);
      let discountInfo: any = null;
      if (discountMatch) {
        try {
          discountInfo = JSON.parse(discountMatch[1]);
        } catch {
          // If parsing fails, return null
        }
      }

      return {
        id: t.id,
        type: t.type,
        originalAmount: discountInfo?.originalAmount || t.amount,
        discountPercentage: discountInfo?.discountPercentage || 0,
        discountAmount: discountInfo?.discountAmount || 0,
        finalAmount: t.amount,
        status: t.status,
        createdAt: t.createdAt,
        reason: discountInfo?.reason || '-',
      };
    });
  }

  // ============================================================
  // REKAPITULASI (dari tagihan yang sudah LUNAS)
  // ============================================================
  async getRecapitulasi(year: number, month?: number) {
    const types = ['SPP', 'DPP', 'INFAQ', 'AKADEMIK', 'SEKOLAH'];

    // Tagihan LUNAS tahunan
    const yearlyPaid = await this.prisma.tagihan.findMany({
      where: { year, status: 'LUNAS' },
      select: { type: true, amount: true },
    });

    // Tagihan LUNAS bulanan
    const monthlyPaid = month
      ? await this.prisma.tagihan.findMany({
          where: { year, month, status: 'LUNAS' },
          select: { type: true, amount: true },
        })
      : [];

    // Tagihan BELUM LUNAS (piutang)
    const yearlyUnpaid = await this.prisma.tagihan.findMany({
      where: { year, status: 'BELUM_LUNAS' },
      select: { type: true, amount: true },
    });

    // Tren bulanan (tagihan LUNAS per bulan dalam setahun)
    const trendPaid = await this.prisma.tagihan.findMany({
      where: { year, status: 'LUNAS', NOT: { month: null } },
      select: { month: true, amount: true },
    });

    const buildSummary = (items: { type: string; amount: number }[]) =>
      types.map((t) => ({
        type: t,
        total: items
          .filter((p) => p.type === t)
          .reduce((s, p) => s + p.amount, 0),
        count: items.filter((p) => p.type === t).length,
      }));

    const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const total = trendPaid
        .filter((p) => p.month === m)
        .reduce((s, p) => s + p.amount, 0);
      return { month: m, total };
    });

    return {
      year,
      month: month ?? null,
      yearly: buildSummary(yearlyPaid),
      monthly: buildSummary(monthlyPaid),
      unpaid: buildSummary(yearlyUnpaid),
      monthlyTrend,
    };
  }

  // ============================================================
  // STUDENT PAYMENT HISTORY (legacy - kept for Payment model)
  // ============================================================
  async getStudentPayments(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: { select: { name: true } },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });
    if (!student) throw new NotFoundException('Siswa tidak ditemukan');
    return student;
  }

  /** Get unpaid tagihans for student based on userId */
  async getMyUnpaidTagihan(userId: string) {
    // Get student record from user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: {
          include: {
            class: { select: { name: true } },
          },
        },
      },
    });

    let student = user?.student;
    if (!student) {
      student = await this.prisma.student.findFirst({
        where: {
          OR: [
            { userId: userId },
            ...(user?.username
              ? [{ nisn: user.username }, { nis: user.username }]
              : []),
            ...(user?.email ? [{ nisn: user.email }, { nis: user.email }] : []),
          ],
        },
        include: {
          class: { select: { name: true } },
        },
      });
    }

    if (!student) {
      return {
        student: null,
        tagihans: [],
      };
    }

    // Get unpaid/installment tagihans
    const tagihans = await this.prisma.tagihan.findMany({
      where: {
        studentId: student.id,
        status: { in: ['BELUM_LUNAS', 'ANGSURAN'] },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      include: {
        payments: { orderBy: { paymentDate: 'desc' } },
        paymentProofs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return {
      student: {
        id: student.id,
        name: student.name,
        nisn: student.nisn,
        nis: student.nis,
        className: student.class?.name || '-',
      },
      tagihans,
    };
  }

  /** Get ALL tagihans (paid and unpaid) for student based on userId (for Laporan Keuangan Siswa) */
  async getMyAllTagihan(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: {
          include: {
            class: { select: { name: true } },
            tagihans: {
              orderBy: { createdAt: 'desc' },
              include: { payments: { orderBy: { paymentDate: 'desc' } } },
            },
          },
        },
      },
    });

    let student = user?.student;
    if (!student) {
      student = await this.prisma.student.findFirst({
        where: {
          OR: [
            { userId: userId },
            ...(user?.username
              ? [{ nisn: user.username }, { nis: user.username }]
              : []),
            ...(user?.email ? [{ nisn: user.email }, { nis: user.email }] : []),
          ],
        },
        include: {
          class: { select: { name: true } },
          tagihans: {
            orderBy: { createdAt: 'desc' },
            include: { payments: { orderBy: { paymentDate: 'desc' } } },
          },
        },
      });
    }

    if (!student) throw new NotFoundException('Siswa tidak ditemukan');
    return student;
  }

  // ============================================================
  // AUTOMATIC BILLING (CRON)
  // ============================================================

  /**
   * Run every day at 01:00 AM.
   * Checks if SPP for the current month and year has been generated for all active students.
   * If not, it creates a new "BELUM_LUNAS" tagihan.
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async generateMonthlySPP() {
    this.logger.log('Running automatic SPP generation check...');

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    // Default SPP amount, could be moved to a settings table later
    const DEFAULT_SPP_AMOUNT = 150000;

    // Get all students
    const students = await this.prisma.student.findMany({
      select: { id: true, name: true },
    });

    let generatedCount = 0;

    for (const student of students) {
      // Check if SPP for this month/year already exists
      const existingSPP = await this.prisma.tagihan.findFirst({
        where: {
          studentId: student.id,
          type: 'SPP',
          month: currentMonth,
          year: currentYear,
        },
      });

      if (!existingSPP) {
        // Generate new tagihan
        const dueDate = new Date(currentYear, currentMonth - 1, 10); // Due on the 10th of the month

        await this.prisma.tagihan.create({
          data: {
            studentId: student.id,
            type: 'SPP',
            amount: DEFAULT_SPP_AMOUNT,
            month: currentMonth,
            year: currentYear,
            dueDate,
            status: 'BELUM_LUNAS',
            notes: 'Tagihan otomatis',
          },
        });
        generatedCount++;
      }
    }

    this.logger.log(
      `Automatic SPP generation completed. Generated ${generatedCount} new bills.`,
    );
    return {
      success: true,
      generatedCount,
      month: currentMonth,
      year: currentYear,
    };
  }

  // ============================================================
  // PENGELUARAN (Expenses)
  // ============================================================
  async getPengeluaran(year?: number, month?: number) {
    const where: any = {};
    if (year) {
      if (month) {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59, 999);
        where.date = { gte: start, lte: end };
      } else {
        const start = new Date(year, 0, 1);
        const end = new Date(year, 11, 31, 23, 59, 59, 999);
        where.date = { gte: start, lte: end };
      }
    }

    return this.prisma.pengeluaran.findMany({
      where,
      include: {
        user: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async createPengeluaran(data: any, userId: string) {
    if (!data.title || !data.amount) {
      throw new NotFoundException('Judul dan Nominal wajib diisi');
    }

    return this.prisma.pengeluaran.create({
      data: {
        title: data.title,
        description: data.description || null,
        amount: parseFloat(data.amount),
        category: data.category || 'UMUM',
        date: data.date ? new Date(data.date) : new Date(),
        recordedBy: userId,
      },
    });
  }

  async deletePengeluaran(id: string) {
    return this.prisma.pengeluaran.delete({
      where: { id },
    });
  }

  // ============================================================
  // LPJ (Laporan Pertanggung Jawaban)
  // ============================================================
  async getLpj(year: number, month?: number) {
    const wherePengeluaran: any = {};
    const whereTagihan: any = { status: 'LUNAS' };

    if (month) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      wherePengeluaran.date = { gte: start, lte: end };
      whereTagihan.paidDate = { gte: start, lte: end };
    } else {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      wherePengeluaran.date = { gte: start, lte: end };
      whereTagihan.paidDate = { gte: start, lte: end };
    }

    // 1. Ambil semua Pemasukan (Tagihan Lunas)
    const tagihans = await this.prisma.tagihan.findMany({
      where: whereTagihan,
      select: { type: true, amount: true, paidDate: true },
    });

    // 2. Ambil semua Pengeluaran
    const pengeluarans = await this.prisma.pengeluaran.findMany({
      where: wherePengeluaran,
      select: { category: true, amount: true, title: true, date: true },
    });

    // Hitung Total Pemasukan
    let totalPemasukan = 0;
    const rincianPemasukan: Record<string, number> = {};
    tagihans.forEach((t) => {
      totalPemasukan += t.amount;
      rincianPemasukan[t.type] = (rincianPemasukan[t.type] || 0) + t.amount;
    });

    // Hitung Total Pengeluaran
    let totalPengeluaran = 0;
    const rincianPengeluaran: Record<string, number> = {};
    pengeluarans.forEach((p) => {
      totalPengeluaran += p.amount;
      rincianPengeluaran[p.category] =
        (rincianPengeluaran[p.category] || 0) + p.amount;
    });

    const saldo = totalPemasukan - totalPengeluaran;

    // Untuk tabel/grafik arus kas masuk & keluar
    return {
      year,
      month,
      summary: {
        totalPemasukan,
        totalPengeluaran,
        saldo,
      },
      rincianPemasukan: Object.keys(rincianPemasukan).map((key) => ({
        type: key,
        amount: rincianPemasukan[key],
      })),
      rincianPengeluaran: Object.keys(rincianPengeluaran).map((key) => ({
        category: key,
        amount: rincianPengeluaran[key],
      })),
      // Histori
      historyPemasukan: tagihans.sort(
        (a, b) => b.paidDate!.getTime() - a.paidDate!.getTime(),
      ),
      historyPengeluaran: pengeluarans.sort(
        (a, b) => b.date.getTime() - a.date.getTime(),
      ),
    };
  }
}
