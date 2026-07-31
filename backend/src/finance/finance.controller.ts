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
  UseGuards,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { StudentOwnershipGuard, FinanceOperationGuard } from '../auth/permission.guard';
import { Roles, RequirePermissions, PaymentPermission, UserRole, SubRole } from '../auth/roles.decorator';

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

  // ----- Tagihan Massal -----
  @Post('tagihan/massal')
  addTagihanMassal(@Body() body: any) {
    return this.financeService.addTagihanMassal(body);
  }

  // ----- Operasi per Tagihan -----
  @Patch('tagihan/:tagihanId')
  updateTagihan(@Param('tagihanId') tagihanId: string, @Body() body: any) {
    return this.financeService.updateTagihan(tagihanId, body);
  }

  @Patch('tagihan/:tagihanId/lunasi')
  lunasiTagihan(@Param('tagihanId') tagihanId: string) {
    return this.financeService.lunasiTagihan(tagihanId);
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
  getLpj(
    @Query('year') year: string,
    @Query('month') month?: string,
  ) {
    return this.financeService.getLpj(
      year ? parseInt(year, 10) : new Date().getFullYear(),
      month ? parseInt(month, 10) : undefined,
    );
  }
}
