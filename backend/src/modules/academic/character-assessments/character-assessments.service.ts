import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SystemLogService } from '../../core/services/system-log.service';
import { EmailNotificationService } from '../../communication/notifications/email.service';

export class CreateAssessmentDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  studentId: string;

  @IsEnum([
    'ADAB_ETIKA',
    'IBADAH',
    'KEDISIPLINAN',
    'PRESTASI_PENGHARGAAN',
    'PELANGGARAN',
    'CATATAN_BK',
  ])
  category:
    | 'ADAB_ETIKA'
    | 'IBADAH'
    | 'KEDISIPLINAN'
    | 'PRESTASI_PENGHARGAAN'
    | 'PELANGGARAN'
    | 'CATATAN_BK';

  @IsEnum(['POSITIF', 'NEGATIF', 'RUTIN', 'CATATAN_KONSELING', 'PEMBINAAN', 'PEMANGGILAN_ORTU'])
  type: 'POSITIF' | 'NEGATIF' | 'RUTIN' | 'CATATAN_KONSELING' | 'PEMBINAAN' | 'PEMANGGILAN_ORTU';

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  points?: number;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  actionTaken?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBoolean()
  notifyParent?: boolean;
}

@Injectable()
export class CharacterAssessmentsService {
  private readonly logger = new Logger(CharacterAssessmentsService.name);

  constructor(
    private prisma: PrismaService,
    private systemLogService: SystemLogService,
    private emailNotificationService: EmailNotificationService,
  ) {}

