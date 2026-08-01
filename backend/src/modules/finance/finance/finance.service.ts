import { Injectable, NotFoundException, Logger } from '@nestjs/common';
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
        tagihans: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: [{ class: { name: 'asc' } }, { name: 'asc' }],
    });

    return students.map((s) => {
      const totalTagihan = s.tagihans.reduce((sum, t) => sum + t.amount, 0);
      const totalLunas = s.tagihans
        .filter((t) => t.status === 'LUNAS')
        .reduce((sum, t) => sum + t.amount, 0);
      const belumLunasCount = s.tagihans.filter(
        (t) => t.status === 'BELUM_LUNAS',
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
        tagihans: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!student) throw new NotFoundException('Siswa tidak ditemukan');
    return student;
  }

  /** Tambah tagihan baru */
  async addTagihan(
    studentId: string,
    dto: {
      type: string;
      amount: number;
      month?: number;
      year?: number;
      dueDate?: string;
      notes?: string;
    },
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Siswa tidak ditemukan');

    const tagihan = await this.prisma.tagihan.create({
      data: {
        studentId,
        type: dto.type,
        amount: dto.amount,
        month: dto.month ?? null,
        year: dto.year ?? null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        status: 'BELUM_LUNAS',
        notes: dto.notes ?? null,
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

  /** Edit tagihan */
  async updateTagihan(
    tagihanId: string,
    dto: {
      type?: string;
      amount?: number;
      month?: number;
      year?: number;
      dueDate?: string;
      notes?: string;
    },
  ) {
    return this.prisma.tagihan.update({
      where: { id: tagihanId },
      data: {
        ...(dto.type && { type: dto.type }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.month !== undefined && { month: dto.month }),
        ...(dto.year !== undefined && { year: dto.year }),
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  /** Tandai tagihan sebagai LUNAS */
  async lunasiTagihan(tagihanId: string) {
    return this.prisma.tagihan.update({
      where: { id: tagihanId },
      data: { status: 'LUNAS', paidDate: new Date() },
    });
  }

  /** Batalkan status LUNAS (ubah kembali ke BELUM_LUNAS) */
  async batalLunasiTagihan(tagihanId: string) {
    return this.prisma.tagihan.update({
      where: { id: tagihanId },
      data: { status: 'BELUM_LUNAS', paidDate: null },
    });
  }

  /** Hapus tagihan */
  async deleteTagihan(tagihanId: string) {
    return this.prisma.tagihan.delete({ where: { id: tagihanId } });
  }

  /** Tambah tagihan massal (untuk satu kelas sekaligus) */
  async addTagihanMassal(dto: {
    classId: string;
    type: string;
    amount: number;
    month?: number;
    year?: number;
    dueDate?: string;
    notes?: string;
  }) {
    const students = await this.prisma.student.findMany({
      where: { classId: dto.classId },
      select: { id: true },
    });
    if (!students.length)
      throw new NotFoundException('Tidak ada siswa di kelas ini');

    const records = students.map((s) => ({
      studentId: s.id,
      type: dto.type,
      amount: dto.amount,
      month: dto.month ?? null,
      year: dto.year ?? null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      status: 'BELUM_LUNAS',
      notes: dto.notes ?? null,
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
        amount: dto.amount,
        count: students.length,
      },
    });

    return result;
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
            class: { select: { name: true } }
          }
        }
      },
    });

    if (!user?.student) {
      return { 
        student: null,
        tagihans: [] 
      };
    }

    // Get unpaid tagihans
    const tagihans = await this.prisma.tagihan.findMany({
      where: {
        studentId: user.student.id,
        status: 'BELUM_LUNAS',
      },
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'asc' }
      ],
      include: {
        paymentProofs: {
          where: {
            status: 'MENUNGGU_VERIFIKASI'
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    return { 
      student: {
        id: user.student.id,
        name: user.student.name,
        nisn: user.student.nisn,
        nis: user.student.nis,
        className: user.student.class.name
      },
      tagihans 
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
            tagihans: { orderBy: { createdAt: 'desc' } },
          }
        }
      }
    });

    if (!user?.student) throw new NotFoundException('Siswa tidak ditemukan');
    return user.student;
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
        user: { select: { name: true } }
      },
      orderBy: { date: 'desc' }
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
        recordedBy: userId
      }
    });
  }

  async deletePengeluaran(id: string) {
    return this.prisma.pengeluaran.delete({
      where: { id }
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
      select: { type: true, amount: true, paidDate: true }
    });

    // 2. Ambil semua Pengeluaran
    const pengeluarans = await this.prisma.pengeluaran.findMany({
      where: wherePengeluaran,
      select: { category: true, amount: true, title: true, date: true }
    });

    // Hitung Total Pemasukan
    let totalPemasukan = 0;
    const rincianPemasukan: Record<string, number> = {};
    tagihans.forEach(t => {
      totalPemasukan += t.amount;
      rincianPemasukan[t.type] = (rincianPemasukan[t.type] || 0) + t.amount;
    });

    // Hitung Total Pengeluaran
    let totalPengeluaran = 0;
    const rincianPengeluaran: Record<string, number> = {};
    pengeluarans.forEach(p => {
      totalPengeluaran += p.amount;
      rincianPengeluaran[p.category] = (rincianPengeluaran[p.category] || 0) + p.amount;
    });

    const saldo = totalPemasukan - totalPengeluaran;

    // Untuk tabel/grafik arus kas masuk & keluar
    return {
      year,
      month,
      summary: {
        totalPemasukan,
        totalPengeluaran,
        saldo
      },
      rincianPemasukan: Object.keys(rincianPemasukan).map(key => ({
        type: key,
        amount: rincianPemasukan[key]
      })),
      rincianPengeluaran: Object.keys(rincianPengeluaran).map(key => ({
        category: key,
        amount: rincianPengeluaran[key]
      })),
      // Histori
      historyPemasukan: tagihans.sort((a, b) => b.paidDate!.getTime() - a.paidDate!.getTime()),
      historyPengeluaran: pengeluarans.sort((a, b) => b.date.getTime() - a.date.getTime())
    };
  }
}
