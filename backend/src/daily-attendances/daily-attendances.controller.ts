import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { DailyAttendancesService } from './daily-attendances.service';

@Controller('daily-attendances')
export class DailyAttendancesController {
  constructor(
    private readonly dailyAttendancesService: DailyAttendancesService,
  ) {}

  @Get('qr')
  getQrToken() {
    return this.dailyAttendancesService.getQrToken();
  }

  @Post('scan')
  scanQr(@Body('userId') userId: string, @Body('token') token: string) {
    return this.dailyAttendancesService.scanQr(userId, token);
  }

  @Get('today')
  getTodayAttendance(@Query('userId') userId?: string) {
    return this.dailyAttendancesService.getTodayAttendance(userId);
  }

  @Get('staff/summary')
  getStaffAttendanceSummary(@Query('date') date?: string) {
    return this.dailyAttendancesService.getStaffAttendanceSummary(date);
  }

  @Get('history')
  getHistory(@Query('userId') userId: string) {
    return this.dailyAttendancesService.getHistory(userId);
  }

  @Get('monthly')
  getMonthlyLog(
    @Query('userId') userId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.dailyAttendancesService.getMonthlyLog(
      userId,
      parseInt(year, 10),
      parseInt(month, 10),
    );
  }
}
