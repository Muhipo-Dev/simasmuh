import { Module } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsController } from './announcements.controller';
import { PrismaService } from '../../core/prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [AnnouncementsService, PrismaService],
  controllers: [AnnouncementsController],
})
export class AnnouncementsModule {}
