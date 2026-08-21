import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { FaceAttendanceService, FaceCameraConfig } from './face-attendance.service';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import { Roles, UserRole, SubRole } from '../../core/auth/roles.decorator';

@Controller('face-attendance')
export class FaceAttendanceController {
  constructor(private readonly faceAttendanceService: FaceAttendanceService) {}

  @Get('config')
  getConfig() {
    return this.faceAttendanceService.getConfig();
  }

  @Put('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SUPERADMIN',
    UserRole.ADMIN_IT,
    UserRole.ADMIN_TU,
    UserRole.BAU,
    UserRole.TATA_USAHA,
    SubRole.ADMIN_TU,
    SubRole.BAU,
  )
  updateConfig(@Body() data: Partial<FaceCameraConfig>) {
    return this.faceAttendanceService.updateConfig(data);
  }

  @Get('users-dataset')
  getUsersDataset() {
    return this.faceAttendanceService.getUsersDataset();
  }

  @Post('sync-dataset')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SUPERADMIN',
    UserRole.ADMIN_IT,
    UserRole.ADMIN_TU,
    UserRole.BAU,
    UserRole.TATA_USAHA,
    SubRole.ADMIN_TU,
    SubRole.BAU,
  )
  syncDataset() {
    return this.faceAttendanceService.syncProfiles();
  }

  @Post('sync-user')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SUPERADMIN',
    UserRole.ADMIN_IT,
    UserRole.ADMIN_TU,
    UserRole.BAU,
    UserRole.TATA_USAHA,
    SubRole.ADMIN_TU,
    SubRole.BAU,
  )
  syncUser(@Body() body: any) {
    return this.faceAttendanceService.syncSingleUser(body);
  }

  @Post('record')
  recordAttendance(
    @Body()
    body: {
      userId: string;
      confidence: number;
      secretKey?: string;
      cameraLocation?: string;
    },
  ) {
    return this.faceAttendanceService.recordFaceAttendance(body);
  }

  @Get('logs')
  getLogs() {
    return this.faceAttendanceService.getRecentLogs();
  }

  @Post('logs/clear')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SUPERADMIN',
    UserRole.ADMIN_IT,
    UserRole.ADMIN_TU,
    UserRole.BAU,
    UserRole.TATA_USAHA,
    SubRole.ADMIN_TU,
    SubRole.BAU,
  )
  clearLogs(@Body('resetDb') resetDb?: boolean) {
    return this.faceAttendanceService.clearLogs(resetDb !== false);
  }

  @Post('logs/delete/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SUPERADMIN',
    UserRole.ADMIN_IT,
    UserRole.ADMIN_TU,
    UserRole.BAU,
    UserRole.TATA_USAHA,
    SubRole.ADMIN_TU,
    SubRole.BAU,
  )
  deleteSingleLogPost(@Param('id') id: string, @Body('resetDb') resetDb?: boolean) {
    return this.faceAttendanceService.deleteSingleLog(id, resetDb !== false);
  }

  @Delete('logs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SUPERADMIN',
    UserRole.ADMIN_IT,
    UserRole.ADMIN_TU,
    UserRole.BAU,
    UserRole.TATA_USAHA,
    SubRole.ADMIN_TU,
    SubRole.BAU,
  )
  deleteSingleLog(@Param('id') id: string, @Query('resetDb') resetDb?: string) {
    return this.faceAttendanceService.deleteSingleLog(id, resetDb !== 'false');
  }

  @Get('service-status')
  getServiceStatus() {
    return this.faceAttendanceService.getAiServiceStatus();
  }

  @Post('service/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SUPERADMIN',
    UserRole.ADMIN_IT,
    UserRole.ADMIN_TU,
    UserRole.BAU,
    UserRole.TATA_USAHA,
    SubRole.ADMIN_TU,
    SubRole.BAU,
  )
  startAiService() {
    return this.faceAttendanceService.startAiWorker();
  }

  @Post('service/stop')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'SUPERADMIN',
    UserRole.ADMIN_IT,
    UserRole.ADMIN_TU,
    UserRole.BAU,
    UserRole.TATA_USAHA,
    SubRole.ADMIN_TU,
    SubRole.BAU,
  )
  stopAiService() {
    return this.faceAttendanceService.stopAiWorker();
  }

  @Post('scan-frame')
  scanFrame(@Body('image') image: string) {
    return this.faceAttendanceService.scanFrame(image);
  }
}
