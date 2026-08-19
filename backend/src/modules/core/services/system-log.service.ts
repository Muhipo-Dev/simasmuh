import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from './supabase-storage.service';
import { LogCompressionService } from './log-compression.service';

export interface CreateLogDto {
  category: 'AUTH' | 'PRESENSI' | 'KEUANGAN' | 'WHATSAPP' | 'AKADEMIK' | 'SISTEM' | 'SECURITY';
  level?: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  action: string;
  message: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
}

@Injectable()
export class SystemLogService {
  private readonly logger = new Logger(SystemLogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseStorage: SupabaseStorageService,
    private readonly compressionService: LogCompressionService,
  ) {}

  /**
   * Mencatat log aktivitas/sistem baru
   */
  async log(dto: CreateLogDto) {
    try {
      const entry = await this.prisma.systemLog.create({
        data: {
          category: dto.category,
          level: dto.level || 'INFO',
          action: dto.action,
          message: dto.message,
          details: dto.details ? (typeof dto.details === 'object' ? dto.details : { raw: dto.details }) : undefined,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          userId: dto.userId,
          userName: dto.userName,
          userRole: dto.userRole,
        },
      });
      return entry;
    } catch (err: any) {
      this.logger.error(`Failed to write system log: ${err?.message || err}`);
      return null;
    }
  }

