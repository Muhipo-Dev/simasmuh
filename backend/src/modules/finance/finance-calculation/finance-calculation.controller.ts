import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { FinanceCalculationService } from './finance-calculation.service';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import {
  RequirePermissions,
  PaymentPermission,
} from '../../core/auth/roles.decorator';

@Controller('finance-calculation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceCalculationController {
  constructor(
    private readonly financeCalculationService: FinanceCalculationService,
  ) {}

  // ============================================================
  // SPP CALCULATIONS
  // ============================================================

  @Get('spp/:studentId')
  @RequirePermissions(PaymentPermission.VIEW_ALL_BILLS)
  async calculateSPP(
    @Param('studentId') studentId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.financeCalculationService.calculateSPPAmount(
      studentId,
      parseInt(month, 10),
      parseInt(year, 10),
    );
  }

  @Post('spp/bulk')
  @RequirePermissions(PaymentPermission.GENERATE_MASS_BILLS)
  async calculateBulkSPP(
    @Body() body: { studentIds: string[]; month: number; year: number },
  ) {
    const results = await this.financeCalculationService.calculateBulkSPP(
      body.studentIds,
      body.month,
      body.year,
    );
    return Object.fromEntries(results);
  }

  // ============================================================
  // DPP CALCULATIONS
  // ============================================================

  @Get('dpp/:studentId')
  @RequirePermissions(PaymentPermission.VIEW_ALL_BILLS)
  async calculateDPP(@Param('studentId') studentId: string) {
    return this.financeCalculationService.calculateDPPAmount(studentId);
  }

  // ============================================================
  // BEASISWA CALCULATIONS
  // ============================================================

  @Post('beasiswa/:studentId')
  @RequirePermissions(PaymentPermission.VIEW_ALL_BILLS)
  async calculateBeasiswa(
    @Param('studentId') studentId: string,
    @Body() body: { originalAmount: number; beasiswaType?: string },
  ) {
    return this.financeCalculationService.calculateStudentBeasiswa(
      studentId,
      body.originalAmount,
      body.beasiswaType,
    );
  }

  @Post('beasiswa/:studentId/final')
  @RequirePermissions(PaymentPermission.VIEW_ALL_BILLS)
  async calculateFinalBill(
    @Param('studentId') studentId: string,
    @Body() body: { baseAmount: number; applicableBeasiswa?: string[] },
  ) {
    return this.financeCalculationService.calculateFinalBillAmount(
      studentId,
      body.baseAmount,
      body.applicableBeasiswa,
    );
  }

  // ============================================================
  // PAYROLL CALCULATIONS
  // ============================================================

  @Get('payroll/:userId')
  @RequirePermissions(PaymentPermission.VIEW_FINANCIAL_REPORTS)
  async calculateMonthlySalary(
    @Param('userId') userId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.financeCalculationService.calculateMonthlySalary(
      userId,
      parseInt(year, 10),
      parseInt(month, 10),
    );
  }

  @Get('payroll-summary')
  @RequirePermissions(PaymentPermission.VIEW_FINANCIAL_REPORTS)
  async getPayrollSummary(
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.financeCalculationService.calculatePayrollSummary(
      parseInt(year, 10),
      month ? parseInt(month, 10) : new Date().getMonth() + 1,
    );
  }

  // ============================================================
  // FINANCIAL SUMMARY CALCULATIONS
  // ============================================================

  @Get('revenue')
  @RequirePermissions(PaymentPermission.VIEW_FINANCIAL_REPORTS)
  async calculateRevenue(
    @Query('year') year: string,
    @Query('month') month?: string,
  ) {
    return this.financeCalculationService.calculateTotalRevenue(
      parseInt(year, 10),
      month ? parseInt(month, 10) : undefined,
    );
  }

  @Get('expenses')
  @RequirePermissions(PaymentPermission.VIEW_FINANCIAL_REPORTS)
  async calculateExpenses(
    @Query('year') year: string,
    @Query('month') month?: string,
  ) {
    return this.financeCalculationService.calculateTotalExpenses(
      parseInt(year, 10),
      month ? parseInt(month, 10) : undefined,
    );
  }

  @Get('balance')
  @RequirePermissions(PaymentPermission.VIEW_FINANCIAL_REPORTS)
  async calculateBalance(
    @Query('year') year: string,
    @Query('month') month?: string,
  ) {
    return this.financeCalculationService.calculateFinancialBalance(
      parseInt(year, 10),
      month ? parseInt(month, 10) : undefined,
    );
  }

  // ============================================================
  // STUDENT BILLING CALCULATIONS
  // ============================================================

  @Get('student/:studentId/outstanding')
  @RequirePermissions(PaymentPermission.VIEW_ALL_BILLS)
  async calculateOutstanding(@Param('studentId') studentId: string) {
    return this.financeCalculationService.calculateStudentOutstandingBills(
      studentId,
    );
  }

  @Post('student/:studentId/payment-plan')
  @RequirePermissions(PaymentPermission.VIEW_ALL_BILLS)
  async calculatePaymentPlan(
    @Param('studentId') studentId: string,
    @Body() body: { totalAmount: number; months?: number },
  ) {
    return this.financeCalculationService.calculatePaymentPlan(
      studentId,
      body.totalAmount,
      body.months,
    );
  }
}
