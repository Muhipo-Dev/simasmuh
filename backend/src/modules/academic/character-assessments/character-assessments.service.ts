import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SystemLogService } from '../../core/services/system-log.service';
import { WhatsAppService } from '../../communication/whatsapp/whatsapp.service';

export class CreateAssessmentDto {
  studentId: string;
  category: 'ADAB_ETIKA' | 'IBADAH' | 'KEDISIPLINAN' | 'PRESTASI_PENGHARGAAN' | 'PELANGGARAN';
  type: 'POSITIF' | 'NEGATIF' | 'RUTIN' | 'CATATAN_KONSELING';
  title: string;
  description?: string;
  points?: number;
  date?: string;
  actionTaken?: string;
  status?: string;
  notifyParent?: boolean;
}

@Injectable()
export class CharacterAssessmentsService {
  private readonly logger = new Logger(CharacterAssessmentsService.name);

  constructor(
    private prisma: PrismaService,
    private systemLogService: SystemLogService,
    private whatsAppService: WhatsAppService,
  ) {}

  async findAll(query: {
    studentId?: string;
    classId?: string;
    category?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.studentId) where.studentId = query.studentId;
    if (query.category) where.category = query.category;
    if (query.type) where.type = query.type;
    if (query.classId) {
      where.student = { classId: query.classId };
    }
    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.characterAssessment.count({ where }),
      this.prisma.characterAssessment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          student: {
            include: {
              class: true,
            },
          },
          evaluator: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
              subRole: true,
              subRole2: true,
              subRole3: true,
            },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const assessment = await this.prisma.characterAssessment.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            class: true,
            parentRelations: {
              include: {
                parent: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
        evaluator: {
          select: {
            id: true,
            name: true,
            role: true,
            subRole: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Data penilaian adab & ketertiban tidak ditemukan');
    }

    return assessment;
  }

  async getStudentSummary(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Siswa tidak ditemukan');
    }

    const assessments = await this.prisma.characterAssessment.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
      include: {
        evaluator: {
          select: {
            name: true,
            role: true,
            subRole: true,
          },
        },
      },
    });

    // Kalkulasi Poin Kedisiplinan (Dasar: 100 Poin)
    let totalPointsDelta = 0;
    let totalPelanggaran = 0;
    let totalPrestasi = 0;
    let totalCatatanKonseling = 0;
    let amalanIbadahCount = 0;

    assessments.forEach((item) => {
      totalPointsDelta += item.points;
      if (item.category === 'PELANGGARAN' || item.type === 'NEGATIF') {
        totalPelanggaran++;
      } else if (item.category === 'PRESTASI_PENGHARGAAN' || (item.points > 0 && item.type === 'POSITIF')) {
        totalPrestasi++;
      } else if (item.category === 'IBADAH') {
        amalanIbadahCount++;
      }

      if (item.type === 'CATATAN_KONSELING') {
        totalCatatanKonseling++;
      }
    });

    const kedisiplinanScore = Math.max(0, Math.min(100, 100 + totalPointsDelta));
    
    // Predikat Kedisiplinan
    let kedisiplinanPredikat = 'A (Sangat Baik / Teladan)';
    if (kedisiplinanScore < 60) kedisiplinanPredikat = 'D (Perlu Pembinaan Khusus)';
    else if (kedisiplinanScore < 75) kedisiplinanPredikat = 'C (Cukup / Peringatan)';
    else if (kedisiplinanScore < 90) kedisiplinanPredikat = 'B (Baik)';

    // Predikat Ibadah & Etika
    const ibadahScore = amalanIbadahCount >= 5 ? 'A (Sangat Rajin)' : amalanIbadahCount >= 2 ? 'B (Aktif)' : 'B (Baik)';
    const perilakuScore = totalPelanggaran === 0 ? 'A (Terpuji & Santun)' : totalPelanggaran <= 2 ? 'B (Baik)' : 'C (Perlu Pembinaan)';

