import { Module } from '@nestjs/common';
import { ExtracurricularService } from './extracurricular.service';
import { ExtracurricularController } from './extracurricular.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { SystemLogModule } from '../../core/system-log/system-log.module';

@Module({
  imports: [PrismaModule, SystemLogModule],
  controllers: [ExtracurricularController],
  providers: [ExtracurricularService],
  exports: [ExtracurricularService],
})
export class ExtracurricularModule {}
