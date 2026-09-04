import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SystemLogService } from '../../core/services/system-log.service';
import { CreateNotulensiDto } from './dto/create-notulensi.dto';
import { UpdateNotulensiDto } from './dto/update-notulensi.dto';

@Injectable()
export class NotulensiRapatService {
  constructor(
    private prisma: PrismaService,
    private systemLogService: SystemLogService,
  ) {}

  async create(dto: CreateNotulensiDto, userId?: string) {
    const count = await this.prisma.notulensiRapat.count();
    const currentYear = new Date().getFullYear();
    const nomorNotulensi = `NOT-${currentYear}-${String(count + 1).padStart(3, '0')}`;

    const record = await this.prisma.notulensiRapat.create({
      data: {
        nomorNotulensi,
        judulRapat: dto.judulRapat,
        agenda: dto.agenda || null,
        kategori: dto.kategori || 'RAPAT_DINAS',
        tanggal: dto.tanggal ? new Date(dto.tanggal) : new Date(),
        waktuMulai: dto.waktuMulai || '08:00',
        waktuSelesai: dto.waktuSelesai || '11:00',
        tempat: dto.tempat || 'Aula Utama',
        pemimpinRapat: dto.pemimpinRapat,
        notulis: dto.notulis,
        pesertaHadirCount: dto.pesertaHadirCount || 0,
        pesertaTotalCount: dto.pesertaTotalCount || 0,
        daftarPeserta: dto.daftarPeserta || null,
        poinPembahasan: dto.poinPembahasan || null,
        keputusanHasil: dto.keputusanHasil,
        tindakLanjut: dto.tindakLanjut || null,
        fotoDokumentasi: dto.fotoDokumentasi || null,
        fileLampiran: dto.fileLampiran || null,
        status: dto.status || 'FINAL',
      },
    });

    await this.systemLogService.log({
      category: 'SISTEM',
      level: 'INFO',
      action: 'NOTULENSI_RAPAT_CREATED',
      message: `Notulensi rapat "${record.judulRapat}" (${record.nomorNotulensi}) berhasil diarsipkan.`,
      userId,
      details: {
        id: record.id,
        nomorNotulensi: record.nomorNotulensi,
        judulRapat: record.judulRapat,
        kategori: record.kategori,
      },
    });

    return record;
  }

  async findAll(params?: {
    search?: string;
    kategori?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = {};

    if (params?.search) {
      where.OR = [
        { judulRapat: { contains: params.search, mode: 'insensitive' } },
        { agenda: { contains: params.search, mode: 'insensitive' } },
        { pemimpinRapat: { contains: params.search, mode: 'insensitive' } },
        { notulis: { contains: params.search, mode: 'insensitive' } },
        { nomorNotulensi: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params?.kategori && params.kategori !== 'ALL') {
      where.kategori = params.kategori;
    }

    if (params?.status && params.status !== 'ALL') {
      where.status = params.status;
    }

    if (params?.startDate && params?.endDate) {
      where.tanggal = {
        gte: new Date(params.startDate),
        lte: new Date(params.endDate),
      };
    }

    return this.prisma.notulensiRapat.findMany({
      where,
      orderBy: { tanggal: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.notulensiRapat.findUnique({
      where: { id },
    });
    if (!record) {
      throw new NotFoundException(`Notulensi rapat dengan ID ${id} tidak ditemukan`);
    }
    return record;
  }

  async update(id: string, dto: UpdateNotulensiDto, userId?: string) {
    await this.findOne(id);

    const data: any = { ...dto };
    if (dto.tanggal) {
      data.tanggal = new Date(dto.tanggal);
    }

    const updated = await this.prisma.notulensiRapat.update({
      where: { id },
      data,
    });

    await this.systemLogService.log({
      category: 'SISTEM',
      level: 'INFO',
      action: 'NOTULENSI_RAPAT_UPDATED',
      message: `Notulensi rapat "${updated.judulRapat}" (${updated.nomorNotulensi}) telah diperbarui.`,
      userId,
      details: { id: updated.id, nomorNotulensi: updated.nomorNotulensi },
    });

    return updated;
  }

  async remove(id: string, userId?: string) {
    const record = await this.findOne(id);

    await this.prisma.notulensiRapat.delete({
      where: { id },
    });

    await this.systemLogService.log({
      category: 'SISTEM',
      level: 'WARN',
      action: 'NOTULENSI_RAPAT_DELETED',
      message: `Notulensi rapat "${record.judulRapat}" (${record.nomorNotulensi}) telah dihapus.`,
      userId,
      details: { id: record.id, nomorNotulensi: record.nomorNotulensi },
    });

    return { message: 'Notulensi rapat berhasil dihapus', id };
  }
}
