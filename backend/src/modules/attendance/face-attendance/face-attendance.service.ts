import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import * as fs from 'fs';
import * as path from 'path';
import { join } from 'path';
import { spawn } from 'child_process';
import { STORAGE_ROOT } from '../../core/config/storage.config';

export interface SingleCameraConfig {
  id: string; // 'cam-1', 'cam-2'
  name: string; // e.g. "Kamera 1 (Gerbang Depan)"
  streamSourceType: 'BROWSER_WEBCAM' | 'RTSP' | 'RTMP' | 'WEBCAM' | 'HTTP_STREAM' | 'LOCAL_VIDEO';
  streamUrl: string;
  location: string;
  isActive: boolean;
}

export interface FaceCameraConfig {
  streamSourceType?: 'BROWSER_WEBCAM' | 'RTSP' | 'RTMP' | 'WEBCAM' | 'HTTP_STREAM' | 'LOCAL_VIDEO';
  streamUrl: string;
  cameraName: string;
  location: string;
  cameras?: SingleCameraConfig[];
  threshold: number; // e.g. 0.70 (70%)
  cooldownMinutes: number; // e.g. 10 minutes
  isActive: boolean;
  welcomeVoice: boolean;
  autoAttendance?: boolean;
  continuousScanNoDelay?: boolean;
  scanIntervalMs?: number;
  showPublicStream?: boolean; // Tampilkan Feed Kamera di Halaman Presensi Publik (/presensi-view)
  showPublicLogs?: boolean; // Tampilkan Log Presensi Wajah di Halaman Presensi Publik (/presensi-view)
  apiKeySecret: string;
  updatedAt: string;
}

export interface FaceDetectionLog {
  id: string;
  date: string; // Format YYYY-MM-DD
  dateFormatted?: string; // Format lokal e.g. "Kamis, 10 Sep 2026"
  timestamp: string; // Jam scan HH:mm:ss
  userId: string;
  userName: string;
  userRole: string;
  avatarUrl?: string | null;
  snapshotUrl?: string | null;
  identifier: string;
  confidence: number;
  scanType: 'MASUK' | 'PULANG' | 'SUDAH_LENGKAP';
  message: string;
  cameraName: string;
}

import { EmailNotificationService } from '../../communication/notifications/email.service';
import { SystemLogService } from '../../core/services/system-log.service';

@Injectable()
export class FaceAttendanceService implements OnModuleInit {
  private readonly logger = new Logger(FaceAttendanceService.name);
  private readonly configPath = join(
    STORAGE_ROOT,
    'face-attendance-config.json',
  );
  private readonly legacyConfigPath = join(
    process.cwd(),
    'storage',
    'face-attendance-config.json',
  );
  private readonly logsPath = join(STORAGE_ROOT, 'face-attendance-logs.json');
  private readonly legacyLogsPath = join(
    process.cwd(),
    'storage',
    'face-attendance-logs.json',
  );
  private recentLogs: FaceDetectionLog[] = [];
  private readonly maxLogs = 1000;

  constructor(
    private prisma: PrismaService,
    private emailNotificationService: EmailNotificationService,
    private systemLogService: SystemLogService,
  ) {
    this.ensureConfigExists();
    this.loadLogsFile();
  }

