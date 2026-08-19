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
  private readonly configPath = join(STORAGE_ROOT, 'face-attendance-config.json');
  private readonly legacyConfigPath = join(process.cwd(), 'storage', 'face-attendance-config.json');
  private recentLogs: FaceDetectionLog[] = [];
  private readonly maxLogs = 50;

  constructor(private prisma: PrismaService) {
    this.ensureConfigExists();
  }

  private ensureConfigExists() {
    try {
      if (!existsSync(STORAGE_ROOT)) {
        mkdirSync(STORAGE_ROOT, { recursive: true });
      }
      
      // Jika config belum ada di STORAGE_ROOT tapi ada di legacy path, salin ke STORAGE_ROOT
      if (!existsSync(this.configPath) && existsSync(this.legacyConfigPath)) {
        const legacyData = readFileSync(this.legacyConfigPath, 'utf8');
        writeFileSync(this.configPath, legacyData, 'utf8');
        return;
      }

      if (!existsSync(this.configPath)) {
        const defaultConfig: FaceCameraConfig = {
          streamSourceType: 'WEBCAM',
          streamUrl: '0',
          cameraName: 'Camera Gerbang Utama',
          location: 'Gerbang Depan Sekolah',
          threshold: 0.58,
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
      if (existsSync(this.legacyConfigPath)) {
        const raw = readFileSync(this.legacyConfigPath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      this.logger.error('Error reading face attendance config', err);
    }
    return {
      streamSourceType: 'WEBCAM',
      streamUrl: '0',
      cameraName: 'Camera Gerbang Utama',
      location: 'Gerbang Depan Sekolah',
      threshold: 0.58,
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
      const configStr = JSON.stringify(updated, null, 2);
      writeFileSync(this.configPath, configStr, 'utf8');
      try {
        const legacyDir = join(process.cwd(), 'storage');
        if (!existsSync(legacyDir)) mkdirSync(legacyDir, { recursive: true });
        writeFileSync(this.legacyConfigPath, configStr, 'utf8');
      } catch {}
      
      // Auto trigger reload/restart on python AI worker if active
      try {
        fetch('http://127.0.0.1:8089/stream/restart', {
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
      const endpoints = ['http://127.0.0.1:8089/status', 'http://localhost:8089/status'];
      for (const url of endpoints) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
          if (res.ok) {
            const data = await res.json();
            return { isOnline: true, ...data };
          }
        } catch {}
      }
    } catch (err) {
      // offline
    }
    return { isOnline: false, is_running: false, stream_status: 'OFFLINE' };
  }

  async startAiWorker() {
    // 1. Check if already online
    const status = await this.getAiServiceStatus();
    let isOnline = status.isOnline;

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
          // Prioritas 1: Gunakan executable GPU dari .venv-gpu jika tersedia
          const venvGpuWindows = path.join(targetDir, '.venv-gpu', 'Scripts', 'python.exe');
          const venvWindows = path.join(targetDir, '.venv', 'Scripts', 'python.exe');
          const venvGpuLinux = path.join(targetDir, '.venv-gpu', 'bin', 'python');
          const venvLinux = path.join(targetDir, '.venv', 'bin', 'python');
          
          let pyCmd = 'python';
          if (fs.existsSync(venvGpuWindows)) {
            pyCmd = venvGpuWindows;
          } else if (fs.existsSync(venvWindows)) {
            pyCmd = venvWindows;
          } else if (fs.existsSync(venvGpuLinux)) {
            pyCmd = venvGpuLinux;
          } else if (fs.existsSync(venvLinux)) {
            pyCmd = venvLinux;
          }

          const pyProc = spawn(pyCmd, ['main.py'], {
            cwd: targetDir,
            detached: true,
            stdio: 'ignore',
            shell: false,
            windowsHide: true,
          });
          pyProc.unref();

          // Wait up to 15 seconds for port 8089 to come alive
          for (let i = 0; i < 30; i++) {
            await new Promise((r) => setTimeout(r, 500));
            const pingCheck = await this.getAiServiceStatus();
            if (pingCheck.isOnline) {
              isOnline = true;
              break;
            }
          }
        } catch (spawnErr) {
          this.logger.error(`Gagal meluncurkan proses python: ${spawnErr.message}`);
        }
      }
    }

    // 3. Trigger stream start
    try {
      const startUrls = ['http://127.0.0.1:8089/stream/start', 'http://localhost:8089/stream/start'];
      for (const url of startUrls) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            signal: AbortSignal.timeout(4000),
          });
          if (res.ok) {
            return await res.json();
          }
        } catch {}
      }
      if (isOnline) {
        return { success: true, message: 'AI Service aktif di port 8089 (Stream Siap)' };
      }
    } catch (err) {
      if (isOnline) {
        return { success: true, message: 'AI Service aktif di port 8089 (Stream Ingesting)' };
      }
    }

    if (isOnline) {
      return { success: true, message: 'AI Microservice FaceNet aktif' };
    }

    throw new BadRequestException('Microservice AI Python di port 8089 sedang memuat model FaceNet. Silakan klik kembali tombol Nyalakan dalam beberapa detik.');
  }

  async stopAiWorker() {
    try {
      const res = await fetch('http://127.0.0.1:8089/stream/stop', {
        method: 'POST',
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      throw new BadRequestException('Microservice AI Python di port 8089 tidak aktif atau tidak dapat dijangkau');
    }
    return { success: true, message: 'AI Service stream dihentikan' };
  }

  async scanFrame(imageBase64: string) {
    try {
      const res = await fetch('http://127.0.0.1:8089/scan_frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // return empty if python offline
    }
    return { faces: [] };
  }
}
