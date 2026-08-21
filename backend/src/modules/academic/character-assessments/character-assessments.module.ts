import { Module } from '@nestjs/common';
import { CharacterAssessmentsService } from './character-assessments.service';
import { CharacterAssessmentsController } from './character-assessments.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { WhatsAppModule } from '../../communication/whatsapp/whatsapp.module';
import { SystemLogModule } from '../../core/system-log/system-log.module';

@Module({
  imports: [PrismaModule, WhatsAppModule, SystemLogModule],
  controllers: [CharacterAssessmentsController],
  providers: [CharacterAssessmentsService],
  exports: [CharacterAssessmentsService],
})
export class CharacterAssessmentsModule {}
