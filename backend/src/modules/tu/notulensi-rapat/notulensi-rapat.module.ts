import { Module } from '@nestjs/common';
import { NotulensiRapatController } from './notulensi-rapat.controller';
import { NotulensiRapatService } from './notulensi-rapat.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { SystemLogModule } from '../../core/system-log/system-log.module';

@Module({
  imports: [PrismaModule, SystemLogModule],
  controllers: [NotulensiRapatController],
  providers: [NotulensiRapatService],
  exports: [NotulensiRapatService],
})
export class NotulensiRapatModule {}
