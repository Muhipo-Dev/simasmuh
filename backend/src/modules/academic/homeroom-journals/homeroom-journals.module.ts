import { Module } from '@nestjs/common';
import { HomeroomJournalsController } from './homeroom-journals.controller';
import { HomeroomJournalsService } from './homeroom-journals.service';

@Module({
  controllers: [HomeroomJournalsController],
  providers: [HomeroomJournalsService],
})
export class HomeroomJournalsModule {}
