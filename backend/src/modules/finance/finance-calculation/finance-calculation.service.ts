import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

/**
 * FinanceCalculationService
 * Centralized service for all financial calculations including:
 * - SPP calculations
 * - DPP calculations
 * - Student discounts
 * - Payroll calculations
 * - Other financial computations
 */
@Injectable()
export class FinanceCalculationService {
  private readonly logger = new Logger(FinanceCalculationService.name);

  constructor(private prisma: PrismaService) {}

  // ============================================================
  // SPP (Sumbangan Pembinaan Pendidikan) CALCULATIONS
  // ============================================================

  /**
   * Calculate SPP amount based on student's program
   * Different programs may have different SPP rates
   */
  async calculateSPPAmount(studentId: string, _month: number, _year: number): Promise<number> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { program: true },
    });

    if (!student) {
      throw new Error('Siswa tidak ditemukan');
    }

    let sppAmount = 300000;
    if (student.program) {
      const progConfig = await this.prisma.programConfig.findUnique({
        where: { code: student.program },
      }) || await this.prisma.programConfig.findFirst({
        where: { code: { equals: student.program, mode: 'insensitive' } },
      });

      if (progConfig && progConfig.defaultSpp > 0) {
        sppAmount = progConfig.defaultSpp;
      }
    }

    this.logger.log(
      `SPP calculated for student ${studentId} (${student.program}): ${sppAmount}`,
    );

    return sppAmount;
  }

  /**
   * Calculate monthly SPP for multiple students (bulk)
   */
  async calculateBulkSPP(
    studentIds: string[],
    month: number,
    year: number,
  ): Promise<Map<string, number>> {
    const results = new Map<string, number>();

    for (const studentId of studentIds) {
      try {
        const amount = await this.calculateSPPAmount(studentId, month, year);
        results.set(studentId, amount);
      } catch (error) {
        this.logger.error(
          `Error calculating SPP for student ${studentId}: ${error.message}`,
        );
        results.set(studentId, 0);
      }
    }

    return results;
  }

  // ============================================================
  // DPP (Dana Pengembangan Akademik) CALCULATIONS
  // ============================================================

  /**
   * Calculate DPP amount based on grade level and program
   * DPP is typically a one-time payment at enrollment
   */
  async calculateDPPAmount(studentId: string): Promise<number> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    });

    if (!student) {
      throw new Error('Siswa tidak ditemukan');
    }

    // Check Setting table defaultDpp
    const setting = await this.prisma.setting.findFirst();
    const systemDefaultDpp = setting?.defaultDpp && setting.defaultDpp > 0 ? setting.defaultDpp : 1500000;

    // Base DPP amount by grade level (if grade 10, 11, 12)
    const gradeBaseRates: Record<number, number> = {
      10: systemDefaultDpp > 0 ? Math.round(systemDefaultDpp * 1.33) : 2000000,
      11: systemDefaultDpp,
      12: systemDefaultDpp > 0 ? Math.round(systemDefaultDpp * 0.67) : 1000000,
    };

    const baseDPP = (student.class && gradeBaseRates[student.class.gradeLevel]) || systemDefaultDpp;

    this.logger.log(
      `DPP calculated for student ${studentId} (Grade ${student.class?.gradeLevel}, ${student.program}): ${baseDPP}`,
    );

    return baseDPP;
  }

  // ============================================================
  // DISCOUNT CALCULATIONS
  // ============================================================

  /**
   * Calculate beasiswa amount for a student
   * Beasiswa can be based on:
   * - Academic achievement
   * - Sibling discounts
   * - Special programs
   * - Financial aid
   */
  async calculateStudentBeasiswa(
    studentId: string,
    originalAmount: number,
    beasiswaType?: string,
  ): Promise<{
    beasiswaAmount: number;
    finalAmount: number;
    beasiswaPercentage: number;
  }> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    });

    if (!student) {
      throw new Error('Siswa tidak ditemukan');
    }

    let beasiswaPercentage = 0;

    // Apply discount based on type or student profile
    switch (beasiswaType?.toUpperCase()) {
      case 'SPP':
        beasiswaPercentage = student.beasiswaSppPct || student.beasiswaPercentage || 0;
        break;
      case 'DPP':
        beasiswaPercentage = student.beasiswaDppPct || student.beasiswaPercentage || 0;
        break;
      case 'SERAGAM':
        beasiswaPercentage = student.beasiswaSeragamPct || student.beasiswaPercentage || 0;
        break;
      case 'AKADEMIK':
        beasiswaPercentage = 25;
        break;
      case 'SAUDARA':
        beasiswaPercentage = 15;
        break;
      case 'BEASISWA':
        beasiswaPercentage = student.beasiswaPercentage || 50;
        break;
      case 'INKLUSI':
        if (student.program?.toLowerCase() === 'inklusi') {
          beasiswaPercentage = 30;
        }
        break;
      default:
        beasiswaPercentage = student.beasiswaPercentage || 0;
    }

    const beasiswaAmount = Math.round(
      originalAmount * (beasiswaPercentage / 100),
    );
    const finalAmount = Math.max(0, originalAmount - beasiswaAmount);

    this.logger.log(
      `Beasiswa calculated for student ${studentId}: ${beasiswaPercentage}% (${beasiswaAmount})`,
    );

    return {
      beasiswaAmount,
      finalAmount,
      beasiswaPercentage,
    };
  }

  /**
   * Calculate total bill amount after applying all applicable discounts
   */
  async calculateFinalBillAmount(
    studentId: string,
    baseAmount: number,
    applicableBeasiswa: string[] = [],
  ): Promise<{
    finalAmount: number;
    totalBeasiswa: number;
    appliedBeasiswa: any[];
  }> {
    let currentAmount = baseAmount;
    const appliedBeasiswa: any[] = [];
    let totalBeasiswa = 0;

    for (const beasiswaType of applicableBeasiswa) {
      const result = await this.calculateStudentBeasiswa(
        studentId,
        currentAmount,
        beasiswaType,
      );
      appliedBeasiswa.push({
        type: beasiswaType,
        percentage: result.beasiswaPercentage,
        amount: result.beasiswaAmount,
      });
      totalBeasiswa += result.beasiswaAmount;
      currentAmount = result.finalAmount;
    }

    return {
      finalAmount: currentAmount,
      totalBeasiswa,
      appliedBeasiswa,
    };
  }

  // ============================================================
  // PAYROLL CALCULATIONS
  // ============================================================

  /**
   * Calculate monthly salary for staff/teacher
   * Based on:
   * - Base salary
   * - Attendance
   * - Roles (main role + subroles)
   * - Additional allowances
   */
  async calculateMonthlySalary(
    userId: string,
    year: number,
    month: number,
  ): Promise<{
    baseSalary: number;
    attendanceBonus: number;
    roleAllowance: number;
    totalSalary: number;
    deductions: number;
    netSalary: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        subRole: true,
        subRole2: true,
        subRole3: true,
      },
    });

    if (!user) {
      throw new Error('User tidak ditemukan');
    }

    // Calculate attendance for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const attendances = await this.prisma.dailyAttendance.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
        status: 'HADIR',
      },
    });

    const izinKeluars = await this.prisma.izinKeluar.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
        status: 'DISETUJUI',
      },
    });

    const totalHadir = attendances.length;
    const uniqueIzinDates = new Set(
      izinKeluars.map((i) => i.date.toISOString().split('T')[0]),
    ).size;
    const totalWorkingDays = totalHadir + uniqueIzinDates;

    // Base salary by role
    const baseSalaries: Record<string, number> = {
      SUPERADMIN: 5000000,
      'ADMIN IT': 4500000,
      'ADMIN WEB': 4000000,
      GURU: 3500000,
      'GURU TAHFIDZ': 3800000,
      KEPALA_SEKOLAH: 7000000,
      WAKIL_KEPALA_SEKOLAH: 6000000,
      BK_BP: 3500000,
      WALI_KELAS: 3600000,
      KURIKULUM: 4500000,
      KESISWAAN: 4000000,
      SARANA_PRASARANA: 3500000,
      BENDAHARA: 4500000,
      SDM_KEPEGAWAIAN: 4000000,
      PEGAWAI: 3000000,
      KEBERSIHAN: 2500000,
      KEAMANAN: 2800000,
      PEMBINA_EKSTRAKURIKULER: 3200000,
      PUSTAKAWAN: 3000000,
    };

    const baseSalary = baseSalaries[user.role] || 3000000;

    // Attendance bonus (full attendance bonus)
    const workingDaysInMonth = 22; // Approximate working days
    const attendanceRate = totalWorkingDays / workingDaysInMonth;
    const attendanceBonus = attendanceRate >= 0.95 ? 500000 : 0;

    // Role allowance (main role + subroles)
    const roles = [
      user.role,
      user.subRole,
      user.subRole2,
      user.subRole3,
    ].filter(Boolean);
    const roleAllowance = (roles.length - 1) * 300000; // 300k per additional role

    // Matched Dana Bantuan / Insentif Pegawai
    const danaBantuans = await this.prisma.danaBantuan.findMany({
      where: { kategori: 'PEGAWAI', isSynced: true },
    });
    const bantuanNominal = danaBantuans
      .filter(
        (b) =>
          !b.penerima ||
          b.penerima.toLowerCase().includes(user.name.toLowerCase()) ||
          user.name.toLowerCase().includes(b.penerima.toLowerCase()),
      )
      .reduce((sum, b) => sum + b.nominal, 0);

    // Calculate total salary
    const totalSalary = baseSalary + attendanceBonus + roleAllowance + bantuanNominal;

    // Deductions (e.g., BPJS, tax, etc.)
    const deductions = Math.round(totalSalary * 0.05); // 5% for social security/tax
    const netSalary = totalSalary - deductions;

    this.logger.log(
      `Salary calculated for ${user.name}: Base=${baseSalary}, Attendance=${attendanceBonus}, Role=${roleAllowance}, Bantuan=${bantuanNominal}, Net=${netSalary}`,
    );

    return {
      baseSalary,
      attendanceBonus,
      roleAllowance,
      totalSalary,
      deductions,
      netSalary,
    };
  }

  /**
   * Calculate payroll summary for all staff in a given month
   */
  async calculatePayrollSummary(year: number, month: number): Promise<any[]> {
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

    const payrollData = await Promise.all(
      staffList.map(async (staff) => {
        const salary = await this.calculateMonthlySalary(staff.id, year, month);
        const roles = [
          staff.role,
          staff.subRole,
          staff.subRole2,
          staff.subRole3,
        ]
          .filter(Boolean)
          .join(', ');

        return {
          id: staff.id,
          name: staff.name,
          roles,
          ...salary,
        };
      }),
    );

    return payrollData;
  }

  // ============================================================
  // FINANCIAL SUMMARY CALCULATIONS
  // ============================================================

  /**
   * Calculate total revenue from student payments for a given period
   */
  async calculateTotalRevenue(
    year: number,
    month?: number,
  ): Promise<{
    totalRevenue: number;
    byType: Record<string, number>;
    paidCount: number;
  }> {
    const where: any = {
      status: { in: ['LUNAS', 'ANGSURAN'] },
      year,
    };

    if (month) {
      where.month = month;
    }

    const paidTagihans = await this.prisma.tagihan.findMany({
      where,
      select: { type: true, amount: true, amountPaid: true, status: true },
    });

    const totalRevenue = paidTagihans.reduce(
      (sum, t) => sum + (t.amountPaid || (t.status === 'LUNAS' ? t.amount : 0)),
      0,
    );
    const paidCount = paidTagihans.length;

    const byType: Record<string, number> = {};
    paidTagihans.forEach((t) => {
      const nominal = t.amountPaid || (t.status === 'LUNAS' ? t.amount : 0);
      byType[t.type] = (byType[t.type] || 0) + nominal;
    });

    return {
      totalRevenue,
      byType,
      paidCount,
    };
  }

  /**
   * Calculate total expenses for a given period
   */
  async calculateTotalExpenses(
    year: number,
    month?: number,
  ): Promise<{
    totalExpenses: number;
    byCategory: Record<string, number>;
    expenseCount: number;
  }> {
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

    const pengeluarans = await this.prisma.pengeluaran.findMany({
      where,
      select: { category: true, amount: true },
    });

    const totalExpenses = pengeluarans.reduce((sum, p) => sum + p.amount, 0);
    const expenseCount = pengeluarans.length;

    const byCategory: Record<string, number> = {};
    pengeluarans.forEach((p) => {
      byCategory[p.category] = (byCategory[p.category] || 0) + p.amount;
    });

    return {
      totalExpenses,
      byCategory,
      expenseCount,
    };
  }

  /**
   * Calculate financial balance (revenue - expenses)
   */
  async calculateFinancialBalance(
    year: number,
    month?: number,
  ): Promise<{
    revenue: number;
    expenses: number;
    balance: number;
    profitMargin: number;
  }> {
    const revenue = await this.calculateTotalRevenue(year, month);
    const expenses = await this.calculateTotalExpenses(year, month);

    const balance = revenue.totalRevenue - expenses.totalExpenses;
    const profitMargin =
      revenue.totalRevenue > 0 ? (balance / revenue.totalRevenue) * 100 : 0;

    return {
      revenue: revenue.totalRevenue,
      expenses: expenses.totalExpenses,
      balance,
      profitMargin: Math.round(profitMargin * 100) / 100,
    };
  }

  // ============================================================
  // STUDENT BILLING CALCULATIONS
  // ============================================================

  /**
   * Calculate total outstanding bills for a student
   */
  async calculateStudentOutstandingBills(studentId: string): Promise<{
    totalOutstanding: number;
    billCount: number;
    overdueCount: number;
    bills: any[];
  }> {
    const tagihans = await this.prisma.tagihan.findMany({
      where: {
        studentId,
        status: { in: ['BELUM_LUNAS', 'ANGSURAN'] },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });

    const totalOutstanding = tagihans.reduce(
      (sum, t) => sum + Math.max(0, t.amount - (t.amountPaid || 0)),
      0,
    );
    const billCount = tagihans.length;

    const now = new Date();
    const overdueCount = tagihans.filter(
      (t) => t.dueDate && t.dueDate < now,
    ).length;

    return {
      totalOutstanding,
      billCount,
      overdueCount,
      bills: tagihans,
    };
  }

  /**
   * Calculate payment plan for a student (installment options)
   */
  calculatePaymentPlan(
    studentId: string,
    totalAmount: number,
    months: number = 12,
  ): {
    monthlyInstallment: number;
    totalWithInterest: number;
    interestRate: number;
    schedule: Array<{ month: number; amount: number; dueDate: Date }>;
  } {
    const interestRate = 0.05; // 5% interest rate
    const totalWithInterest = totalAmount * (1 + interestRate);
    const monthlyInstallment = Math.round(totalWithInterest / months);

    const schedule: Array<{ month: number; amount: number; dueDate: Date }> =
      [];
    const startDate = new Date();

    for (let i = 0; i < months; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i + 1);
      dueDate.setDate(10); // Due on the 10th of each month

      schedule.push({
        month: i + 1,
        amount: monthlyInstallment,
        dueDate,
      });
    }

    return {
      monthlyInstallment,
      totalWithInterest: Math.round(totalWithInterest),
      interestRate,
      schedule,
    };
  }
}
