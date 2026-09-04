import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SystemLogService } from '../../core/services/system-log.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private systemLogService: SystemLogService,
  ) {}

  // ============================================================
  // PAYROLL & SALARY CALCULATION SYSTEM (SIMASMUH)
  // ============================================================

  /**
   * Menghitung rincian tunjangan presensi harian per user untuk satu bulan:
   * 1. Transport:
   *    - Masuk <= 07:05 -> +5.000
   *    - Pulang (Senin - Kamis): >= 15:00 -> +5.000
   *    - Pulang (Jumat): >= 13:30 -> +5.000
   *    - Datang > 07:05 atau Pulang < batas waktu -> tidak dapat transport (0)
   * 2. Uang Makan:
   *    - Durasi Masuk s/d Pulang >= 6 jam -> +8.000
   *    - Durasi < 6 jam -> 0
   */
  private calculateAttendanceAllowances(attendances: any[]) {
    let totalTransport = 0;
    let totalMeal = 0;
    let validDays = 0;
    const dailyDetails: any[] = [];

    for (const att of attendances) {
      if (att.status !== 'HADIR') continue;
      validDays++;

      const dateObj = new Date(att.date);
      const dayOfWeek = dateObj.getDay(); // 0 = Minggu, 5 = Jumat

      const inTimeStr = att.checkInTime || att.time;
      const outTimeStr = att.checkOutTime;

      let transportIn = 0;
      let transportOut = 0;
      let meal = 0;
      let durationHours = 0;

      // Evaluasi Masuk
      if (inTimeStr) {
        const [inH, inM] = inTimeStr.split(':').map((v: string) => parseInt(v, 10) || 0);
        const inMinutes = inH * 60 + inM;
        // <= 07:05 (7*60 + 5 = 425 menit)
        if (inMinutes <= 425) {
          transportIn = 5000;
        }
      }

      // Evaluasi Pulang
      if (outTimeStr) {
        const [outH, outM] = outTimeStr.split(':').map((v: string) => parseInt(v, 10) || 0);
        const outMinutes = outH * 60 + outM;

        if (dayOfWeek === 5) {
          // Hari Jumat: >= 13:30 (13*60 + 30 = 810 menit)
          if (outMinutes >= 810) {
            transportOut = 5000;
          }
        } else {
          // Senin - Kamis & hari lainnya: >= 15:00 (15*60 = 900 menit)
          if (outMinutes >= 900) {
            transportOut = 5000;
          }
        }
      }

      // Evaluasi Uang Makan berdasarkan durasi kerja
      if (inTimeStr && outTimeStr) {
        const [inH, inM] = inTimeStr.split(':').map((v: string) => parseInt(v, 10) || 0);
        const [outH, outM] = outTimeStr.split(':').map((v: string) => parseInt(v, 10) || 0);
        const inMinutes = inH * 60 + inM;
        const outMinutes = outH * 60 + outM;
        const diffMinutes = outMinutes - inMinutes;

        if (diffMinutes > 0) {
          durationHours = parseFloat((diffMinutes / 60).toFixed(2));
          // Durasi >= 6 jam (360 menit)
          if (diffMinutes >= 360) {
            meal = 8000;
          }
        }
      }

      const transportDayTotal = transportIn + transportOut;
      totalTransport += transportDayTotal;
      totalMeal += meal;

      dailyDetails.push({
        date: att.date,
        checkInTime: inTimeStr || '-',
        checkOutTime: outTimeStr || '-',
        durationHours,
        transportIn,
        transportOut,
        transportTotal: transportDayTotal,
        mealAllowance: meal,
      });
    }

    return {
      totalTransport,
      totalMeal,
      validDays,
      dailyDetails,
    };
  }

  async getPayrollSummary(
    year: number,
    month: number,
    harianRateParam?: number,
    subRoleAllowanceParam?: number,
    minHadirBonusParam?: number,
    insentifKetertibanParam?: number,
    tunjanganMakanParam?: number,
  ) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    const staffList = await this.prisma.user.findMany({
      where: {
        role: { notIn: ['SISWA', 'WALI_MURID'] },
      },
      select: {
        id: true,
        name: true,
        role: true,
        subRole: true,
        subRole2: true,
        subRole3: true,
        subRole4: true,
        subRole5: true,
        employmentStatus: true,
        bankName: true,
        bankAccountNumber: true,
        bankAccountHolder: true,
        nipNbm: true,
        phone: true,
        teacherProfile: { select: { nip: true, phone: true } },
      },
      orderBy: { name: 'asc' },
    });

    const attendances = await this.prisma.dailyAttendance.findMany({
      where: { date: { gte: startDate, lte: endDate }, status: 'HADIR' },
      orderBy: { date: 'asc' },
    });

    const izinKeluars = await this.prisma.izinKeluar.findMany({
      where: { date: { gte: startDate, lte: endDate }, status: 'DISETUJUI' },
    });

    const savedRecords = await this.prisma.payrollRecord.findMany({
      where: { year, month },
    });

    const recordMap = new Map<string, any>();
    savedRecords.forEach((r) => {
      recordMap.set(r.userId, r);
    });

    return staffList.map((staff) => {
      const staffAttendances = attendances.filter((a) => a.userId === staff.id);
      const uniqueIzinDates = new Set(
        izinKeluars
          .filter((i) => i.userId === staff.id)
          .map((i) => i.date.toISOString().split('T')[0]),
      );

      const rolesList = [
        staff.role,
        staff.subRole,
        staff.subRole2,
        staff.subRole3,
        staff.subRole4,
        staff.subRole5,
      ].filter(Boolean);
      const roles = rolesList.join(', ');

      // Kalkulasi Tunjangan Presensi (Absen Makan & Transport) Otomatis Berdasarkan Log
      const attCalc = this.calculateAttendanceAllowances(staffAttendances);

      const savedRecord = recordMap.get(staff.id);

      // Status kepegawaian default jika belum diatur
      const defaultStatus =
        staff.employmentStatus ||
        (staff.role === 'GURU' || staff.subRole === 'GURU' ? 'GTTP' : 'PTTP');

      // Jam, Masa Kerja, Kelebihan Jam & Tarif
      const totalHours = savedRecord?.totalHours ?? 0;
      const hourlyRate = savedRecord?.hourlyRate ?? 0;
      const baseSalary = savedRecord?.baseSalary ?? (totalHours * hourlyRate);

      const rawNotes = savedRecord?.notes || '';
      let parsedMeta: any = {};
      try {
        if (rawNotes.startsWith('{')) parsedMeta = JSON.parse(rawNotes);
      } catch (e) {}

      const masaKerja = parsedMeta.masaKerja ?? 0;
      const kelebihanJam = Number(parsedMeta.kelebihanJam) || 0;

      // Absen Makan & Transport
      const transportAllowance = attCalc.totalTransport;
      const mealAllowance = attCalc.totalMeal;

      // Komponen Manual Tunjangan & Potongan
      const manualAllowances: { name: string; amount: number }[] =
        Array.isArray(savedRecord?.manualAllowances)
          ? savedRecord.manualAllowances as { name: string; amount: number }[]
          : [];
      const manualDeductions: { name: string; amount: number }[] =
        Array.isArray(savedRecord?.manualDeductions)
          ? savedRecord.manualDeductions as { name: string; amount: number }[]
          : [];

      const totalManualAllowance = manualAllowances.reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0,
      );
      const totalManualDeduction = manualDeductions.reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0,
      );

      // Total Gaji Kotor = Gaji Pokok + Kelebihan Jam + Absen Makan + Transport + Tunjangan Manual
      const totalAllowance =
        transportAllowance + mealAllowance + totalManualAllowance;
      const totalGrossSalary = baseSalary + kelebihanJam + totalAllowance;
      const totalDeduction = totalManualDeduction;
      const netSalary = totalGrossSalary - totalDeduction;

      return {
        id: staff.id,
        name: staff.name,
        roles,
        role: staff.role,
        nip: staff.nipNbm || staff.teacherProfile?.nip || '-',
        phone: staff.phone || staff.teacherProfile?.phone || '-',
        employmentStatus: savedRecord?.employmentStatus || defaultStatus,
        masaKerja,
        bankName: staff.bankName || '',
        bankAccountNumber: staff.bankAccountNumber || '',
        bankAccountHolder: staff.bankAccountHolder || '',
        totalHadir: staffAttendances.length,
        totalIzin: uniqueIzinDates.size,
        totalHours,
        hourlyRate,
        baseSalary,
        kelebihanJam,
        transportAllowance,
        mealAllowance,
        totalAllowance,
        totalGrossSalary,
        totalDeduction,
        netSalary,
        manualAllowances,
        manualDeductions,
        notes: rawNotes.startsWith('{') ? (parsedMeta.notes || '') : rawNotes,
        isConfigured: !!savedRecord,
        dailyDetails: attCalc.dailyDetails,
      };
    });
  }

  /** Menyimpan atau memperbarui rincian kalkulasi penggajian per pegawai */
  async savePayrollRecord(
    userId: string,
    year: number,
    month: number,
    data: {
      employmentStatus?: string;
      bankName?: string;
      bankAccountNumber?: string;
      bankAccountHolder?: string;
      masaKerja?: number;
      kelebihanJam?: number;
      totalHours: number;
      hourlyRate: number;
      manualAllowances?: { name: string; amount: number }[];
      manualDeductions?: { name: string; amount: number }[];
      notes?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('Pegawai tidak ditemukan');
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    const attendances = await this.prisma.dailyAttendance.findMany({
      where: { userId, date: { gte: startDate, lte: endDate }, status: 'HADIR' },
    });

    const attCalc = this.calculateAttendanceAllowances(attendances);

    const totalHours = Number(data.totalHours) || 0;
    const hourlyRate = Number(data.hourlyRate) || 0;
    const baseSalary = totalHours * hourlyRate;
    const kelebihanJam = Number(data.kelebihanJam) || 0;
    const masaKerja = Number(data.masaKerja) || 0;

    const manualAllowances = Array.isArray(data.manualAllowances)
      ? data.manualAllowances
      : [];
    const manualDeductions = Array.isArray(data.manualDeductions)
      ? data.manualDeductions
      : [];

    const totalManualAllowance = manualAllowances.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0,
    );
    const totalManualDeduction = manualDeductions.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0,
    );

    const transportAllowance = attCalc.totalTransport;
    const mealAllowance = attCalc.totalMeal;
    const totalAllowance =
      transportAllowance + mealAllowance + totalManualAllowance;
    const totalGrossSalary = baseSalary + kelebihanJam + totalAllowance;
    const totalDeduction = totalManualDeduction;
    const netSalary = totalGrossSalary - totalDeduction;

    const employmentStatus =
      data.employmentStatus || user.employmentStatus || 'GTTP';

    // Update employmentStatus & data rekening di User jika ada perubahan
    const updateUserData: any = {};
    if (data.employmentStatus && data.employmentStatus !== user.employmentStatus) {
      updateUserData.employmentStatus = data.employmentStatus;
    }
    if (data.bankName !== undefined) updateUserData.bankName = data.bankName;
    if (data.bankAccountNumber !== undefined) updateUserData.bankAccountNumber = data.bankAccountNumber;
    if (data.bankAccountHolder !== undefined) updateUserData.bankAccountHolder = data.bankAccountHolder;

    if (Object.keys(updateUserData).length > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: updateUserData,
      });
    }

    const notesMeta = JSON.stringify({
      masaKerja,
      kelebihanJam,
      notes: data.notes || '',
    });

    const record = await this.prisma.payrollRecord.upsert({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
      create: {
        userId,
        month,
        year,
        employmentStatus,
        totalHours,
        hourlyRate,
        baseSalary,
        transportAllowance,
        mealAllowance,
        totalAttendanceDays: attendances.length,
        manualAllowances: manualAllowances as any,
        manualDeductions: manualDeductions as any,
        totalAllowance,
        totalDeduction,
        netSalary,
        notes: notesMeta,
        isPublished: true,
      },
      update: {
        employmentStatus,
        totalHours,
        hourlyRate,
        baseSalary,
        transportAllowance,
        mealAllowance,
        totalAttendanceDays: attendances.length,
        manualAllowances: manualAllowances as any,
        manualDeductions: manualDeductions as any,
        totalAllowance,
        totalDeduction,
        netSalary,
        notes: notesMeta,
        isPublished: true,
      },
    });

    return {
      message: `Rincian penggajian untuk ${user.name} berhasil disimpan!`,
      record,
    };
  }

  /** Update data rekening bank pegawai */
  async updateStaffBankAccount(
    userId: string,
    data: { bankName?: string; bankAccountNumber?: string; bankAccountHolder?: string },
  ) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        bankName: data.bankName || null,
        bankAccountNumber: data.bankAccountNumber || null,
        bankAccountHolder: data.bankAccountHolder || null,
      },
      select: {
        id: true,
        name: true,
        bankName: true,
        bankAccountNumber: true,
        bankAccountHolder: true,
      },
    });

    return {
      message: `Informasi rekening ${updated.name} berhasil diperbarui!`,
      user: updated,
    };
  }

  /** Update status jabatan kepegawaian (PTTP, GTTP, GTP, PTP) */
  async updateStaffEmploymentStatus(userId: string, employmentStatus: string) {
    const validStatuses = ['PTTP', 'GTTP', 'GTP', 'PTP'];
    if (!validStatuses.includes(employmentStatus)) {
      throw new BadRequestException('Label status kepegawaian tidak valid (PTTP, GTTP, GTP, PTP)');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { employmentStatus },
      select: {
        id: true,
        name: true,
        role: true,
        employmentStatus: true,
      },
    });

    return {
      message: `Status kepegawaian ${updated.name} berhasil diubah menjadi ${employmentStatus}`,
      user: updated,
    };
  }

  /** Mengambil data slip gaji spesifik untuk satu pegawai */
  async getStaffSlipGaji(userId: string, year: number, month: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        subRole: true,
        subRole2: true,
        subRole3: true,
        subRole4: true,
        subRole5: true,
        employmentStatus: true,
        bankName: true,
        bankAccountNumber: true,
        bankAccountHolder: true,
        nipNbm: true,
        phone: true,
        avatarUrl: true,
        teacherProfile: { select: { nip: true, phone: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('Pegawai tidak ditemukan');
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    const attendances = await this.prisma.dailyAttendance.findMany({
      where: { userId, date: { gte: startDate, lte: endDate }, status: 'HADIR' },
      orderBy: { date: 'asc' },
    });

    const izinKeluars = await this.prisma.izinKeluar.findMany({
      where: { userId, date: { gte: startDate, lte: endDate }, status: 'DISETUJUI' },
    });

    const attCalc = this.calculateAttendanceAllowances(attendances);

    const savedRecord = await this.prisma.payrollRecord.findUnique({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
    });

    const rolesList = [
      user.role,
      user.subRole,
      user.subRole2,
      user.subRole3,
      user.subRole4,
      user.subRole5,
    ].filter(Boolean);

    const defaultStatus =
      user.employmentStatus ||
      (user.role === 'GURU' || user.subRole === 'GURU' ? 'GTTP' : 'PTTP');

    const totalHours = savedRecord?.totalHours ?? 0;
    const hourlyRate = savedRecord?.hourlyRate ?? 0;
    const baseSalary = savedRecord?.baseSalary ?? (totalHours * hourlyRate);

    const rawNotes = savedRecord?.notes || '';
    let parsedMeta: any = {};
    try {
      if (rawNotes.startsWith('{')) parsedMeta = JSON.parse(rawNotes);
    } catch (e) {}

    const masaKerja = parsedMeta.masaKerja ?? 0;
    const kelebihanJam = Number(parsedMeta.kelebihanJam) || 0;

    const transportAllowance = attCalc.totalTransport;
    const mealAllowance = attCalc.totalMeal;

    const manualAllowances: { name: string; amount: number }[] =
      Array.isArray(savedRecord?.manualAllowances)
        ? (savedRecord?.manualAllowances as any)
        : [];
    const manualDeductions: { name: string; amount: number }[] =
      Array.isArray(savedRecord?.manualDeductions)
        ? (savedRecord?.manualDeductions as any)
        : [];

    const totalManualAllowance = manualAllowances.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0,
    );
    const totalManualDeduction = manualDeductions.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0,
    );

    const totalAllowance =
      transportAllowance + mealAllowance + totalManualAllowance;
    const totalGrossSalary = baseSalary + kelebihanJam + totalAllowance;
    const totalDeduction = totalManualDeduction;
    const netSalary = totalGrossSalary - totalDeduction;

    const settings = await this.prisma.setting.findFirst();

    return {
      schoolInfo: {
        schoolName: settings?.schoolName || 'SMA MUHAMMADIYAH 1 PONOROGO',
        address: settings?.address || 'Jln. Batoro Katong No. 6B Ponorogo',
        phone: settings?.phone || '(0352) 481521',
        email: settings?.email || 'smamuhipo@gmail.com',
        principalName: settings?.principalName || 'Sugeng Riadi, M.Pd.',
        principalNip: settings?.principalNip || 'NBM. 974.501',
        treasurerName: 'AGUNG TRIBOWO, SE',
        logoUrl: settings?.logoUrl || null,
      },
      staff: {
        id: user.id,
        name: user.name,
        roles: rolesList.join(', '),
        role: user.role,
        nip: user.nipNbm || user.teacherProfile?.nip || '-',
        phone: user.phone || user.teacherProfile?.phone || '-',
        employmentStatus: savedRecord?.employmentStatus || defaultStatus,
        masaKerja,
        bankName: user.bankName || '',
        bankAccountNumber: user.bankAccountNumber || '',
        bankAccountHolder: user.bankAccountHolder || '',
      },
      period: {
        year,
        month,
      },
      attendance: {
        totalHadir: attendances.length,
        totalIzin: izinKeluars.length,
        dailyDetails: attCalc.dailyDetails,
      },
      calculation: {
        totalHours,
        hourlyRate,
        baseSalary,
        kelebihanJam,
        transportAllowance,
        mealAllowance,
        manualAllowances,
        manualDeductions,
        totalAllowance,
        totalGrossSalary,
        totalDeduction,
        netSalary,
        notes: rawNotes.startsWith('{') ? (parsedMeta.notes || '') : rawNotes,
      },
    };
  }

  /** Export Rekapitulasi Gaji Excel Multi-Kolom Lengkap */
  async generatePayrollExcel(year: number, month: number) {
    const summary = await this.getPayrollSummary(year, month);
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Rekap Gaji ${month}-${year}`);

    // Kolom Header Excel
    worksheet.columns = [
      { header: 'NO', key: 'no', width: 6 },
      { header: 'NAMA PEGAWAI / GURU', key: 'name', width: 28 },
      { header: 'STATUS JABATAN', key: 'employmentStatus', width: 16 },
      { header: 'PERAN / ROLE', key: 'roles', width: 24 },
      { header: 'BANK', key: 'bankName', width: 12 },
      { header: 'NO. REKENING', key: 'bankAccountNumber', width: 20 },
      { header: 'ATAS NAMA', key: 'bankAccountHolder', width: 24 },
      { header: 'HADIR (HARI)', key: 'totalHadir', width: 14 },
      { header: 'JAM KERJA', key: 'totalHours', width: 12 },
      { header: 'TARIF / JAM (RP)', key: 'hourlyRate', width: 18 },
      { header: 'GAJI POKOK (RP)', key: 'baseSalary', width: 18 },
      { header: 'KELEBIHAN JAM (RP)', key: 'kelebihanJam', width: 20 },
      { header: 'ABSEN MAKAN (RP)', key: 'mealAllowance', width: 20 },
      { header: 'TRANSPORT (RP)', key: 'transportAllowance', width: 18 },
      { header: 'TOTAL PENGHASILAN (RP)', key: 'totalGrossSalary', width: 26 },
      { header: 'TOTAL POTONGAN (RP)', key: 'totalDeduction', width: 22 },
      { header: 'GAJI BERSIH (NETTO) (RP)', key: 'netSalary', width: 26 },
    ];

    // Styling Header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '005E36' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    headerRow.height = 28;

    summary.forEach((item, idx) => {
      const row = worksheet.addRow({
        no: idx + 1,
        name: item.name,
        employmentStatus: item.employmentStatus,
        roles: item.roles,
        bankName: item.bankName || '-',
        bankAccountNumber: item.bankAccountNumber || '-',
        bankAccountHolder: item.bankAccountHolder || '-',
        totalHadir: item.totalHadir,
        totalHours: item.totalHours,
        hourlyRate: item.hourlyRate,
        baseSalary: item.baseSalary,
        kelebihanJam: item.kelebihanJam || 0,
        mealAllowance: item.mealAllowance,
        transportAllowance: item.transportAllowance,
        totalGrossSalary: item.totalGrossSalary || (item.baseSalary + item.totalAllowance),
        totalDeduction: item.totalDeduction,
        netSalary: item.netSalary,
      });

      // Format angka rupiah
      [10, 11, 12, 13, 14, 15, 16, 17].forEach((colIdx) => {
        row.getCell(colIdx).numFmt = '#,##0';
      });

      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(5).alignment = { horizontal: 'center' };
      row.getCell(8).alignment = { horizontal: 'center' };
      row.getCell(9).alignment = { horizontal: 'center' };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ============================================================
  // TAGIHAN SISWA
  // ============================================================

  /** Daftar semua siswa beserta ringkasan tagihan mereka */
  async getStudentsWithTagihan(classId?: string) {
    const students: any[] = await this.prisma.student.findMany({
      where: classId ? { classId } : undefined,
      include: {
        class: { select: { name: true } },
        tagihans: {
          orderBy: { createdAt: 'desc' },
          include: { payments: { orderBy: { paymentDate: 'desc' } } },
        },
      } as any,
      orderBy: [{ class: { name: 'asc' } }, { name: 'asc' }],
    });

    return students.map((s) => {
      const tagihansList = s.tagihans || [];
      const totalTagihan = tagihansList.reduce(
        (sum: number, t: any) => sum + t.amount,
        0,
      );
      const totalLunas = tagihansList.reduce(
        (sum: number, t: any) =>
          sum + (t.amountPaid || (t.status === 'LUNAS' ? t.amount : 0)),
        0,
      );
      const sisaTagihan = Math.max(0, totalTagihan - totalLunas);
      const belumLunasCount = tagihansList.filter(
        (t: any) => t.status !== 'LUNAS',
      ).length;
      const sppTagihan = tagihansList.filter(
        (t: any) => t.type === 'SPP' && t.status === 'LUNAS',
      );
      return {
        id: s.id,
        nisn: s.nisn,
        nis: s.nis,
        name: s.name,
        gender: s.gender,
        program: s.program || null,
        gelombang: s.gelombang || 'Gelombang 1',
        jalurPendaftaran: s.jalurPendaftaran || 'Mandiri',
        className: s.class?.name || '-',
        totalTagihan,
        totalLunas,
        sisaTagihan,
        belumLunasCount,
        sppLunasCount: sppTagihan.length,
        tagihanCount: tagihansList.length,
        beasiswaPercentage: s.beasiswaPercentage || 0,
        beasiswaReason:
          s.beasiswaReason ||
          (s.beasiswaPercentage > 0 ? 'Beasiswa Default Siswa' : null),
        beasiswaSeragamPct: s.beasiswaSeragamPct || 0,
        beasiswaSppPct: s.beasiswaSppPct || 0,
        beasiswaDppPct: s.beasiswaDppPct || 0,
      };
    });
  }

  /** Mensingkronkan beasiswa default siswa ke seluruh tagihan siswa */
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
      if (t.amountPaid > 0 && t.status === 'LUNAS') {
        continue;
      }

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

  /** Detail tagihan untuk satu siswa */
  async getStudentTagihan(studentId: string) {
    const s = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { program: true, beasiswaPercentage: true, beasiswaReason: true },
    });
    if (s) {
      const effectivePct = s.beasiswaPercentage || 0;
      const effectiveReason =
        s.beasiswaReason ||
        (effectivePct > 0 ? 'Beasiswa Default Siswa' : null);
      await this.syncStudentBeasiswaToBills(
        studentId,
        effectivePct,
        effectiveReason,
      );
    }

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: { select: { name: true } },
        tagihans: {
          orderBy: { createdAt: 'desc' },
          include: { payments: { orderBy: { paymentDate: 'desc' } } },
        },
      } as any,
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
      beasiswaPercentage?: number;
      beasiswaReason?: string;
    },
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Siswa tidak ditemukan');

    const originalAmount = dto.amount;
    let finalAmount = dto.amount;
    let notes = dto.notes ?? null;

    // Gunakan beasiswa eksplisit jika ada, atau fallback ke beasiswa default siswa
    const effectivePct =
      dto.beasiswaPercentage !== undefined && dto.beasiswaPercentage > 0
        ? dto.beasiswaPercentage
        : student.beasiswaPercentage || 0;

    const effectiveReason =
      dto.beasiswaPercentage !== undefined && dto.beasiswaPercentage > 0
        ? dto.beasiswaReason
        : student.beasiswaReason ||
          (effectivePct > 0 ? 'Beasiswa Default Siswa' : null);

    if (effectivePct > 0) {
      const validPct = [25, 50, 75, 100].includes(effectivePct)
        ? effectivePct
        : 0;
      if (validPct > 0) {
        const beasiswaAmount = Math.round(originalAmount * (validPct / 100));
        finalAmount = originalAmount - beasiswaAmount;
        const beasiswaInfo = {
          originalAmount,
          beasiswaPercentage: validPct,
          beasiswaAmount,
          finalAmount,
          reason: effectiveReason || '-',
        };
        notes = `${notes ? notes + ' | ' : ''}BEASISWA_INFO: ${JSON.stringify(beasiswaInfo)}`;
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
      beasiswaPercentage?: number;
      beasiswaReason?: string;
    },
  ) {
    const existing = await this.prisma.tagihan.findUnique({
      where: { id: tagihanId },
    });
    if (!existing) throw new NotFoundException('Tagihan tidak ditemukan');

    let baseAmount = dto.amount !== undefined ? dto.amount : existing.amount;
    // Extract original amount if exists in notes
    const beasiswaMatch = existing.notes?.match(/BEASISWA_INFO:\s*(\{.*?\})/);
    if (beasiswaMatch && dto.amount === undefined) {
      try {
        const beasiswaInfo = JSON.parse(beasiswaMatch[1]);
        baseAmount = beasiswaInfo.originalAmount || existing.amount;
      } catch {}
    }

    let cleanNotes =
      (dto.notes !== undefined ? dto.notes : existing.notes) || '';
    cleanNotes = cleanNotes
      .replace(/\s*\|\s*BEASISWA_INFO:\s*\{.*?\}/g, '')
      .replace(/^BEASISWA_INFO:\s*\{.*?\}/g, '')
      .trim();

    let finalAmount = baseAmount;
    if (dto.beasiswaPercentage !== undefined) {
      if (dto.beasiswaPercentage > 0) {
        const validPct = [25, 50, 75, 100].includes(dto.beasiswaPercentage)
          ? dto.beasiswaPercentage
          : 0;
        if (validPct > 0) {
          const beasiswaAmount = Math.round(baseAmount * (validPct / 100));
          finalAmount = baseAmount - beasiswaAmount;
          const beasiswaInfo = {
            originalAmount: baseAmount,
            beasiswaPercentage: validPct,
            beasiswaAmount,
            finalAmount,
            reason: dto.beasiswaReason || '-',
          };
          cleanNotes = `${cleanNotes ? cleanNotes + ' | ' : ''}BEASISWA_INFO: ${JSON.stringify(beasiswaInfo)}`;
        }
      }
    } else if (beasiswaMatch && dto.amount !== undefined) {
      // If amount updated but beasiswa not specified, re-apply old beasiswa percentage if available
      try {
        const oldInfo = JSON.parse(beasiswaMatch[1]);
        const validPct = oldInfo.beasiswaPercentage;
        const beasiswaAmount = Math.round(baseAmount * (validPct / 100));
        finalAmount = baseAmount - beasiswaAmount;
        const beasiswaInfo = {
          originalAmount: baseAmount,
          beasiswaPercentage: validPct,
          beasiswaAmount,
          finalAmount,
          reason: dto.beasiswaReason || oldInfo.reason || '-',
        };
        cleanNotes = `${cleanNotes ? cleanNotes + ' | ' : ''}BEASISWA_INFO: ${JSON.stringify(beasiswaInfo)}`;
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

  /** Tandai tagihan sebagai LUNAS atau bayar angsuran tunai dengan opsi diskon */
  async lunasiTagihan(
    tagihanId: string,
    dto?: {
      amountPaid?: number;
      paymentAmount?: number;
      notes?: string;
      beasiswaPercentage?: number;
      beasiswaReason?: string;
    },
  ) {
    const tagihan: any = await this.prisma.tagihan.findUnique({
      where: { id: tagihanId },
    });
    if (!tagihan) throw new NotFoundException('Tagihan tidak ditemukan');

    let baseAmount = tagihan.amount;
    let cleanNotes = (dto?.notes || tagihan.notes || '')
      .replace(/\s*\|\s*BEASISWA_INFO:\s*\{.*?\}/g, '')
      .replace(/^BEASISWA_INFO:\s*\{.*?\}/g, '')
      .replace(/\s*\|\s*DISCOUNT_INFO:\s*\{.*?\}/g, '')
      .replace(/^DISCOUNT_INFO:\s*\{.*?\}/g, '')
      .trim();

    // Check if discount/beasiswa is applied during cash payment
    if (dto?.beasiswaPercentage && dto.beasiswaPercentage > 0) {
      const validPct = [25, 50, 75, 100].includes(dto.beasiswaPercentage)
        ? dto.beasiswaPercentage
        : 0;
      if (validPct > 0) {
        const beasiswaMatch = tagihan.notes?.match(
          /BEASISWA_INFO:\s*(\{.*?\})/,
        );
        const discountMatch = tagihan.notes?.match(
          /DISCOUNT_INFO:\s*(\{.*?\})/,
        );
        let orig = baseAmount;
        if (beasiswaMatch) {
          try {
            const parsedInfo = JSON.parse(beasiswaMatch[1]);
            orig = parsedInfo.originalAmount || baseAmount;
          } catch {}
        } else if (discountMatch) {
          try {
            const parsedInfo = JSON.parse(discountMatch[1]);
            orig = parsedInfo.originalAmount || baseAmount;
          } catch {}
        }
        const beasiswaAmount = Math.round(orig * (validPct / 100));
        baseAmount = orig - beasiswaAmount;
        const beasiswaInfo = {
          originalAmount: orig,
          beasiswaPercentage: validPct,
          beasiswaAmount,
          finalAmount: baseAmount,
          reason: dto.beasiswaReason || 'Beasiswa Kasir Keuangan',
        };
        cleanNotes = `${cleanNotes ? cleanNotes + ' | ' : ''}BEASISWA_INFO: ${JSON.stringify(beasiswaInfo)}`;
      }
    }

    const currentPaid = (tagihan.amountPaid ??
      (tagihan.status === 'LUNAS' ? baseAmount : 0)) as number;
    const remainingAmount = Math.max(0, baseAmount - currentPaid);

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
      throw new BadRequestException(
        'Nominal pembayaran harus lebih besar dari 0',
      );
    }

    if (payAmount > remainingAmount) {
      throw new BadRequestException(
        `Nominal pembayaran (Rp ${payAmount.toLocaleString('id-ID')}) melebihi sisa tagihan (Rp ${remainingAmount.toLocaleString('id-ID')})`,
      );
    }

    const newAmountPaid = currentPaid + payAmount;
    const sisaKurangBayar = Math.max(0, baseAmount - newAmountPaid);
    const isLunas = newAmountPaid >= baseAmount;
    const newStatus = isLunas
      ? 'LUNAS'
      : newAmountPaid > 0
        ? 'ANGSURAN'
        : 'BELUM_LUNAS';

    const defaultPaymentNotes = isLunas
      ? 'Pembayaran Lunas Kasir Keuangan'
      : `Pembayaran Angsuran Kasir (Kurang Bayar Rp ${sisaKurangBayar.toLocaleString('id-ID')})`;

    return this.prisma.$transaction(async (tx) => {
      const updated = await (tx.tagihan as any).update({
        where: { id: tagihanId },
        data: {
          amount: baseAmount,
          amountPaid: newAmountPaid,
          status: newStatus,
          paidDate: isLunas ? new Date() : tagihan.paidDate,
          notes: cleanNotes || null,
        },
      });

      await (tx.payment as any).create({
        data: {
          studentId: tagihan.studentId,
          tagihanId: tagihan.id,
          type: tagihan.type,
          amount: payAmount,
          month: tagihan.month,
          year: tagihan.year,
          notes: dto?.notes || defaultPaymentNotes,
        },
      });

      return {
        ...updated,
        payAmount,
        sisaKurangBayar,
        isLunas,
        message: isLunas
          ? 'Pembayaran berhasil dan tagihan telah LUNAS.'
          : `Pembayaran angsuran berhasil dicatat. Sisa kurang bayar: Rp ${sisaKurangBayar.toLocaleString('id-ID')}`,
      };
    });
  }

  /** Batalkan status LUNAS / reset angsuran */
  async batalLunasiTagihan(tagihanId: string) {
    return this.prisma.$transaction(async (tx) => {
      await (tx.payment as any).deleteMany({
        where: { tagihanId },
      });
      return (tx.tagihan as any).update({
        where: { id: tagihanId },
        data: { amountPaid: 0, status: 'BELUM_LUNAS', paidDate: null },
      });
    });
  }

  /** Hapus tagihan */
  async deleteTagihan(tagihanId: string) {
    return this.prisma.tagihan.delete({ where: { id: tagihanId } });
  }

  /** Reset tagihan siswa (Restricted with Password Verification) */
  async resetStudentTagihan(
    userId: string,
    dto: { studentIds: string[]; password: string },
  ) {
    if (!dto.studentIds || dto.studentIds.length === 0) {
      throw new BadRequestException('Pilih setidaknya 1 siswa untuk di-reset');
    }
    if (!dto.password || !dto.password.trim()) {
      throw new BadRequestException('Password otorisasi keamanan wajib diisi');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException(
        'Pengguna tidak ditemukan atau tidak valid',
      );
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException(
        'Password otorisasi tidak valid! Verifikasi gagal.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Delete all payments associated with tagihan of these students
      await (tx.payment as any).deleteMany({
        where: {
          tagihan: {
            studentId: { in: dto.studentIds },
          },
        },
      });

      // Delete all tagihan of these students
      const deleteResult = await (tx.tagihan as any).deleteMany({
        where: {
          studentId: { in: dto.studentIds },
        },
      });

      return {
        success: true,
        count: deleteResult.count,
        studentCount: dto.studentIds.length,
        message: `Berhasil mereset ${deleteResult.count} tagihan dari ${dto.studentIds.length} siswa.`,
      };
    });
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
    beasiswaPercentage?: number;
    beasiswaReason?: string;
  }) {
    const students = await this.prisma.student.findMany({
      where: { classId: dto.classId },
      select: {
        id: true,
        program: true,
        beasiswaPercentage: true,
        beasiswaReason: true,
      },
    });
    if (!students.length)
      throw new NotFoundException('Tidak ada siswa di kelas ini');

    const originalAmount = dto.amount;
    const hasBulkBeasiswa =
      dto.beasiswaPercentage !== undefined && dto.beasiswaPercentage > 0;
    const bulkValidPct = hasBulkBeasiswa
      ? [25, 50, 75, 100].includes(dto.beasiswaPercentage!)
        ? dto.beasiswaPercentage!
        : 0
      : 0;

    const records = students.map((s) => {
      let finalAmount = originalAmount;
      let notes = dto.notes ?? null;

      const effectivePct = hasBulkBeasiswa
        ? bulkValidPct
        : s.beasiswaPercentage || 0;

      const effectiveReason = hasBulkBeasiswa
        ? dto.beasiswaReason
        : s.beasiswaReason ||
          (effectivePct > 0 ? 'Beasiswa Default Siswa' : null);

      if (effectivePct > 0) {
        const validPct = [25, 50, 75, 100].includes(effectivePct)
          ? effectivePct
          : 0;
        if (validPct > 0) {
          const beasiswaAmount = Math.round(originalAmount * (validPct / 100));
          finalAmount = originalAmount - beasiswaAmount;
          const beasiswaInfo = {
            originalAmount,
            beasiswaPercentage: validPct,
            beasiswaAmount,
            finalAmount,
            reason: effectiveReason || '-',
          };
          notes = `${notes ? notes + ' | ' : ''}BEASISWA_INFO: ${JSON.stringify(beasiswaInfo)}`;
        }
      }

      return {
        studentId: s.id,
        type: dto.type,
        amount: finalAmount,
        month: dto.month ?? null,
        year: dto.year ?? null,
        dueDate: this.parseDueDate(dto.dueDate),
        status: finalAmount === 0 ? 'LUNAS' : 'BELUM_LUNAS',
        paidDate: finalAmount === 0 ? new Date() : null,
        notes,
      };
    });

    const result = await this.prisma.tagihan.createMany({ data: records });

    // Emit event for bulk tagihan notification
    this.eventEmitter.emit('tagihan.created', {
      tagihanId: null, // Not applicable for bulk
      studentId: null, // Not applicable for bulk
      isBulk: true,
      bulkData: {
        classId: dto.classId,
        tagihanType: dto.type,
        amount: originalAmount,
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

      // SERVER-SIDE CALCULATION: Fetch default SPP from ProgramConfig table
      let sppAmount = dto.amount;
      if (student.program) {
        const progConfig =
          (await this.prisma.programConfig.findUnique({
            where: { code: student.program },
          })) ||
          (await this.prisma.programConfig.findFirst({
            where: { code: { equals: student.program, mode: 'insensitive' } },
          }));

        if (progConfig && progConfig.defaultSpp > 0) {
          sppAmount = progConfig.defaultSpp;
        }
      }
      const calculatedAmount = Math.round(sppAmount);

      // Calculate scholarship discount if student has beasiswaSppPct set
      let finalAmount = calculatedAmount;
      const pct = student.beasiswaSppPct || 0;
      let notes =
        dto.notes ||
        `SPP ${dto.month}/${dto.year} - Program: ${student.program || 'reguler'}`;
      let status = 'BELUM_LUNAS';
      let paidDate: Date | null = null;

      if (pct > 0) {
        const beasiswaAmount = Math.round(calculatedAmount * (pct / 100));
        finalAmount = calculatedAmount - beasiswaAmount;
        const beasiswaInfo = {
          originalAmount: calculatedAmount,
          beasiswaPercentage: pct,
          beasiswaAmount,
          finalAmount,
          reason: student.beasiswaReason || 'Beasiswa',
        };
        notes = `${notes ? notes + ' | ' : ''}BEASISWA_INFO: ${JSON.stringify(beasiswaInfo)}`;
        if (finalAmount === 0) {
          status = 'LUNAS';
          paidDate = new Date();
        }
      }

      // Create tagihan with SERVER-CALCULATED amount and scholarship applied
      const tagihan = await this.prisma.tagihan.create({
        data: {
          studentId: student.id,
          type: 'SPP',
          amount: finalAmount,
          month: dto.month,
          year: dto.year,
          dueDate,
          status,
          paidDate,
          notes,
        },
      });

      results.push({
        studentId: student.id,
        studentName: student.name,
        program: student.program || 'reguler',
        baseAmount: dto.amount,
        finalAmount: finalAmount,
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

    // Fetch default DPP from Setting or ProgramConfig
    const setting = await this.prisma.setting.findFirst();
    const systemDefaultDpp =
      setting?.defaultDpp && setting.defaultDpp > 0
        ? setting.defaultDpp
        : 1500000;

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

      // Base DPP from setting/dto
      const studentBaseDpp = dto.baseAmount || systemDefaultDpp;

      // SERVER-SIDE CALCULATION: Apply student default beasiswa if set
      let finalAmount = studentBaseDpp;
      const beasiswaPercentage =
        student.beasiswaDppPct || student.beasiswaPercentage || 0;
      let beasiswaAmount = 0;

      if (beasiswaPercentage > 0) {
        beasiswaAmount = Math.round(
          studentBaseDpp * (beasiswaPercentage / 100),
        );
        finalAmount = Math.max(0, studentBaseDpp - beasiswaAmount);
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

      // Store beasiswa info in notes as JSON
      if (beasiswaPercentage > 0) {
        await this.prisma.tagihan.update({
          where: { id: tagihan.id },
          data: {
            notes: `${tagihan.notes} | BEASISWA_INFO: ${JSON.stringify({
              originalAmount: studentBaseDpp,
              beasiswaPercentage,
              beasiswaAmount,
              finalAmount,
              reason: student.beasiswaReason || 'Beasiswa DPP',
            })}`,
          },
        });
      }

      results.push({
        studentId: student.id,
        studentName: student.name,
        program: student.program || 'reguler',
        originalAmount: studentBaseDpp,
        beasiswaPercentage,
        beasiswaAmount,
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
  // BEASISWA MANAGEMENT (Server-Side Only)
  // ============================================================
  async applyDiscount(
    tagihanId: string,
    beasiswaPercentage: 25 | 50 | 75 | 100,
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
        'Tidak dapat memberikan beasiswa pada tagihan yang sudah lunas',
      );
    }

    // Parse existing discount/beasiswa info from notes if present
    let originalAmount = tagihan.amount;
    const beasiswaMatch = tagihan.notes?.match(/BEASISWA_INFO:\s*(\{.*?\})/);
    const discountMatch = tagihan.notes?.match(/DISCOUNT_INFO:\s*(\{.*?\})/);
    if (beasiswaMatch) {
      try {
        const beasiswaInfo = JSON.parse(beasiswaMatch[1]);
        originalAmount = beasiswaInfo.originalAmount || tagihan.amount;
      } catch {}
    } else if (discountMatch) {
      try {
        const discountInfo = JSON.parse(discountMatch[1]);
        originalAmount = discountInfo.originalAmount || tagihan.amount;
      } catch {}
    }

    // SERVER-SIDE CALCULATION: Calculate beasiswa amount
    const beasiswaAmount = Math.round(
      originalAmount * (beasiswaPercentage / 100),
    );
    const finalAmount = originalAmount - beasiswaAmount;

    // Clean existing beasiswa/discount info from notes
    const cleanNotes = (tagihan.notes || '')
      .replace(/\s*\|\s*BEASISWA_INFO:\s*\{.*?\}/g, '')
      .replace(/^BEASISWA_INFO:\s*\{.*?\}/g, '')
      .replace(/\s*\|\s*DISCOUNT_INFO:\s*\{.*?\}/g, '')
      .replace(/^DISCOUNT_INFO:\s*\{.*?\}/g, '')
      .trim();

    // Update tagihan with SERVER-CALCULATED values stored in notes
    const beasiswaInfo = {
      originalAmount,
      beasiswaPercentage,
      beasiswaAmount,
      finalAmount,
      reason: reason || '-',
    };

    const updatedNotes = `${cleanNotes ? cleanNotes + ' | ' : ''}BEASISWA_INFO: ${JSON.stringify(beasiswaInfo)}`;

    const updated = await this.prisma.tagihan.update({
      where: { id: tagihanId },
      data: {
        amount: finalAmount,
        notes: updatedNotes,
      },
    });

    this.logger.log(
      `Beasiswa ${beasiswaPercentage}% applied to tagihan ${tagihanId} for student ${tagihan.student.name}`,
    );

    return {
      tagihanId: updated.id,
      originalAmount,
      beasiswaPercentage,
      beasiswaAmount,
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

    // Parse discount or beasiswa info from notes
    const beasiswaMatch = tagihan.notes?.match(/BEASISWA_INFO:\s*(\{.*?\})/);
    const discountMatch = tagihan.notes?.match(/DISCOUNT_INFO:\s*(\{.*?\})/);
    if (!beasiswaMatch && !discountMatch) {
      throw new Error(
        'Tagihan ini tidak memiliki diskon/beasiswa yang dapat dihapus',
      );
    }

    let originalAmount = tagihan.amount;
    try {
      if (beasiswaMatch) {
        const beasiswaInfo = JSON.parse(beasiswaMatch[1]);
        originalAmount = beasiswaInfo.originalAmount || tagihan.amount;
      } else if (discountMatch) {
        const discountInfo = JSON.parse(discountMatch[1]);
        originalAmount = discountInfo.originalAmount || tagihan.amount;
      }
    } catch {
      throw new Error('Gagal memparse informasi diskon/beasiswa');
    }

    // Restore original amount (SERVER-SIDE) and clean notes
    const updatedNotes = (tagihan.notes || '')
      .replace(/\s*\|\s*BEASISWA_INFO:\s*\{.*?\}/g, '')
      .replace(/^BEASISWA_INFO:\s*\{.*?\}/g, '')
      .replace(/\s*\|\s*DISCOUNT_INFO:\s*\{.*?\}/g, '')
      .replace(/^DISCOUNT_INFO:\s*\{.*?\}/g, '')
      .trim();

    const updated = await this.prisma.tagihan.update({
      where: { id: tagihanId },
      data: {
        amount: originalAmount,
        notes: updatedNotes || null,
      },
    });

    this.logger.log(`Discount/Beasiswa removed from tagihan ${tagihanId}`);

    return {
      tagihanId: updated.id,
      restoredAmount: updated.amount,
    };
  }

  async getStudentDiscounts(studentId: string) {
    const tagihans = await this.prisma.tagihan.findMany({
      where: {
        studentId,
        OR: [
          { notes: { contains: 'BEASISWA_INFO' } },
          { notes: { contains: 'DISCOUNT_INFO' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return tagihans.map((t) => {
      const beasiswaMatch = t.notes?.match(/BEASISWA_INFO:\s*(\{.*?\})/);
      const discountMatch = t.notes?.match(/DISCOUNT_INFO:\s*(\{.*?\})/);
      let info: any = null;
      if (beasiswaMatch) {
        try {
          info = JSON.parse(beasiswaMatch[1]);
        } catch {}
      } else if (discountMatch) {
        try {
          const discountInfo = JSON.parse(discountMatch[1]);
          info = {
            originalAmount: discountInfo.originalAmount,
            beasiswaPercentage: discountInfo.discountPercentage,
            beasiswaAmount: discountInfo.discountAmount,
            reason: discountInfo.reason,
          };
        } catch {}
      }

      return {
        id: t.id,
        type: t.type,
        originalAmount: info?.originalAmount || t.amount,
        beasiswaPercentage: info?.beasiswaPercentage || 0,
        beasiswaAmount: info?.beasiswaAmount || 0,
        finalAmount: t.amount,
        status: t.status,
        createdAt: t.createdAt,
        reason: info?.reason || '-',
      };
    });
  }

  // ============================================================
  // REKAPITULASI (dari tagihan yang sudah LUNAS & ANGSURAN)
  // ============================================================
  async getRecapitulasi(year: number, month?: number) {
    // Dynamic distinct types or standard types
    const types = [
      'SPP',
      'DPP',
      'INFAQ',
      'AKADEMIK',
      'SEKOLAH',
      'SERAGAM',
      'UKS',
      'UKA',
    ];

    // Tagihan LUNAS / ANGSURAN tahunan
    const yearlyPaid = await this.prisma.tagihan.findMany({
      where: { year, status: { in: ['LUNAS', 'ANGSURAN'] } },
      select: { type: true, amount: true, amountPaid: true, status: true },
    });

    // Tagihan LUNAS / ANGSURAN bulanan
    const monthlyPaid = month
      ? await this.prisma.tagihan.findMany({
          where: { year, month, status: { in: ['LUNAS', 'ANGSURAN'] } },
          select: { type: true, amount: true, amountPaid: true, status: true },
        })
      : [];

    // Tagihan BELUM LUNAS / Sisa ANGSURAN (piutang)
    const yearlyUnpaid = await this.prisma.tagihan.findMany({
      where: { year, status: { in: ['BELUM_LUNAS', 'ANGSURAN'] } },
      select: { type: true, amount: true, amountPaid: true, status: true },
    });

    // Tren bulanan (penerimaan tagihan per bulan dalam setahun)
    const trendPaid = await this.prisma.tagihan.findMany({
      where: {
        year,
        status: { in: ['LUNAS', 'ANGSURAN'] },
        NOT: { month: null },
      },
      select: { month: true, amount: true, amountPaid: true, status: true },
    });

    const buildSummary = (
      items: {
        type: string;
        amount: number;
        amountPaid?: number | null;
        status?: string;
      }[],
      isUnpaid = false,
    ) =>
      types.map((t) => {
        const filtered = items.filter(
          (p) => p.type.toUpperCase() === t.toUpperCase(),
        );
        const total = filtered.reduce((s, p) => {
          if (isUnpaid) {
            return s + Math.max(0, p.amount - (p.amountPaid || 0));
          }
          return s + (p.amountPaid || (p.status === 'LUNAS' ? p.amount : 0));
        }, 0);
        return {
          type: t,
          total,
          count: filtered.length,
        };
      });

    const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const total = trendPaid
        .filter((p) => p.month === m)
        .reduce(
          (s, p) => s + (p.amountPaid || (p.status === 'LUNAS' ? p.amount : 0)),
          0,
        );
      return { month: m, total };
    });

    return {
      year,
      month: month ?? null,
      yearly: buildSummary(yearlyPaid),
      monthly: buildSummary(monthlyPaid),
      unpaid: buildSummary(yearlyUnpaid, true),
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

  /** Get unpaid tagihans for student based on userId or studentId */
  async getMyUnpaidTagihan(userId: string, studentId?: string) {
    let student: any = null;

    if (studentId) {
      student = await this.prisma.student.findUnique({
        where: { id: studentId },
        include: {
          class: { select: { name: true } },
        },
      });
    }

    if (!student) {
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

      student = user?.student;
      if (!student) {
        // Cek apakah user adalah wali murid
        const parentUser = await this.prisma.user.findUnique({
          where: { id: userId },
          include: {
            parentProfile: {
              include: {
                students: {
                  include: {
                    student: {
                      include: {
                        class: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (parentUser?.parentProfile?.students?.length) {
          student = parentUser.parentProfile.students[0].student as any;
        }
      }
    }

    if (!student) {
      student = await this.prisma.student.findFirst({
        where: {
          OR: [{ userId: userId }, ...(userId ? [{ id: userId }] : [])],
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
      } as any,
    });

    return {
      student: {
        id: student.id,
        name: student.name,
        nis: student.nis,
        nisn: student.nisn,
        virtualAccount: student.virtualAccount,
        className: student.class?.name || '-',
      },
      tagihans,
    };
  }

  /** Get ALL tagihans (paid and unpaid) for student based on userId or studentId (for Laporan Keuangan Siswa) */
  async getMyAllTagihan(userId: string, studentId?: string) {
    if (studentId) {
      const student = await (this.prisma.student as any).findUnique({
        where: { id: studentId },
        include: {
          class: { select: { name: true } },
          tagihans: {
            orderBy: { createdAt: 'desc' },
            include: { payments: { orderBy: { paymentDate: 'desc' } } },
          },
        },
      });
      if (student) {
        return student;
      }
    }

    const user: any = await this.prisma.user.findUnique({
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
        parentProfile: {
          include: {
            students: {
              include: {
                student: {
                  include: {
                    class: { select: { name: true } },
                    tagihans: {
                      orderBy: { createdAt: 'desc' },
                      include: {
                        payments: { orderBy: { paymentDate: 'desc' } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      } as any,
    });

    let student = user?.student;
    if (!student && user?.parentProfile?.students?.length) {
      student = user.parentProfile.students[0].student;
    }

    if (!student) {
      student = await (this.prisma.student as any).findFirst({
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
  // ============================================================
  // AUTOMATIC BILLING (CRON)
  // ============================================================

  /**
   * Run every day at 01:00 AM.
   * Checks if SPP for the current month and year has been generated for all active students.
   * If not, it creates a new tagihan synchronized with ProgramConfig and student scholarships.
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async generateMonthlySPP() {
    this.logger.log('Running automatic SPP generation check...');

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    // Default SPP fallback
    const DEFAULT_SPP_AMOUNT = 300000;

    // Get all students with program and scholarship data
    const students = await this.prisma.student.findMany({
      select: {
        id: true,
        name: true,
        program: true,
        beasiswaSppPct: true,
        beasiswaPercentage: true,
        beasiswaReason: true,
      },
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
        // Fetch SPP baseline from ProgramConfig
        let sppAmount = DEFAULT_SPP_AMOUNT;
        if (student.program) {
          const progConfig =
            (await this.prisma.programConfig.findUnique({
              where: { code: student.program },
            })) ||
            (await this.prisma.programConfig.findFirst({
              where: { code: { equals: student.program, mode: 'insensitive' } },
            }));

          if (progConfig && progConfig.defaultSpp > 0) {
            sppAmount = progConfig.defaultSpp;
          }
        }

        const calculatedAmount = Math.round(sppAmount);
        let finalAmount = calculatedAmount;
        const pct = student.beasiswaSppPct || student.beasiswaPercentage || 0;
        let notes = `Tagihan otomatis SPP ${currentMonth}/${currentYear} - Program: ${student.program || 'reguler'}`;
        let status = 'BELUM_LUNAS';
        let paidDate: Date | null = null;

        if (pct > 0) {
          const beasiswaAmount = Math.round(calculatedAmount * (pct / 100));
          finalAmount = Math.max(0, calculatedAmount - beasiswaAmount);
          const beasiswaInfo = {
            originalAmount: calculatedAmount,
            beasiswaPercentage: pct,
            beasiswaAmount,
            finalAmount,
            reason: student.beasiswaReason || 'Beasiswa Default Siswa',
          };
          notes = `${notes} | BEASISWA_INFO: ${JSON.stringify(beasiswaInfo)}`;
          if (finalAmount === 0) {
            status = 'LUNAS';
            paidDate = new Date();
          }
        }

        // Generate new tagihan
        const dueDate = new Date(currentYear, currentMonth - 1, 10); // Due on the 10th of the month

        await this.prisma.tagihan.create({
          data: {
            studentId: student.id,
            type: 'SPP',
            amount: finalAmount,
            month: currentMonth,
            year: currentYear,
            dueDate,
            status,
            paidDate,
            notes,
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
    const whereTagihan: any = { status: { in: ['LUNAS', 'ANGSURAN'] } };

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

    // 1. Ambil semua Pemasukan (Tagihan Lunas & Angsuran)
    const tagihans = await this.prisma.tagihan.findMany({
      where: whereTagihan,
      select: {
        type: true,
        amount: true,
        amountPaid: true,
        status: true,
        paidDate: true,
      },
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
      const nominal = t.amountPaid || (t.status === 'LUNAS' ? t.amount : 0);
      totalPemasukan += nominal;
      rincianPemasukan[t.type] = (rincianPemasukan[t.type] || 0) + nominal;
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
      historyPemasukan: tagihans
        .filter((t) => t.paidDate)
        .sort((a, b) => b.paidDate!.getTime() - a.paidDate!.getTime()),
      historyPengeluaran: pengeluarans.sort(
        (a, b) => b.date.getTime() - a.date.getTime(),
      ),
    };
  }

  // ============================================================
  // DANA BANTUAN (Grants / Aid Funds)
  // ============================================================
  async getDanaBantuan(
    year?: number,
    month?: number,
    kategori?: string,
    status?: string,
  ) {
    const where: any = {};
    if (year) {
      if (month) {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59, 999);
        where.tanggal = { gte: start, lte: end };
      } else {
        const start = new Date(year, 0, 1);
        const end = new Date(year, 11, 31, 23, 59, 59, 999);
        where.tanggal = { gte: start, lte: end };
      }
    }
    if (kategori && kategori !== 'ALL') {
      where.kategori = kategori;
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }

    return this.prisma.danaBantuan.findMany({
      where,
      include: {
        user: { select: { name: true } },
      },
      orderBy: { tanggal: 'desc' },
    });
  }

  async createDanaBantuan(data: any, userId: string) {
    if (!data.namaBantuan || !data.nominal) {
      throw new BadRequestException('Nama Bantuan dan Nominal wajib diisi');
    }

    return this.prisma.danaBantuan.create({
      data: {
        namaBantuan: data.namaBantuan,
        kategori: data.kategori || 'SISWA',
        sumberDana: data.sumberDana || 'Yayasan',
        nominal: parseFloat(data.nominal),
        penerima: data.penerima || null,
        tanggal: data.tanggal ? new Date(data.tanggal) : new Date(),
        status: data.status || 'DISETUJUI',
        keterangan: data.keterangan || null,
        targetSync: data.targetSync || 'KEUANGAN_KELUAR',
        recordedBy: userId,
      },
    });
  }

  async updateDanaBantuan(id: string, data: any) {
    const existing = await this.prisma.danaBantuan.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Data bantuan tidak ditemukan');
    }

    return this.prisma.danaBantuan.update({
      where: { id },
      data: {
        namaBantuan:
          data.namaBantuan !== undefined
            ? data.namaBantuan
            : existing.namaBantuan,
        kategori:
          data.kategori !== undefined ? data.kategori : existing.kategori,
        sumberDana:
          data.sumberDana !== undefined ? data.sumberDana : existing.sumberDana,
        nominal:
          data.nominal !== undefined
            ? parseFloat(data.nominal)
            : existing.nominal,
        penerima:
          data.penerima !== undefined ? data.penerima : existing.penerima,
        tanggal: data.tanggal ? new Date(data.tanggal) : existing.tanggal,
        status: data.status !== undefined ? data.status : existing.status,
        keterangan:
          data.keterangan !== undefined ? data.keterangan : existing.keterangan,
        targetSync:
          data.targetSync !== undefined ? data.targetSync : existing.targetSync,
      },
    });
  }

  async deleteDanaBantuan(id: string) {
    return this.prisma.danaBantuan.delete({
      where: { id },
    });
  }

  async syncDanaBantuan(
    id: string,
    targetSync: string | undefined,
    userId: string,
  ) {
    const dana = await this.prisma.danaBantuan.findUnique({ where: { id } });
    if (!dana) {
      throw new NotFoundException('Data bantuan tidak ditemukan');
    }

    const syncTarget = targetSync || dana.targetSync || 'KEUANGAN_KELUAR';
    let syncedRefId: string | null = null;

    if (syncTarget === 'KEUANGAN_KELUAR' || syncTarget === 'PENGGAJIAN') {
      const expCategory =
        syncTarget === 'PENGGAJIAN'
          ? 'PENGGAJIAN'
          : dana.kategori === 'OPERASIONAL'
            ? 'OPERASIONAL'
            : 'BANTUAN';
      const titlePrefix =
        syncTarget === 'PENGGAJIAN'
          ? '[Insentif/Bantuan Gaji]'
          : '[Dana Bantuan]';
      const createdExp = await this.prisma.pengeluaran.create({
        data: {
          title: `${titlePrefix} ${dana.namaBantuan}${dana.penerima ? ' - ' + dana.penerima : ''}`,
          description:
            dana.keterangan ||
            `Sinkronisasi Bantuan ${dana.sumberDana} (${dana.kategori})`,
          amount: dana.nominal,
          category: expCategory,
          date: dana.tanggal,
          recordedBy: userId,
        },
      });
      syncedRefId = createdExp.id;
    }

    return this.prisma.danaBantuan.update({
      where: { id },
      data: {
        isSynced: true,
        syncedAt: new Date(),
        targetSync: syncTarget,
        syncedReferenceId: syncedRefId,
      },
    });
  }

  async exportRekapKeuanganKelas(classId: string): Promise<Buffer> {
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        homeroomTeacher: {
          include: { user: true },
        },
        students: {
          orderBy: { name: 'asc' },
          include: {
            tagihans: {
              include: { payments: true },
            },
          },
        },
      },
    });

    if (!cls) {
      throw new NotFoundException('Kelas tidak ditemukan');
    }

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Rekap Keuangan - ${cls.name}`);

    // Header Title (Kop Laporan Cetak Kelas)
    worksheet.mergeCells('A1:J1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `REKAPAN KEUANGAN SISWA KELAS ${cls.name.toUpperCase()}`;
    titleCell.font = { name: 'Arial', size: 14, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells('A2:J2');
    const subCell = worksheet.getCell('A2');
    subCell.value = `Tahun Ajaran: ${cls.academicYear || '2026/2027'} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`;
    subCell.font = { name: 'Arial', size: 10, italic: true };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.addRow([]);

    // Information Box: Kelas & Wali Kelas
    const waliKelasName =
      (cls.homeroomTeacher as any)?.user?.name ||
      (cls.homeroomTeacher as any)?.name ||
      'Belum Ditentukan';

    const infoRow1 = worksheet.addRow([
      '  KELAS',
      '',
      `: ${cls.name}`,
      '',
      '',
      'WALI KELAS',
      '',
      `: ${waliKelasName}`,
    ]);
    infoRow1.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true };
    });
    worksheet.mergeCells(`A${infoRow1.number}:B${infoRow1.number}`);
    worksheet.mergeCells(`C${infoRow1.number}:E${infoRow1.number}`);
    worksheet.mergeCells(`F${infoRow1.number}:G${infoRow1.number}`);
    worksheet.mergeCells(`H${infoRow1.number}:J${infoRow1.number}`);

    const infoRow2 = worksheet.addRow([
      '  JUMLAH SISWA',
      '',
      `: ${cls.students.length} Siswa`,
      '',
      '',
      'STATUS CETAK',
      '',
      ': DOKUMEN RESMI KELAS',
    ]);
    infoRow2.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, italic: true };
    });
    worksheet.mergeCells(`A${infoRow2.number}:B${infoRow2.number}`);
    worksheet.mergeCells(`C${infoRow2.number}:E${infoRow2.number}`);
    worksheet.mergeCells(`F${infoRow2.number}:G${infoRow2.number}`);
    worksheet.mergeCells(`H${infoRow2.number}:J${infoRow2.number}`);

    worksheet.addRow([]);

    // Table Headers
    const headers = [
      'No',
      'Nama',
      'Frekuensi/Bulan',
      'Bulan',
      'SPP',
      'Tag Kelas Non DPP',
      'UKS',
      'UIS/UAK',
      'DPP',
      'Total Siswa',
    ];
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = {
        name: 'Arial',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFF' },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1E3A8A' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    const monthNamesShort = [
      'JUL',
      'AGT',
      'SEP',
      'OKT',
      'NOV',
      'DES',
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MEI',
      'JUN',
    ];

    let rowIndex = 1;
    let grandTotalSpp = 0;
    let grandTotalNonDpp = 0;
    let grandTotalUks = 0;
    let grandTotalUis = 0;
    let grandTotalDpp = 0;
    let grandTotalAll = 0;
    let totalFrekuensi = 0;

    for (const student of cls.students) {
      const sppTagihans = student.tagihans.filter(
        (t) => t.type === 'SPP' && t.status === 'LUNAS',
      );
      const frekuensi = sppTagihans.length;
      totalFrekuensi += frekuensi;

      let bulanStr = '-';
      if (frekuensi > 0) {
        const monthsPaid = sppTagihans
          .map((t) => t.month)
          .filter((m): m is number => m !== null && m >= 1 && m <= 12)
          .sort((a, b) => a - b);

        if (monthsPaid.length === 1) {
          bulanStr = monthNamesShort[monthsPaid[0] - 1] || `${monthsPaid[0]}`;
        } else if (monthsPaid.length > 1) {
          const firstMonth =
            monthNamesShort[monthsPaid[0] - 1] || `${monthsPaid[0]}`;
          const lastMonth =
            monthNamesShort[monthsPaid[monthsPaid.length - 1] - 1] ||
            `${monthsPaid[monthsPaid.length - 1]}`;
          bulanStr = `${firstMonth}-${lastMonth}`;
        }
      }

      const totalSppPaid = sppTagihans.reduce(
        (sum, t) => sum + (t.amountPaid || t.amount),
        0,
      );

      const nonDppTagihans = student.tagihans.filter(
        (t) =>
          !['SPP', 'DPP', 'UKS', 'UIS', 'UAK'].includes(t.type.toUpperCase()),
      );
      const tagKelasNonDpp = nonDppTagihans.reduce(
        (sum, t) =>
          sum + (t.amountPaid || (t.status === 'LUNAS' ? t.amount : 0)),
        0,
      );

      const uksPaid = student.tagihans
        .filter((t) => t.type.toUpperCase() === 'UKS')
        .reduce(
          (sum, t) =>
            sum + (t.amountPaid || (t.status === 'LUNAS' ? t.amount : 0)),
          0,
        );

      const uisPaid = student.tagihans
        .filter((t) => ['UIS', 'UAK', 'UIS/UAK'].includes(t.type.toUpperCase()))
        .reduce(
          (sum, t) =>
            sum + (t.amountPaid || (t.status === 'LUNAS' ? t.amount : 0)),
          0,
        );

      const dppPaid = student.tagihans
        .filter((t) => t.type.toUpperCase() === 'DPP')
        .reduce(
          (sum, t) =>
            sum + (t.amountPaid || (t.status === 'LUNAS' ? t.amount : 0)),
          0,
        );

      const rowTotal =
        totalSppPaid + tagKelasNonDpp + uksPaid + uisPaid + dppPaid;

      grandTotalSpp += totalSppPaid;
      grandTotalNonDpp += tagKelasNonDpp;
      grandTotalUks += uksPaid;
      grandTotalUis += uisPaid;
      grandTotalDpp += dppPaid;
      grandTotalAll += rowTotal;

      const dataRow = worksheet.addRow([
        rowIndex++,
        student.name,
        frekuensi,
        bulanStr,
        totalSppPaid,
        tagKelasNonDpp,
        uksPaid,
        uisPaid,
        dppPaid,
        rowTotal,
      ]);

      dataRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        if (colNumber === 1 || colNumber === 3 || colNumber === 4) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber >= 5) {
          cell.numFmt = '#,##0';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    }

    // Add Summary Total Row at the bottom
    const summaryRow = worksheet.addRow([
      'JUMLAH TOTAL',
      '',
      totalFrekuensi,
      '-',
      grandTotalSpp,
      grandTotalNonDpp,
      grandTotalUks,
      grandTotalUis,
      grandTotalDpp,
      grandTotalAll,
    ]);

    worksheet.mergeCells(`A${summaryRow.number}:B${summaryRow.number}`);

    summaryRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 11, bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F3F4F6' },
      };
      cell.border = {
        top: { style: 'double' },
        left: { style: 'thin' },
        bottom: { style: 'double' },
        right: { style: 'thin' },
      };
      if (colNumber === 1 || colNumber === 3 || colNumber === 4) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colNumber >= 5) {
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    });

    // Adjust Column Widths
    worksheet.columns = [
      { width: 6 }, // No
      { width: 28 }, // Nama
      { width: 16 }, // Frekuensi/Bulan
      { width: 16 }, // Bulan
      { width: 15 }, // SPP
      { width: 22 }, // Tag Kelas Non DPP
      { width: 15 }, // UKS
      { width: 15 }, // UIS/UAK
      { width: 18 }, // DPP
      { width: 20 }, // Total Siswa
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ============================================================
  // VIRTUAL ACCOUNT (BNI) MANAGEMENT & IMPORT
  // ============================================================

  /** Get list of students with their Virtual Account numbers & active tagihan calculation */
  async getVirtualAccounts(classId?: string, search?: string) {
    const where: any = {};

    if (classId) {
      where.classId = classId;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { nis: { contains: q, mode: 'insensitive' } },
        { nisn: { contains: q, mode: 'insensitive' } },
        { virtualAccount: { contains: q, mode: 'insensitive' } },
      ];
    }

    const studentsData = await (this.prisma.student as any).findMany({
      where,
      select: {
        id: true,
        nis: true,
        nisn: true,
        name: true,
        gender: true,
        virtualAccount: true,
        class: {
          select: {
            id: true,
            name: true,
            gradeLevel: true,
          },
        },
        tagihans: {
          select: {
            amount: true,
            amountPaid: true,
            status: true,
          },
        },
      },
      orderBy: [
        { class: { gradeLevel: 'asc' } },
        { class: { name: 'asc' } },
        { name: 'asc' },
      ],
    });

    let totalNominalVaActive = 0;
    let totalUnpaidNominal = 0;

    const students = studentsData.map((s: any) => {
      const tagihans = s.tagihans || [];
      const totalTagihan = tagihans.reduce(
        (sum: number, t: any) => sum + (t.amount || 0),
        0,
      );
      const totalLunas = tagihans.reduce((sum: number, t: any) => {
        if (t.status === 'LUNAS') return sum + (t.amount || 0);
        return sum + (t.amountPaid || 0);
      }, 0);
      const sisaTagihan = Math.max(0, totalTagihan - totalLunas);

      totalUnpaidNominal += sisaTagihan;
      if (s.virtualAccount) {
        totalNominalVaActive += sisaTagihan;
      }

      return {
        id: s.id,
        nis: s.nis,
        nisn: s.nisn,
        name: s.name,
        gender: s.gender,
        virtualAccount: s.virtualAccount,
        class: s.class,
        totalTagihan,
        totalLunas,
        sisaTagihan,
        tagihanCount: tagihans.length,
        statusTagihan:
          tagihans.length === 0
            ? 'TANPA_TAGIHAN'
            : sisaTagihan === 0
              ? 'LUNAS'
              : 'ADA_TAGIHAN',
      };
    });

    const totalStudents = students.length;
    const countWithVa = students.filter((s: any) => !!s.virtualAccount).length;
    const countWithoutVa = totalStudents - countWithVa;

    return {
      stats: {
        totalStudents,
        countWithVa,
        countWithoutVa,
        totalNominalVaActive,
        totalUnpaidNominal,
      },
      students,
    };
  }

  /** Import Virtual Account in mass using NIS as relation key with strict deduplication */
  async importVirtualAccounts(
    items: { nis: string; virtualAccount: string; name?: string }[],
  ) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Data import tidak boleh kosong');
    }

    let successCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors: { nis: string; name?: string; reason: string }[] = [];

    // Pre-fetch all students by NIS to make processing fast and efficient
    const allNisList = items
      .map((i) => (i.nis ? String(i.nis).trim() : ''))
      .filter((n) => n.length > 0);

    const existingStudents = await (this.prisma.student as any).findMany({
      where: {
        nis: { in: allNisList },
      },
      select: {
        id: true,
        nis: true,
        name: true,
        virtualAccount: true,
      },
    });

    const studentMap = new Map<string, any>();
    existingStudents.forEach((s: any) => {
      studentMap.set(s.nis, s);
    });

    for (const item of items) {
      const cleanNis = item.nis ? String(item.nis).trim() : '';
      const cleanVa = item.virtualAccount
        ? String(item.virtualAccount).trim()
        : '';

      if (!cleanNis) {
        failedCount++;
        errors.push({
          nis: '-',
          name: item.name,
          reason: 'NIS tidak valid / kosong',
        });
        continue;
      }

      if (!cleanVa) {
        failedCount++;
        errors.push({
          nis: cleanNis,
          name: item.name,
          reason: 'Kode Virtual Account tidak boleh kosong',
        });
        continue;
      }

      const student = studentMap.get(cleanNis);
      if (!student) {
        failedCount++;
        errors.push({
          nis: cleanNis,
          name: item.name,
          reason: `Siswa dengan NIS ${cleanNis} tidak ditemukan di database`,
        });
        continue;
      }

      // PREVENT DUPLICATION / UNNEEDED DB WRITES:
      // Jika nomor VA di database sudah ADA dan SAMA PERSIS dengan file import, lewati (SKIP).
      if (student.virtualAccount === cleanVa) {
        skippedCount++;
        continue;
      }

      try {
        const isUpdate = !!student.virtualAccount;
        await (this.prisma.student as any).update({
          where: { id: student.id },
          data: { virtualAccount: cleanVa },
        });

        if (isUpdate) {
          updatedCount++;
        } else {
          successCount++;
        }
      } catch (err: any) {
        failedCount++;
        errors.push({
          nis: cleanNis,
          name: student.name || item.name,
          reason: err.message || 'Gagal menyimpan Virtual Account',
        });
      }
    }

    return {
      message: `Import selesai. ${successCount} baru, ${updatedCount} diperbarui, ${skippedCount} dilewati (identik), ${failedCount} gagal.`,
      summary: {
        total: items.length,
        successCount,
        updatedCount,
        skippedCount,
        failedCount,
      },
      errors,
    };
  }

  /** Update or clear Virtual Account for a single student */
  async updateStudentVirtualAccount(
    studentId: string,
    virtualAccount: string | null,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Siswa tidak ditemukan');

    const cleanVa =
      virtualAccount && virtualAccount.trim() ? virtualAccount.trim() : null;

    const updated = await (this.prisma.student as any).update({
      where: { id: studentId },
      data: { virtualAccount: cleanVa },
      select: {
        id: true,
        nis: true,
        name: true,
        virtualAccount: true,
      },
    });

    return {
      message: cleanVa
        ? 'Nomor Virtual Account berhasil diperbarui'
        : 'Nomor Virtual Account berhasil dihapus',
      student: updated,
    };
  }

  /** Generate Excel template for Virtual Account import */
  async generateVirtualAccountTemplate() {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template VA Siswa');

    worksheet.columns = [
      { header: 'NIS', key: 'nis', width: 18 },
      { header: 'Nama Siswa', key: 'name', width: 32 },
      { header: 'Kode Virtual Account', key: 'virtualAccount', width: 25 },
      { header: 'Bank', key: 'bank', width: 12 },
    ];

    // Style Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.font = {
      name: 'Arial',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFF' },
    };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '005E36' }, // Hijau Khas Muhammadiyah
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Pre-populate template with ALL active master students from database (TU/Superadmin)
    const masterStudents = await (this.prisma.student as any).findMany({
      select: {
        nis: true,
        name: true,
        virtualAccount: true,
        class: { select: { name: true } },
      },
      orderBy: [{ class: { name: 'asc' } }, { name: 'asc' }],
    });

    if (masterStudents.length > 0) {
      masterStudents.forEach((s: any) => {
        worksheet.addRow({
          nis: s.nis || '',
          name: s.name || '',
          virtualAccount: s.virtualAccount || '',
          bank: 'BNI',
        });
      });
    } else {
      worksheet.addRow({
        nis: '12345',
        name: 'Contoh Siswa A',
        virtualAccount: '988880012345',
        bank: 'BNI',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
