import { Module } from '@nestjs/common';
import { AttendancesController } from './attendances.controller';
import { AttendancesService } from './attendances.service';
import { PrismaService } from '../../core/prisma/prisma.service';

@Module({
  controllers: [AttendancesController],
  providers: [AttendancesService, PrismaService],
})
export class AttendancesModule {}
