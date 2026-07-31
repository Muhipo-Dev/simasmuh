import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service';
import { PaymentNotificationsService } from './payment-notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationListenersService } from './notification-listeners.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),
    ScheduleModule.forRoot(),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    PaymentNotificationsService,
    NotificationsGateway,
    NotificationListenersService,
    PrismaService,
  ],
  exports: [
    NotificationsService,
    PaymentNotificationsService,
    NotificationsGateway,
    NotificationListenersService,
  ],
})
export class NotificationsModule {}