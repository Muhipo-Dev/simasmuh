import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemLogService } from '../services/system-log.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [SystemLogService],
  exports: [SystemLogService],
})
export class SystemLogModule {}
