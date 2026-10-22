import { ConsoleLogger, LogLevel } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: 'LOG' | 'INFO' | 'ERROR' | 'WARN' | 'DEBUG' | 'VERBOSE' | 'FATAL';
  context: string;
  message: string;
  trace?: string;
  raw: string;
}

/**
 * FileLoggerService: Logger kustom tingkat sistem SIMASMUH
 * - Output tetap tampil real-time dan berwarna di Terminal Console.
 * - Otomatis mencatat dan membackup log ke direktori file terorganisir di project (`/logs/`):
 *   - `/logs/simasmuh-backend.log` (Log aktif terkini)
 *   - `/logs/backend-errors.log` (Khusus log error dan fatal)
 *   - `/logs/archive/simasmuh-backend-YYYY-MM-DD.log` (Rotasi harian)
 * - In-Memory Ring Buffer (1.000 log terbaru) untuk live streaming ke Dashboard Pengaturan Sistem Admin.
 * - Berjalan secara asynchronous (non-blocking) agar tidak mengganggu kecepatan atau performa runtime sistem.
 */
export class FileLoggerService extends ConsoleLogger {
  private static instance: FileLoggerService | null = null;
  private static memoryLogs: SystemLogEntry[] = [];
  private static readonly MAX_MEMORY_LOGS = 1000;

  private logDirectory: string;
  private archiveDirectory: string;
  private mainLogFile: string;
  private errorLogFile: string;
  private writeStream: fs.WriteStream | null = null;
  private errorStream: fs.WriteStream | null = null;
  private currentDate: string = '';

  constructor(context?: string) {
    super(context || 'SIMASMUH');
    FileLoggerService.instance = this;
    this.initLogDirectories();
  }

  public static getInstance(): FileLoggerService | null {
    return FileLoggerService.instance;
  }

  public static getRecentLogs(limit = 200, level?: string, search?: string): SystemLogEntry[] {
    let logs = [...FileLoggerService.memoryLogs];
    if (level && level !== 'ALL') {
      const targetLevel = level.toUpperCase();
      logs = logs.filter((l) => l.level === targetLevel || (targetLevel === 'LOG' && l.level === 'INFO'));
    }
    if (search && search.trim() !== '') {
      const q = search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.message.toLowerCase().includes(q) ||
          l.context.toLowerCase().includes(q) ||
          l.raw.toLowerCase().includes(q),
      );
    }
    return logs.slice(-limit);
  }

  public static clearMemoryLogs() {
    FileLoggerService.memoryLogs = [];
  }

  private initLogDirectories() {
    try {
      const rootDir = process.cwd();
      this.logDirectory = path.resolve(rootDir, 'logs');
      this.archiveDirectory = path.join(this.logDirectory, 'archive');

      if (!fs.existsSync(this.logDirectory)) {
        fs.mkdirSync(this.logDirectory, { recursive: true });
      }
      if (!fs.existsSync(this.archiveDirectory)) {
        fs.mkdirSync(this.archiveDirectory, { recursive: true });
      }

      this.mainLogFile = path.join(this.logDirectory, 'simasmuh-backend.log');
      this.errorLogFile = path.join(this.logDirectory, 'backend-errors.log');

      this.currentDate = this.getFormattedDate();
      this.initStreams();
    } catch (err) {
      console.error('[FileLoggerService] Gagal menginisialisasi direktori log:', err);
    }
  }

  private getFormattedDate(): string {
    const d = new Date();
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d); // YYYY-MM-DD (UTC+7)
  }

  private getFormattedTimestamp(): string {
    const d = new Date();
    const datePart = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);

    const timePart = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .format(d)
      .replace(/\./g, ':');

    return `${datePart} ${timePart}`;
  }

  private initStreams() {
    try {
      if (this.writeStream) this.writeStream.end();
      if (this.errorStream) this.errorStream.end();

      this.writeStream = fs.createWriteStream(this.mainLogFile, { flags: 'a', encoding: 'utf8' });
      this.errorStream = fs.createWriteStream(this.errorLogFile, { flags: 'a', encoding: 'utf8' });
    } catch (err) {
      console.error('[FileLoggerService] Gagal membuka stream log file:', err);
    }
  }

  private checkRotation() {
    const today = this.getFormattedDate();
    if (this.currentDate !== today) {
      try {
        // Backup arsip harian jika file log eksis
        if (fs.existsSync(this.mainLogFile)) {
          const archiveTarget = path.join(this.archiveDirectory, `simasmuh-backend-${this.currentDate}.log`);
          fs.copyFileSync(this.mainLogFile, archiveTarget);
        }
        this.currentDate = today;
        this.initStreams();
        this.cleanOldArchives(30); // Simpan 30 hari arsip
      } catch (err) {
        console.error('[FileLoggerService] Gagal rotasi log:', err);
      }
    }
  }

  private cleanOldArchives(daysToKeep = 30) {
    try {
      if (!fs.existsSync(this.archiveDirectory)) return;
      const files = fs.readdirSync(this.archiveDirectory);
      const now = Date.now();
      const maxAgeMs = daysToKeep * 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.archiveDirectory, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          fs.unlinkSync(filePath);
        }
      }
    } catch {}
  }

  private stripAnsi(text: string): string {
    // Menghilangkan ANSI color codes dari console string agar log file bersih
    // eslint-disable-next-line no-control-regex
    return text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
  }

  private writeToFile(level: string, message: any, context?: string, trace?: string) {
    try {
      this.checkRotation();
      const timestamp = this.getFormattedTimestamp();
      const ctx = context || this.context || 'System';
      const cleanMsg = typeof message === 'object' ? JSON.stringify(message) : this.stripAnsi(String(message));
      
      let line = `[${timestamp}] [${level.toUpperCase()}] [${ctx}] ${cleanMsg}\n`;
      if (trace) {
        line += `  Trace: ${this.stripAnsi(trace)}\n`;
      }

      // Simpan ke in-memory ring buffer untuk live web stream admin
      const entry: SystemLogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp,
        level: level.toUpperCase() as any,
        context: ctx,
        message: cleanMsg,
        trace: trace ? this.stripAnsi(trace) : undefined,
        raw: line.trim(),
      };
      FileLoggerService.memoryLogs.push(entry);
      if (FileLoggerService.memoryLogs.length > FileLoggerService.MAX_MEMORY_LOGS) {
        FileLoggerService.memoryLogs.shift();
      }

      if (this.writeStream && !this.writeStream.destroyed) {
        this.writeStream.write(line);
      }

      if ((level === 'ERROR' || level === 'FATAL') && this.errorStream && !this.errorStream.destroyed) {
        this.errorStream.write(line);
      }
    } catch (err) {
      // Jangan throw error agar tidak mengganggu aliran aplikasi
    }
  }

  log(message: any, context?: string) {
    super.log(message, context);
    this.writeToFile('INFO', message, context);
  }

  error(message: any, trace?: string, context?: string) {
    super.error(message, trace, context);
    this.writeToFile('ERROR', message, context, trace);
  }

  warn(message: any, context?: string) {
    super.warn(message, context);
    this.writeToFile('WARN', message, context);
  }

  debug(message: any, context?: string) {
    super.debug(message, context);
    this.writeToFile('DEBUG', message, context);
  }

  verbose(message: any, context?: string) {
    super.verbose(message, context);
    this.writeToFile('VERBOSE', message, context);
  }

  fatal(message: any, trace?: string, context?: string) {
    if (typeof super.fatal === 'function') {
      super.fatal(message, trace, context);
    } else {
      super.error(message, trace, context);
    }
    this.writeToFile('FATAL', message, context, trace);
  }
}
