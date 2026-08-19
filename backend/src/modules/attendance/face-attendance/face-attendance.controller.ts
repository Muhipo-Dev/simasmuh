import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { FaceAttendanceService, FaceCameraConfig } from './face-attendance.service';

@Controller('face-attendance')
export class FaceAttendanceController {
  constructor(private readonly faceAttendanceService: FaceAttendanceService) {}

  @Get('config')
  getConfig() {
    return this.faceAttendanceService.getConfig();
  }

  @Put('config')
  updateConfig(@Body() data: Partial<FaceCameraConfig>) {
    return this.faceAttendanceService.updateConfig(data);
  }

  @Get('users-dataset')
  getUsersDataset() {
    return this.faceAttendanceService.getUsersDataset();
  }

  @Post('sync-dataset')
  syncDataset() {
    return this.faceAttendanceService.syncProfiles();
  }

  @Post('sync-user')
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
  clearLogs(@Body('resetDb') resetDb?: boolean) {
    return this.faceAttendanceService.clearLogs(resetDb !== false);
  }

  @Post('logs/delete/:id')
  deleteSingleLogPost(@Param('id') id: string, @Body('resetDb') resetDb?: boolean) {
    return this.faceAttendanceService.deleteSingleLog(id, resetDb !== false);
  }

  @Delete('logs/:id')
  deleteSingleLog(@Param('id') id: string, @Query('resetDb') resetDb?: string) {
    return this.faceAttendanceService.deleteSingleLog(id, resetDb !== 'false');
  }

  @Get('service-status')
  getServiceStatus() {
    return this.faceAttendanceService.getAiServiceStatus();
  }

  @Post('service/start')
  startAiService() {
    return this.faceAttendanceService.startAiWorker();
  }

  @Post('service/stop')
  stopAiService() {
    return this.faceAttendanceService.stopAiWorker();
  }

  @Post('scan-frame')
  scanFrame(@Body('image') image: string) {
    return this.faceAttendanceService.scanFrame(image);
  }
}
