import { Module } from '@nestjs/common';
import { TeachingJournalsController } from './teaching-journals.controller';
import { TeachingJournalsService } from './teaching-journals.service';

@Module({
  controllers: [TeachingJournalsController],
  providers: [TeachingJournalsService]
})
export class TeachingJournalsModule {}
