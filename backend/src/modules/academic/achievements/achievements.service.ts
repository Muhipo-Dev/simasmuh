import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SystemLogService } from '../../core/services/system-log.service';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';

@Injectable()
export class AchievementsService {
  constructor(
    private prisma: PrismaService,
    private systemLogService: SystemLogService,
  ) {}

  async create(dto: CreateAchievementDto, user: any) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      include: { class: true },
    });

    if (!student) {
      throw new NotFoundException('Data siswa tidak ditemukan.');
    }

    const achievement = await this.prisma.studentAchievement.create({
      data: {
        studentId: dto.studentId,
        judul: dto.judul,
        kategoriBidang: dto.kategoriBidang,
        tingkat: dto.tingkat,
        peringkat: dto.peringkat || null,
        penyelenggara: dto.penyelenggara || null,
        tahun: dto.tahun || new Date().getFullYear(),
        tanggal: dto.tanggal ? new Date(dto.tanggal) : new Date(),
        tempat: dto.tempat || null,
        deskripsi: dto.deskripsi || null,
        sertifikatUrl: dto.sertifikatUrl || null,
        pembimbing: dto.pembimbing || null,
        poinApresiasi: dto.poinApresiasi || 0,
        statusVerifikasi: dto.statusVerifikasi || 'TERVERIFIKASI',
        inputByUserId: user?.id || null,
        inputByName: user?.name || null,
        inputByRole: user?.role || user?.subRole || 'KESISWAAN',
      },
      include: {
        student: {
          include: {
            class: true,
          },
        },
      },
    });

    await this.systemLogService.log({
      category: 'AKADEMIK',
      level: 'INFO',
      action: 'STUDENT_ACHIEVEMENT_CREATED',
      message: `Prestasi siswa "${student.name}" - ${achievement.judul} (${achievement.tingkat}) berhasil dicatat.`,
      userId: user?.id,
      details: {
        achievementId: achievement.id,
        studentId: student.id,
        studentName: student.name,
        judul: achievement.judul,
        tingkat: achievement.tingkat,
      },
    });

    return achievement;
  }

  async findAll(params: {
    studentId?: string;
    classId?: string;
    tingkat?: string;
    kategoriBidang?: string;
    tahun?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { studentId, classId, tingkat, kategoriBidang, tahun, search, page = 1, limit = 50 } = params;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};

    if (studentId) where.studentId = studentId;
    if (classId) where.student = { classId };
    if (tingkat) where.tingkat = tingkat;
    if (kategoriBidang) where.kategoriBidang = kategoriBidang;
    if (tahun) where.tahun = Number(tahun);

    if (search) {
      where.OR = [
        { judul: { contains: search, mode: 'insensitive' } },
        { deskripsi: { contains: search, mode: 'insensitive' } },
        { penyelenggara: { contains: search, mode: 'insensitive' } },
        { student: { name: { contains: search, mode: 'insensitive' } } },
        { student: { nisn: { contains: search, mode: 'insensitive' } } },
        { student: { nis: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.studentAchievement.count({ where }),
      this.prisma.studentAchievement.findMany({
        where,
        skip,
        take,
        orderBy: { tanggal: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              nisn: true,
              nis: true,
              gender: true,
              class: {
                select: {
                  id: true,
                  name: true,
                  gradeLevel: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / take) || 1,
      data,
    };
  }

  async getStatistics(params?: { tahun?: number; classId?: string }) {
    const where: any = {};
    if (params?.tahun) where.tahun = Number(params.tahun);
    if (params?.classId) where.student = { classId: params.classId };

    const allAchievements = await this.prisma.studentAchievement.findMany({
      where,
      select: {
        id: true,
        tingkat: true,
        kategoriBidang: true,
        tahun: true,
        tanggal: true,
        judul: true,
        peringkat: true,
        student: {
          select: {
            id: true,
            name: true,
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { tanggal: 'desc' },
    });

    const totalAchievements = allAchievements.length;

    // Tingkat breakdown
    const tingkatCounts = {
      KELAS: 0,
      SEKOLAH: 0,
      KECAMATAN: 0,
      KABUPATEN: 0,
      PROVINSI: 0,
      NASIONAL: 0,
      INTERNASIONAL: 0,
    };

    // Kategori breakdown
    const kategoriCounts = {
      AGAMA: 0,
      OLAHRAGA: 0,
      SAINS_TECH: 0,
      BAHASA: 0,
      SENI: 0,
      PENGEMBANGAN_DIRI: 0,
    };

    allAchievements.forEach((item) => {
      const t = item.tingkat as keyof typeof tingkatCounts;
      if (tingkatCounts[t] !== undefined) {
        tingkatCounts[t]++;
      }
      const k = item.kategoriBidang as keyof typeof kategoriCounts;
      if (kategoriCounts[k] !== undefined) {
        kategoriCounts[k]++;
      }
    });

    // Hitung persentase kategori
    const kategoriPercentages = {
      AGAMA: totalAchievements > 0 ? Number(((kategoriCounts.AGAMA / totalAchievements) * 100).toFixed(2)) : 0,
      OLAHRAGA: totalAchievements > 0 ? Number(((kategoriCounts.OLAHRAGA / totalAchievements) * 100).toFixed(2)) : 0,
      SAINS_TECH: totalAchievements > 0 ? Number(((kategoriCounts.SAINS_TECH / totalAchievements) * 100).toFixed(2)) : 0,
      BAHASA: totalAchievements > 0 ? Number(((kategoriCounts.BAHASA / totalAchievements) * 100).toFixed(2)) : 0,
      SENI: totalAchievements > 0 ? Number(((kategoriCounts.SENI / totalAchievements) * 100).toFixed(2)) : 0,
      PENGEMBANGAN_DIRI: totalAchievements > 0 ? Number(((kategoriCounts.PENGEMBANGAN_DIRI / totalAchievements) * 100).toFixed(2)) : 0,
    };

    // 20 Prestasi Terakhir
    const latest20 = allAchievements.slice(0, 20);

    return {
      totalAchievements,
      tingkatCounts,
      kategoriCounts,
      kategoriPercentages,
      latest20,
    };
  }

  async findOne(id: string) {
    const achievement = await this.prisma.studentAchievement.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            class: true,
          },
        },
      },
    });

    if (!achievement) {
      throw new NotFoundException('Data prestasi tidak ditemukan.');
    }

    return achievement;
  }

  async update(id: string, dto: UpdateAchievementDto, user: any) {
    const existing = await this.findOne(id);

    const updated = await this.prisma.studentAchievement.update({
      where: { id },
      data: {
        studentId: dto.studentId !== undefined ? dto.studentId : undefined,
        judul: dto.judul !== undefined ? dto.judul : undefined,
        kategoriBidang: dto.kategoriBidang !== undefined ? dto.kategoriBidang : undefined,
        tingkat: dto.tingkat !== undefined ? dto.tingkat : undefined,
        peringkat: dto.peringkat !== undefined ? dto.peringkat : undefined,
        penyelenggara: dto.penyelenggara !== undefined ? dto.penyelenggara : undefined,
        tahun: dto.tahun !== undefined ? dto.tahun : undefined,
        tanggal: dto.tanggal ? new Date(dto.tanggal) : undefined,
        tempat: dto.tempat !== undefined ? dto.tempat : undefined,
        deskripsi: dto.deskripsi !== undefined ? dto.deskripsi : undefined,
        sertifikatUrl: dto.sertifikatUrl !== undefined ? dto.sertifikatUrl : undefined,
        pembimbing: dto.pembimbing !== undefined ? dto.pembimbing : undefined,
        poinApresiasi: dto.poinApresiasi !== undefined ? dto.poinApresiasi : undefined,
        statusVerifikasi: dto.statusVerifikasi !== undefined ? dto.statusVerifikasi : undefined,
      },
      include: {
        student: {
          include: {
            class: true,
          },
        },
      },
    });

    await this.systemLogService.log({
      category: 'AKADEMIK',
      level: 'INFO',
      action: 'STUDENT_ACHIEVEMENT_UPDATED',
      message: `Data prestasi "${updated.judul}" (${updated.student.name}) berhasil diperbarui oleh ${user?.name}.`,
      userId: user?.id,
      details: {
        achievementId: updated.id,
        studentId: updated.studentId,
        judul: updated.judul,
      },
    });

    return updated;
  }

  async remove(id: string, user: any) {
    const existing = await this.findOne(id);

    await this.prisma.studentAchievement.delete({
      where: { id },
    });

    await this.systemLogService.log({
      category: 'AKADEMIK',
      level: 'WARN',
      action: 'STUDENT_ACHIEVEMENT_DELETED',
      message: `Data prestasi "${existing.judul}" (${existing.student?.name}) telah dihapus oleh ${user?.name}.`,
      userId: user?.id,
      details: {
        achievementId: id,
        studentId: existing.studentId,
        judul: existing.judul,
      },
    });

    return { message: 'Prestasi berhasil dihapus.' };
  }
}
