import { Module } from '@nestjs/common';
import { GuestBookController } from './guest-book.controller';
import { GuestBookService } from './guest-book.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { SystemLogModule } from '../../core/system-log/system-log.module';
import { NotificationsModule } from '../../communication/notifications/notifications.module';

@Module({
  imports: [PrismaModule, SystemLogModule, NotificationsModule],
  controllers: [GuestBookController],
  providers: [GuestBookService],
  exports: [GuestBookService],
})
export class GuestBookModule {}
