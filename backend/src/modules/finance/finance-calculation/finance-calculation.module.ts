import { Module } from '@nestjs/common';
import { FinanceCalculationController } from './finance-calculation.controller';
import { FinanceCalculationService } from './finance-calculation.service';
import { PrismaService } from '../../core/prisma/prisma.service';

@Module({
  controllers: [FinanceCalculationController],
  providers: [FinanceCalculationService, PrismaService],
  exports: [FinanceCalculationService],
})
export class FinanceCalculationModule {}
