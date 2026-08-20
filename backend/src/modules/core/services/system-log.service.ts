import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mencatat log aktivitas/sistem standar langsung ke database
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
   * Mengambil daftar log aktivitas
   */
  async getLogs(params: {
    category?: string;
    level?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
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
}
