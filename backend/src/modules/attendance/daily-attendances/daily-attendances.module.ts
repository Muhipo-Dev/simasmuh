import { Module } from '@nestjs/common';
import { DailyAttendancesService } from './daily-attendances.service';
import { DailyAttendancesController } from './daily-attendances.controller';
import { PrismaService } from '../../core/prisma/prisma.service';
import { IzinKeluarModule } from '../izin-keluar/izin-keluar.module';
import { WhatsAppModule } from '../../communication/whatsapp/whatsapp.module';
import { NotificationsModule } from '../../communication/notifications/notifications.module';

@Module({
  imports: [IzinKeluarModule, WhatsAppModule, NotificationsModule],
  providers: [DailyAttendancesService, PrismaService],
  controllers: [DailyAttendancesController],
})
export class DailyAttendancesModule {}
