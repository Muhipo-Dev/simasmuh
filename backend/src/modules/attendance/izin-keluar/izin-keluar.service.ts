import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class IzinKeluarService {
  constructor(private prisma: PrismaService) {}

  // Pegawai/guru: ajukan izin
  async create(
    userId: string,
    data: {
      date: string;
      waktuKeluar: string;
      estimasiKembali?: string;
      alasan: string;
    },
  ) {
    const dateObj = new Date(data.date);
    dateObj.setHours(0, 0, 0, 0);
    return this.prisma.izinKeluar.create({
      data: {
        date: dateObj,
        waktuKeluar: data.waktuKeluar,
        estimasiKembali: data.estimasiKembali || null,
        alasan: data.alasan,
        status: 'MENUNGGU',
        userId,
      },
      include: { user: { select: { name: true, role: true } } },
    });
  }

  // Pegawai/guru: lihat izin saya
  async findMy(userId: string) {
    return this.prisma.izinKeluar.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 30,
    });
  }

  // Superadmin/Admin: lihat semua izin
  async findAll(date?: string) {
    const where: any = {};
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }
    return this.prisma.izinKeluar.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, role: true, subRole: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Superadmin/Admin: setujui izin
  async approve(id: string, catatanAdmin?: string) {
    const izin = await this.prisma.izinKeluar.findUnique({ where: { id } });
    if (!izin) throw new NotFoundException('Izin tidak ditemukan');
    return this.prisma.izinKeluar.update({
      where: { id },
      data: { status: 'DISETUJUI', catatanAdmin: catatanAdmin || null },
      include: { user: { select: { name: true } } },
    });
  }

  // Superadmin/Admin: tolak izin
  async reject(id: string, catatanAdmin?: string) {
    const izin = await this.prisma.izinKeluar.findUnique({ where: { id } });
    if (!izin) throw new NotFoundException('Izin tidak ditemukan');
    return this.prisma.izinKeluar.update({
      where: { id },
      data: { status: 'DITOLAK', catatanAdmin: catatanAdmin || null },
      include: { user: { select: { name: true } } },
    });
  }

  // Hapus izin (pemilik atau admin)
  async remove(id: string, userId: string, role: string) {
    const izin = await this.prisma.izinKeluar.findUnique({ where: { id } });
    if (!izin) throw new NotFoundException('Izin tidak ditemukan');
    if (izin.userId !== userId && role !== 'ADMIN_IT') {
      throw new ForbiddenException('Anda tidak berhak menghapus izin ini');
    }
    return this.prisma.izinKeluar.delete({ where: { id } });
  }

  // Ambil izin yang DISETUJUI hari ini per userId (untuk integrasi presensi)
  async getTodayApprovedByUser(userId: string) {
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return this.prisma.izinKeluar.findFirst({
      where: {
        userId,
        status: 'DISETUJUI',
        date: { gte: start, lte: end },
      },
    });
  }

  // Ambil semua izin DISETUJUI hari ini (untuk presensi publik)
  async getTodayApprovedAll(dateStr?: string): Promise<any[]> {
    let target = new Date();
    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) target = parsed;
    }
    const start = new Date(target);
    start.setHours(0, 0, 0, 0);
    const end = new Date(target);
    end.setHours(23, 59, 59, 999);
    return this.prisma.izinKeluar.findMany({
      where: {
        status: 'DISETUJUI',
        date: { gte: start, lte: end },
      },
      select: {
        userId: true,
        waktuKeluar: true,
        estimasiKembali: true,
        alasan: true,
      },
    });
  }
}
