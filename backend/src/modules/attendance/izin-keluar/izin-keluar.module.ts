import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IzinKeluarController } from './izin-keluar.controller';
import { IzinKeluarService } from './izin-keluar.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { NotificationsModule } from '../../communication/notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'nailar-muhipo55',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [IzinKeluarController],
  providers: [IzinKeluarService],
  exports: [IzinKeluarService],
})
export class IzinKeluarModule {}
