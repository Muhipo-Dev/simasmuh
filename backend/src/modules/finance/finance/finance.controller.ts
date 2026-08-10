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

  // ----- Payroll (existing) -----
  @Get('payroll-summary')
  @RequirePermissions(PaymentPermission.VIEW_FINANCIAL_REPORTS)
  getPayrollSummary(
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.financeService.getPayrollSummary(
      parseInt(year, 10),
      parseInt(month, 10),
    );
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
  // DISCOUNT MANAGEMENT (Server-Side Only)
  // ============================================================
  @Post('discount/:tagihanId')
  @RequirePermissions(PaymentPermission.CREATE_BILLS)
  async applyDiscount(
    @Param('tagihanId') tagihanId: string,
    @Body() body: { discountPercentage: 25 | 50 | 75 | 100; reason?: string },
  ) {
    return this.financeService.applyDiscount(
      tagihanId,
      body.discountPercentage,
      body.reason,
    );
  }

  @Delete('discount/:tagihanId')
  @RequirePermissions(PaymentPermission.CREATE_BILLS)
  async removeDiscount(@Param('tagihanId') tagihanId: string) {
    return this.financeService.removeDiscount(tagihanId);
  }

  @Get('discount/:studentId')
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
  getMyUnpaidTagihan(@Req() req: any) {
    return this.financeService.getMyUnpaidTagihan(req.user?.id);
  }

  // ----- Student all bills (for Laporan Keuangan) -----
  @Get('my-all-tagihan')
  @RequirePermissions(PaymentPermission.VIEW_OWN_BILLS)
  getMyAllTagihan(@Req() req: any) {
    return this.financeService.getMyAllTagihan(req.user?.id);
  }

  // ============================================================
  // PENGELUARAN (Expenses)
  // ============================================================
  @Get('pengeluaran')
  @RequirePermissions(PaymentPermission.VIEW_FINANCIAL_REPORTS)
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
  @RequirePermissions(PaymentPermission.VIEW_FINANCIAL_REPORTS)
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
}

