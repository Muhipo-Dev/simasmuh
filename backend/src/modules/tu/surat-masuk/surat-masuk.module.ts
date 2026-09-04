import { Module } from '@nestjs/common';
import { SuratMasukService } from './surat-masuk.service';
import { SuratMasukController } from './surat-masuk.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { NotificationsModule } from '../../communication/notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [SuratMasukController],
  providers: [SuratMasukService],
  exports: [SuratMasukService],
})
export class SuratMasukModule {}