  async findAll(query: {
    studentId?: string;
    classId?: string;
    category?: string;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 50));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.studentId) where.studentId = query.studentId;
    if (query.category) where.category = query.category;
    if (query.type) where.type = query.type;
    if (query.status && query.status !== 'ALL') where.status = query.status;
    if (query.classId && query.classId !== 'ALL') {
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
              subRole4: true,
              subRole5: true,
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
      throw new NotFoundException(
        'Data penilaian adab & ketertiban tidak ditemukan',
      );
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

    // Kalkulasi Poin Kedisiplinan (Dasar: 1000 Poin) - hanya hitung yang sudah terverifikasi / disetujui / selesai
    let totalPointsDelta = 0;
    let totalPelanggaran = 0;
    let totalPrestasi = 0;
    let totalCatatanKonseling = 0;
    let amalanIbadahCount = 0;
    let pendingVerificationCount = 0;

    assessments.forEach((item) => {
      const isVerified =
        item.status === 'SELESAI' ||
        item.status === 'TERVERIFIKASI' ||
        item.status === 'DALAM_PEMBINAAN';
      if (item.status === 'MENUNGGU' || item.status === 'MENUNGGU_VERIFIKASI') {
        pendingVerificationCount++;
      }

      if (isVerified) {
        totalPointsDelta += item.points;
        if (item.category === 'PELANGGARAN' || item.type === 'NEGATIF') {
          totalPelanggaran++;
        } else if (
          item.category === 'PRESTASI_PENGHARGAAN' ||
          (item.points > 0 && item.type === 'POSITIF')
        ) {
          totalPrestasi++;
        } else if (item.category === 'IBADAH') {
          amalanIbadahCount++;
        }
      }

      if (item.type === 'CATATAN_KONSELING') {
        totalCatatanKonseling++;
      }
    });

    const kedisiplinanScore = Math.max(
      0,
      Math.min(1000, 1000 + totalPointsDelta),
    );

    // Predikat / Skor Huruf Standar (Skala 1000 Poin)
    // A: 900 - 1000 (Baik / Terpuji)
    // B: 700 - 899  (Baik / Perlu Pantauan & Sedikit Bimbingan)
    // C: 500 - 699  (Cukup / Perlu Pantauan & Bimbingan)
    // D: 200 - 499  (Kurang / Perlu Bimbingan Ketat)
    // E: 0 - 199    (Sangat Rendah / Dikeluarkan dari Sekolah)
    const getGradeInfo = (score: number) => {
      if (score >= 900) return { grade: 'A', label: 'A (Baik / Terpuji)' };
      if (score >= 700) return { grade: 'B', label: 'B (Pantauan & Bimbingan Ringan)' };
      if (score >= 500) return { grade: 'C', label: 'C (Pantauan & Bimbingan)' };
      if (score >= 200) return { grade: 'D', label: 'D (Perlu Bimbingan Ketat)' };
      return { grade: 'E', label: 'E (Kritis / Dikeluarkan dari Sekolah)' };
    };

    const kedisiplinanPredikat = getGradeInfo(kedisiplinanScore).label;
    const kedisiplinanGrade = getGradeInfo(kedisiplinanScore).grade;

    // Perhitungan Skor Ibadah (Basis 1000 Poin) - Amalan ibadah dan poin kebaikan memulihkan poin yang berkurang
    const ibadahBonus = (amalanIbadahCount * 50) + (totalPrestasi * 25);
    const ibadahScoreNum = Math.max(0, Math.min(1000, 1000 + ibadahBonus - (totalPelanggaran * 30)));
    const ibadahScore = getGradeInfo(ibadahScoreNum).label;
    const ibadahGrade = getGradeInfo(ibadahScoreNum).grade;

    // Perhitungan Skor Perilaku / Adab (Basis 1000 Poin) - Prestasi, adab, dan kebaikan (XP Kebaikan) dapat memulihkan skor
    const kebaikanXpBonus = Math.max(0, totalPointsDelta > 0 ? totalPointsDelta : 0);
    const perilakuScoreNum = Math.max(0, Math.min(1000, 1000 - (totalPelanggaran * 100) + kebaikanXpBonus));
    const perilakuScore = getGradeInfo(perilakuScoreNum).label;
    const perilakuGrade = getGradeInfo(perilakuScoreNum).grade;

    return {
      student,
      kedisiplinanScore,
      kedisiplinanPredikat,
      kedisiplinanGrade,
      ibadahScore,
      ibadahGrade,
      perilakuScore,
      perilakuGrade,
      totalPelanggaran,
      totalPrestasi,
      totalCatatanKonseling,
      pendingVerificationCount,
      totalAssessments: assessments.length,
      history: assessments,
    };
  }

  async getDashboardStatistics() {
    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0,
    );
    const endOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999,
    );

    const [
      totalAssessments,
      todayAssessments,
      totalPelanggaran,
      totalPrestasi,
      totalIbadah,
      totalKonseling,
      pendingVerification,
      recentAssessments,
      categoryCounts,
      classesWithIssues,
    ] = await Promise.all([
      this.prisma.characterAssessment.count(),
      this.prisma.characterAssessment.count({
        where: { date: { gte: startOfToday, lte: endOfToday } },
      }),
      this.prisma.characterAssessment.count({
        where: {
          OR: [{ category: 'PELANGGARAN' }, { type: 'NEGATIF' }],
          status: { in: ['SELESAI', 'TERVERIFIKASI', 'DALAM_PEMBINAAN'] },
        },
      }),
      this.prisma.characterAssessment.count({
        where: {
          OR: [{ category: 'PRESTASI_PENGHARGAAN' }, { type: 'POSITIF' }],
          status: { in: ['SELESAI', 'TERVERIFIKASI', 'DALAM_PEMBINAAN'] },
        },
      }),
      this.prisma.characterAssessment.count({
        where: {
          category: 'IBADAH',
          status: { in: ['SELESAI', 'TERVERIFIKASI', 'DALAM_PEMBINAAN'] },
        },
      }),
      this.prisma.characterAssessment.count({
        where: { type: 'CATATAN_KONSELING' },
      }),
      this.prisma.characterAssessment.count({
        where: { status: { in: ['MENUNGGU', 'MENUNGGU_VERIFIKASI'] } },
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
        where: {
          OR: [{ category: 'PELANGGARAN' }, { type: 'NEGATIF' }],
          status: { in: ['SELESAI', 'TERVERIFIKASI', 'DALAM_PEMBINAAN'] },
        },
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
    const classPelanggaranMap: Record<
      string,
      { className: string; count: number }
    > = {};
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
      pendingVerification,
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

    const userRoles = [
      evaluator?.role,
      evaluator?.subRole,
      evaluator?.subRole2,
      evaluator?.subRole3,
      evaluator?.subRole4,
      evaluator?.subRole5,
    ].filter(Boolean);

    const isKetertibanOrAdmin = userRoles.some((r) =>
      [
        'SUPERADMIN',
        'ADMIN_IT',
        'KETERTIBAN',
        'BK_BP',
        'BK',
        'KEPALA_SEKOLAH',
        'BAU',
        'ADMIN_TU',
      ].includes(r || ''),
    );

    // Jika diinput oleh Guru umum, status awal adalah MENUNGGU (menunggu verifikasi Petugas Ketertiban/BK)
    // Jika diinput langsung oleh Petugas Ketertiban / Guru BK / Superadmin, status langsung SELESAI / TERVERIFIKASI
    const finalStatus = dto.status
      ? dto.status
      : isKetertibanOrAdmin
        ? 'SELESAI'
        : 'MENUNGGU';

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
        status: finalStatus,
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

    // Jika langsung terverifikasi (oleh Tatib/BK/Admin), kirim notifikasi in-app & WA ke Siswa & Orang Tua
    if (
      finalStatus === 'SELESAI' ||
      finalStatus === 'TERVERIFIKASI' ||
      finalStatus === 'DALAM_PEMBINAAN'
    ) {
      await this.sendAssessmentNotifications(
        assessment,
        student,
        evaluator,
        points,
        dto,
      );
    } else {
      // Jika status MENUNGGU (input guru), kirim notifikasi ke tim Ketertiban & BK
      try {
        const tatibUsers = await this.prisma.user.findMany({
          where: {
            OR: [
              { role: 'KETERTIBAN' },
              { subRole: 'KETERTIBAN' },
              { subRole2: 'KETERTIBAN' },
              { subRole3: 'KETERTIBAN' },
              { subRole4: 'KETERTIBAN' },
              { subRole5: 'KETERTIBAN' },
              { role: 'BK_BP' },
              { subRole: 'BK_BP' },
              { subRole2: 'BK_BP' },
              { subRole3: 'BK_BP' },
              { subRole4: 'BK_BP' },
              { subRole5: 'BK_BP' },
            ],
          },
          select: { id: true, name: true, phone: true },
        });

        for (const tatib of tatibUsers) {
          await this.prisma.notification.create({
            data: {
              userId: tatib.id,
              senderId: evaluatorId,
              type: 'ETIKA_TATIB',
              title: `Verifikasi Catatan Siswa: ${student.name}`,
              message: `Guru ${evaluator?.name || 'Guru'} mencatat poin kedisiplinan (${dto.title}) untuk siswa ${student.name} (${student.class?.name || '-'}). Menunggu verifikasi Pembina Ketertiban.`,
              priority: 'HIGH',
              data: { assessmentId: assessment.id, studentId: student.id },
            },
          });
        }
      } catch (err: any) {
        this.logger.error(`Gagal notifikasi ke tim tatib: ${err.message}`);
      }
    }

    // Log ke SystemLog
    try {
      await this.systemLogService.log({
        category: 'AKADEMIK',
        action: 'CHARACTER_ASSESSMENT_CREATED',
        message: `Catatan ${dto.category} (${finalStatus}) dibuat untuk ${student.name} (${student.nis}) oleh ${evaluator?.name || evaluatorId}`,
        userId: evaluatorId,
        userName: evaluator?.name,
        userRole: evaluator?.role,
        details: {
          assessmentId: assessment.id,
          studentId: student.id,
          category: dto.category,
          points,
          status: finalStatus,
        },
      });
    } catch (err: any) {
      this.logger.error(`Gagal system log: ${err.message}`);
    }

    return assessment;
  }

  async verifyAssessment(
    id: string,
    verifierId: string,
    body: {
      status?: 'TERVERIFIKASI' | 'DITOLAK' | 'DALAM_PEMBINAAN';
      actionTaken?: string;
      note?: string;
    },
  ) {
    const existing = await this.prisma.characterAssessment.findUnique({
      where: { id },
      include: {
        student: {
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

    if (!existing) {
      throw new NotFoundException('Data catatan pembinaan tidak ditemukan');
    }

    const verifier = await this.prisma.user.findUnique({
      where: { id: verifierId },
    });

    const statusTarget = body.status || 'TERVERIFIKASI';
    const actionTakenTarget =
      body.actionTaken ||
      existing.actionTaken ||
      (statusTarget === 'DITOLAK'
        ? 'Ditolak Petugas Ketertiban'
        : 'Diverifikasi & Diterapkan oleh Bagian Ketertiban');

    const updated = await this.prisma.characterAssessment.update({
      where: { id },
      data: {
        status: statusTarget,
        actionTaken: actionTakenTarget,
        description: body.note
          ? `${existing.description || ''}\n[Catatan Pembina]: ${body.note}`.trim()
          : existing.description,
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

    // Jika disetujui/diverifikasi, kirim notifikasi ke Siswa & Orang Tua/Wali
    if (
      statusTarget === 'TERVERIFIKASI' ||
      statusTarget === 'DALAM_PEMBINAAN'
    ) {
      await this.sendAssessmentNotifications(
        updated,
        existing.student,
        verifier || existing.evaluator,
        existing.points,
        {
          category: existing.category as any,
          title: existing.title,
          description: existing.description || '',
          actionTaken: actionTakenTarget,
          notifyParent: existing.notifyParent,
        },
      );

      // Auto Rujukan ke Tim BK jika Poin Siswa Kritis (< 700) atau Pelanggaran Berat
      try {
        const summary = await this.getStudentSummary(existing.studentId);
        if (summary.kedisiplinanScore < 700 || existing.points <= -100) {
          const bkUsers = await this.prisma.user.findMany({
            where: {
              OR: [
                { role: 'BK_BP' }, { subRole: 'BK_BP' }, { subRole2: 'BK_BP' },
                { subRole3: 'BK_BP' }, { subRole4: 'BK_BP' }, { subRole5: 'BK_BP' },
                { role: 'BK' }, { subRole: 'BK' },
              ],
            },
            select: { id: true, name: true },
          });

          for (const bkUser of bkUsers) {
            await this.prisma.notification.create({
              data: {
                userId: bkUser.id,
                senderId: verifierId,
                type: 'ETIKA_TATIB',
                title: `Rujukan BK Otomatis: ${existing.student.name}`,
                message: `Siswa ${existing.student.name} (${existing.student.class?.name || '-'}) mencapai skor kedisiplinan ${summary.kedisiplinanScore} Poin (${summary.kedisiplinanGrade}). Memerlukan tindak lanjut bimbingan konseling Guru BK.`,
                priority: 'HIGH',
                data: { assessmentId: id, studentId: existing.studentId, score: summary.kedisiplinanScore },
              },
            });
          }
        }
      } catch (err: any) {
        this.logger.error(`Gagal trigger rujukan otomatis BK: ${err.message}`);
      }
    }

    // Notifikasi kembali ke Guru pencatat (Evaluator awal)
    if (existing.evaluatorId && existing.evaluatorId !== verifierId) {
      try {
        await this.prisma.notification.create({
          data: {
            userId: existing.evaluatorId,
            senderId: verifierId,
            type: 'ETIKA_TATIB',
            title: `Catatan Siswa ${statusTarget === 'DITOLAK' ? 'Ditolak' : 'Diverifikasi'}: ${existing.student.name}`,
            message: `Catatan kedisiplinan siswa ${existing.student.name} telah di-${statusTarget.toLowerCase()} oleh Pembina Ketertiban (${verifier?.name || 'Petugas Ketertiban'}).`,
            priority: 'NORMAL',
            data: { assessmentId: id, status: statusTarget },
          },
        });
      } catch (e: any) {
        this.logger.error(`Gagal notifikasi ke guru penilai: ${e.message}`);
      }
    }

    await this.systemLogService.log({
      category: 'AKADEMIK',
      action: 'CHARACTER_ASSESSMENT_VERIFIED',
      message: `Verifikasi catatan pembinaan ID: ${id} menjadi ${statusTarget} oleh ${verifier?.name || verifierId}`,
      userId: verifierId,
      userName: verifier?.name,
      userRole: verifier?.role,
      details: {
        assessmentId: id,
        studentId: existing.studentId,
        status: statusTarget,
        actionTaken: actionTakenTarget,
      },
    });

    return updated;
  }

  private async sendAssessmentNotifications(
    assessment: any,
    student: any,
    evaluator: any,
    points: number,
    dto: any,
  ) {
    try {
      const notifCategory = (dto.category || assessment.category || '').replace(
        '_',
        ' ',
      );
      const notifTitle = `Catatan ${notifCategory}: ${dto.title || assessment.title}`;
      const notifMessage = `Siswa: ${student.name} (${student.class?.name || '-'}). ${dto.description || dto.title}. Poin: ${points > 0 ? '+' : ''}${points}. Diverifikasi & Diterapkan Bagian Ketertiban.`;

      // In-App ke Siswa jika memiliki akun
      if (student.userId) {
        await this.prisma.notification.create({
          data: {
            userId: student.userId,
            senderId: evaluator?.id || assessment.evaluatorId,
            type: 'ETIKA_TATIB',
            title: notifTitle,
            message: notifMessage,
            priority: dto.category === 'PELANGGARAN' ? 'HIGH' : 'NORMAL',
            data: {
              assessmentId: assessment.id,
              category: dto.category,
              points,
            },
          },
        });
      }

      // In-App ke Akun Wali Murid
      for (const rel of student.parentRelations || []) {
        if (rel.parent?.userId) {
          await this.prisma.notification.create({
            data: {
              userId: rel.parent.userId,
              senderId: evaluator?.id || assessment.evaluatorId,
              type: 'ETIKA_TATIB',
              title: notifTitle,
              message: notifMessage,
              priority: dto.category === 'PELANGGARAN' ? 'HIGH' : 'NORMAL',
              data: {
                assessmentId: assessment.id,
                studentId: student.id,
                category: dto.category,
              },
            },
          });
        }
      }

      // Notifikasi Push Email ke Siswa & Orang Tua / Wali Murid
      if (student.userId) {
        const studentUser = await this.prisma.user.findUnique({
          where: { id: student.userId },
          select: { email: true, name: true },
        });
        if (studentUser?.email && studentUser.email.includes('@')) {
          this.emailNotificationService
            .sendEmailNotification({
              to: studentUser.email,
              subject: `[SIMASMUH Catatan Siswa] ${notifTitle}`,
              title: notifTitle,
              category: 'KEDISIPLINAN',
              badgeLabel: notifCategory,
              recipientName: studentUser.name,
              contentText: notifMessage,
              metaDetails: [
                { label: 'Nama Siswa', value: student.name },
                { label: 'Kelas', value: student.class?.name || '-' },
                { label: 'Kategori', value: notifCategory },
                { label: 'Poin Evaluasi', value: `${points > 0 ? '+' : ''}${points}` },
                { label: 'Tindak Lanjut', value: dto.actionTaken || assessment.actionTaken || 'Diterapkan Bagian Ketertiban' },
              ],
              actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/akademik/etika-tatib`,
              actionText: 'Lihat Buku Catatan Karakter',
            })
            .catch(() => {});
        }
      }

      for (const rel of student.parentRelations || []) {
        if (rel.parent?.userId) {
          const parentUser = await this.prisma.user.findUnique({
            where: { id: rel.parent.userId },
            select: { email: true, name: true },
          });
          if (parentUser?.email && parentUser.email.includes('@')) {
            this.emailNotificationService
              .sendEmailNotification({
                to: parentUser.email,
                subject: `[SIMASMUH Catatan Ananda] ${notifTitle}`,
                title: notifTitle,
                category: 'KEDISIPLINAN',
                badgeLabel: notifCategory,
                recipientName: parentUser.name,
                contentText: notifMessage,
                metaDetails: [
                  { label: 'Nama Siswa', value: student.name },
                  { label: 'Kelas', value: student.class?.name || '-' },
                  { label: 'Kategori', value: notifCategory },
                  { label: 'Poin Evaluasi', value: `${points > 0 ? '+' : ''}${points}` },
                  { label: 'Tindak Lanjut', value: dto.actionTaken || assessment.actionTaken || 'Diterapkan Bagian Ketertiban' },
                ],
                actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/akademik/etika-tatib`,
                actionText: 'Buka Buku Saku & Catatan Siswa',
              })
              .catch(() => {});
          }
        }
      }

    } catch (err: any) {
      this.logger.error(
        `Gagal mengirim notifikasi adab & tatib: ${err.message}`,
      );
    }
  }

  async update(id: string, dto: Partial<CreateAssessmentDto>, userId: string) {
    const existing = await this.prisma.characterAssessment.findUnique({
      where: { id },
    });
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

  async getStudentsSummary(query: { classId?: string; search?: string }) {
    const whereStudent: any = {};
    if (query.classId && query.classId !== 'ALL') {
      whereStudent.classId = query.classId;
    }
    if (query.search) {
      whereStudent.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { nis: { contains: query.search, mode: 'insensitive' } },
        { nisn: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const students = await this.prisma.student.findMany({
      where: whereStudent,
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
        characterAssessments: {
          orderBy: { date: 'desc' },
          include: {
            evaluator: {
              select: {
                id: true,
                name: true,
                role: true,
                subRole: true,
              },
            },
          },
        },
      },
      orderBy: [{ class: { name: 'asc' } }, { name: 'asc' }],
    });

    return students.map((st) => {
      const assessments = st.characterAssessments || [];
      let totalPointsDelta = 0;
      let totalPelanggaran = 0;
      let totalPrestasi = 0;
      let totalPembinaan = 0;
      let amalanIbadahCount = 0;
      let adabEtikaCount = 0;
      let pendingVerificationCount = 0;

      assessments.forEach((item) => {
        const isVerified =
          item.status === 'SELESAI' ||
          item.status === 'TERVERIFIKASI' ||
          item.status === 'DALAM_PEMBINAAN';
        if (
          item.status === 'MENUNGGU' ||
          item.status === 'MENUNGGU_VERIFIKASI'
        ) {
          pendingVerificationCount++;
        }

        if (isVerified) {
          totalPointsDelta += item.points;
          if (item.category === 'PELANGGARAN' || item.type === 'NEGATIF') {
            totalPelanggaran++;
          } else if (
            item.category === 'PRESTASI_PENGHARGAAN' ||
            (item.points > 0 && item.type === 'POSITIF')
          ) {
            totalPrestasi++;
          } else if (item.category === 'IBADAH') {
            amalanIbadahCount++;
          } else if (item.category === 'ADAB_ETIKA') {
            adabEtikaCount++;
          }
        }

        if (item.status === 'DALAM_PEMBINAAN' || item.actionTaken) {
          totalPembinaan++;
        }
      });

      const ketertibanScore = Math.max(
        0,
        Math.min(1000, 1000 + totalPointsDelta),
      );
      const adabBonus = (adabEtikaCount * 50) + (totalPrestasi * 50);
      const adabScore = Math.max(
        0,
        Math.min(1000, 1000 - totalPelanggaran * 100 + adabBonus),
      );
      const ibadahBonus = (amalanIbadahCount * 50) + (totalPrestasi * 25);
      const ibadahScoreNum = Math.max(
        0,
        Math.min(1000, 1000 + ibadahBonus - totalPelanggaran * 30),
      );

      const getGradeInfo = (score: number) => {
        if (score >= 900) return { grade: 'A', status: 'Baik / Terpuji' };
        if (score >= 700) return { grade: 'B', status: 'Pantauan & Bimbingan Ringan' };
        if (score >= 500) return { grade: 'C', status: 'Pantauan & Bimbingan' };
        if (score >= 200) return { grade: 'D', status: 'Perlu Bimbingan Ketat' };
        return { grade: 'E', status: 'Kritis / Dikeluarkan dari Sekolah' };
      };

      const ketertibanGradeInfo = getGradeInfo(ketertibanScore);
      const adabGradeInfo = getGradeInfo(adabScore);
      const ibadahGradeInfo = getGradeInfo(ibadahScoreNum);

      return {
        id: st.id,
        nis: st.nis,
        nisn: st.nisn,
        name: st.name,
        gender: st.gender,
        classId: st.classId,
        className: st.class?.name || 'Tanpa Kelas',
        ketertibanScore,
        ketertibanGrade: ketertibanGradeInfo.grade,
        ketertibanStatus: ketertibanGradeInfo.status,
        adabScore,
        adabGrade: adabGradeInfo.grade,
        adabStatus: adabGradeInfo.status,
        ibadahScore: ibadahScoreNum,
        ibadahGrade: ibadahGradeInfo.grade,
        ibadahStatus: ibadahGradeInfo.status,
        totalPointsDelta,
        totalPelanggaran,
        totalPrestasi,
        totalPembinaan,
        parentPhone: st.parentRelations?.[0]?.parent?.user?.phone || st.parentRelations?.[0]?.parent?.phone || st.user?.phone || '',
        parentName: st.parentRelations?.[0]?.parent?.user?.name || 'Orang Tua / Wali Murid',
        parentRelations: st.parentRelations,
        user: st.user,
        pendingVerificationCount,
        assessments,
      };
    });
  }

  async resetStudentPoints(studentId: string, userId: string, reason?: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    });

    if (!student) {
      throw new NotFoundException('Siswa tidak ditemukan');
    }

    const evaluator = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Buat assessment penyeimbang atau reset status
    const currentSummary = await this.getStudentSummary(studentId);
    const deltaToReset = 1000 - currentSummary.kedisiplinanScore;

    // Tambahkan record rekam jejak Pemutihan / Reset Poin
    await this.prisma.characterAssessment.create({
      data: {
        studentId,
        evaluatorId: userId,
        category: 'KEDISIPLINAN',
        type: 'POSITIF',
        title: 'Pemutihan / Reset Poin Kedisiplinan Siswa',
        description:
          reason ||
          'Poin ketertiban dan kedisiplinan siswa di-reset kembali ke 1000 poin oleh Tim Ketertiban.',
        points: deltaToReset,
        status: 'SELESAI',
        actionTaken: 'Pemutihan Poin Kedisiplinan',
        notifyParent: true,
      },
    });

    await this.systemLogService.log({
      category: 'AKADEMIK',
      action: 'CHARACTER_ASSESSMENT_RESET',
      message: `Reset poin kedisiplinan siswa ${student.name} (${student.nis}) oleh ${evaluator?.name || userId}`,
      userId,
      userName: evaluator?.name,
      userRole: evaluator?.role,
    });

    return {
      success: true,
      message: `Poin kedisiplinan siswa ${student.name} berhasil di-reset ke 1000 poin.`,
    };
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.characterAssessment.findUnique({
      where: { id },
    });
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
