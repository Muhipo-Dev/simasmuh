import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SystemLogService } from '../../core/services/system-log.service';
import { CreateKegiatanDto } from './dto/create-kegiatan.dto';
import { UpdateKegiatanDto } from './dto/update-kegiatan.dto';
import { ScanPresensiKegiatanDto, ManualPresensiKegiatanDto } from './dto/presensi-kegiatan.dto';
import * as crypto from 'crypto';

@Injectable()
export class KegiatanSekolahService {
  constructor(
    private prisma: PrismaService,
    private systemLogService: SystemLogService,
  ) {}

  private generateQrToken(): string {
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `KEG-${timestamp}-${randomHex}`;
  }

  async create(dto: CreateKegiatanDto, userId?: string) {
    const currentYear = new Date().getFullYear();
    const count = await this.prisma.kegiatanSekolah.count();
    const nomorKegiatan = `KEG-${currentYear}-${String(count + 1).padStart(3, '0')}`;
    const qrCodeToken = this.generateQrToken();

    const record = await this.prisma.kegiatanSekolah.create({
      data: {
        nomorKegiatan,
        namaKegiatan: dto.namaKegiatan,
        kategori: dto.kategori || 'KAJIAN_SELASA_PAGI',
        tanggal: dto.tanggal ? new Date(dto.tanggal) : new Date(),
        waktuMulai: dto.waktuMulai || '06:45',
        waktuSelesai: dto.waktuSelesai || '07:30',
        tempat: dto.tempat || 'Masjid / Aula Utama',
        pemateri: dto.pemateri || null,
        penanggungJawab: dto.penanggungJawab || 'Tim Humas & Ismuba',
        ringkasanMateri: dto.ringkasanMateri || null,
        dokumentasiUrl: dto.dokumentasiUrl || null,
        qrCodeToken,
        status: dto.status || 'DIBUKA',
      },
    });

    await this.systemLogService.log({
      category: 'SISTEM',
      level: 'INFO',
      action: 'KEGIATAN_SEKOLAH_CREATED',
      message: `Kegiatan "${record.namaKegiatan}" (${record.nomorKegiatan}) berhasil dibuat dengan QR Code.`,
      userId,
      details: {
        id: record.id,
        nomorKegiatan: record.nomorKegiatan,
        namaKegiatan: record.namaKegiatan,
        qrCodeToken: record.qrCodeToken,
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
        { namaKegiatan: { contains: params.search, mode: 'insensitive' } },
        { nomorKegiatan: { contains: params.search, mode: 'insensitive' } },
        { pemateri: { contains: params.search, mode: 'insensitive' } },
        { penanggungJawab: { contains: params.search, mode: 'insensitive' } },
        { tempat: { contains: params.search, mode: 'insensitive' } },
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

    return this.prisma.kegiatanSekolah.findMany({
      where,
      include: {
        presensis: {
          orderBy: { waktuPresensi: 'asc' },
        },
        _count: {
          select: { presensis: true },
        },
      },
      orderBy: { tanggal: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.kegiatanSekolah.findUnique({
      where: { id },
      include: {
        presensis: {
          orderBy: { waktuPresensi: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                nipNbm: true,
                role: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: { presensis: true },
        },
      },
    });

    if (!record) {
      throw new NotFoundException(`Kegiatan dengan ID ${id} tidak ditemukan`);
    }

    return record;
  }

  async update(id: string, dto: UpdateKegiatanDto, userId?: string) {
    await this.findOne(id);

    const updateData: any = { ...dto };
    if (dto.tanggal) {
      updateData.tanggal = new Date(dto.tanggal);
    }

    const updated = await this.prisma.kegiatanSekolah.update({
      where: { id },
      data: updateData,
    });

    await this.systemLogService.log({
      category: 'SISTEM',
      level: 'INFO',
      action: 'KEGIATAN_SEKOLAH_UPDATED',
      message: `Data kegiatan "${updated.namaKegiatan}" (${updated.nomorKegiatan}) telah diperbarui.`,
      userId,
      details: { id: updated.id, nomorKegiatan: updated.nomorKegiatan },
    });

    return updated;
  }

  async refreshQrToken(id: string, userId?: string) {
    const record = await this.findOne(id);
    const newToken = this.generateQrToken();

    const updated = await this.prisma.kegiatanSekolah.update({
      where: { id },
      data: { qrCodeToken: newToken },
    });

    await this.systemLogService.log({
      category: 'SISTEM',
      level: 'INFO',
      action: 'KEGIATAN_QR_REFRESHED',
      message: `QR Code token untuk kegiatan "${record.namaKegiatan}" diperbarui ke ${newToken}.`,
      userId,
      details: { id: record.id, oldToken: record.qrCodeToken, newToken },
    });

    return updated;
  }

  async remove(id: string, userId?: string) {
    const record = await this.findOne(id);

    await this.prisma.kegiatanSekolah.delete({
      where: { id },
    });

    await this.systemLogService.log({
      category: 'SISTEM',
      level: 'WARN',
      action: 'KEGIATAN_SEKOLAH_DELETED',
      message: `Kegiatan "${record.namaKegiatan}" (${record.nomorKegiatan}) telah dihapus.`,
      userId,
      details: { id: record.id, nomorKegiatan: record.nomorKegiatan },
    });

    return { message: 'Kegiatan berhasil dihapus', id };
  }

  // ================= PRESENSI KEGIATAN ================= //

  async scanPresensi(dto: ScanPresensiKegiatanDto, authUserId?: string) {
    const targetUserId = dto.userId || authUserId;
    if (!targetUserId) {
      throw new BadRequestException('Pengguna tidak terautentikasi.');
    }

    // 1. Cari kegiatan berdasarkan token QR
    const kegiatan = await this.prisma.kegiatanSekolah.findUnique({
      where: { qrCodeToken: dto.qrCodeToken.trim() },
    });

    if (!kegiatan) {
      throw new BadRequestException('QR Code Kegiatan tidak valid atau tidak ditemukan.');
    }

    if (kegiatan.status === 'DITUTUP' || kegiatan.status === 'DIBATALKAN') {
      throw new BadRequestException(`Presensi untuk kegiatan ini telah ${kegiatan.status.toLowerCase()}.`);
    }

    // 2. Ambil data User
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new NotFoundException('Data pengguna tidak ditemukan.');
    }

    // 3. Cek apakah sudah pernah scan / presensi
    const existing = await this.prisma.presensiKegiatan.findUnique({
      where: {
        kegiatanId_userId: {
          kegiatanId: kegiatan.id,
          userId: user.id,
        },
      },
    });

    if (existing) {
      const timeStr = new Date(existing.waktuPresensi).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      return {
        success: true,
        alreadyRecorded: true,
        message: `Anda sudah tercatat hadir pada kegiatan "${kegiatan.namaKegiatan}" (Pukul ${timeStr} WIB).`,
        kegiatan: {
          id: kegiatan.id,
          namaKegiatan: kegiatan.namaKegiatan,
          kategori: kegiatan.kategori,
          tempat: kegiatan.tempat,
        },
        presensi: existing,
      };
    }

    // 4. Catat presensi baru
    const presensi = await this.prisma.presensiKegiatan.create({
      data: {
        kegiatanId: kegiatan.id,
        userId: user.id,
        namaPeserta: user.name,
        nipNbm: user.nipNbm || null,
        role: user.role,
        waktuPresensi: new Date(),
        metode: 'QR_SCAN',
        keterangan: dto.keterangan || 'Hadir via Scan QR Mandiri',
      },
    });

    await this.systemLogService.log({
      category: 'SISTEM',
      level: 'INFO',
      action: 'PRESENSI_KEGIATAN_RECORDED',
      message: `${user.name} berhasil melakukan presensi QR pada kegiatan "${kegiatan.namaKegiatan}".`,
      userId: user.id,
      details: {
        kegiatanId: kegiatan.id,
        namaKegiatan: kegiatan.namaKegiatan,
        presensiId: presensi.id,
      },
    });

    return {
      success: true,
      alreadyRecorded: false,
      message: `Presensi Berhasil! Anda tercatat hadir pada "${kegiatan.namaKegiatan}".`,
      kegiatan: {
        id: kegiatan.id,
        namaKegiatan: kegiatan.namaKegiatan,
        kategori: kegiatan.kategori,
        tempat: kegiatan.tempat,
      },
      presensi,
    };
  }

  async addManualPresensi(kegiatanId: string, dto: ManualPresensiKegiatanDto, adminUserId?: string) {
    const kegiatan = await this.prisma.kegiatanSekolah.findUnique({
      where: { id: kegiatanId },
    });

    if (!kegiatan) {
      throw new NotFoundException('Kegiatan tidak ditemukan');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('Data pegawai/guru tidak ditemukan');
    }

    const existing = await this.prisma.presensiKegiatan.findUnique({
      where: {
        kegiatanId_userId: {
          kegiatanId: kegiatan.id,
          userId: user.id,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`Peserta ${user.name} sudah tercatat di kegiatan ini.`);
    }

    const presensi = await this.prisma.presensiKegiatan.create({
      data: {
        kegiatanId: kegiatan.id,
        userId: user.id,
        namaPeserta: user.name,
        nipNbm: user.nipNbm || null,
        role: user.role,
        waktuPresensi: new Date(),
        metode: 'MANUAL',
        keterangan: dto.keterangan || 'Input manual oleh Admin/Humas',
      },
    });

    await this.systemLogService.log({
      category: 'SISTEM',
      level: 'INFO',
      action: 'PRESENSI_KEGIATAN_MANUAL',
      message: `Admin menambahkan presensi ${user.name} pada kegiatan "${kegiatan.namaKegiatan}".`,
      userId: adminUserId,
      details: { kegiatanId, userId: user.id, presensiId: presensi.id },
    });

    return presensi;
  }

  async removePresensi(presensiId: string, adminUserId?: string) {
    const presensi = await this.prisma.presensiKegiatan.findUnique({
      where: { id: presensiId },
      include: { kegiatan: true },
    });

    if (!presensi) {
      throw new NotFoundException('Data presensi tidak ditemukan');
    }

    await this.prisma.presensiKegiatan.delete({
      where: { id: presensiId },
    });

    await this.systemLogService.log({
      category: 'SISTEM',
      level: 'INFO',
      action: 'PRESENSI_KEGIATAN_REMOVED',
      message: `Presensi ${presensi.namaPeserta} pada kegiatan "${presensi.kegiatan.namaKegiatan}" dibatalkan/dihapus.`,
      userId: adminUserId,
      details: { presensiId, kegiatanId: presensi.kegiatanId },
    });

    return { message: 'Presensi berhasil dihapus', id: presensiId };
  }
}
