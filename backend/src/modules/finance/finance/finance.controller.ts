import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import {
  StudentOwnershipGuard,
  FinanceOperationGuard,
} from '../../core/auth/permission.guard';
import {
  RequirePermissions,
  PaymentPermission,
} from '../../core/auth/roles.decorator';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ----- Payroll Summary & Management -----
  @Get('payroll-summary')
  @RequirePermissions(PaymentPermission.VIEW_FINANCIAL_REPORTS)
  getPayrollSummary(
    @Req() req: any,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const userSubRoles = [
      req.user?.subRole,
      req.user?.subRole2,
      req.user?.subRole3,
      req.user?.subRole4,
      req.user?.subRole5,
      req.user?.role,
    ];
    const isKeuanganStaff = userSubRoles.some((r) =>
      [
        'KEUANGAN_ALL',
        'KEUANGAN_MASUK',
        'KEUANGAN_KELUAR',
        'SUPERADMIN',
        'ADMIN_IT',
        'KEPALA_SEKOLAH',
      ].includes(r),
    );

    if (!isKeuanganStaff) {
      throw new ForbiddenException(
        'Akses ditolak. Penggajian pegawai hanya dapat diakses oleh bagian Keuangan / Superadmin.',
      );
    }

    const currentYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month, 10) : new Date().getMonth() + 1;

    return this.financeService.getPayrollSummary(currentYear, currentMonth);
  }

  @Post('payroll/save-record')
  @RequirePermissions(PaymentPermission.CREATE_BILLS)
  async savePayrollRecord(
    @Req() req: any,
    @Body()
    body: {
      userId: string;
      year: number;
      month: number;
      employmentStatus?: string;
      totalHours: number;
      hourlyRate: number;
      manualAllowances?: { name: string; amount: number }[];
      manualDeductions?: { name: string; amount: number }[];
      notes?: string;
    },
  ) {
    const userSubRoles = [
      req.user?.subRole,
      req.user?.subRole2,
      req.user?.subRole3,
      req.user?.subRole4,
      req.user?.subRole5,
      req.user?.role,
    ];
    const isKeuanganAll = userSubRoles.some((r) =>
      ['KEUANGAN_ALL', 'SUPERADMIN', 'ADMIN_IT'].includes(r),
    );

    if (!isKeuanganAll) {
      throw new ForbiddenException(
        'Akses ditolak. Pengaturan komponen penggajian hanya dapat diubah oleh Keuangan All / Superadmin.',
      );
    }

    return this.financeService.savePayrollRecord(
      body.userId,
      body.year,
      body.month,
      body,
    );
  }

  @Patch('payroll/employment-status/:userId')
  @RequirePermissions(PaymentPermission.CREATE_BILLS)
  async updateStaffEmploymentStatus(
    @Req() req: any,
    @Param('userId') userId: string,
    @Body('employmentStatus') employmentStatus: string,
  ) {
    const userSubRoles = [
      req.user?.subRole,
      req.user?.subRole2,
      req.user?.subRole3,
      req.user?.subRole4,
      req.user?.subRole5,
      req.user?.role,
    ];
    const isKeuanganAll = userSubRoles.some((r) =>
      ['KEUANGAN_ALL', 'SUPERADMIN', 'ADMIN_IT'].includes(r),
    );

    if (!isKeuanganAll) {
      throw new ForbiddenException(
        'Akses ditolak. Pengaturan status kepegawaian hanya dapat diubah oleh Keuangan All / Superadmin.',
      );
    }

    return this.financeService.updateStaffEmploymentStatus(
      userId,
      employmentStatus,
    );
  }

  @Patch('payroll/bank-account/:userId')
  @RequirePermissions(PaymentPermission.CREATE_BILLS)
  async updateStaffBankAccount(
    @Req() req: any,
    @Param('userId') userId: string,
    @Body() body: { bankName?: string; bankAccountNumber?: string; bankAccountHolder?: string },
  ) {
    const userSubRoles = [
      req.user?.subRole,
      req.user?.subRole2,
      req.user?.subRole3,
      req.user?.subRole4,
      req.user?.subRole5,
      req.user?.role,
    ];
    const isKeuanganAll = userSubRoles.some((r) =>
      ['KEUANGAN_ALL', 'SUPERADMIN', 'ADMIN_IT'].includes(r),
    );

    if (!isKeuanganAll) {
      throw new ForbiddenException(
        'Akses ditolak. Pengaturan rekening pegawai hanya dapat diubah oleh Keuangan All / Superadmin.',
      );
    }

    return this.financeService.updateStaffBankAccount(userId, body);
  }

  @Get('payroll/my-slip-gaji')
  async getMySlipGaji(
    @Req() req: any,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const currentYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month, 10) : new Date().getMonth() + 1;
    return this.financeService.getStaffSlipGaji(
      req.user?.id,
      currentYear,
      currentMonth,
    );
  }

  @Get('payroll/slip-gaji/:userId')
  @RequirePermissions(PaymentPermission.VIEW_FINANCIAL_REPORTS)
  async getStaffSlipGaji(
    @Req() req: any,
    @Param('userId') userId: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const currentYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month, 10) : new Date().getMonth() + 1;
    return this.financeService.getStaffSlipGaji(
      userId,
      currentYear,
      currentMonth,
    );
  }

  @Get('payroll/export-excel')
  @RequirePermissions(PaymentPermission.VIEW_FINANCIAL_REPORTS)
  async exportPayrollExcel(
    @Query('year') year: string,
    @Query('month') month: string,
    @Res() res: any,
  ) {
    const currentYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month, 10) : new Date().getMonth() + 1;
    const buffer = await this.financeService.generatePayrollExcel(
      currentYear,
      currentMonth,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Rekapitulasi_Penggajian_${currentMonth}_${currentYear}.xlsx`,
    );
    res.send(buffer);
  }

  // ----- Tagihan - Daftar Siswa -----
  @Get('students')
  @RequirePermissions(PaymentPermission.VIEW_ALL_BILLS)
  getStudentsWithTagihan(@Query('classId') classId?: string) {
    return this.financeService.getStudentsWithTagihan(classId);
  }

  // ----- Tagihan per Siswa -----
  @Get('students/:studentId/tagihan')
  getStudentTagihan(@Param('studentId') studentId: string) {
    return this.financeService.getStudentTagihan(studentId);
  }

  @Post('students/:studentId/tagihan')
  addTagihan(@Param('studentId') studentId: string, @Body() body: any) {
    return this.financeService.addTagihan(studentId, body);
  }

  // ----- Reset Tagihan Siswa (Restricted Password Verification) -----
  @Post('students/reset-tagihan')
  @RequirePermissions(PaymentPermission.DELETE_BILLS)
  @UseGuards(FinanceOperationGuard)
  async resetStudentTagihan(
    @Req() req: any,
    @Body() body: { studentIds: string[]; password: string },
  ) {
    return this.financeService.resetStudentTagihan(req.user?.id, body);
  }

  // ----- Tagihan Massal -----
  @Post('tagihan/massal')
  addTagihanMassal(@Body() body: any) {
    return this.financeService.addTagihanMassal(body);
  }

  // ----- Rilis Tagihan 1 Tahun Penuh (Massal) -----
  @Post('tagihan/release-yearly')
  @RequirePermissions(PaymentPermission.GENERATE_MASS_BILLS)
  @UseGuards(FinanceOperationGuard)
  releaseYearlyBills(@Req() req: any, @Body() body: any) {
    return this.financeService.releaseYearlyBills(req.user?.id, body);
  }

  // ----- Reset Rilis Tagihan 1 Tahun (Restricted Password Verification) -----
  @Post('tagihan/reset-yearly')
  @RequirePermissions(PaymentPermission.DELETE_BILLS)
  @UseGuards(FinanceOperationGuard)
  resetYearlyBills(@Req() req: any, @Body() body: any) {
    return this.financeService.resetYearlyBills(req.user?.id, body);
  }

  // ============================================================
  // SPP MASS INPUT PER CLASS (Server-Side Calculation)
  // ============================================================
  @Post('spp/mass-input')
  @RequirePermissions(PaymentPermission.GENERATE_MASS_BILLS)
  @UseGuards(FinanceOperationGuard)
  async massInputSPP(
    @Body()
    body: {
      classId: string;
      amount: number;
      month: number;
      year: number;
      dueDate?: string;
      notes?: string;
    },
  ) {
    return this.financeService.massInputSPP(body);
  }

  // ============================================================
  // DPP INPUT PER ANGKATAN (Server-Side Calculation with Kader Discount)
  // ============================================================
  @Post('dpp/input-angkatan')
  @RequirePermissions(PaymentPermission.GENERATE_MASS_BILLS)
  @UseGuards(FinanceOperationGuard)
  async inputDPPByAngkatan(
    @Body()
    body: {
      gradeLevel: number;
      baseAmount: number;
      dueDate?: string;
      notes?: string;
    },
  ) {
    return this.financeService.inputDPPByAngkatan(body);
  }

  // ============================================================
  // BEASISWA MANAGEMENT (Server-Side Only)
  // ============================================================
  @Post('beasiswa/:tagihanId')
  @RequirePermissions(PaymentPermission.CREATE_BILLS)
  async applyDiscount(
    @Param('tagihanId') tagihanId: string,
    @Body() body: { beasiswaPercentage: 25 | 50 | 75 | 100; reason?: string },
  ) {
    return this.financeService.applyDiscount(
      tagihanId,
      body.beasiswaPercentage,
      body.reason,
    );
  }

  @Delete('beasiswa/:tagihanId')
  @RequirePermissions(PaymentPermission.CREATE_BILLS)
  async removeDiscount(@Param('tagihanId') tagihanId: string) {
    return this.financeService.removeDiscount(tagihanId);
  }

  @Get('beasiswa/:studentId')
  @RequirePermissions(PaymentPermission.VIEW_ALL_BILLS)
  async getStudentDiscounts(@Param('studentId') studentId: string) {
    return this.financeService.getStudentDiscounts(studentId);
  }

  // ----- Operasi per Tagihan -----
  @Patch('tagihan/:tagihanId')
  updateTagihan(@Param('tagihanId') tagihanId: string, @Body() body: any) {
    return this.financeService.updateTagihan(tagihanId, body);
  }

  @Patch('tagihan/:tagihanId/lunasi')
  lunasiTagihan(@Param('tagihanId') tagihanId: string, @Body() body?: any) {
    return this.financeService.lunasiTagihan(tagihanId, body);
  }

  @Patch('tagihan/:tagihanId/batal-lunasi')
  batalLunasiTagihan(@Param('tagihanId') tagihanId: string) {
    return this.financeService.batalLunasiTagihan(tagihanId);
  }

  @Delete('tagihan/:tagihanId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTagihan(@Param('tagihanId') tagihanId: string) {
    return this.financeService.deleteTagihan(tagihanId);
  }

  // ----- Rekapitulasi -----
  @Get('rekap')
  @RequirePermissions(PaymentPermission.VIEW_FINANCIAL_REPORTS)
  getRecapitulasi(@Query('year') year: string, @Query('month') month?: string) {
    return this.financeService.getRecapitulasi(
      parseInt(year, 10),
      month ? parseInt(month, 10) : undefined,
    );
  }

  // ----- Automatic Tagihan (Manual Trigger) -----
  @Post('tagihan/generate-spp')
  @RequirePermissions(PaymentPermission.GENERATE_MASS_BILLS)
  @UseGuards(FinanceOperationGuard)
  generateMonthlySPP() {
    return this.financeService.generateMonthlySPP();
  }

  // ----- Student payment history (legacy) -----
  @Get('students/:studentId/payments')
  @UseGuards(StudentOwnershipGuard)
  getStudentPayments(@Param('studentId') studentId: string) {
    return this.financeService.getStudentPayments(studentId);
  }

  // ----- Student unpaid bills (for payment popup) -----
  @Get('my-tagihan')
  @RequirePermissions(PaymentPermission.VIEW_OWN_BILLS)
  getMyUnpaidTagihan(@Req() req: any, @Query('studentId') studentId?: string) {
    return this.financeService.getMyUnpaidTagihan(req.user?.id, studentId);
  }

  // ----- Student all bills (for Laporan Keuangan) -----
  @Get('my-all-tagihan')
  @RequirePermissions(PaymentPermission.VIEW_OWN_BILLS)
  getMyAllTagihan(@Req() req: any, @Query('studentId') studentId?: string) {
    return this.financeService.getMyAllTagihan(req.user?.id, studentId);
  }

  // ============================================================
  // PENGELUARAN (Expenses)
  // ============================================================
  @Get('pengeluaran')
  @RequirePermissions(PaymentPermission.VIEW_EXPENSES)
  getPengeluaran(@Query('year') year?: string, @Query('month') month?: string) {
    return this.financeService.getPengeluaran(
      year ? parseInt(year, 10) : undefined,
      month ? parseInt(month, 10) : undefined,
    );
  }

  @Post('pengeluaran')
  @RequirePermissions(PaymentPermission.CREATE_BILLS)
  createPengeluaran(@Body() body: any, @Req() req: any) {
    return this.financeService.createPengeluaran(body, req.user?.id);
  }

  @Delete('pengeluaran/:id')
  @RequirePermissions(PaymentPermission.DELETE_BILLS)
  deletePengeluaran(@Param('id') id: string) {
    return this.financeService.deletePengeluaran(id);
  }

  // ============================================================
  // LPJ (Laporan Pertanggung Jawaban)
  // ============================================================
  @Get('lpj')
  @RequirePermissions(PaymentPermission.VIEW_EXPENSES)
  getLpj(@Query('year') year: string, @Query('month') month?: string) {
    return this.financeService.getLpj(
      year ? parseInt(year, 10) : new Date().getFullYear(),
      month ? parseInt(month, 10) : undefined,
    );
  }

  // ============================================================
  // DANA BANTUAN (Grants / Aid Funds)
  // ============================================================
  @Get('dana-bantuan')
  @RequirePermissions(PaymentPermission.VIEW_FINANCIAL_REPORTS)
  getDanaBantuan(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('kategori') kategori?: string,
    @Query('status') status?: string,
  ) {
    return this.financeService.getDanaBantuan(
      year ? parseInt(year, 10) : undefined,
      month ? parseInt(month, 10) : undefined,
      kategori,
      status,
    );
  }

  @Post('dana-bantuan')
  @RequirePermissions(PaymentPermission.CREATE_BILLS)
  createDanaBantuan(@Body() body: any, @Req() req: any) {
    return this.financeService.createDanaBantuan(body, req.user?.id);
  }

  @Patch('dana-bantuan/:id')
  @RequirePermissions(PaymentPermission.CREATE_BILLS)
  updateDanaBantuan(@Param('id') id: string, @Body() body: any) {
    return this.financeService.updateDanaBantuan(id, body);
  }

  @Delete('dana-bantuan/:id')
  @RequirePermissions(PaymentPermission.DELETE_BILLS)
  deleteDanaBantuan(@Param('id') id: string) {
    return this.financeService.deleteDanaBantuan(id);
  }

  @Post('dana-bantuan/:id/sync')
  @RequirePermissions(PaymentPermission.CREATE_BILLS)
  syncDanaBantuan(
    @Param('id') id: string,
    @Body('targetSync') targetSync: string,
    @Req() req: any,
  ) {
    return this.financeService.syncDanaBantuan(id, targetSync, req.user?.id);
  }

  @Get('export-rekap-kelas')
  async exportRekapKelas(
    @Query('classId') classId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.financeService.exportRekapKeuanganKelas(classId);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=rekap_keuangan_kelas_${classId}.xlsx`,
    );
    res.send(buffer);
  }

  // ============================================================
  // REKAPITULASI 3 BULANAN (TRIWULAN) ENDPOINTS
  // ============================================================
  @Get('rekap-quarterly')
  @RequirePermissions(PaymentPermission.VIEW_FINANCIAL_REPORTS)
  getQuarterlyRecap(
    @Query('classId') classId: string,
    @Query('year') year?: string,
    @Query('quarter') quarter?: string,
  ) {
    const yr = year ? parseInt(year, 10) : new Date().getFullYear();
    const qtr = quarter ? parseInt(quarter, 10) : 1;
    return this.financeService.getQuarterlyRecap(classId, yr, qtr);
  }

  @Get('export-rekap-triwulan')
  @RequirePermissions(PaymentPermission.VIEW_FINANCIAL_REPORTS)
  async exportRekapTriwulan(
    @Query('classId') classId: string,
    @Query('year') year: string,
    @Query('quarter') quarter: string,
    @Res() res: Response,
  ) {
    const yr = year ? parseInt(year, 10) : new Date().getFullYear();
    const qtr = quarter ? parseInt(quarter, 10) : 1;
    const buffer = await this.financeService.exportRekapTriwulanExcel(
      classId,
      yr,
      qtr,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=rekap_triwulan_${qtr}_kelas_${classId}.xlsx`,
    );
    res.send(buffer);
  }

  // ============================================================
  // VIRTUAL ACCOUNT (BNI) ENDPOINTS
  // ============================================================
  @Get('virtual-accounts')
  @RequirePermissions(PaymentPermission.VIEW_ALL_BILLS)
  getVirtualAccounts(
    @Query('classId') classId?: string,
    @Query('search') search?: string,
  ) {
    return this.financeService.getVirtualAccounts(classId, search);
  }

  @Post('virtual-accounts/import')
  @RequirePermissions(PaymentPermission.CREATE_BILLS)
  importVirtualAccounts(
    @Body() items: { nis: string; virtualAccount: string; name?: string }[],
  ) {
    return this.financeService.importVirtualAccounts(items);
  }

  @Patch('virtual-accounts/:studentId')
  @RequirePermissions(PaymentPermission.CREATE_BILLS)
  updateStudentVirtualAccount(
    @Param('studentId') studentId: string,
    @Body('virtualAccount') virtualAccount: string | null,
  ) {
    return this.financeService.updateStudentVirtualAccount(
      studentId,
      virtualAccount,
    );
  }

  @Get('virtual-accounts/export-template')
  @RequirePermissions(PaymentPermission.VIEW_ALL_BILLS)
  async exportVirtualAccountTemplate(@Res() res: Response) {
    const buffer = await this.financeService.generateVirtualAccountTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=template_import_virtual_account_siswa.xlsx',
    );
    res.send(buffer);
  }
}
