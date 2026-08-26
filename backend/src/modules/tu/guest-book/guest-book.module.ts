import { Module } from '@nestjs/common';
import { GuestBookController } from './guest-book.controller';
import { GuestBookService } from './guest-book.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { SystemLogModule } from '../../core/system-log/system-log.module';
import { WhatsAppModule } from '../../communication/whatsapp/whatsapp.module';

@Module({
  imports: [PrismaModule, SystemLogModule, WhatsAppModule],
  controllers: [GuestBookController],
  providers: [GuestBookService],
  exports: [GuestBookService],
})
export class GuestBookModule {}
