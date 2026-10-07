import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
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

  /**
   * Helper pengecekan apakah user yang sedang login adalah pembina resmi unit ekskul ini
   */
  private isUserPembinaOf(ekskul: any, user: any): boolean {
    if (!user) return false;
    const userId = user.id;
    const userName = (user.name || '').trim().toLowerCase();
    const userNip = (user.nipNbm || user.username || '').trim();

    if (ekskul.pembinaUserId && ekskul.pembinaUserId === userId) return true;
    if (ekskul.pembinaNip && userNip && (ekskul.pembinaNip === userNip || ekskul.pembinaNip === user.username)) return true;
    if (ekskul.pembinaName && userName && (
      ekskul.pembinaName.toLowerCase().includes(userName) ||
      userName.includes(ekskul.pembinaName.toLowerCase())
    )) return true;
    if (ekskul.pembina2Name && userName && (
      ekskul.pembina2Name.toLowerCase().includes(userName) ||
      userName.includes(ekskul.pembina2Name.toLowerCase())
    )) return true;

    return false;
  }

  /**
   * Assertion bahwa pengguna MUTLAK harus Pembina resmi dari ekstrakurikuler bersangkutan
   */
  private assertPembina(ekskul: any, user: any) {
    const isSuperAdmin = user?.role === 'SUPERADMIN';
    if (!this.isUserPembinaOf(ekskul, user) && !isSuperAdmin) {
      throw new ForbiddenException(
        `Akses ditolak: Hanya pembina resmi dari ekstrakurikuler "${ekskul.name}" yang memiliki hak mengelola anggota, jadwal, jurnal presensi, dan penilaian.`
      );
    }
  }

  /**
   * Helper verifikasi peran Waka Kesiswaan / Kesiswaan / Superadmin
   */
  private isWakaOrKesiswaan(user: any): boolean {
    const roles = [
      user?.role,
      user?.subRole,
      user?.subRole2,
      user?.subRole3,
      user?.subRole4,
      user?.subRole5,
    ].filter(Boolean);

    return roles.some((r: string) =>
      ['SUPERADMIN', 'ADMIN_IT', 'KEPALA_SEKOLAH', 'KESISWAAN', 'WAKA_KESISWAAN', 'BAU', 'ADMIN_TU'].includes(r) ||
      r.startsWith('WAKA_') ||
      r.includes('KESISWAAN')
    );
  }

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
   * Mengambil daftar ekskul yang KHUSUS dibina oleh pengguna yang sedang login
   */
  async getMyBinaan(user: any): Promise<any[]> {
    if (!user) return [];

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
    if (user?.username) {
      whereConditions.push({ pembinaNip: user.username });
    }

    const items = await (this.prisma as any).extracurricular.findMany({
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

    return items;
  }

  /**
   * Mengambil data ekstrakurikuler yang diikuti oleh siswa yang sedang login (Realtime)
   */
  async getStudentActivities(user: any): Promise<any> {
    let studentId: string | null = null;

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

  /**
   * Siswa mendaftar / bergabung ke ekstrakurikuler secara mandiri (Maksimal 3 Ekstrakurikuler)
   */
  async joinExtracurricular(extracurricularId: string, user: any): Promise<any> {
    const ekskul = await this.findOne(extracurricularId);
    if (!ekskul.isActive) {
      throw new BadRequestException('Unit kegiatan ekstrakurikuler ini sedang tidak aktif.');
    }

    let student: any = null;
    if (user?.id) {
      student = await this.prisma.student.findFirst({
        where: {
          OR: [
            { userId: user.id },
            { nis: user.username },
            { nisn: user.username },
          ],
        },
        include: { class: true },
      });
    }

    if (!student) {
      throw new NotFoundException('Profil siswa Anda tidak ditemukan di sistem.');
    }

    // Cek batas maksimal 3 ekstrakurikuler
    const activeCount = await (this.prisma as any).extracurricularMember.count({
      where: {
        studentId: student.id,
        status: 'AKTIF',
      },
    });

    if (activeCount >= 3) {
      throw new BadRequestException('Siswa hanya dapat memilih maksimal hingga 3 ekstrakurikuler.');
    }

    const existingMember = await (this.prisma as any).extracurricularMember.findUnique({
      where: {
        extracurricularId_studentId: {
          extracurricularId,
          studentId: student.id,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException(`Anda sudah terdaftar sebagai anggota ${ekskul.name}.`);
    }

    const newMember = await (this.prisma as any).extracurricularMember.create({
      data: {
        extracurricularId,
        studentId: student.id,
        role: 'ANGGOTA',
        status: 'AKTIF',
        catatan: `Mendaftar mandiri melalui Portal Siswa SIMASMUH pada ${new Date().toLocaleDateString('id-ID')}`,
      },
      include: {
        extracurricular: true,
        student: {
          include: { class: true },
        },
      },
    });

    await this.systemLogService.log({
      category: 'AKADEMIK',
      level: 'INFO',
      action: 'EXTRACURRICULAR_JOINED',
      message: `Siswa "${student.name}" (Kelas ${student.class?.name || '-'}) bergabung ke ekstrakurikuler "${ekskul.name}".`,
      userId: user?.id,
      details: {
        extracurricularId,
        studentId: student.id,
        membershipId: newMember.id,
      },
    });

    return {
      success: true,
      message: `Selamat! Anda berhasil bergabung dengan ekstrakurikuler ${ekskul.name}.`,
      data: newMember,
    };
  }

  /**
   * Siswa mencoba keluar mandiri (Ditolak: Hanya pembina yang berwenang mengeluarkan data siswa)
   */
  async leaveExtracurricular(extracurricularId: string, user: any): Promise<any> {
    throw new BadRequestException(
      'Siswa tidak dapat membatalkan keanggotaan secara mandiri. Pengeluaran anggota ekstrakurikuler hanya dapat dilakukan oleh Pembina Ekstrakurikuler bersangkutan.'
    );
  }

  /**
   * Master Tambah Ekstrakurikuler (Khusus Waka Kesiswaan & Superadmin)
   */
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

    await this.syncPembinaSubRole(
      dto.pembinaUserId || extracurricular.pembinaUserId,
      dto.pembinaId || extracurricular.pembinaId,
      dto.pembinaName || extracurricular.pembinaName,
      dto.pembinaNip || extracurricular.pembinaNip
    );

    return extracurricular;
  }

  /**
   * Helper untuk otomatis menyinkronkan subRole PEMBINA_EKSTRA pada akun User/Guru
   */
  private async syncPembinaSubRole(pembinaUserId?: string, pembinaId?: string, pembinaName?: string, pembinaNip?: string) {
    try {
      let targetUserId = pembinaUserId;

      if (!targetUserId && pembinaId) {
        const teacher = await (this.prisma.teacherProfile as any).findUnique({
          where: { id: pembinaId },
          select: { userId: true },
        });
        if (teacher?.userId) {
          targetUserId = teacher.userId;
        }
      }

      if (!targetUserId && pembinaNip) {
        const userByNip = await (this.prisma.user as any).findFirst({
          where: {
            OR: [
              { nipNbm: pembinaNip },
              { username: pembinaNip },
              { teacherProfile: { nip: pembinaNip } },
            ],
          },
          select: { id: true },
        });
        if (userByNip?.id) {
          targetUserId = userByNip.id;
        }
      }

      if (!targetUserId && pembinaName) {
        const userByName = await (this.prisma.user as any).findFirst({
          where: {
            name: { equals: pembinaName, mode: 'insensitive' },
          },
          select: { id: true },
        });
        if (userByName?.id) {
          targetUserId = userByName.id;
        }
      }

      if (targetUserId) {
        const user = await (this.prisma.user as any).findUnique({
          where: { id: targetUserId },
        });

        if (user) {
          const subRoles = [user.subRole, user.subRole2, user.subRole3, user.subRole4, user.subRole5].filter(Boolean);
          const hasPembinaRole = subRoles.includes('PEMBINA_EKSTRA') || subRoles.includes('PEMBINA_EXTRA');

          if (!hasPembinaRole) {
            const updateData: any = {};
            if (!user.subRole) updateData.subRole = 'PEMBINA_EKSTRA';
            else if (!user.subRole2) updateData.subRole2 = 'PEMBINA_EKSTRA';
            else if (!user.subRole3) updateData.subRole3 = 'PEMBINA_EKSTRA';
            else if (!user.subRole4) updateData.subRole4 = 'PEMBINA_EKSTRA';
            else if (!user.subRole5) updateData.subRole5 = 'PEMBINA_EKSTRA';
            else updateData.subRole5 = 'PEMBINA_EKSTRA';

            await (this.prisma.user as any).update({
              where: { id: targetUserId },
              data: updateData,
            });
          }
        }
      }
    } catch (err) {
      console.error('Gagal sinkronisasi subRole pembina ekstra:', err);
    }
  }

  /**
   * Update Data Ekstrakurikuler:
   * - Waka Kesiswaan: Mengubah nama, kategori, pembina, status aktif (tidak merubah jadwal/lokasi/deskripsi kegiatan).
   * - Pembina Ekstra: Mengubah deskripsi, lokasi, jadwal hari dan waktu latihan untuk ekstra binaannya.
   */
  async update(id: string, dto: UpdateExtracurricularDto, user: any): Promise<any> {
    const existing = await this.findOne(id);
    const isPembina = this.isUserPembinaOf(existing, user);
    const isWaka = this.isWakaOrKesiswaan(user);

    if (!isPembina && !isWaka) {
      throw new ForbiddenException('Anda tidak memiliki wewenang untuk mengubah data ekstrakurikuler ini.');
    }

    const updateData: any = {};

    if (isWaka && !isPembina) {
      // Waka Kesiswaan: Master fields only
      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.code !== undefined) updateData.code = dto.code;
      if (dto.category !== undefined) updateData.category = dto.category;
      if (dto.pembinaId !== undefined) updateData.pembinaId = dto.pembinaId;
      if (dto.pembinaUserId !== undefined) updateData.pembinaUserId = dto.pembinaUserId;
      if (dto.pembinaName !== undefined) updateData.pembinaName = dto.pembinaName;
      if (dto.pembinaNip !== undefined) updateData.pembinaNip = dto.pembinaNip;
      if (dto.pembinaContact !== undefined) updateData.pembinaContact = dto.pembinaContact;
      if (dto.pembina2Name !== undefined) updateData.pembina2Name = dto.pembina2Name;
      if (dto.pembina2Contact !== undefined) updateData.pembina2Contact = dto.pembina2Contact;
      if (dto.logoUrl !== undefined) updateData.logoUrl = dto.logoUrl;
      if (dto.targetPeserta !== undefined) updateData.targetPeserta = dto.targetPeserta;
      if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    } else if (isPembina && !isWaka) {
      // Pembina: Jadwal, Lokasi, dan Deskripsi kegiatan
      if (dto.description !== undefined) updateData.description = dto.description;
      if (dto.scheduleDay !== undefined) updateData.scheduleDay = dto.scheduleDay;
      if (dto.scheduleTime !== undefined) updateData.scheduleTime = dto.scheduleTime;
      if (dto.location !== undefined) updateData.location = dto.location;
    } else {
      // Superadmin / Waka yang juga membina ekstra ini
      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.code !== undefined) updateData.code = dto.code;
      if (dto.category !== undefined) updateData.category = dto.category;
      if (dto.description !== undefined) updateData.description = dto.description;
      if (dto.scheduleDay !== undefined) updateData.scheduleDay = dto.scheduleDay;
      if (dto.scheduleTime !== undefined) updateData.scheduleTime = dto.scheduleTime;
      if (dto.location !== undefined) updateData.location = dto.location;
      if (dto.pembinaId !== undefined) updateData.pembinaId = dto.pembinaId;
      if (dto.pembinaUserId !== undefined) updateData.pembinaUserId = dto.pembinaUserId;
      if (dto.pembinaName !== undefined) updateData.pembinaName = dto.pembinaName;
      if (dto.pembinaNip !== undefined) updateData.pembinaNip = dto.pembinaNip;
      if (dto.pembinaContact !== undefined) updateData.pembinaContact = dto.pembinaContact;
      if (dto.pembina2Name !== undefined) updateData.pembina2Name = dto.pembina2Name;
      if (dto.pembina2Contact !== undefined) updateData.pembina2Contact = dto.pembina2Contact;
      if (dto.logoUrl !== undefined) updateData.logoUrl = dto.logoUrl;
      if (dto.targetPeserta !== undefined) updateData.targetPeserta = dto.targetPeserta;
      if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    }

    const updated = await (this.prisma as any).extracurricular.update({
      where: { id },
      data: updateData,
    });

    await this.systemLogService.log({
      category: 'AKADEMIK',
      level: 'INFO',
      action: 'EXTRACURRICULAR_UPDATED',
      message: `Data ekstrakurikuler "${updated.name}" berhasil diperbarui oleh ${user?.name}.`,
      userId: user?.id,
      details: { extracurricularId: updated.id },
    });

    if (dto.pembinaUserId || dto.pembinaId || dto.pembinaName || dto.pembinaNip) {
      await this.syncPembinaSubRole(
        dto.pembinaUserId || updated.pembinaUserId,
        dto.pembinaId || updated.pembinaId,
        dto.pembinaName || updated.pembinaName,
        dto.pembinaNip || updated.pembinaNip
      );
    }

    return updated;
  }

  /**
   * Hapus Unit Ekstrakurikuler (Khusus Waka Kesiswaan & Superadmin)
   */
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

  /**
   * Tambah Anggota Siswa (Khusus Pembina Ekstrakurikuler Binaan)
   */
  async addMember(extracurricularId: string, dto: AddMemberDto, user: any): Promise<any> {
    const ekskul = await this.findOne(extracurricularId);
    this.assertPembina(ekskul, user);

    const activeCount = await (this.prisma as any).extracurricularMember.count({
      where: {
        studentId: dto.studentId,
        status: 'AKTIF',
      },
    });

    if (activeCount >= 3) {
      throw new BadRequestException('Siswa ini telah terdaftar di 3 ekstrakurikuler (batas maksimal 3 ekstrakurikuler).');
    }

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

    await this.systemLogService.log({
      category: 'AKADEMIK',
      level: 'INFO',
      action: 'EXTRACURRICULAR_MEMBER_ADDED',
      message: `Siswa "${member.student?.name}" didaftarkan ke ekstrakurikuler "${ekskul.name}" oleh pembina ${user?.name}.`,
      userId: user?.id,
      details: {
        extracurricularId,
        studentId: dto.studentId,
        memberId: member.id,
      },
    });

    return member;
  }

  /**
   * Keluarkan Anggota Siswa (KHUSUS PEMBINA EKSTRAKURIKULER BINAAN)
   */
  async removeMember(memberId: string, user: any): Promise<any> {
    const member = await (this.prisma as any).extracurricularMember.findUnique({
      where: { id: memberId },
      include: {
        extracurricular: true,
        student: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Data anggota ekstrakurikuler tidak ditemukan.');
    }

    this.assertPembina(member.extracurricular, user);

    await (this.prisma as any).extracurricularMember.delete({
      where: { id: memberId },
    });

    await this.systemLogService.log({
      category: 'AKADEMIK',
      level: 'INFO',
      action: 'EXTRACURRICULAR_MEMBER_REMOVED',
      message: `Siswa "${member.student?.name}" dikeluarkan dari ekstrakurikuler "${member.extracurricular?.name}" oleh pembina ${user?.name}.`,
      userId: user?.id,
      details: {
        extracurricularId: member.extracurricularId,
        studentId: member.studentId,
        memberId,
      },
    });

    return {
      success: true,
      message: `Siswa ${member.student?.name || ''} telah berhasil dikeluarkan dari ekstrakurikuler ${member.extracurricular?.name}.`,
    };
  }

  // ==================== JURNAL & PRESENSI MINGGUAN (KHUSUS PEMBINA) ====================

  async createSession(extracurricularId: string, dto: CreateSessionDto, user: any): Promise<any> {
    const ekskul = await this.findOne(extracurricularId);
    this.assertPembina(ekskul, user);

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

    await this.systemLogService.log({
      category: 'AKADEMIK',
      level: 'INFO',
      action: 'EXTRACURRICULAR_SESSION_CREATED',
      message: `Jurnal sesi latihan "${session.title}" dibuat untuk ekstrakurikuler "${ekskul.name}" oleh pembina ${user?.name}.`,
      userId: user?.id,
      details: {
        extracurricularId,
        sessionId: session.id,
        totalPeserta: members.length,
      },
    });

    return this.getSessionDetail(session.id);
  }

  async updateSession(sessionId: string, dto: UpdateSessionDto, user: any): Promise<any> {
    const existing = await (this.prisma as any).extracurricularSession.findUnique({
      where: { id: sessionId },
      include: { extracurricular: true },
    });
    if (!existing) {
      throw new NotFoundException('Sesi pertemuan tidak ditemukan.');
    }
    this.assertPembina(existing.extracurricular, user);

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
      include: { extracurricular: true },
    });
    if (!existing) {
      throw new NotFoundException('Sesi pertemuan tidak ditemukan.');
    }
    this.assertPembina(existing.extracurricular, user);

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
      include: { extracurricular: true },
    });
    if (!session) {
      throw new NotFoundException('Sesi pertemuan tidak ditemukan.');
    }
    this.assertPembina(session.extracurricular, user);

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

  // ==================== PENILAIAN RAPOR (KHUSUS PEMBINA) ====================

  async saveGrades(extracurricularId: string, dto: BulkSaveGradesDto, user: any): Promise<any> {
    const ekskul = await this.findOne(extracurricularId);
    this.assertPembina(ekskul, user);

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

  // ==================== SUPERVISI LOG UNTUK KESISWAAN & KEPALA SEKOLAH ====================

  async getSupervisionSummary(): Promise<any> {
    const ekskuls = await (this.prisma as any).extracurricular.findMany({
      orderBy: { name: 'asc' },
      include: {
        members: {
          include: {
            student: {
              include: { class: true },
            },
            grades: true,
            attendances: true,
          },
        },
        sessions: {
          orderBy: { sessionDate: 'desc' },
          include: {
            attendances: true,
          },
        },
      },
    });

    const summaryList = ekskuls.map((e: any) => {
      const totalMembers = e.members?.length || 0;
      const totalSessions = e.sessions?.length || 0;
      const latestSession = e.sessions?.[0] || null;

      let totalHadir = 0;
      let totalAttRecords = 0;

      e.sessions?.forEach((s: any) => {
        const atts = s.attendances || [];
        totalAttRecords += atts.length;
        totalHadir += atts.filter((a: any) => a.status === 'HADIR').length;
      });

      const avgAttendanceRate = totalAttRecords > 0 ? Math.round((totalHadir / totalAttRecords) * 100) : 0;
      const gradedCount = e.members?.filter((m: any) => m.grades && m.grades.length > 0).length || 0;

      return {
        id: e.id,
        name: e.name,
        code: e.code,
        category: e.category,
        pembinaName: e.pembinaName,
        pembinaNip: e.pembinaNip,
        pembinaContact: e.pembinaContact,
        scheduleDay: e.scheduleDay,
        scheduleTime: e.scheduleTime,
        location: e.location,
        isActive: e.isActive,
        totalMembers,
        totalSessions,
        avgAttendanceRate,
        gradedCount,
        latestSession: latestSession
          ? {
              id: latestSession.id,
              title: latestSession.title,
              sessionDate: latestSession.sessionDate,
              location: latestSession.location,
              topic: latestSession.topic,
              attendanceCount: latestSession.attendances?.filter((a: any) => a.status === 'HADIR').length || 0,
            }
          : null,
      };
    });

    const recentSessions = await (this.prisma as any).extracurricularSession.findMany({
      take: 20,
      orderBy: { sessionDate: 'desc' },
      include: {
        extracurricular: {
          select: {
            id: true,
            name: true,
            pembinaName: true,
            category: true,
          },
        },
        attendances: true,
      },
    });

    return {
      overview: {
        totalEkskul: ekskuls.length,
        activeEkskul: ekskuls.filter((x: any) => x.isActive).length,
        totalMembers: ekskuls.reduce((acc: number, x: any) => acc + (x.members?.length || 0), 0),
        totalSessions: ekskuls.reduce((acc: number, x: any) => acc + (x.sessions?.length || 0), 0),
      },
      summaryList,
      recentSessions: recentSessions.map((s: any) => ({
        id: s.id,
        title: s.title,
        sessionDate: s.sessionDate,
        startTime: s.startTime,
        endTime: s.endTime,
        location: s.location,
        topic: s.topic,
        trainerName: s.trainerName,
        notes: s.notes,
        extracurricularName: s.extracurricular?.name,
        extracurricularCategory: s.extracurricular?.category,
        pembinaName: s.extracurricular?.pembinaName,
        totalHadir: s.attendances?.filter((a: any) => a.status === 'HADIR').length || 0,
        totalPeserta: s.attendances?.length || 0,
      })),
    };
  }
}
