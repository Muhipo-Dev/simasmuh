import { Controller, Get, Post, Put, Body, UseGuards } from '@nestjs/common';
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
  clearLogs() {
    return this.faceAttendanceService.clearLogs();
  }
}
