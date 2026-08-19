import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseStorageService } from '../services/supabase-storage.service';
import { LogCompressionService } from '../services/log-compression.service';
import { SystemLogService } from '../services/system-log.service';
import { LogArchiveCronService } from '../services/log-archive-cron.service';
import { RuntimeLogStreamerService } from '../services/runtime-log-streamer.service';
import { HttpLoggingInterceptor } from '../interceptors/http-logging.interceptor';
import { SystemLogController } from '../controllers/system-log.controller';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [SystemLogController],
  providers: [
    SupabaseStorageService,
    LogCompressionService,
    SystemLogService,
    LogArchiveCronService,
    RuntimeLogStreamerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
  ],
  exports: [
    SupabaseStorageService,
    LogCompressionService,
    SystemLogService,
    RuntimeLogStreamerService,
  ],
})
export class SystemLogModule {}

