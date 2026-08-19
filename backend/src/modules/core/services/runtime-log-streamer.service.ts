import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { SupabaseStorageService } from './supabase-storage.service';
import { LogCompressionService } from './log-compression.service';
import { PrismaService } from '../prisma/prisma.service';

export interface RuntimeLogLine {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  context: string;
  message: string;
  meta?: any;
}

@Injectable()
export class RuntimeLogStreamerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RuntimeLogStreamerService.name);
  private logBuffer: RuntimeLogLine[] = [];
  private flushIntervalTimer: NodeJS.Timeout | null = null;
  private readonly MAX_BUFFER_ITEMS = 500;
  private readonly FLUSH_INTERVAL_MS = 5 * 60 * 1000; // 5 menit

  constructor(
    private readonly supabaseStorage: SupabaseStorageService,
    private readonly compressionService: LogCompressionService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.startPeriodicFlush();
    this.captureProcessEvents();
  }

  onModuleDestroy() {
    if (this.flushIntervalTimer) {
      clearInterval(this.flushIntervalTimer);
    }
    // Flush data terakhir sebelum shutdown
    this.flushCompressedLogsSync();
  }

  /**
   * Menambahkan baris log aplikasi runtime / development ke buffer memori
   */
  pushLog(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', context: string, message: string, meta?: any) {
    const cleanMessage = typeof message === 'string' 
      ? message.replace(/\x1b\[[0-9;]*m/g, '').trim() // Hapus ansi color codes
      : JSON.stringify(message);

    this.logBuffer.push({
      timestamp: new Date().toISOString(),
      level,
      context: context || 'Application',
      message: cleanMessage,
      meta,
    });

    if (this.logBuffer.length >= this.MAX_BUFFER_ITEMS) {
      this.flushToSupabase().catch((err) => {
        this.logger.error(`Error auto-flushing runtime logs: ${err?.message || err}`);
      });
    }
  }

  /**
   * Mulai timer kompresi dan upload berkala
   */
  private startPeriodicFlush() {
    this.flushIntervalTimer = setInterval(() => {
      if (this.logBuffer.length > 0) {
        this.flushToSupabase().catch((err) => {
          this.logger.error(`Periodic runtime log flush error: ${err?.message || err}`);
        });
      }
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Menangkap unhandled error dan crash agar tetap terkompresi aman di Supabase
   */
  private captureProcessEvents() {
    process.on('unhandledRejection', (reason: any) => {
      this.pushLog('ERROR', 'UnhandledRejection', reason?.stack || reason?.message || String(reason));
    });

    process.on('uncaughtException', (err: Error) => {
      this.pushLog('ERROR', 'UncaughtException', err.stack || err.message);
      this.flushCompressedLogsSync();
    });
  }

  /**
   * Kompresi dan unggah buffer runtime/dev log ke Supabase Storage sekecil-kecilnya
   */
  async flushToSupabase(category = 'RUNTIME'): Promise<{ success: boolean; filename?: string; originalBytes?: number; compressedBytes?: number }> {
    if (this.logBuffer.length === 0) {
      return { success: true };
    }

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const timestampStr = `${yearMonth}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const filename = `runtime_log_${timestampStr}.json.gz`;
    const storagePath = `runtime/${yearMonth}/${filename}`;

    const payload = {
      meta: {
        school: 'SMA Muhammadiyah 1 Ponorogo',
        system: 'SIMASMUH Runtime & Dev Log Engine',
        environment: process.env.NODE_ENV || 'production',
        flushedAt: now.toISOString(),
        totalLines: logsToFlush.length,
        algorithm: 'GZIP_LEVEL_9',
      },
      logs: logsToFlush,
    };

    // Kompresi maksimal (Level 9)
    const compressionResult = this.compressionService.compressGzip(payload);

    // Upload ke bucket Supabase
    const uploadRes = await this.supabaseStorage.uploadCompressedBuffer(
      'system-logs',
      storagePath,
      compressionResult.compressedBuffer,
      'application/gzip',
    );

    if (uploadRes.success) {
      try {
        await this.prisma.compressedLogArchive.create({
          data: {
            filename,
            storagePath,
            bucketName: 'system-logs',
            category: category === 'DEV' ? 'DEV' : 'RUNTIME',
            originalSizeBytes: compressionResult.originalSizeBytes,
            compressedSizeBytes: compressionResult.compressedSizeBytes,
            compressionRatio: compressionResult.compressionRatioPercent,
            compressionAlgo: 'GZIP_LEVEL_9',
            recordCount: logsToFlush.length,
            startDate: new Date(logsToFlush[0]?.timestamp || now),
            endDate: new Date(logsToFlush[logsToFlush.length - 1]?.timestamp || now),
            checksumSha256: compressionResult.checksumSha256,
            uploadedToSupabase: true,
            supabaseUrl: uploadRes.url,
            notes: `Runtime/Dev log terkompresi ${compressionResult.compressionRatioPercent}% (${this.compressionService.formatBytes(compressionResult.savedBytes)} hemat)`,
          },
        });
      } catch (dbErr: any) {
        this.logger.warn(`Failed to record runtime archive metadata: ${dbErr?.message || dbErr}`);
      }
    }

    return {
      success: uploadRes.success,
      filename,
      originalBytes: compressionResult.originalSizeBytes,
      compressedBytes: compressionResult.compressedSizeBytes,
    };
  }

  /**
   * Flush sinkron darurat saat aplikasi mati
   */
  private flushCompressedLogsSync() {
    if (this.logBuffer.length === 0) return;
    try {
      const logsToFlush = [...this.logBuffer];
      this.logBuffer = [];
      const payload = {
        meta: { system: 'SIMASMUH Emergency Shutdown Log', flushedAt: new Date().toISOString() },
        logs: logsToFlush,
      };
      this.compressionService.compressGzip(payload);
    } catch {}
  }
}
