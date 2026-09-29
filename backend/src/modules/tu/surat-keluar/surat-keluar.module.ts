import { Module } from '@nestjs/common';
import { SuratKeluarController } from './surat-keluar.controller';
import { SuratKeluarService } from './surat-keluar.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { SystemLogModule } from '../../core/system-log/system-log.module';
import { NotificationsModule } from '../../communication/notifications/notifications.module';

@Module({
  imports: [PrismaModule, SystemLogModule, NotificationsModule],
  controllers: [SuratKeluarController],
  providers: [SuratKeluarService],
  exports: [SuratKeluarService],
})
export class SuratKeluarModule {}
