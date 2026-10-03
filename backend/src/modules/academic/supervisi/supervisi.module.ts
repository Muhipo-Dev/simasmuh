import { Module } from '@nestjs/common';
import { SupervisiController } from './supervisi.controller';
import { SupervisiService } from './supervisi.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { SystemLogModule } from '../../core/system-log/system-log.module';

@Module({
  imports: [PrismaModule, SystemLogModule],
  controllers: [SupervisiController],
  providers: [SupervisiService],
  exports: [SupervisiService],
})
export class SupervisiModule {}
