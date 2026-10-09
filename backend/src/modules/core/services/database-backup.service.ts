import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { PrismaService } from '../prisma/prisma.service';
import { SystemLogService } from './system-log.service';

const execAsync = promisify(exec);

@Injectable()
export class DatabaseBackupService {
  private readonly logger = new Logger(DatabaseBackupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly logService: SystemLogService,
  ) {}

  /**
   * Mendapatkan path folder penyimpanan backup terstandarisasi
   */
  getBackupDir(): string {
    const storageCandidates = [
      'D:\\simasmuh_storage\\backups',
      'C:\\simasmuh_storage\\backups',
      path.resolve(process.cwd(), 'storage', 'backups'),
      path.resolve(process.cwd(), '..', 'storage', 'backups'),
    ];

    for (const dir of storageCandidates) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        return dir;
      } catch {}
    }

    const fallbackDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    return fallbackDir;
  }

  /**
   * Menjalankan Backup Otomatis Terjadwal setiap hari pukul 02:00 WIB
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleScheduledDailyBackup() {
    this.logger.log('Menjalankan pencadangan database otomatis terjadwal (02:00 WIB)...');
    try {
      const res = await this.performBackup('AUTOMATED_CRON');
      if (res.success) {
        this.logger.log(`Pencadangan database otomatis selesai: ${res.filePath}`);
      }
    } catch (err: any) {
      this.logger.error(`Pencadangan otomatis gagal: ${err?.message || err}`);
    }
  }

  /**
   * Menjalankan eksekusi backup database Supabase Docker / PostgreSQL
   */
  async performBackup(triggerBy: string = 'MANUAL'): Promise<{
    success: boolean;
    fileName?: string;
    filePath?: string;
    sizeBytes?: number;
    error?: string;
  }> {
    const backupDir = this.getBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `simasmuh_db_backup_${timestamp}.sql`;
    const targetFilePath = path.join(backupDir, fileName);

    try {
      // 1. Coba pg_dump via docker container supabase_db_siakad-coba
      const dockerDumpCmd = `docker exec supabase_db_siakad-coba pg_dump -U postgres -d postgres --clean --if-exists > "${targetFilePath}"`;
      
      let isSuccess = false;
      try {
        await execAsync(dockerDumpCmd, { maxBuffer: 1024 * 1024 * 200 }); // 200MB buffer
        if (fs.existsSync(targetFilePath) && fs.statSync(targetFilePath).size > 1024) {
          isSuccess = true;
        }
      } catch (dockerErr) {
        this.logger.warn(`Docker pg_dump gagal: ${dockerErr}`);
      }

      // 2. Jika dump berhasil
      if (isSuccess) {
        const stats = fs.statSync(targetFilePath);
        
        await this.logService.log({
          category: 'SISTEM',
          level: 'INFO',
          action: 'DATABASE_BACKUP_SUCCESS',
          message: `Pencadangan basis data berhasil (${(stats.size / 1024 / 1024).toFixed(2)} MB)`,
          details: {
            fileName,
            filePath: targetFilePath,
            sizeBytes: stats.size,
            triggerBy,
          },
        });

        this.pruneOldBackups(backupDir, 14); // Simpan 14 backup terakhir

        return {
          success: true,
          fileName,
          filePath: targetFilePath,
          sizeBytes: stats.size,
        };
      }

      throw new Error('Gagal menghasilkan file backup database yang valid.');
    } catch (error: any) {
      this.logger.error(`Eksekusi backup database gagal: ${error?.message || error}`);
      await this.logService.log({
        category: 'SISTEM',
        level: 'ERROR',
        action: 'DATABASE_BACKUP_FAILED',
        message: `Gagal mencadangkan basis data: ${error?.message || error}`,
        details: { triggerBy, error: error?.message },
      });

      return {
        success: false,
        error: error?.message || 'Database backup failed',
      };
    }
  }

  /**
   * Menghapus file backup lama agar tidak memakan ruang penyimpanan
   */
  private pruneOldBackups(backupDir: string, maxFiles: number = 14) {
    try {
      const files = fs
        .readdirSync(backupDir)
        .filter((f) => f.startsWith('simasmuh_db_backup_') && f.endsWith('.sql'))
        .map((f) => ({
          name: f,
          path: path.join(backupDir, f),
          time: fs.statSync(path.join(backupDir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length > maxFiles) {
        const toDelete = files.slice(maxFiles);
        for (const file of toDelete) {
          try {
            fs.unlinkSync(file.path);
            this.logger.log(`Membersihkan arsip backup lama: ${file.name}`);
          } catch {}
        }
      }
    } catch {}
  }
}
