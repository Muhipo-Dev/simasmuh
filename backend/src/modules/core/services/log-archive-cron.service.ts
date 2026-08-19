import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SystemLogService } from './system-log.service';

@Injectable()
export class LogArchiveCronService {
  private readonly logger = new Logger(LogArchiveCronService.name);

  constructor(private readonly systemLogService: SystemLogService) {}

  /**
   * Cron berkala setiap 6 jam untuk mengarsipkan log ke Supabase secara terkompresi
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async handlePeriodicArchive() {
    this.logger.log('⏰ Running periodic compressed log archiving to Supabase Storage...');
    try {
      const res = await this.systemLogService.archiveLogsToSupabase({
        category: 'ALL',
        algorithm: 'GZIP_LEVEL_9',
      });
      this.logger.log(`✅ Periodic archiving result: ${JSON.stringify(res.metrics || res.message)}`);
    } catch (err: any) {
      this.logger.error(`❌ Periodic archiving failed: ${err?.message || err}`);
    }
  }

  /**
   * Cron harian setiap jam 23:55 malam untuk konsolidasi arsip harian
   */
  @Cron('55 23 * * *')
  async handleDailyMidnightArchive() {
    this.logger.log('🌙 Running daily midnight compressed log consolidation...');
    try {
      const res = await this.systemLogService.archiveLogsToSupabase({
        category: 'ALL',
        forceAll: false,
        algorithm: 'GZIP_LEVEL_9',
      });
      this.logger.log(`✅ Daily log archive stored in Supabase: ${JSON.stringify(res.metrics || res.message)}`);
    } catch (err: any) {
      this.logger.error(`❌ Daily archiving failed: ${err?.message || err}`);
    }
  }
}
