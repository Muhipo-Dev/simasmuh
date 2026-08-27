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
import { WhatsAppService } from '../../communication/whatsapp/whatsapp.service';

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
  ])
  category:
    | 'ADAB_ETIKA'
    | 'IBADAH'
    | 'KEDISIPLINAN'
    | 'PRESTASI_PENGHARGAAN'
    | 'PELANGGARAN';

  @IsEnum(['POSITIF', 'NEGATIF', 'RUTIN', 'CATATAN_KONSELING'])
  type: 'POSITIF' | 'NEGATIF' | 'RUTIN' | 'CATATAN_KONSELING';

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
    private whatsAppService: WhatsAppService,
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

    // Kalkulasi Poin Kedisiplinan (Dasar: 100 Poin) - hanya hitung yang sudah terverifikasi / disetujui / selesai
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
      Math.min(100, 100 + totalPointsDelta),
    );

    // Predikat Kedisiplinan
    let kedisiplinanPredikat = 'A (Sangat Baik / Teladan)';
    if (kedisiplinanScore < 60)
      kedisiplinanPredikat = 'D (Perlu Pembinaan Khusus)';
    else if (kedisiplinanScore < 75)
      kedisiplinanPredikat = 'C (Cukup / Peringatan)';
    else if (kedisiplinanScore < 90) kedisiplinanPredikat = 'B (Baik)';

    // Predikat Ibadah & Etika
    const ibadahScore =
      amalanIbadahCount >= 5
        ? 'A (Sangat Rajin)'
        : amalanIbadahCount >= 2
          ? 'B (Aktif)'
          : 'B (Baik)';
    const perilakuScore =
      totalPelanggaran === 0
        ? 'A (Terpuji & Santun)'
        : totalPelanggaran <= 2
          ? 'B (Baik)'
          : 'C (Perlu Pembinaan)';

    return {
      student,
      kedisiplinanScore,
      kedisiplinanPredikat,
      ibadahScore,
      perilakuScore,
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
        'KEPALA_SEKOLAH',
        'BAU',
        'ADMIN_TU',
      ].includes(r || ''),
    );

    // Jika diinput oleh Guru umum, status awal adalah MENUNGGU (menunggu verifikasi Petugas Ketertiban)
    // Jika diinput langsung oleh Petugas Ketertiban / Superadmin, status langsung SELESAI / TERVERIFIKASI
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

    // Jika langsung terverifikasi (oleh Tatib/Admin), kirim notifikasi in-app & WA ke Siswa & Orang Tua
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
      // Jika status MENUNGGU (input guru), kirim notifikasi ke tim Ketertiban
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

      // Standar Notifikasi Ganda WhatsApp ke Orang Tua / Wali & Siswa
      if (dto.notifyParent !== false) {
        const waTargets = new Set<string>();
        if (student.parentPhone) waTargets.add(student.parentPhone);
        if (student.phone) waTargets.add(student.phone);

        for (const rel of student.parentRelations || []) {
          if (rel.parent?.phone) waTargets.add(rel.parent.phone);
          if (rel.parent?.user?.phone) waTargets.add(rel.parent.user.phone);
        }

        if (waTargets.size === 0) {
          waTargets.add(WhatsAppService.DEFAULT_SENDER_NUMBER);
        }

        for (const phone of waTargets) {
          const waMessage = `🔔 *PEMBERITAHUAN CATATAN SISWA & TATA TERTIB*
*SIMASMUH - SMA Muhammadiyah 1 Ponorogo*
----------------------------------------
👤 *Nama Siswa:* ${student.name}
🏷️ *NIS/NISN:* ${student.nis} / ${student.nisn || '-'}
🏫 *Kelas:* ${student.class?.name || '-'}
📌 *Kategori:* ${notifCategory}
📋 *Judul:* ${dto.title || assessment.title}
📝 *Keterangan:* ${dto.description || '-'}
⚖️ *Poin Evaluasi:* ${points > 0 ? '+' : ''}${points}
🛠️ *Tindak Lanjut:* ${dto.actionTaken || assessment.actionTaken || 'Diverifikasi & diterapkan Bagian Ketertiban Sekolah'}
👨‍🏫 *Verifikator / Pembina:* ${evaluator?.name || 'Bagian Ketertiban Sekolah'}
----------------------------------------
_Catatan ini telah diverifikasi & resmi diterapkan ke poin kedisiplinan siswa._
_Informasi ini terkirim otomatis melalui Sistem Manajemen Akademik & Karakter Siswa (SIMASMUH)._`;

          await this.whatsAppService.sendDirectMessage({
            to: phone,
            recipientName: student.name,
            recipientRole: 'WALI_MURID',
            category: 'INFORMASI',
            title: `Evaluasi Kedisiplinan - ${student.name}`,
            message: waMessage,
          });
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
        Math.min(100, 100 + totalPointsDelta),
      );
      const adabScore = Math.max(
        0,
        Math.min(100, 100 - totalPelanggaran * 5 + adabEtikaCount * 5),
      );

      return {
        id: st.id,
        nis: st.nis,
        nisn: st.nisn,
        name: st.name,
        gender: st.gender,
        classId: st.classId,
        className: st.class?.name || 'Tanpa Kelas',
        ketertibanScore,
        adabScore,
        totalPointsDelta,
        totalPelanggaran,
        totalPrestasi,
        totalPembinaan,
        amalanIbadahCount,
        adabEtikaCount,
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
    const deltaToReset = 100 - currentSummary.kedisiplinanScore;

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
          'Poin ketertiban dan kedisiplinan siswa di-reset kembali ke 100 poin oleh Tim Ketertiban.',
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
      details: { studentId, deltaToReset, reason },
    });

    return {
      message: `Poin kedisiplinan siswa ${student.name} berhasil di-reset ke 100 poin.`,
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
