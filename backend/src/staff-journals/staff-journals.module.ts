import { Module } from '@nestjs/common';
import { StaffJournalsController } from './staff-journals.controller';
import { StaffJournalsService } from './staff-journals.service';

import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StaffJournalsController],
  providers: [StaffJournalsService],
})
export class StaffJournalsModule {}
