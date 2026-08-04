import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { AuthModule } from '../../core/auth/auth.module';
import { PrismaService } from '../../core/prisma/prisma.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { FinanceCalculationModule } from '../finance-calculation/finance-calculation.module';

@Module({
  imports: [AuthModule, EventEmitterModule, FinanceCalculationModule],
  controllers: [FinanceController],
  providers: [FinanceService, PrismaService],
  exports: [FinanceService],
})
export class FinanceModule {}
