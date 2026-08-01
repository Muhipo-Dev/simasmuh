import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IzinKeluarController } from './izin-keluar.controller';
import { IzinKeluarService } from './izin-keluar.service';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [IzinKeluarController],
  providers: [IzinKeluarService],
  exports: [IzinKeluarService],
})
export class IzinKeluarModule {}
