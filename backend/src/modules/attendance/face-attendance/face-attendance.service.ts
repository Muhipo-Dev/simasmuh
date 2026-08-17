import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import * as fs from 'fs';
import * as path from 'path';
import { join } from 'path';
import { spawn } from 'child_process';
import { STORAGE_ROOT } from '../../core/config/storage.config';

export interface FaceCameraConfig {
  streamSourceType?: 'RTSP' | 'RTMP' | 'WEBCAM' | 'HTTP_STREAM' | 'LOCAL_VIDEO';
  streamUrl: string;
  cameraName: string;
  location: string;
  threshold: number; // e.g. 0.70 (70%)
  cooldownMinutes: number; // e.g. 10 minutes
  isActive: boolean;
  welcomeVoice: boolean;
  apiKeySecret: string;
  updatedAt: string;
}

export interface FaceDetectionLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  avatarUrl?: string | null;
  identifier: string;
  confidence: number;
  scanType: 'MASUK' | 'PULANG' | 'SUDAH_LENGKAP';
  message: string;
  cameraName: string;
}

@Injectable()
export class FaceAttendanceService {
  private readonly logger = new Logger(FaceAttendanceService.name);
  private readonly configPath = join(process.cwd(), 'storage', 'face-attendance-config.json');
  private recentLogs: FaceDetectionLog[] = [];
  private readonly maxLogs = 50;

  constructor(private prisma: PrismaService) {
    this.ensureConfigExists();
  }

  private ensureConfigExists() {
    try {
      const dir = join(process.cwd(), 'storage');
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      if (!existsSync(this.configPath)) {
        const defaultConfig: FaceCameraConfig = {
          streamUrl: 'rtmp://localhost/live/siakad_camera',
          cameraName: 'Camera Gerbang Utama',
          location: 'Gerbang Depan Sekolah',
          threshold: 0.70,
          cooldownMinutes: 10,
          isActive: true,
          welcomeVoice: true,
          apiKeySecret: 'simasmuh_face_token_secret_2026',
          updatedAt: new Date().toISOString(),
        };
        writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
      }
    } catch (err) {
      this.logger.error('Failed to initialize face attendance config file', err);
    }
  }

