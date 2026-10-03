import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SystemLogService } from '../../core/services/system-log.service';
import {
  CreateExtracurricularDto,
  UpdateExtracurricularDto,
  AddMemberDto,
  CreateSessionDto,
  UpdateSessionDto,
  BulkSaveAttendanceDto,
  BulkSaveGradesDto,
} from './dto/extracurricular.dto';

@Injectable()
export class ExtracurricularService {
  constructor(
    private prisma: PrismaService,
    private systemLogService: SystemLogService,
  ) {}

  async findAll(category?: string, search?: string): Promise<any[]> {
    const where: any = {};
    if (category && category !== 'ALL') {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { pembinaName: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    return (this.prisma as any).extracurricular.findMany({
      where,
      include: {
        _count: {
          select: {
            members: true,
            sessions: true,
            grades: true,
          },
        },
        members: {
          include: {
            student: {
              include: {
                class: true,
              },
            },
          },
        },
        sessions: {
          orderBy: { sessionDate: 'desc' },
          take: 3,
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  async findOne(id: string): Promise<any> {
    const item = await (this.prisma as any).extracurricular.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            student: {
              include: {
                class: true,
              },
            },
            attendances: {
              include: {
                session: true,
              },
            },
            grades: true,
          },
          orderBy: [
            { role: 'asc' },
            { joinedAt: 'asc' },
          ],
        },
        sessions: {
          include: {
            attendances: true,
          },
          orderBy: {
            sessionDate: 'desc',
          },
        },
        grades: {
          include: {
            member: {
              include: {
                student: {
                  include: {
                    class: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Data ekstrakurikuler tidak ditemukan.');
    }
    return item;
  }

  /**
   * Mengambil daftar ekskul yang dibina oleh pengguna yang sedang login
   */
  async getMyBinaan(user: any): Promise<any[]> {
    const roles = [
      user?.role,
      user?.subRole,
      user?.subRole2,
      user?.subRole3,
      user?.subRole4,
      user?.subRole5,
    ].filter(Boolean);

    const isFullAccess = roles.some((r: string) =>
      ['SUPERADMIN', 'ADMIN_IT', 'KEPALA_SEKOLAH', 'KESISWAAN', 'WAKA_KESISWAAN', 'BAU', 'ADMIN_TU'].includes(r) ||
      r.startsWith('WAKA_')
    );

    if (isFullAccess) {
      return this.findAll();
    }

    // Cari ekskul yang diasosiasikan dengan pembina ini
    const whereConditions: any[] = [];

    if (user?.id) {
      whereConditions.push({ pembinaUserId: user.id });
    }
    if (user?.name) {
      whereConditions.push({ pembinaName: { contains: user.name, mode: 'insensitive' } });
      whereConditions.push({ pembina2Name: { contains: user.name, mode: 'insensitive' } });
    }
    if (user?.nipNbm) {
      whereConditions.push({ pembinaNip: user.nipNbm });
    }

    let items = await (this.prisma as any).extracurricular.findMany({
      where: {
        OR: whereConditions.length > 0 ? whereConditions : [{ id: '__none__' }],
      },
      include: {
        _count: {
          select: {
            members: true,
            sessions: true,
            grades: true,
          },
        },
        members: {
          include: {
            student: {
              include: {
                class: true,
              },
            },
          },
        },
        sessions: {
          orderBy: { sessionDate: 'desc' },
          take: 5,
        },
      },
      orderBy: { name: 'asc' },
    });

    // Jika belum ada ekskul yang terhubung langsung, kembalikan semua ekskul aktif agar pembina bisa mengelola
    if (items.length === 0) {
      items = await (this.prisma as any).extracurricular.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: {
              members: true,
              sessions: true,
              grades: true,
            },
          },
          members: {
            include: {
              student: {
                include: {
                  class: true,
                },
              },
            },
          },
          sessions: {
            orderBy: { sessionDate: 'desc' },
            take: 5,
          },
        },
        orderBy: { name: 'asc' },
      });
    }

    return items;
  }

  /**
   * Mengambil data ekstrakurikuler yang diikuti oleh siswa yang sedang login
   */
  async getStudentActivities(user: any): Promise<any> {
    let studentId: string | null = null;

    // Cari profil siswa dari userId atau username (NIS/NISN)
    if (user?.id) {
      const student = await this.prisma.student.findFirst({
        where: {
          OR: [
            { userId: user.id },
            { nis: user.username },
            { nisn: user.username },
          ],
        },
      });
      if (student) {
        studentId = student.id;
      }
    }

    if (!studentId) {
      return {
        myMemberships: [],
        availableCatalog: await (this.prisma as any).extracurricular.findMany({
          where: { isActive: true },
          orderBy: { name: 'asc' },
        }),
      };
    }

    const memberships = await (this.prisma as any).extracurricularMember.findMany({
      where: { studentId },
      include: {
        extracurricular: {
          include: {
            sessions: {
              orderBy: { sessionDate: 'desc' },
            },
          },
        },
        attendances: {
          include: {
            session: true,
          },
          orderBy: {
            session: { sessionDate: 'desc' },
          },
        },
        grades: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const catalog = await (this.prisma as any).extracurricular.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      myMemberships: memberships,
      availableCatalog: catalog,
    };
  }

  async create(dto: CreateExtracurricularDto, user: any): Promise<any> {
    const extracurricular = await (this.prisma as any).extracurricular.create({
      data: {
        name: dto.name,
        code: dto.code || null,
        category: dto.category || 'UMUM',
        description: dto.description || null,
        scheduleDay: dto.scheduleDay || null,
        scheduleTime: dto.scheduleTime || null,
        location: dto.location || null,
        pembinaId: dto.pembinaId || null,
        pembinaUserId: dto.pembinaUserId || null,
        pembinaName: dto.pembinaName,
        pembinaNip: dto.pembinaNip || null,
        pembinaContact: dto.pembinaContact || null,
        pembina2Name: dto.pembina2Name || null,
        pembina2Contact: dto.pembina2Contact || null,
        logoUrl: dto.logoUrl || null,
        targetPeserta: dto.targetPeserta || 'Semua Tingkat (X, XI, XII)',
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        createdBy: user?.name || user?.email || 'KESISWAAN',
      },
    });

    await this.systemLogService.log({
      category: 'AKADEMIK',
      level: 'INFO',
      action: 'EXTRACURRICULAR_CREATED',
      message: `Ekstrakurikuler "${extracurricular.name}" dengan pembina ${extracurricular.pembinaName} berhasil ditambahkan oleh ${user?.name}.`,
      userId: user?.id,
      details: { extracurricularId: extracurricular.id },
    });

    return extracurricular;
  }

  async update(id: string, dto: UpdateExtracurricularDto, user: any): Promise<any> {
    await this.findOne(id);

    const updated = await (this.prisma as any).extracurricular.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.scheduleDay !== undefined && { scheduleDay: dto.scheduleDay }),
        ...(dto.scheduleTime !== undefined && { scheduleTime: dto.scheduleTime }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.pembinaId !== undefined && { pembinaId: dto.pembinaId }),
        ...(dto.pembinaUserId !== undefined && { pembinaUserId: dto.pembinaUserId }),
        ...(dto.pembinaName !== undefined && { pembinaName: dto.pembinaName }),
        ...(dto.pembinaNip !== undefined && { pembinaNip: dto.pembinaNip }),
        ...(dto.pembinaContact !== undefined && { pembinaContact: dto.pembinaContact }),
        ...(dto.pembina2Name !== undefined && { pembina2Name: dto.pembina2Name }),
        ...(dto.pembina2Contact !== undefined && { pembina2Contact: dto.pembina2Contact }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.targetPeserta !== undefined && { targetPeserta: dto.targetPeserta }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    await this.systemLogService.log({
      category: 'AKADEMIK',
      level: 'INFO',
      action: 'EXTRACURRICULAR_UPDATED',
      message: `Data ekstrakurikuler "${updated.name}" berhasil diperbarui.`,
      userId: user?.id,
      details: { extracurricularId: updated.id },
    });

    return updated;
  }

  async delete(id: string, user: any): Promise<any> {
    const existing = await this.findOne(id);
    await (this.prisma as any).extracurricular.delete({ where: { id } });

    await this.systemLogService.log({
      category: 'AKADEMIK',
      level: 'WARN',
      action: 'EXTRACURRICULAR_DELETED',
      message: `Ekstrakurikuler "${existing.name}" telah dihapus oleh ${user?.name}.`,
      userId: user?.id,
      details: { extracurricularId: id },
    });

    return { success: true, message: 'Ekstrakurikuler berhasil dihapus.' };
  }

  async addMember(extracurricularId: string, dto: AddMemberDto, user?: any): Promise<any> {
    await this.findOne(extracurricularId);

    const existingMember = await (this.prisma as any).extracurricularMember.findUnique({
      where: {
        extracurricularId_studentId: {
          extracurricularId,
          studentId: dto.studentId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('Siswa ini sudah terdaftar di ekstrakurikuler tersebut.');
    }

    const member = await (this.prisma as any).extracurricularMember.create({
      data: {
        extracurricularId,
        studentId: dto.studentId,
        role: dto.role || 'ANGGOTA',
        catatan: dto.catatan || null,
      },
      include: {
        student: {
          include: {
            class: true,
          },
        },
      },
    });

    return member;
  }

  async removeMember(memberId: string, user?: any): Promise<any> {
    return (this.prisma as any).extracurricularMember.delete({
      where: { id: memberId },
    });
  }

  // ==================== PERTEMUAN & PRESENSI MINGGUAN ====================

  async createSession(extracurricularId: string, dto: CreateSessionDto, user: any): Promise<any> {
    const ekskul = await this.findOne(extracurricularId);

    const session = await (this.prisma as any).extracurricularSession.create({
      data: {
        extracurricularId,
        title: dto.title,
        sessionDate: new Date(dto.sessionDate),
        startTime: dto.startTime || null,
        endTime: dto.endTime || null,
        location: dto.location || ekskul.location || null,
        topic: dto.topic || null,
        trainerName: dto.trainerName || ekskul.pembinaName,
        notes: dto.notes || null,
        createdBy: user?.name || user?.email || 'PEMBINA',
      },
    });

    // Otomatis buat baris presensi default 'HADIR' untuk seluruh anggota aktif
    const members = await (this.prisma as any).extracurricularMember.findMany({
      where: { extracurricularId, status: 'AKTIF' },
    });

    if (members.length > 0) {
      await (this.prisma as any).extracurricularAttendance.createMany({
        data: members.map((m: any) => ({
          sessionId: session.id,
          memberId: m.id,
          studentId: m.studentId,
          status: 'HADIR',
        })),
        skipDuplicates: true,
      });
    }

    return this.getSessionDetail(session.id);
  }

  async updateSession(sessionId: string, dto: UpdateSessionDto, user: any): Promise<any> {
    const existing = await (this.prisma as any).extracurricularSession.findUnique({
      where: { id: sessionId },
    });
    if (!existing) {
      throw new NotFoundException('Sesi pertemuan tidak ditemukan.');
    }

    return (this.prisma as any).extracurricularSession.update({
      where: { id: sessionId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.sessionDate !== undefined && { sessionDate: new Date(dto.sessionDate) }),
        ...(dto.startTime !== undefined && { startTime: dto.startTime }),
        ...(dto.endTime !== undefined && { endTime: dto.endTime }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.topic !== undefined && { topic: dto.topic }),
        ...(dto.trainerName !== undefined && { trainerName: dto.trainerName }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async deleteSession(sessionId: string, user: any): Promise<any> {
    const existing = await (this.prisma as any).extracurricularSession.findUnique({
      where: { id: sessionId },
    });
    if (!existing) {
      throw new NotFoundException('Sesi pertemuan tidak ditemukan.');
    }

    await (this.prisma as any).extracurricularSession.delete({
      where: { id: sessionId },
    });

    return { success: true, message: 'Sesi pertemuan berhasil dihapus.' };
  }

  async getSessionDetail(sessionId: string): Promise<any> {
    const session = await (this.prisma as any).extracurricularSession.findUnique({
      where: { id: sessionId },
      include: {
        extracurricular: {
          include: {
            members: {
              include: {
                student: {
                  include: {
                    class: true,
                  },
                },
              },
            },
          },
        },
        attendances: {
          include: {
            member: {
              include: {
                student: {
                  include: {
                    class: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Sesi pertemuan tidak ditemukan.');
    }
    return session;
  }

  async saveSessionAttendance(sessionId: string, dto: BulkSaveAttendanceDto, user: any): Promise<any> {
    const session = await (this.prisma as any).extracurricularSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Sesi pertemuan tidak ditemukan.');
    }

    for (const record of dto.attendances) {
      await (this.prisma as any).extracurricularAttendance.upsert({
        where: {
          sessionId_memberId: {
            sessionId,
            memberId: record.memberId,
          },
        },
        create: {
          sessionId,
          memberId: record.memberId,
          studentId: record.studentId,
          status: record.status,
          notes: record.notes || null,
        },
        update: {
          status: record.status,
          notes: record.notes || null,
        },
      });
    }

    return { success: true, message: 'Presensi pertemuan berhasil disimpan.' };
  }

  // ==================== NILAI & PREDIKAT RAPOR ====================

  async saveGrades(extracurricularId: string, dto: BulkSaveGradesDto, user: any): Promise<any> {
    await this.findOne(extracurricularId);

    for (const grade of dto.grades) {
      const academicYear = grade.academicYear || '2025/2026';
      const semester = grade.semester || 'GANJIL';

      await (this.prisma as any).extracurricularGrade.upsert({
        where: {
          extracurricularId_studentId_academicYear_semester: {
            extracurricularId,
            studentId: grade.studentId,
            academicYear,
            semester,
          },
        },
        create: {
          extracurricularId,
          memberId: grade.memberId,
          studentId: grade.studentId,
          academicYear,
          semester,
          score: grade.score || 85,
          predicate: grade.predicate,
          description: grade.description || null,
          createdBy: user?.name || user?.email || 'PEMBINA',
        },
        update: {
          score: grade.score !== undefined ? grade.score : undefined,
          predicate: grade.predicate,
          description: grade.description || null,
        },
      });
    }

    return { success: true, message: 'Nilai ekstrakurikuler berhasil disimpan.' };
  }

  // ==================== REKAPITULASI REALTIME ====================

  async getRecap(extracurricularId: string): Promise<any> {
    const ekskul: any = await this.findOne(extracurricularId);

    const totalMembers = ekskul.members?.length || 0;
    const totalSessions = ekskul.sessions?.length || 0;

    const memberRecaps = (ekskul.members || []).map((member: any) => {
      const attendances = member.attendances || [];
      const hadirCount = attendances.filter((a: any) => a.status === 'HADIR').length;
      const izinCount = attendances.filter((a: any) => a.status === 'IZIN').length;
      const sakitCount = attendances.filter((a: any) => a.status === 'SAKIT').length;
      const alfaCount = attendances.filter((a: any) => a.status === 'ALFA').length;

      const attendancePercentage =
        totalSessions > 0 ? Math.round((hadirCount / totalSessions) * 100) : 100;

      const latestGrade = member.grades?.[0] || null;

      return {
        memberId: member.id,
        studentId: member.studentId,
        studentName: member.student?.name || '-',
        nisn: member.student?.nisn || '-',
        nis: member.student?.nis || '-',
        className: member.student?.class?.name || '-',
        gender: member.student?.gender || '-',
        role: member.role || 'ANGGOTA',
        hadirCount,
        izinCount,
        sakitCount,
        alfaCount,
        attendancePercentage,
        grade: latestGrade
          ? {
              score: latestGrade.score,
              predicate: latestGrade.predicate,
              description: latestGrade.description,
              academicYear: latestGrade.academicYear,
              semester: latestGrade.semester,
            }
          : null,
      };
    });

    // Statistik agregat
    const avgAttendance =
      memberRecaps.length > 0
        ? Math.round(
            memberRecaps.reduce((acc: number, curr: any) => acc + curr.attendancePercentage, 0) /
              memberRecaps.length,
          )
        : 0;

    const gradeDistribution = {
      sangatBaik: memberRecaps.filter((m: any) => m.grade?.predicate === 'A' || m.grade?.predicate === 'Sangat Baik').length,
      baik: memberRecaps.filter((m: any) => m.grade?.predicate === 'B' || m.grade?.predicate === 'Baik').length,
      cukup: memberRecaps.filter((m: any) => m.grade?.predicate === 'C' || m.grade?.predicate === 'Cukup').length,
      kurang: memberRecaps.filter((m: any) => m.grade?.predicate === 'D' || m.grade?.predicate === 'Kurang').length,
      belumDinilai: memberRecaps.filter((m: any) => !m.grade).length,
    };

    return {
      extracurricular: {
        id: ekskul.id,
        name: ekskul.name,
        code: ekskul.code,
        category: ekskul.category,
        scheduleDay: ekskul.scheduleDay,
        scheduleTime: ekskul.scheduleTime,
        location: ekskul.location,
        pembinaName: ekskul.pembinaName,
      },
      stats: {
        totalMembers,
        totalSessions,
        avgAttendance,
        gradeDistribution,
      },
      memberRecaps,
    };
  }

  async getStats(): Promise<any> {
    const [totalEkskul, activeEkskul, totalAnggota, totalSessions] = await Promise.all([
      (this.prisma as any).extracurricular.count(),
      (this.prisma as any).extracurricular.count({ where: { isActive: true } }),
      (this.prisma as any).extracurricularMember.count({ where: { status: 'AKTIF' } }),
      (this.prisma as any).extracurricularSession.count(),
    ]);

    return {
      totalEkskul,
      activeEkskul,
      totalAnggota,
      totalSessions,
    };
  }
}
