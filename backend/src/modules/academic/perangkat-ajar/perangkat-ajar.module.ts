import { Module } from '@nestjs/common';
import { PerangkatAjarService } from './perangkat-ajar.service';
import { PerangkatAjarController } from './perangkat-ajar.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { NotificationsModule } from '../../communication/notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [PerangkatAjarController],
  providers: [PerangkatAjarService],
  exports: [PerangkatAjarService],
})
export class PerangkatAjarModule {}
