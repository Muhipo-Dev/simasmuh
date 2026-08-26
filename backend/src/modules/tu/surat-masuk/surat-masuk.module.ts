import { Module } from '@nestjs/common';
import { SuratMasukService } from './surat-masuk.service';
import { SuratMasukController } from './surat-masuk.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { WhatsAppModule } from '../../communication/whatsapp/whatsapp.module';

@Module({
  imports: [PrismaModule, WhatsAppModule],
  controllers: [SuratMasukController],
  providers: [SuratMasukService],
  exports: [SuratMasukService],
})
export class SuratMasukModule {}
