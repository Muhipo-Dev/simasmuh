import { Module } from '@nestjs/common';
import { FaceAttendanceService } from './face-attendance.service';
import { FaceAttendanceController } from './face-attendance.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { NotificationsModule } from '../../communication/notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [FaceAttendanceController],
  providers: [FaceAttendanceService],
  exports: [FaceAttendanceService],
})
export class FaceAttendanceModule {}
