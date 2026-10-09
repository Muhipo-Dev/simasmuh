import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemLogService } from '../services/system-log.service';
import { DatabaseBackupService } from '../services/database-backup.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [SystemLogService, DatabaseBackupService],
  exports: [SystemLogService, DatabaseBackupService],
})
export class SystemLogModule {}
