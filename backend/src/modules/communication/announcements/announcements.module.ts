import { Module } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsController } from './announcements.controller';
import { SystemAnnouncementsService } from './system-announcements.service';
import { SystemAnnouncementsController } from './system-announcements.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [AnnouncementsController, SystemAnnouncementsController],
  providers: [AnnouncementsService, SystemAnnouncementsService],
  exports: [AnnouncementsService, SystemAnnouncementsService],
})
export class AnnouncementsModule {}