  /**
   * Mengambil daftar log aktif dengan filter dan pagination
   */
  async getLogs(params: {
    category?: string;
    level?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    isArchived?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.category && params.category !== 'ALL') {
      where.category = params.category;
    }

    if (params.level && params.level !== 'ALL') {
      where.level = params.level;
    }

    if (typeof params.isArchived === 'boolean') {
      where.isArchived = params.isArchived;
    }

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate);
    }

    if (params.search && params.search.trim() !== '') {
      const q = params.search.trim();
      where.OR = [
        { message: { contains: q, mode: 'insensitive' } },
        { action: { contains: q, mode: 'insensitive' } },
        { userName: { contains: q, mode: 'insensitive' } },
        { userRole: { contains: q, mode: 'insensitive' } },
        { ipAddress: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.systemLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Mengarsipkan & mengompresi log ke Supabase Storage sekecil-kecilnya
   */
  async archiveLogsToSupabase(options?: {
    category?: string;
    forceAll?: boolean;
    algorithm?: 'GZIP_LEVEL_9' | 'BROTLI_MAX';
  }) {
    const category = options?.category || 'ALL';
    const algorithm = options?.algorithm || 'GZIP_LEVEL_9';
    const forceAll = options?.forceAll || false;

    // Filter log yang belum diarsipkan
    const where: any = {};
    if (!forceAll) {
      where.isArchived = false;
    }
    if (category !== 'ALL') {
      where.category = category;
    }

    // Ambil log yang memenuhi syarat
    const logsToArchive = await this.prisma.systemLog.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    // Ambil juga WhatsApp logs jika kategori ALL atau WHATSAPP
    let waLogsToArchive: any[] = [];
    if (category === 'ALL' || category === 'WHATSAPP') {
      waLogsToArchive = await this.prisma.whatsAppLog.findMany({
        orderBy: { createdAt: 'asc' },
        take: 500,
      });
    }

    if (logsToArchive.length === 0 && waLogsToArchive.length === 0) {
      return {
        success: true,
        message: 'Tidak ada data log baru yang perlu dikompres & diarsipkan.',
        archivedCount: 0,
      };
    }

    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const timestampStr = `${yearMonth}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

    const ext = algorithm === 'BROTLI_MAX' ? 'br' : 'gz';
    const filename = `simasmuh_log_${category.toLowerCase()}_${timestampStr}.json.${ext}`;
    const storagePath = `archives/${yearMonth}/${filename}`;

    // Format log sekecil mungkin
    const payload = {
      meta: {
        school: 'SMA Muhammadiyah 1 Ponorogo',
        system: 'SIMASMUH Cloud Log System',
        category,
        archivedAt: now.toISOString(),
        totalSystemLogs: logsToArchive.length,
        totalWhatsAppLogs: waLogsToArchive.length,
        algorithm,
      },
      systemLogs: logsToArchive,
      whatsappLogs: waLogsToArchive,
    };

    // Kompresi sekecil-kecilnya
    const compressionResult =
      algorithm === 'BROTLI_MAX'
        ? this.compressionService.compressBrotli(payload)
        : this.compressionService.compressGzip(payload);

    // Upload ke Supabase Storage
    const uploadRes = await this.supabaseStorage.uploadCompressedBuffer(
      'system-logs',
      storagePath,
      compressionResult.compressedBuffer,
      algorithm === 'BROTLI_MAX' ? 'application/x-brotli' : 'application/gzip',
    );

    if (!uploadRes.success) {
      throw new Error(`Gagal mengunggah log terkompresi ke Supabase: ${uploadRes.error}`);
    }

    const startDate = logsToArchive[0]?.createdAt || now;
    const endDate = logsToArchive[logsToArchive.length - 1]?.createdAt || now;

    // Simpan riwayat arsip ke DB
    const archiveRecord = await this.prisma.compressedLogArchive.create({
      data: {
        filename,
        storagePath,
        bucketName: 'system-logs',
        category,
        originalSizeBytes: compressionResult.originalSizeBytes,
        compressedSizeBytes: compressionResult.compressedSizeBytes,
        compressionRatio: compressionResult.compressionRatioPercent,
        compressionAlgo: algorithm,
        recordCount: logsToArchive.length + waLogsToArchive.length,
        startDate,
        endDate,
        checksumSha256: compressionResult.checksumSha256,
        uploadedToSupabase: true,
        supabaseUrl: uploadRes.url,
        notes: `Tersimpan di Supabase bucket 'system-logs' dengan kompresi ${compressionResult.compressionRatioPercent}% (${this.compressionService.formatBytes(compressionResult.savedBytes)} dihemat)`,
      },
    });

    // Tandai log sistem sebagai terarsip
    if (logsToArchive.length > 0) {
      const logIds = logsToArchive.map((l) => l.id);
      await this.prisma.systemLog.updateMany({
        where: { id: { in: logIds } },
        data: {
          isArchived: true,
          archiveId: archiveRecord.id,
        },
      });
    }

    this.logger.log(
      `📦 Log Archive Created: ${filename} | Original: ${this.compressionService.formatBytes(compressionResult.originalSizeBytes)} -> Compressed: ${this.compressionService.formatBytes(compressionResult.compressedSizeBytes)} (${compressionResult.compressionRatioPercent}% saved)`,
    );

    return {
      success: true,
      archive: archiveRecord,
      metrics: {
        originalSize: this.compressionService.formatBytes(compressionResult.originalSizeBytes),
        compressedSize: this.compressionService.formatBytes(compressionResult.compressedSizeBytes),
        savedBytes: this.compressionService.formatBytes(compressionResult.savedBytes),
        compressionRatio: `${compressionResult.compressionRatioPercent}%`,
        totalRecords: logsToArchive.length + waLogsToArchive.length,
      },
    };
  }

  /**
   * Mengambil daftar arsip log dari database & Supabase
   */
  async getArchives(params: { category?: string; page?: number; limit?: number }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.category && params.category !== 'ALL') {
      where.category = params.category;
    }

    const [items, total] = await Promise.all([
      this.prisma.compressedLogArchive.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.compressedLogArchive.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        formattedOriginalSize: this.compressionService.formatBytes(item.originalSizeBytes),
        formattedCompressedSize: this.compressionService.formatBytes(item.compressedSizeBytes),
        formattedSavedSize: this.compressionService.formatBytes(
          Math.max(0, item.originalSizeBytes - item.compressedSizeBytes),
        ),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Mengunduh atau melihat isi arsip log dari Supabase Storage
   */
  async getArchiveContent(archiveId: string, decompress = false) {
    const archive = await this.prisma.compressedLogArchive.findUnique({
      where: { id: archiveId },
    });

    if (!archive) {
      throw new Error('Arsip log tidak ditemukan');
    }

    const buffer = await this.supabaseStorage.downloadBuffer(archive.bucketName, archive.storagePath);
    if (!buffer) {
      throw new Error('Gagal mengunduh file log dari Supabase Storage');
    }

    if (decompress) {
      const rawString =
        archive.compressionAlgo === 'BROTLI_MAX'
          ? this.compressionService.decompressBrotli(buffer)
          : this.compressionService.decompressGzip(buffer);

      try {
        return {
          archive,
          isDecompressed: true,
          data: JSON.parse(rawString),
        };
      } catch {
        return {
          archive,
          isDecompressed: true,
          data: rawString,
        };
      }
    }

    return {
      archive,
      isDecompressed: false,
      buffer,
      filename: archive.filename,
      contentType: archive.compressionAlgo === 'BROTLI_MAX' ? 'application/x-brotli' : 'application/gzip',
    };
  }

  /**
   * Ringkasan Statistik Kompresi & Penyimpanan Supabase
   */
  async getStorageStats() {
    const [
      totalLogsCount,
      unarchivedLogsCount,
      archivesCount,
      sizeAggregates,
      recentArchives,
    ] = await Promise.all([
      this.prisma.systemLog.count(),
      this.prisma.systemLog.count({ where: { isArchived: false } }),
      this.prisma.compressedLogArchive.count(),
      this.prisma.compressedLogArchive.aggregate({
        _sum: {
          originalSizeBytes: true,
          compressedSizeBytes: true,
          recordCount: true,
        },
      }),
      this.prisma.compressedLogArchive.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const totalOriginalBytes = sizeAggregates._sum.originalSizeBytes || 0;
    const totalCompressedBytes = sizeAggregates._sum.compressedSizeBytes || 0;
    const totalSavedBytes = Math.max(0, totalOriginalBytes - totalCompressedBytes);
    const overallRatio =
      totalOriginalBytes > 0
        ? parseFloat((((totalOriginalBytes - totalCompressedBytes) / totalOriginalBytes) * 100).toFixed(2))
        : 0;

    return {
      supabaseStorage: {
        bucket: 'system-logs',
        status: 'ONLINE',
        compressionStandard: 'GZIP Level 9 / Brotli Max',
      },
      counts: {
        totalLogs: totalLogsCount,
        unarchivedLogs: unarchivedLogsCount,
        archivedRecords: sizeAggregates._sum.recordCount || 0,
        totalArchives: archivesCount,
      },
      storageMetrics: {
        totalOriginalBytes,
        totalCompressedBytes,
        totalSavedBytes,
        formattedOriginalSize: this.compressionService.formatBytes(totalOriginalBytes),
        formattedCompressedSize: this.compressionService.formatBytes(totalCompressedBytes),
        formattedSavedSize: this.compressionService.formatBytes(totalSavedBytes),
        overallCompressionRatio: `${overallRatio}%`,
      },
      recentArchives: recentArchives.map((a) => ({
        ...a,
        formattedOriginalSize: this.compressionService.formatBytes(a.originalSizeBytes),
        formattedCompressedSize: this.compressionService.formatBytes(a.compressedSizeBytes),
      })),
    };
  }

  /**
   * Purge log yang sudah terarsip di Supabase untuk menghemat ruang basis data
   */
  async purgeArchivedLogs(olderThanDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const deleted = await this.prisma.systemLog.deleteMany({
      where: {
        isArchived: true,
        createdAt: { lte: cutoffDate },
      },
    });

    return {
      success: true,
      deletedCount: deleted.count,
      message: `${deleted.count} log lama yang sudah terkompres aman di Supabase telah dibersihkan dari database aktif.`,
    };
  }
}
