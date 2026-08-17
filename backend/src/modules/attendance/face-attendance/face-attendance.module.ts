import { Module } from '@nestjs/common';
import { FaceAttendanceService } from './face-attendance.service';
import { FaceAttendanceController } from './face-attendance.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FaceAttendanceController],
  providers: [FaceAttendanceService],
  exports: [FaceAttendanceService],
})
export class FaceAttendanceModule {}