  getConfig(): FaceCameraConfig {
    try {
      if (existsSync(this.configPath)) {
        const raw = readFileSync(this.configPath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      this.logger.error('Error reading face attendance config', err);
    }
    return {
      streamUrl: 'rtmp://localhost/live/siakad_camera',
      cameraName: 'Camera Gerbang Utama',
      location: 'Gerbang Depan Sekolah',
      threshold: 0.70,
      cooldownMinutes: 10,
      isActive: true,
      welcomeVoice: true,
      apiKeySecret: 'simasmuh_face_token_secret_2026',
      updatedAt: new Date().toISOString(),
    };
  }

  async updateConfig(data: Partial<FaceCameraConfig>): Promise<FaceCameraConfig> {
    const current = this.getConfig();
    const updated: FaceCameraConfig = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    try {
      writeFileSync(this.configPath, JSON.stringify(updated, null, 2), 'utf8');
      
      // Auto trigger reload/restart on python AI worker if active
      try {
        fetch('http://localhost:8005/stream/restart', {
          method: 'POST',
          signal: AbortSignal.timeout(3000),
        }).catch(() => {});
      } catch {}
    } catch (err) {
      this.logger.error('Failed to save face attendance config', err);
      throw new BadRequestException('Gagal menyimpan konfigurasi');
    }
    return updated;
  }

  async getUsersDataset() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        subRole: true,
        avatarUrl: true,
        nipNbm: true,
        student: {
          select: {
            id: true,
            nis: true,
            nisn: true,
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        teacherProfile: {
          select: {
            id: true,
            nip: true,
          },
        },
      },
    });

    const dataset = users.map((u) => {
      let localPath: string | null = null;
      if (u.avatarUrl && u.avatarUrl.startsWith('/uploads/')) {
        const cleanRel = u.avatarUrl.replace(/^\/uploads\//, '');
        const candidate = join(STORAGE_ROOT, cleanRel);
        if (existsSync(candidate)) {
          localPath = candidate;
        }
      }

      return {
        userId: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        subRole: u.subRole,
        avatarUrl: u.avatarUrl,
        localPath,
        identifier: u.student?.nis || u.nipNbm || u.teacherProfile?.nip || u.username,
        className: u.student?.class?.name || null,
        hasPhoto: Boolean(u.avatarUrl && u.avatarUrl.trim().length > 0),
      };
    });

    const students = dataset.filter((d) => d.role === 'SISWA');
    const teachers = dataset.filter((d) => d.role === 'GURU');
    const staff = dataset.filter((d) => d.role !== 'SISWA' && d.role !== 'GURU');

    return {
      totalUsers: dataset.length,
      usersWithPhoto: dataset.filter((d) => d.hasPhoto).length,
      breakdown: {
        students: { total: students.length, withPhoto: students.filter((s) => s.hasPhoto).length },
        teachers: { total: teachers.length, withPhoto: teachers.filter((t) => t.hasPhoto).length },
        staff: { total: staff.length, withPhoto: staff.filter((st) => st.hasPhoto).length },
      },
      dataset,
    };
  }

  async recordFaceAttendance(payload: {
    userId: string;
    confidence: number;
    secretKey?: string;
    cameraLocation?: string;
  }) {
    const config = this.getConfig();
    if (payload.secretKey && payload.secretKey !== config.apiKeySecret) {
      throw new BadRequestException('Kunci autentikasi API kamera tidak valid');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        student: {
          include: { class: true },
        },
        teacherProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan di database');
    }

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const timeString = `${pad(today.getHours())}:${pad(today.getMinutes())}:${pad(today.getSeconds())}`;

    const existing = await this.prisma.dailyAttendance.findFirst({
      where: {
        userId: user.id,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    let scanType: 'MASUK' | 'PULANG' | 'SUDAH_LENGKAP' = 'MASUK';
    let message = '';

    if (!existing) {
      // First scan = Masuk
      await this.prisma.dailyAttendance.create({
        data: {
          date: startOfDay,
          time: timeString,
          checkInTime: timeString,
          status: 'HADIR',
          userId: user.id,
        },
      });
      scanType = 'MASUK';
      message = `Presensi Masuk berhasil dicatat pukul ${timeString}`;
    } else if (!existing.checkOutTime) {
      // Check cooldown time between in and out
      if (existing.checkInTime) {
        const [inHour, inMin] = existing.checkInTime.split(':').map(Number);
        const inTotalMins = inHour * 60 + (inMin || 0);
        const outTotalMins = today.getHours() * 60 + today.getMinutes();

        if (outTotalMins - inTotalMins >= config.cooldownMinutes) {
          await this.prisma.dailyAttendance.update({
            where: { id: existing.id },
            data: { checkOutTime: timeString },
          });
          scanType = 'PULANG';
          message = `Presensi Pulang berhasil dicatat pukul ${timeString}`;
        } else {
          scanType = 'SUDAH_LENGKAP';
          message = `Sudah tercatat masuk pada ${existing.checkInTime}. Cooldown ${config.cooldownMinutes} menit sebelum absen pulang.`;
        }
      } else {
        await this.prisma.dailyAttendance.update({
          where: { id: existing.id },
          data: { checkOutTime: timeString },
        });
        scanType = 'PULANG';
        message = `Presensi Pulang berhasil dicatat pukul ${timeString}`;
      }
    } else {
      scanType = 'SUDAH_LENGKAP';
      message = `Presensi harian sudah lengkap (Masuk: ${existing.checkInTime}, Pulang: ${existing.checkOutTime})`;
    }

    const logEntry: FaceDetectionLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: timeString,
      userId: user.id,
      userName: user.name,
      userRole: user.role + (user.student?.class ? ` (${user.student.class.name})` : ''),
      avatarUrl: user.avatarUrl,
      identifier: user.student?.nis || user.nipNbm || user.teacherProfile?.nip || user.username,
      confidence: Math.round(payload.confidence * 100) / 100,
      scanType,
      message,
      cameraName: payload.cameraLocation || config.cameraName,
    };

    this.recentLogs.unshift(logEntry);
    if (this.recentLogs.length > this.maxLogs) {
      this.recentLogs = this.recentLogs.slice(0, this.maxLogs);
    }

    return {
      success: true,
      scanType,
      message,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      log: logEntry,
    };
  }

  getRecentLogs(): FaceDetectionLog[] {
    return this.recentLogs;
  }

  clearLogs() {
    this.recentLogs = [];
    return { success: true, message: 'Log berhasil dikosongkan' };
  }

  async getAiServiceStatus() {
    try {
      const res = await fetch('http://localhost:8005/status', { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        return { isOnline: true, ...data };
      }
    } catch (err) {
      // offline
    }
    return { isOnline: false, is_running: false, stream_status: 'OFFLINE' };
  }

  async startAiWorker() {
    // 1. Check if already online
    let isOnline = false;
    try {
      const ping = await fetch('http://localhost:8005/status', { signal: AbortSignal.timeout(1500) });
      if (ping.ok) isOnline = true;
    } catch {
      isOnline = false;
    }

    // 2. If offline, spawn Python process automatically
    if (!isOnline) {
      this.logger.log('Microservice Python AI offline, mencoba meluncurkan python main.py...');
      
      const possibleDirs = [
        path.resolve(process.cwd(), '../services/face-attendance'),
        path.resolve(process.cwd(), 'services/face-attendance'),
        path.resolve(__dirname, '../../../../../services/face-attendance'),
        'd:/simasmuh/services/face-attendance',
      ];

      let targetDir = possibleDirs.find((dir) => fs.existsSync(path.join(dir, 'main.py')));

      if (targetDir) {
        try {
          const pyProc = spawn('python', ['main.py'], {
            cwd: targetDir,
            detached: true,
            stdio: 'ignore',
            shell: true,
          });
          pyProc.unref();

          // Wait up to 6 seconds for port 8005 to come alive
          for (let i = 0; i < 12; i++) {
            await new Promise((r) => setTimeout(r, 500));
            try {
              const pingCheck = await fetch('http://localhost:8005/status', { signal: AbortSignal.timeout(1000) });
              if (pingCheck.ok) {
                isOnline = true;
                break;
              }
            } catch {}
          }
        } catch (spawnErr) {
          this.logger.error(`Gagal meluncurkan proses python: ${spawnErr.message}`);
        }
      }
    }

    // 3. Trigger stream start
    try {
      const res = await fetch('http://localhost:8005/stream/start', {
        method: 'POST',
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      if (isOnline) {
        return { success: true, message: 'AI Service aktif di port 8005 (Stream Ingesting)' };
      }
      throw new BadRequestException('Microservice AI Python di port 8005 belum dapat dijangkau. Pastikan Python sudah terinstal di komputer/server.');
    }
    return { success: true, message: 'AI Service berhasil dinyalakan' };
  }

  async stopAiWorker() {
    try {
      const res = await fetch('http://localhost:8005/stream/stop', {
        method: 'POST',
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      throw new BadRequestException('Microservice AI Python di port 8005 tidak aktif atau tidak dapat dijangkau');
    }
    return { success: true, message: 'AI Service stream dihentikan' };
  }
}