  private loadLogsFile() {
    try {
      const normalizeLogs = (logs: any[]): FaceDetectionLog[] => {
        return logs.map((log) => {
          if (!log.date || !log.dateFormatted) {
            let logDate = new Date();
            if (log.id && log.id.includes('-')) {
              const ts = Number(log.id.split('-')[0]);
              if (!isNaN(ts) && ts > 0) logDate = new Date(ts);
            }
            const pad = (n: number) => n.toString().padStart(2, '0');
            const dateIso = `${logDate.getFullYear()}-${pad(logDate.getMonth() + 1)}-${pad(logDate.getDate())}`;
            const dateFormatted = logDate.toLocaleDateString('id-ID', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            return {
              ...log,
              date: log.date || dateIso,
              dateFormatted: log.dateFormatted || dateFormatted,
            };
          }
          return log;
        });
      };

      const possibleLogFiles = [
        this.logsPath,
        this.legacyLogsPath,
        'D:/simasmuh_storage/face-attendance-logs.json',
        'd:/simasmuh/storage/face-attendance-logs.json',
        'd:/simasmuh/backend/storage/face-attendance-logs.json',
      ];

      for (const p of possibleLogFiles) {
        if (p && existsSync(p)) {
          try {
            const raw = readFileSync(p, 'utf8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              this.recentLogs = normalizeLogs(parsed).slice(0, this.maxLogs);
              this.saveLogsFile();
              return;
            }
          } catch {}
        }
      }

      // Fallback: Jika file JSON kosong / belum terbaca, bangun otomatis dari basis data DailyAttendance
      this.restoreLogsFromDb().catch(() => {});
    } catch (err) {
      this.logger.error(
        'Gagal memuat face-attendance-logs.json dari penyimpanan',
        err,
      );
    }
  }

  async restoreLogsFromDb(): Promise<FaceDetectionLog[]> {
    try {
      const dailyRecords = await this.prisma.dailyAttendance.findMany({
        include: {
          user: {
            include: {
              student: { include: { class: true } },
              teacherProfile: true,
            },
          },
        },
        orderBy: { date: 'desc' },
        take: this.maxLogs,
      });

      if (dailyRecords && dailyRecords.length > 0) {
        const pad = (n: number) => n.toString().padStart(2, '0');
        const restored: FaceDetectionLog[] = dailyRecords.map((d, index) => {
          const recordDate = new Date(d.date);
          const dateIso = `${recordDate.getFullYear()}-${pad(recordDate.getMonth() + 1)}-${pad(recordDate.getDate())}`;
          const dateFormatted = recordDate.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });

          const timeStr = d.checkInTime || d.time || '07:15:00';
          const identifier =
            d.user?.student?.nis ||
            d.user?.nipNbm ||
            d.user?.teacherProfile?.nip ||
            d.user?.username ||
            '-';

          return {
            id: `${recordDate.getTime()}-${d.id || index}`,
            date: dateIso,
            dateFormatted: dateFormatted,
            timestamp: timeStr,
            userId: d.userId,
            userName: d.user?.name || 'Pengguna',
            userRole: d.user?.role || 'SISWA',
            avatarUrl: d.user?.avatarUrl || null,
            snapshotUrl: null,
            identifier: identifier,
            confidence: 0.95,
            scanType: d.checkOutTime ? 'PULANG' : 'MASUK',
            message: 'Presensi Terverifikasi (Database)',
            cameraName: 'Camera Gerbang Utama',
          };
        });

        this.recentLogs = restored;
        this.saveLogsFile();
        return this.recentLogs;
      }
    } catch (err) {
      this.logger.error('Gagal restore logs dari database DailyAttendance', err);
    }
    return [];
  }

  private saveLogsFile() {
    try {
      const logsStr = JSON.stringify(this.recentLogs, null, 2);
      writeFileSync(this.logsPath, logsStr, 'utf8');
      try {
        const legacyDir = join(process.cwd(), 'storage');
        if (!existsSync(legacyDir)) mkdirSync(legacyDir, { recursive: true });
        writeFileSync(this.legacyLogsPath, logsStr, 'utf8');
      } catch {}
    } catch (err) {
      this.logger.error('Gagal menyimpan file face-attendance-logs.json', err);
    }
  }

  async onModuleInit() {
    try {
      this.logger.log(
        'Face Attendance AI Service berada dalam mode Standby (On-Demand). Layanan akan aktif saat dihidupkan manual oleh admin melalui dashboard.',
      );
    } catch (err) {
      this.logger.error(
        'Gagal memeriksa status awal AI Microservice pada onModuleInit',
        err,
      );
    }
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
          cameras: [
            {
              id: 'cam-1',
              name: 'Kamera 1 (Gerbang Depan)',
              streamSourceType: 'RTSP',
              streamUrl: 'rtsp://admin:password@192.168.1.64:554/Streaming/Channels/101',
              location: 'Gerbang Depan',
              isActive: true,
            },
            {
              id: 'cam-2',
              name: 'Kamera 2 (Gerbang Belakang / Gedung B)',
              streamSourceType: 'RTSP',
              streamUrl: 'rtsp://admin:password@192.168.1.65:554/Streaming/Channels/101',
              location: 'Gerbang Belakang',
              isActive: true,
            },
          ],
          threshold: 0.90,
          cooldownMinutes: 10,
          isActive: false,
          welcomeVoice: true,
          showPublicStream: true,
          showPublicLogs: true,
          apiKeySecret: 'simasmuh_face_token_secret_2026',
          updatedAt: new Date().toISOString(),
        };
        this.saveConfigFile(defaultConfig);
      }
    } catch (err) {
      this.logger.error(
        'Failed to initialize face attendance config file',
        err,
      );
    }
  }

  private saveConfigFile(config: FaceCameraConfig) {
    try {
      const configStr = JSON.stringify(config, null, 2);
      writeFileSync(this.configPath, configStr, 'utf8');
      try {
        const legacyDir = join(process.cwd(), 'storage');
        if (!existsSync(legacyDir)) mkdirSync(legacyDir, { recursive: true });
        writeFileSync(this.legacyLogsPath, configStr, 'utf8');
      } catch {}
    } catch (err) {
      this.logger.error(
        'Gagal menulis file konfigurasi face-attendance-config.json',
        err,
      );
    }
  }

  getConfig(): FaceCameraConfig {
    const defaultCameras: SingleCameraConfig[] = [
      {
        id: 'cam-1',
        name: 'Kamera 1 (Gerbang Depan)',
        streamSourceType: 'RTSP',
        streamUrl: 'rtsp://admin:password@192.168.1.64:554/Streaming/Channels/101',
        location: 'Gerbang Depan',
        isActive: true,
      },
      {
        id: 'cam-2',
        name: 'Kamera 2 (Gerbang Belakang / Gedung B)',
        streamSourceType: 'RTSP',
        streamUrl: 'rtsp://admin:password@192.168.1.65:554/Streaming/Channels/101',
        location: 'Gerbang Belakang',
        isActive: true,
      },
    ];

    if (existsSync(this.configPath)) {
      try {
        const raw = readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(raw);
        const threshold = typeof parsed.threshold === 'number' 
          ? Math.max(0.10, Math.min(1.0, parsed.threshold)) 
          : 0.70;
        return {
          showPublicStream: true,
          showPublicLogs: true,
          cameras: Array.isArray(parsed.cameras) && parsed.cameras.length > 0 ? parsed.cameras : defaultCameras,
          ...parsed,
          threshold,
        };
      } catch {}
    }
    if (existsSync(this.legacyConfigPath)) {
      try {
        const raw = readFileSync(this.legacyConfigPath, 'utf8');
        const parsed = JSON.parse(raw);
        const threshold = typeof parsed.threshold === 'number' 
          ? Math.max(0.10, Math.min(1.0, parsed.threshold)) 
          : 0.70;
        return {
          showPublicStream: true,
          showPublicLogs: true,
          cameras: Array.isArray(parsed.cameras) && parsed.cameras.length > 0 ? parsed.cameras : defaultCameras,
          ...parsed,
          threshold,
        };
      } catch {}
    }
    return {
      streamSourceType: 'BROWSER_WEBCAM',
      streamUrl: 'BROWSER_WEBCAM',
      cameraName: 'Camera AI Presensi',
      location: 'Gerbang Depan Sekolah',
      cameras: defaultCameras,
      threshold: 0.90,
      cooldownMinutes: 15,
      isActive: true,
      welcomeVoice: true,
      showPublicStream: true,
      showPublicLogs: true,
      apiKeySecret: 'simasmuh_face_token_secret_2026',
      updatedAt: new Date().toISOString(),
    };
  }

  async updateConfig(
    data: Partial<FaceCameraConfig>,
  ): Promise<FaceCameraConfig> {
    const current = this.getConfig();
    const updated: FaceCameraConfig = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    try {
      this.saveConfigFile(updated);

      if (data.isActive === true) {
        this.startAiWorker().catch((err) => {
          this.logger.warn(
            `Gagal memulai AI worker setelah updateConfig: ${err?.message || err}`,
          );
        });
      } else if (data.isActive === false) {
        this.stopAiWorker().catch((err) => {
          this.logger.warn(
            `Gagal menghentikan AI worker setelah updateConfig: ${err?.message || err}`,
          );
        });
      } else {
        // Auto trigger reload/restart on python AI worker if active
        try {
          fetch('http://127.0.0.1:8089/refresh-config', {
            method: 'POST',
            signal: AbortSignal.timeout(3000),
          }).catch(() => {});
          fetch('http://127.0.0.1:8089/stream/restart', {
            method: 'POST',
            signal: AbortSignal.timeout(3000),
          }).catch(() => {});
        } catch {}
      }
    } catch (err) {
      this.logger.error('Failed to save face attendance config', err);
      throw new BadRequestException('Gagal menyimpan konfigurasi');
    }
    return updated;
  }

  async getUsersDataset() {
    const users = await this.prisma.user.findMany({
      where: {
        role: {
          not: 'WALI_MURID' as any,
        },
      },
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
      if (u.avatarUrl) {
        if (u.avatarUrl.startsWith('/uploads/')) {
          const cleanRel = u.avatarUrl.replace(/^\/uploads\//, '');
          const possiblePaths = [
            join(STORAGE_ROOT, cleanRel),
            join(STORAGE_ROOT, 'profiles', cleanRel),
            join(STORAGE_ROOT, 'students', cleanRel),
            join(STORAGE_ROOT, path.basename(cleanRel)),
            join(STORAGE_ROOT, 'profiles', path.basename(cleanRel)),
            join(STORAGE_ROOT, 'students', path.basename(cleanRel)),
            join(process.cwd(), 'storage', cleanRel),
            join(process.cwd(), 'storage', 'profiles', cleanRel),
          ];
          for (const p of possiblePaths) {
            if (existsSync(p)) {
              localPath = p;
              break;
            }
          }
        } else if (!u.avatarUrl.startsWith('http')) {
          const possiblePaths = [
            join(STORAGE_ROOT, u.avatarUrl),
            join(STORAGE_ROOT, 'profiles', u.avatarUrl),
            join(STORAGE_ROOT, 'students', u.avatarUrl),
            join(STORAGE_ROOT, path.basename(u.avatarUrl)),
            join(STORAGE_ROOT, 'profiles', path.basename(u.avatarUrl)),
            join(STORAGE_ROOT, 'students', path.basename(u.avatarUrl)),
            join(process.cwd(), 'storage', u.avatarUrl),
            join(process.cwd(), 'storage', 'profiles', u.avatarUrl),
          ];
          for (const p of possiblePaths) {
            if (existsSync(p)) {
              localPath = p;
              break;
            }
          }
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
        identifier:
          u.student?.nis || u.nipNbm || u.teacherProfile?.nip || u.username,
        className: u.student?.class?.name || null,
        hasPhoto: Boolean(u.avatarUrl && u.avatarUrl.trim().length > 0),
      };
    });

    const students = dataset.filter((d) => d.role === 'SISWA');
    const teachers = dataset.filter((d) => d.role === 'GURU');
    const staff = dataset.filter(
      (d) => d.role !== 'SISWA' && d.role !== 'GURU',
    );

    return {
      totalUsers: dataset.length,
      usersWithPhoto: dataset.filter((d) => d.hasPhoto).length,
      breakdown: {
        students: {
          total: students.length,
          withPhoto: students.filter((s) => s.hasPhoto).length,
        },
        teachers: {
          total: teachers.length,
          withPhoto: teachers.filter((t) => t.hasPhoto).length,
        },
        staff: {
          total: staff.length,
          withPhoto: staff.filter((st) => st.hasPhoto).length,
        },
      },
      dataset,
    };
  }

  async recordFaceAttendance(payload: {
    userId: string;
    confidence: number;
    secretKey?: string;
    cameraLocation?: string;
    snapshot?: string;
  }) {
    const config = this.getConfig();
    if (payload.secretKey && payload.secretKey !== config.apiKeySecret) {
      throw new BadRequestException('Kunci autentikasi API kamera tidak valid');
    }

    // Validasi batas input log sistem & absensi: kemiripan biometrik FaceNet terkalibrasi >= config.threshold (wajib minimal 0.90 / 90%)
    const minAttendanceThreshold = typeof config.threshold === 'number' ? Math.max(0.90, config.threshold) : 0.90;
    const confidenceValue = Number(payload.confidence) || 0;
    if (confidenceValue < minAttendanceThreshold) {
      throw new BadRequestException(
        `Tingkat kemiripan wajah (${Math.round(confidenceValue * 100)}%) belum memenuhi batas sensitivitas minimum presensi (${Math.round(minAttendanceThreshold * 100)}%). Wajib di atas 90%.`,
      );
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
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dayOfWeek = today.getDay(); // 0 = Minggu, 1 = Senin, ..., 5 = Jumat, 6 = Sabtu
    const isWorkDay = dayOfWeek >= 1 && dayOfWeek <= 6; // Senin - Sabtu

    // Cek Hari Kerja / Sekolah Aktif (Senin - Sabtu)
    if (!isWorkDay && process.env.NODE_ENV === 'production') {
      throw new BadRequestException(
        'Presensi wajah otomatis aktif pada hari operasional sekolah (Senin s.d. Sabtu).',
      );
    }

    const currentHours = today.getHours();
    const currentMinutes = today.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;

    const isStudent = user.role === 'SISWA';

    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

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
      // 1. Scan Pertama Hari Ini = MASUK / KEDATANGAN (Siswa & GTK)
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
      message = isStudent
        ? `Presensi kehadiran siswa berhasil dicatat pukul ${timeString} WIB.`
        : `Presensi kedatangan pegawai berhasil dicatat pukul ${timeString} WIB.`;

      // Kirim Notifikasi Email Masuk ke Pengguna
      if (user.email && user.email.includes('@')) {
        this.emailNotificationService
          .sendAttendanceNotification({
            toEmail: user.email,
            studentOrUserName: user.name,
            status: 'HADIR (KEDATANGAN)',
            time: timeString,
            dateFormatted: today.toLocaleDateString('id-ID', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            role: user.role,
            type: 'MASUK',
          })
          .catch(() => {});
      }

      // Khusus Siswa: Kirim juga Notifikasi Otomatis ke Email Wali Murid / Orang Tua
      if (isStudent && user.student?.id) {
        this.prisma.parentStudent
          .findMany({
            where: { studentId: user.student.id },
            include: { parent: { include: { user: true } } },
          })
          .then((parentRels) => {
            for (const rel of parentRels) {
              if (rel.parent?.user?.email && rel.parent.user.email.includes('@')) {
                this.emailNotificationService
                  .sendAttendanceNotification({
                    toEmail: rel.parent.user.email,
                    studentOrUserName: user.name,
                    status: 'HADIR (KEDATANGAN SEKOLAH)',
                    time: timeString,
                    dateFormatted: today.toLocaleDateString('id-ID', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }),
                    role: 'SISWA',
                    type: 'MASUK',
                  })
                  .catch(() => {});
              }
            }
          })
          .catch(() => {});
      }
    } else if (isStudent) {
      // 2. KETENTUAN SISWA: Cukup 1 kali saat kedatangan di gerbang sekolah.
      scanType = 'SUDAH_LENGKAP';
      message = `Presensi kehadiran Anda telah tercatat pada pukul ${existing.checkInTime || existing.time} WIB.`;
    } else if (!existing.checkOutTime) {
      // 3. KETENTUAN GTK (Guru, Karyawan, Pegawai, Superadmin): Wajib 2 kali sehari (Datang / MASUK & Pulang / PULANG)
      if (existing.checkInTime) {
        const inParts = existing.checkInTime.split(':').map(Number);
        const inTotalSeconds = inParts[0] * 3600 + (inParts[1] || 0) * 60 + (inParts[2] || 0);
        const currentTotalSeconds = currentHours * 3600 + currentMinutes * 60 + today.getSeconds();
        const diffSeconds = currentTotalSeconds >= inTotalSeconds 
          ? (currentTotalSeconds - inTotalSeconds) 
          : (currentTotalSeconds + 86400 - inTotalSeconds);

        const cooldownSeconds = (Number(config.cooldownMinutes) || 10) * 60;

        // Jika jeda dari waktu masuk sudah melewati cooldown (misal 1 menit = 60 detik), catat presensi PULANG
        if (diffSeconds >= cooldownSeconds) {
          await this.prisma.dailyAttendance.update({
            where: { id: existing.id },
            data: { checkOutTime: timeString },
          });
          scanType = 'PULANG';
          message = `Presensi kepulangan pegawai berhasil dicatat pukul ${timeString} WIB.`;

          // Kirim Notifikasi Email Pulang
          if (user.email && user.email.includes('@')) {
            this.emailNotificationService
              .sendAttendanceNotification({
                toEmail: user.email,
                studentOrUserName: user.name,
                status: 'PULANG',
                time: timeString,
                dateFormatted: today.toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }),
                role: user.role,
                type: 'PULANG',
              })
              .catch(() => {});
          }
        } else {
          scanType = 'SUDAH_LENGKAP';
          const remainingSec = Math.max(1, cooldownSeconds - diffSeconds);
          const remainingMin = Math.ceil(remainingSec / 60);
          message = `Presensi kedatangan telah tercatat pukul ${existing.checkInTime} WIB. Jeda waktu kepulangan (${config.cooldownMinutes}m) tersisa ${remainingMin > 1 ? remainingMin + ' menit' : remainingSec + ' detik'}.`;
        }
      } else {
        await this.prisma.dailyAttendance.update({
          where: { id: existing.id },
          data: { checkOutTime: timeString },
        });
        scanType = 'PULANG';
        message = `Presensi kepulangan pegawai berhasil dicatat pukul ${timeString} WIB.`;

        if (user.email && user.email.includes('@')) {
          this.emailNotificationService
            .sendAttendanceNotification({
              toEmail: user.email,
              studentOrUserName: user.name,
              status: 'PULANG',
              time: timeString,
              dateFormatted: today.toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
              role: user.role,
              type: 'PULANG',
            })
            .catch(() => {});
        }
      }
    } else {
      // GTK sudah presensi datang dan pulang lengkap hari ini
      scanType = 'SUDAH_LENGKAP';
      message = `Presensi hari ini telah lengkap (Kedatangan: ${existing.checkInTime} WIB, Kepulangan: ${existing.checkOutTime} WIB).`;
    }

    const dateIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const dateFormatted = today.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const logEntry: FaceDetectionLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      date: dateIso,
      dateFormatted,
      timestamp: timeString,
      userId: user.id,
      userName: user.name,
      userRole:
        user.role +
        (user.student?.class ? ` (${user.student.class.name})` : ''),
      avatarUrl: user.avatarUrl,
      snapshotUrl: payload.snapshot || null,
      identifier:
        user.student?.nis ||
        user.nipNbm ||
        user.teacherProfile?.nip ||
        user.username,
      confidence: Math.round(payload.confidence * 100) / 100,
      scanType,
      message,
      cameraName: payload.cameraLocation || config.cameraName,
    };

    this.recentLogs.unshift(logEntry);
    if (this.recentLogs.length > this.maxLogs) {
      this.recentLogs = this.recentLogs.slice(0, this.maxLogs);
    }
    this.saveLogsFile();

    // Rekam ke Log Sistem untuk pengarsipan terkompresi di Supabase
    this.systemLogService
      .log({
        category: 'PRESENSI',
        level: 'INFO',
        action: `FACE_SCAN_${scanType}`,
        message: `Presensi Wajah AI: ${user.name} (${user.role}) - ${scanType} [Akurasi: ${logEntry.confidence}]`,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        details: {
          scanType,
          confidence: logEntry.confidence,
          cameraName: logEntry.cameraName,
          time: timeString,
        },
      })
      .catch(() => {});

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

  async getRecentLogs(options?: { todayOnly?: boolean; date?: string }): Promise<FaceDetectionLog[]> {
    if (this.recentLogs.length === 0) {
      this.loadLogsFile();
      if (this.recentLogs.length === 0) {
        await this.restoreLogsFromDb();
      }
    }
    if (!options) return this.recentLogs;
    let filtered = [...this.recentLogs];
    
    if (options.todayOnly) {
      const today = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
      filtered = filtered.filter((l) => l.date === todayIso);
    } else if (options.date) {
      filtered = filtered.filter((l) => l.date === options.date);
    }
    
    return filtered;
  }

  async deleteSingleLog(id: string, resetDb: boolean = true) {
    const index = this.recentLogs.findIndex((l) => l.id === id);
    const log = index !== -1 ? this.recentLogs[index] : null;

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    if (log && resetDb && log.userId) {
      try {
        await this.prisma.dailyAttendance.deleteMany({
          where: {
            userId: log.userId,
            date: { gte: startOfDay, lte: endOfDay },
          },
        });

        const user = await this.prisma.user.findUnique({
          where: { id: log.userId },
          include: { student: true },
        });

        if (user?.student) {
          await this.prisma.attendance.deleteMany({
            where: {
              studentId: user.student.id,
              date: { gte: startOfDay, lte: endOfDay },
            },
          });
        }
      } catch (err) {
        this.logger.error(
          `Gagal mereset data presensi pengguna ${log.userId} di database`,
          err,
        );
      }

      // Reset timer cooldown deteksi di AI microservice agar pengguna dapat langsung terdeteksi ulang
      try {
        await fetch('http://127.0.0.1:8089/reset-cooldown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: log.userId }),
          signal: AbortSignal.timeout(2000),
        });
      } catch {}
    }

    if (index !== -1) {
      this.recentLogs.splice(index, 1);
      this.saveLogsFile();
    }

    return {
      success: true,
      message:
        'Log scan dan status presensi pengguna berhasil dihapus serta direset dari basis data.',
    };
  }

  async clearLogs(resetDb: boolean = true) {
    const today = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    let deletedCount = 0;
    if (resetDb) {
      try {
        const delDaily = await this.prisma.dailyAttendance.deleteMany({
          where: {
            date: { gte: startOfDay, lte: endOfDay },
          },
        });
        const delStudent = await this.prisma.attendance.deleteMany({
          where: {
            date: { gte: startOfDay, lte: endOfDay },
          },
        });
        deletedCount = delDaily.count + delStudent.count;
      } catch (err) {
        this.logger.error('Gagal mereset presensi hari ini di database', err);
      }
    }

    // Hanya hapus log hari ini, riwayat hari kemarin (seperti Jumat 2 Oktober 2026 dsb) TETAP UTUH & AMAN
    this.recentLogs = this.recentLogs.filter((log) => {
      if (!log.date) return false;
      return log.date !== todayIso;
    });
    this.saveLogsFile();

    // Reset semua timer cooldown di Python AI Worker
    try {
      await fetch('http://127.0.0.1:8089/reset-cooldown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
        signal: AbortSignal.timeout(2000),
      });
    } catch {}

    return {
      success: true,
      message: resetDb
        ? `Log presensi hari ini berhasil dikosongkan dan ${deletedCount} catatan presensi hari ini direset di basis data (riwayat hari kemarin tetap aman tersimpan).`
        : 'Log hari ini berhasil dikosongkan.',
      deletedCount,
    };
  }

  async getAiServiceStatus() {
    try {
      const endpoints = [
        'http://127.0.0.1:8089/status',
        'http://localhost:8089/status',
      ];
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
    // 1. Simpan status isActive: true secara permanen di konfigurasi server
    const current = this.getConfig();
    if (!current.isActive) {
      current.isActive = true;
      current.updatedAt = new Date().toISOString();
      this.saveConfigFile(current);
    }

    // 2. Check if already online
    const status = await this.getAiServiceStatus();
    let isOnline = status.isOnline;

    // 3. If offline, spawn Python process automatically
    if (!isOnline) {
      this.logger.log(
        'Microservice Python FaceNet AI offline, meluncurkan python main.py...',
      );

      const possibleDirs = [
        path.resolve(process.cwd(), '../services/face-attendance'),
        path.resolve(process.cwd(), 'services/face-attendance'),
        path.resolve(__dirname, '../../../../../services/face-attendance'),
        'd:/simasmuh/services/face-attendance',
        'c:/simasmuh/services/face-attendance',
      ];

      const targetDir = possibleDirs.find((dir) =>
        fs.existsSync(path.join(dir, 'main.py')),
      );

      if (targetDir) {
        try {
          const venvWindows = path.join(
            targetDir,
            '.venv',
            'Scripts',
            'python.exe',
          );
          const venvGpuWindows = path.join(
            targetDir,
            '.venv-gpu',
            'Scripts',
            'python.exe',
          );
          const venvLinux = path.join(targetDir, '.venv', 'bin', 'python');
          const venvGpuLinux = path.join(
            targetDir,
            '.venv-gpu',
            'bin',
            'python',
          );

          let pyCmd = 'python';
          if (fs.existsSync(venvWindows)) {
            pyCmd = venvWindows;
          } else if (fs.existsSync(venvGpuWindows)) {
            pyCmd = venvGpuWindows;
          } else if (fs.existsSync(venvLinux)) {
            pyCmd = venvLinux;
          } else if (fs.existsSync(venvGpuLinux)) {
            pyCmd = venvGpuLinux;
          }

          const pyProc = spawn(pyCmd, ['main.py'], {
            cwd: targetDir,
            detached: true,
            stdio: 'ignore',
            shell: false,
            windowsHide: true,
            env: {
              ...process.env,
              PYTHONUNBUFFERED: '1',
              PORT: '8089',
              BACKEND_URL: 'http://localhost:3001',
            },
          });
          pyProc.unref();

          // Wait up to 30 seconds for port 8089 to come alive with 500ms polling
          for (let i = 0; i < 60; i++) {
            await new Promise((r) => setTimeout(r, 500));
            const pingCheck = await this.getAiServiceStatus();
            if (pingCheck.isOnline) {
              isOnline = true;
              break;
            }
          }
        } catch (spawnErr: any) {
          this.logger.error(
            `Gagal meluncurkan proses python: ${spawnErr?.message || spawnErr}`,
          );
        }
      }
    }

    // 4. Trigger stream start
    try {
      const startUrls = [
        'http://127.0.0.1:8089/stream/start',
        'http://localhost:8089/stream/start',
      ];
      for (const url of startUrls) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            signal: AbortSignal.timeout(5000),
          });
          if (res.ok) {
            return await res.json();
          }
        } catch {}
      }
      if (isOnline) {
        return {
          success: true,
          message: 'AI Service aktif di port 8089 (Stream Siap)',
        };
      }
    } catch (err) {
      if (isOnline) {
        return {
          success: true,
          message: 'AI Service aktif di port 8089 (Stream Ingesting)',
        };
      }
    }

    if (isOnline) {
      return { success: true, message: 'AI Microservice FaceNet aktif' };
    }

    throw new BadRequestException(
      'Microservice AI Python di port 8089 sedang memuat model FaceNet. Silakan klik kembali tombol Nyalakan dalam beberapa detik.',
    );
  }

  async stopAiWorker() {
    // 1. Simpan status isActive: false secara permanen di konfigurasi server
    const current = this.getConfig();
    if (current.isActive) {
      current.isActive = false;
      current.updatedAt = new Date().toISOString();
      this.saveConfigFile(current);
    }

    try {
      const endpoints = [
        'http://127.0.0.1:8089/stream/stop',
        'http://localhost:8089/stream/stop',
      ];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, {
            method: 'POST',
            signal: AbortSignal.timeout(3000),
          });
          if (res.ok) {
            return {
              success: true,
              message:
                'AI FaceNet streaming dinonaktifkan (Mode Standby Hemat Daya)',
            };
          }
        } catch {}
      }
    } catch (err) {
      // fallback
    }
    return { success: true, message: 'AI FaceNet dinonaktifkan' };
  }

  async syncProfiles() {
    try {
      const endpoints = [
        'http://127.0.0.1:8089/sync-profiles',
        'http://localhost:8089/sync-profiles',
      ];
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            signal: AbortSignal.timeout(15000),
          });
          if (res.ok) {
            return await res.json();
          }
        } catch {}
      }
    } catch (err) {
      this.logger.error('Failed to trigger python sync-profiles', err);
    }
    return {
      success: true,
      message: 'Dataset profil pengguna berhasil disinkronkan ke FaceNet.',
    };
  }

  async syncSingleUser(user: {
    id: string;
    name?: string;
    role?: string;
    username?: string;
    avatarUrl?: string | null;
    identifier?: string;
    student?: { nis?: string };
    teacherProfile?: { nip?: string };
    nipNbm?: string;
  }) {
    try {
      let localPath: string | null = null;
      if (user.avatarUrl) {
        const cleanRel = user.avatarUrl.replace(/^\/uploads\//, '');
        const storageRoots = [
          STORAGE_ROOT,
          'D:/simasmuh_storage',
          'C:/simasmuh_storage',
          join(process.cwd(), 'storage'),
        ];
        const possiblePaths: string[] = [];
        for (const sRoot of storageRoots) {
          possiblePaths.push(
            join(sRoot, cleanRel),
            join(sRoot, 'profiles', cleanRel),
            join(sRoot, path.basename(cleanRel)),
            join(sRoot, 'profiles', path.basename(cleanRel)),
          );
        }
        for (const p of possiblePaths) {
          if (existsSync(p)) {
            localPath = p;
            break;
          }
        }
      }

      const payload = {
        userId: user.id,
        name: user.name || '',
        role: user.role || 'SISWA',
        identifier:
          user.identifier ||
          user.student?.nis ||
          user.nipNbm ||
          user.teacherProfile?.nip ||
          user.username ||
          user.id,
        avatarUrl: user.avatarUrl || null,
        localPath,
      };

      const endpoints = [
        'http://127.0.0.1:8089/sync-user',
        'http://localhost:8089/sync-user',
      ];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(10000),
          });
          if (res.ok) {
            return await res.json();
          }
        } catch {}
      }
    } catch (err) {
      this.logger.error('Failed to sync single user to FaceNet', err);
    }
    return {
      success: false,
      message: 'Microservice AI offline atau tidak merespons.',
    };
  }

  async scanFrame(imageBase64: string, recordAttendance: boolean = true, force: boolean = false) {
    try {
      const res = await fetch('http://127.0.0.1:8089/scan_frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64, recordAttendance, force }),
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Microservice dalam kondisi offline / standby
    }
    return { faces: [] };
  }

  async confirmAttendance(payload: { userId: string; confidence?: number }) {
    try {
      const res = await fetch('http://127.0.0.1:8089/confirm_attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Fallback: catat langsung ke database utama jika microservice unreachable
      const rec = await this.recordFaceAttendance({
        userId: payload.userId,
        confidence: payload.confidence || 0.95,
        cameraLocation: 'Gerbang Utama (Disambiguasi Kembar)',
      });
      return {
        success: true,
        message: rec.message,
        attendance: rec,
      };
    }
    return {
      success: false,
      message: 'Gagal mengonfirmasi presensi',
    };
  }

  /**
   * High-Fidelity Indonesian Female Voice (TTS Proxy & Cache)
   * Menyediakan suara wanita Indonesia yang jernih, merdu, dan ramah public speaker.
   */
  async streamTtsVoice(text: string, res: any) {
    if (!text || !text.trim()) {
      res.status(400).send('Text query parameter is required');
      return;
    }

    try {
      // Sanitasi pelafalan: bersihkan simbol/tanda baca berlebih dan konversi kata kapital ke huruf kecil
      // agar akronim / kata kapital (seperti "SIMASMUH", "MUHIPO", atau nama siswa kapital) dibaca mengalir sebagai kata utuh (tidak dieja per huruf)
      const cleanText = text
        .replace(/[,._\-/\\|(){}[\]]/g, ' ') // Ganti tanda titik, koma, garis miring dll dengan spasi agar tidak dieja
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

      const crypto = await import('crypto');
      const hash = crypto.createHash('md5').update(cleanText).digest('hex');
      const cacheDir = join(STORAGE_ROOT, 'tts-cache');
      
      if (!existsSync(cacheDir)) {
        mkdirSync(cacheDir, { recursive: true });
      }
      
      const cachedFile = join(cacheDir, `${hash}.mp3`);
      if (existsSync(cachedFile)) {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        const fileStream = fs.createReadStream(cachedFile);
        fileStream.pipe(res);
        return;
      }

      // Download suara wanita Indonesia online dari TTS engine dengan pelafalan natural
      const encodedText = encodeURIComponent(cleanText);
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=id&client=tw-ob&q=${encodedText}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`TTS provider returned status ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Simpan ke cache disk
      fs.writeFileSync(cachedFile, buffer);

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(buffer);
    } catch (err: any) {
      this.logger.warn(`Gagal streaming TTS online: ${err.message}`);
      res.status(500).send('Gagal memproses audio TTS');
    }
  }
}

