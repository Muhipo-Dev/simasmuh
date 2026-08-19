import { Module, Global } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { PrismaService } from '../../core/prisma/prisma.service';

@Global()
@Module({
  controllers: [WhatsAppController],
  providers: [WhatsAppService, PrismaService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
