import { Module } from '@nestjs/common';
import { CharacterAssessmentsService } from './character-assessments.service';
import { CharacterAssessmentsController } from './character-assessments.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { WhatsAppModule } from '../../communication/whatsapp/whatsapp.module';
import { SystemLogModule } from '../../core/system-log/system-log.module';
import { NotificationsModule } from '../../communication/notifications/notifications.module';

@Module({
  imports: [PrismaModule, WhatsAppModule, SystemLogModule, NotificationsModule],
  controllers: [CharacterAssessmentsController],
  providers: [CharacterAssessmentsService],
  exports: [CharacterAssessmentsService],
})
export class CharacterAssessmentsModule {}
