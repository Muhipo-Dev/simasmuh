import { Module } from '@nestjs/common';
import { PerangkatAjarService } from './perangkat-ajar.service';
import { PerangkatAjarController } from './perangkat-ajar.controller';
import { KurikulumModule } from '../kurikulum/kurikulum.module';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { NotificationsModule } from '../../communication/notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule, KurikulumModule],
  controllers: [PerangkatAjarController],
  providers: [PerangkatAjarService],
  exports: [PerangkatAjarService, KurikulumModule],
})
export class PerangkatAjarModule {}