    return {
      student,
      kedisiplinanScore,
      kedisiplinanPredikat,
      ibadahScore,
      perilakuScore,
      totalPelanggaran,
      totalPrestasi,
      totalCatatanKonseling,
      totalAssessments: assessments.length,
      history: assessments,
    };
  }

  async getDashboardStatistics() {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const [
      totalAssessments,
      todayAssessments,
      totalPelanggaran,
      totalPrestasi,
      totalIbadah,
      totalKonseling,
      recentAssessments,
      categoryCounts,
      classesWithIssues,
    ] = await Promise.all([
      this.prisma.characterAssessment.count(),
      this.prisma.characterAssessment.count({
        where: { date: { gte: startOfToday, lte: endOfToday } },
      }),
      this.prisma.characterAssessment.count({
        where: { OR: [{ category: 'PELANGGARAN' }, { type: 'NEGATIF' }] },
      }),
      this.prisma.characterAssessment.count({
        where: { OR: [{ category: 'PRESTASI_PENGHARGAAN' }, { type: 'POSITIF' }] },
      }),
      this.prisma.characterAssessment.count({
        where: { category: 'IBADAH' },
      }),
      this.prisma.characterAssessment.count({
        where: { type: 'CATATAN_KONSELING' },
      }),
      this.prisma.characterAssessment.findMany({
        take: 8,
        orderBy: { date: 'desc' },
        include: {
          student: {
            include: {
              class: true,
            },
          },
          evaluator: {
            select: {
              name: true,
              role: true,
              subRole: true,
            },
          },
        },
      }),
      this.prisma.characterAssessment.groupBy({
        by: ['category'],
        _count: { id: true },
      }),
      this.prisma.characterAssessment.findMany({
        where: { OR: [{ category: 'PELANGGARAN' }, { type: 'NEGATIF' }] },
        select: {
          student: {
            select: {
              class: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // Grouping pelanggaran per kelas
    const classPelanggaranMap: Record<string, { className: string; count: number }> = {};
    classesWithIssues.forEach((item) => {
      const cls = item.student?.class;
      if (cls) {
        if (!classPelanggaranMap[cls.id]) {
          classPelanggaranMap[cls.id] = { className: cls.name, count: 0 };
        }
        classPelanggaranMap[cls.id].count++;
      }
    });

    const topClassesWithPelanggaran = Object.values(classPelanggaranMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalAssessments,
      todayAssessments,
      totalPelanggaran,
      totalPrestasi,
      totalIbadah,
      totalKonseling,
      recentAssessments,
      categoryCounts: categoryCounts.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
      topClassesWithPelanggaran,
    };
  }

  async create(dto: CreateAssessmentDto, evaluatorId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      include: {
        class: true,
        user: true,
        parentRelations: {
          include: {
            parent: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Siswa tidak ditemukan');
    }

    const evaluator = await this.prisma.user.findUnique({
      where: { id: evaluatorId },
    });

    const points = Number(dto.points) || 0;

    const assessment = await this.prisma.characterAssessment.create({
      data: {
        studentId: dto.studentId,
        evaluatorId,
        category: dto.category,
        type: dto.type,
        title: dto.title,
        description: dto.description || null,
        points,
        date: dto.date ? new Date(dto.date) : new Date(),
        actionTaken: dto.actionTaken || null,
        status: dto.status || 'SELESAI',
        notifyParent: dto.notifyParent !== false,
      },
      include: {
        student: {
          include: {
            class: true,
          },
        },
        evaluator: {
          select: {
            id: true,
            name: true,
            role: true,
            subRole: true,
          },
        },
      },
    });

    // 1. Notifikasi In-App ke Siswa & Orang Tua/Wali
    try {
      const notifCategory = dto.category.replace('_', ' ');
      const notifTitle = `Catatan ${notifCategory}: ${dto.title}`;
      const notifMessage = `Siswa: ${student.name} (${student.class?.name || '-'}). ${dto.description || dto.title}. Poin: ${points > 0 ? '+' : ''}${points}. Penilai: ${evaluator?.name || 'Tim Pembina'}`;

      // In-App ke Siswa jika memiliki akun
      if (student.userId) {
        await this.prisma.notification.create({
          data: {
            userId: student.userId,
            senderId: evaluatorId,
            type: 'ETIKA_TATIB',
            title: notifTitle,
            message: notifMessage,
            priority: dto.category === 'PELANGGARAN' ? 'HIGH' : 'NORMAL',
            data: { assessmentId: assessment.id, category: dto.category, points },
          },
        });
      }

      // In-App ke Akun Wali Murid
      for (const rel of student.parentRelations) {
        if (rel.parent?.userId) {
          await this.prisma.notification.create({
            data: {
              userId: rel.parent.userId,
              senderId: evaluatorId,
              type: 'ETIKA_TATIB',
              title: notifTitle,
              message: notifMessage,
              priority: dto.category === 'PELANGGARAN' ? 'HIGH' : 'NORMAL',
              data: { assessmentId: assessment.id, studentId: student.id, category: dto.category },
            },
          });
        }
      }

      // 2. Standar Notifikasi Ganda WhatsApp ke Orang Tua / Wali & Siswa
      if (dto.notifyParent !== false) {
        const waTargets = new Set<string>();
        if (student.parentPhone) waTargets.add(student.parentPhone);
        if (student.phone) waTargets.add(student.phone);

        // Ambil no hp dari parentRelations
        for (const rel of student.parentRelations) {
          if (rel.parent?.phone) waTargets.add(rel.parent.phone);
          if (rel.parent?.user?.phone) waTargets.add(rel.parent.user.phone);
        }

        if (waTargets.size === 0) {
          waTargets.add(WhatsAppService.DEFAULT_SENDER_NUMBER);
        }

        for (const phone of waTargets) {
          const waMessage = 
`🔔 *PEMBERITAHUAN CATATAN SISWA & TATA TERTIB*
*SIMASMUH - SMA Muhammadiyah 1 Ponorogo*
----------------------------------------
👤 *Nama Siswa:* ${student.name}
🏷️ *NIS/NISN:* ${student.nis} / ${student.nisn}
🏫 *Kelas:* ${student.class?.name || '-'}
📌 *Kategori:* ${notifCategory}
📋 *Judul:* ${dto.title}
📝 *Keterangan:* ${dto.description || '-'}
⚖️ *Poin Evaluasi:* ${points > 0 ? '+' : ''}${points}
🛠️ *Tindak Lanjut:* ${dto.actionTaken || 'Dipantau dan dibimbing secara berkala'}
👨‍🏫 *Penilai / Pembina:* ${evaluator?.name || 'Tim Ketertiban & BP/BK'}
----------------------------------------
_Informasi ini terkirim otomatis melalui Sistem Manajemen Akademik & Karakter Siswa (SIMASMUH)._`;

          await this.whatsAppService.sendDirectMessage({
            to: phone,
            recipientName: student.name,
            recipientRole: 'WALI_MURID',
            category: 'INFORMASI',
            title: `Evaluasi Adab & Tatib - ${student.name}`,
            message: waMessage,
          });
        }
      }

      // 3. Log ke SystemLog
      await this.systemLogService.log({
        category: 'AKADEMIK',
        action: 'CHARACTER_ASSESSMENT_CREATED',
        message: `Penilaian ${dto.category} dibuat untuk ${student.name} (${student.nis}) oleh ${evaluator?.name || evaluatorId}`,
        userId: evaluatorId,
        userName: evaluator?.name,
        userRole: evaluator?.role,
        details: {
          assessmentId: assessment.id,
          studentId: student.id,
          category: dto.category,
          points,
        },
      });
    } catch (err: any) {
      this.logger.error(`Gagal mengirim notifikasi adab & tatib: ${err.message}`);
    }

    return assessment;
  }

  async update(id: string, dto: Partial<CreateAssessmentDto>, userId: string) {
    const existing = await this.prisma.characterAssessment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Data penilaian tidak ditemukan');
    }

    const updated = await this.prisma.characterAssessment.update({
      where: { id },
      data: {
        category: dto.category,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        points: dto.points !== undefined ? Number(dto.points) : undefined,
        date: dto.date ? new Date(dto.date) : undefined,
        actionTaken: dto.actionTaken,
        status: dto.status,
      },
      include: {
        student: {
          include: {
            class: true,
          },
        },
        evaluator: {
          select: {
            name: true,
            role: true,
            subRole: true,
          },
        },
      },
    });

    await this.systemLogService.log({
      category: 'AKADEMIK',
      action: 'CHARACTER_ASSESSMENT_UPDATED',
      message: `Pembaruan data penilaian adab ID: ${id}`,
      userId,
    });

    return updated;
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.characterAssessment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Data penilaian tidak ditemukan');
    }

    await this.prisma.characterAssessment.delete({ where: { id } });

    await this.systemLogService.log({
      category: 'AKADEMIK',
      action: 'CHARACTER_ASSESSMENT_DELETED',
      message: `Penghapusan catatan penilaian adab & tatib ID: ${id}`,
      userId,
    });

    return { message: 'Data penilaian berhasil dihapus' };
  }
}
