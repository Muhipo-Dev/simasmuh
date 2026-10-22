import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SystemLogService } from '../../core/services/system-log.service';
import { EmailNotificationService } from '../../communication/notifications/email.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private systemLogService: SystemLogService,
    private emailNotificationService: EmailNotificationService,
    private jwtService: JwtService,
  ) {}

  async findAll(requestingUser?: any) {
    const isSuperadminOrGod =
      requestingUser?.role === 'SUPERADMIN' ||
      requestingUser?.role === 'ADMIN_IT' ||
      requestingUser?.role === 'GOD' ||
      requestingUser?.role === 'GOD_USER' ||
      requestingUser?.username === 'supermuhipo';

    const whereClause: any = {};
    if (requestingUser && !isSuperadminOrGod) {
      whereClause.role = { notIn: ['GOD', 'GOD_USER'] };
      whereClause.username = { not: 'supermuhipo' };
    }

    return this.prisma.user.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        phone: true,
        nipNbm: true,
        role: true,
        employmentStatus: true,
        isActive: true,
        subRole: true,
        subRole2: true,
        subRole3: true,
        subRole4: true,
        subRole5: true,
        avatarUrl: true,
        address: true,
        bankName: true,
        bankAccountNumber: true,
        bankAccountHolder: true,
        createdAt: true,
        teacherProfile: true,
        student: {
          include: {
            class: true,
          },
        },
        parentProfile: {
          include: {
            students: {
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
      orderBy: { name: 'asc' },
    });
  }

  async create(data: any) {
    const usernameValue =
      data.username && data.username.trim() !== ''
        ? data.username.trim()
        : null;
    if (!usernameValue) {
      throw new BadRequestException('Username wajib diisi');
    }

    const nipNbmValue =
      data.nipNbm && data.nipNbm.trim() !== '' ? data.nipNbm.trim() : null;
    if (nipNbmValue) {
      const existingNip = await this.prisma.user.findFirst({
        where: { nipNbm: nipNbmValue },
      });
      if (existingNip)
        throw new BadRequestException(
          'NIP / NBM sudah terdaftar pada akun lain',
        );
    }

    // Validasi Keamanan Tunggal (Single Role) Kepala Sekolah
    const isAssigningKepalaSekolah =
      data.role === 'KEPALA_SEKOLAH' ||
      data.subRole === 'KEPALA_SEKOLAH' ||
      data.subRole2 === 'KEPALA_SEKOLAH' ||
      data.subRole3 === 'KEPALA_SEKOLAH' ||
      data.subRole4 === 'KEPALA_SEKOLAH' ||
      data.subRole5 === 'KEPALA_SEKOLAH';

    if (isAssigningKepalaSekolah) {
      const existingKepsek = await this.prisma.user.findFirst({
        where: {
          OR: [
            { role: 'KEPALA_SEKOLAH' },
            { subRole: 'KEPALA_SEKOLAH' },
            { subRole2: 'KEPALA_SEKOLAH' },
            { subRole3: 'KEPALA_SEKOLAH' },
            { subRole4: 'KEPALA_SEKOLAH' },
            { subRole5: 'KEPALA_SEKOLAH' },
          ],
        },
      });

      if (existingKepsek) {
        throw new BadRequestException(
          `Jabatan Kepala Sekolah saat ini masih diemban oleh "${existingKepsek.name}" (${existingKepsek.username}). Demi keamanan E-Sign dan aturan sistem, ubah/kosongkan role Kepala Sekolah pada akun lama terlebih dahulu sebelum menugaskannya ke akun baru.`,
        );
      }
    }

    const existingUsername = await this.prisma.user.findFirst({
      where: { username: usernameValue },
    });
    if (existingUsername) {
      throw new BadRequestException('Username sudah terdaftar');
    }

    const emailValue =
      data.email && data.email.trim() !== '' ? data.email.trim() : null;
    if (emailValue) {
      const existingEmail = await this.prisma.user.findFirst({
        where: { email: emailValue },
      });
      if (existingEmail) {
        throw new BadRequestException('Email sudah terdaftar');
      }
    }

    const plainPassword =
      data.password && data.password.trim() !== ''
        ? data.password.trim()
        : usernameValue;

    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const phoneValue =
      data.phone && data.phone.trim() !== ''
        ? data.phone.trim()
        : null;

    const createdUser = await this.prisma.user.create({
      data: {
        username: usernameValue,
        name: data.name,
        email: emailValue,
        nipNbm: nipNbmValue,
        phone: phoneValue,
        password: hashedPassword,
        role: data.role || 'GURU',
        employmentStatus: data.employmentStatus || (data.role === 'HONORER' || data.subRole === 'HONORER' ? 'HONORER' : (data.role === 'GURU' || data.subRole === 'GURU' ? 'GTTP' : 'PTTP')),
        isActive: data.isActive !== undefined ? (data.isActive === true || data.isActive === 'true') : true,
        subRole: data.subRole || null,
        subRole2: data.subRole2 || null,
        subRole3: data.subRole3 || null,
        subRole4: data.subRole4 || null,
        subRole5: data.subRole5 || null,
        avatarUrl: data.avatarUrl || null,
        address: data.address || null,
        bankName: data.bankName || null,
        bankAccountNumber: data.bankAccountNumber || null,
        bankAccountHolder: data.bankAccountHolder || null,
        ...(data.role === 'GURU' ||
        data.role === 'HONORER' ||
        data.subRole === 'GURU' ||
        data.subRole === 'HONORER' ||
        data.subRole2 === 'GURU' ||
        data.subRole2 === 'HONORER' ||
        data.subRole3 === 'GURU' ||
        data.subRole3 === 'HONORER' ||
        data.subRole4 === 'GURU' ||
        data.subRole4 === 'HONORER' ||
        data.subRole5 === 'GURU' ||
        data.subRole5 === 'HONORER' ||
        data.role === 'PEGAWAI' ||
        data.role === 'ADMIN_TU' ||
        data.role === 'KEPALA_SEKOLAH' ||
        data.role === 'ADMIN_IT' ||
        data.lastEducation ||
        data.skUrl ||
        data.cvUrl ||
        data.ijazahUrl ||
        data.berkasUrl
          ? {
              teacherProfile: {
                create: {
                  ...(nipNbmValue ? { nip: nipNbmValue } : {}),
                  phone: phoneValue,
                  lastEducation: data.lastEducation || 'S1',
                  skUrl: data.skUrl || null,
                  cvUrl: data.cvUrl || null,
                  ijazahUrl: data.ijazahUrl || null,
                  berkasUrl: data.berkasUrl || null,
                } as any,
              },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        phone: true,
        nipNbm: true,
        role: true,
        employmentStatus: true,
        subRole: true,
        subRole2: true,
        subRole3: true,
        subRole4: true,
        subRole5: true,
        avatarUrl: true,
        address: true,
        bankName: true,
        bankAccountNumber: true,
        bankAccountHolder: true,
        teacherProfile: true,
      },
    });

    if (createdUser && createdUser.avatarUrl) {
      this.triggerFaceNetSync(createdUser.id);
    }

    return createdUser;
  }

  async update(id: string, data: any, currentUser?: any) {
    const userToUpdate = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!userToUpdate) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    // Proteksi Khusus GOD user (supermuhipo)
    if (userToUpdate.username === 'supermuhipo') {
      if (currentUser) {
        const callerRoles = [
          currentUser.role,
          currentUser.subRole,
          currentUser.subRole2,
          currentUser.subRole3,
          currentUser.subRole4,
          currentUser.subRole5,
        ].filter(Boolean);
        const isSuperadminCaller =
          currentUser.username === 'supermuhipo' ||
          callerRoles.includes('SUPERADMIN') ||
          currentUser.role === 'SUPERADMIN';

        if (!isSuperadminCaller) {
          throw new BadRequestException(
            'Hak perubahan username, password, dan data akun GOD user (supermuhipo) hanya dapat dilakukan oleh pengguna berstatus SUPERADMIN.',
          );
        }
      }
    }

    const updateData: any = {
      name: data.name,
      role: userToUpdate.username === 'supermuhipo' ? (data.role || userToUpdate.role || 'GOD_USER') : data.role,
      subRole: data.subRole || null,
      subRole2: data.subRole2 || null,
      subRole3: data.subRole3 || null,
      subRole4: data.subRole4 || null,
      subRole5: data.subRole5 || null,
    };

    if (data.employmentStatus !== undefined) {
      updateData.employmentStatus = data.employmentStatus;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = userToUpdate.username === 'supermuhipo' ? true : (data.isActive === true || data.isActive === 'true');
    }

    // Validasi Keamanan Tunggal (Single Role) Kepala Sekolah pada Update
    const isAssigningKepalaSekolah =
      data.role === 'KEPALA_SEKOLAH' ||
      data.subRole === 'KEPALA_SEKOLAH' ||
      data.subRole2 === 'KEPALA_SEKOLAH' ||
      data.subRole3 === 'KEPALA_SEKOLAH' ||
      data.subRole4 === 'KEPALA_SEKOLAH' ||
      data.subRole5 === 'KEPALA_SEKOLAH';

    if (isAssigningKepalaSekolah) {
      const existingKepsek = await this.prisma.user.findFirst({
        where: {
          NOT: { id },
          OR: [
            { role: 'KEPALA_SEKOLAH' },
            { subRole: 'KEPALA_SEKOLAH' },
            { subRole2: 'KEPALA_SEKOLAH' },
            { subRole3: 'KEPALA_SEKOLAH' },
            { subRole4: 'KEPALA_SEKOLAH' },
            { subRole5: 'KEPALA_SEKOLAH' },
          ],
        },
      });

      if (existingKepsek) {
        throw new BadRequestException(
          `Jabatan Kepala Sekolah saat ini masih diemban oleh "${existingKepsek.name}" (${existingKepsek.username}). Demi keamanan E-Sign dan integritas persuratan resmi, ubah/kosongkan role Kepala Sekolah pada akun lama terlebih dahulu sebelum menugaskannya ke akun baru.`,
        );
      }
    }

    if (data.phone !== undefined) {
      updateData.phone =
        data.phone && data.phone.trim() !== ''
          ? data.phone.trim()
          : null;
    }

    if (data.username !== undefined) {
      const usernameValue = data.username ? data.username.trim() : '';
      if (!usernameValue) {
        throw new BadRequestException('Username wajib diisi');
      }
      const existingUsername = await this.prisma.user.findFirst({
        where: { username: usernameValue, NOT: { id } },
      });
      if (existingUsername) {
        throw new BadRequestException(
          'Username sudah terdaftar pada akun lain',
        );
      }
      updateData.username = usernameValue;
    }

    if (data.email !== undefined) {
      if (data.email && data.email.trim() !== '') {
        const emailValue = data.email.trim();
        const existingEmail = await this.prisma.user.findFirst({
          where: { email: emailValue, NOT: { id } },
        });
        if (existingEmail) {
          throw new BadRequestException('Email sudah terdaftar pada akun lain');
        }
        updateData.email = emailValue;
      } else {
        updateData.email = null;
      }
    }

    const nipNbmValue =
      data.nipNbm !== undefined
        ? data.nipNbm && data.nipNbm.trim() !== ''
          ? data.nipNbm.trim()
          : null
        : undefined;
    if (nipNbmValue !== undefined && nipNbmValue !== null) {
      const existingNip = await this.prisma.user.findFirst({
        where: { nipNbm: nipNbmValue, NOT: { id } },
      });
      if (existingNip)
        throw new BadRequestException(
          'NIP / NBM sudah terdaftar pada akun lain',
        );
    }

    if (nipNbmValue !== undefined) {
      updateData.nipNbm = nipNbmValue;
    }

    if (data.password && data.password.trim() !== '') {
      updateData.password = await bcrypt.hash(data.password.trim(), 10);
    }

    if (data.avatarUrl !== undefined) {
      updateData.avatarUrl = data.avatarUrl;
    }
    if (data.address !== undefined) {
      updateData.address = data.address;
    }
    if (data.bankName !== undefined) {
      updateData.bankName = data.bankName;
    }
    if (data.bankAccountNumber !== undefined) {
      updateData.bankAccountNumber = data.bankAccountNumber;
    }
    if (data.bankAccountHolder !== undefined) {
      updateData.bankAccountHolder = data.bankAccountHolder;
    }

    if (
      data.role === 'GURU' ||
      data.role === 'HONORER' ||
      data.subRole === 'GURU' ||
      data.subRole === 'HONORER' ||
      data.subRole2 === 'GURU' ||
      data.subRole2 === 'HONORER' ||
      data.subRole3 === 'GURU' ||
      data.subRole3 === 'HONORER' ||
      data.subRole4 === 'GURU' ||
      data.subRole4 === 'HONORER' ||
      data.subRole5 === 'GURU' ||
      data.subRole5 === 'HONORER' ||
      data.role === 'PEGAWAI' ||
      data.role === 'ADMIN_TU' ||
      data.role === 'KEPALA_SEKOLAH' ||
      data.role === 'ADMIN_IT' ||
      data.lastEducation !== undefined ||
      data.certificationStatus !== undefined ||
      data.skUrl !== undefined ||
      data.cvUrl !== undefined ||
      data.ijazahUrl !== undefined ||
      data.berkasUrl !== undefined
    ) {
      const existingProfile = await this.prisma.teacherProfile.findUnique({
        where: { userId: id },
      });
      const profileData: any = {};
      if (nipNbmValue !== undefined) profileData.nip = nipNbmValue;
      if (data.phone !== undefined) profileData.phone = data.phone;
      if (data.lastEducation !== undefined) profileData.lastEducation = data.lastEducation;
      if (data.certificationStatus !== undefined) profileData.certificationStatus = data.certificationStatus;
      if (data.certificationYear !== undefined) profileData.certificationYear = Number(data.certificationYear) || null;
      if (data.skUrl !== undefined) profileData.skUrl = data.skUrl;
      if (data.cvUrl !== undefined) profileData.cvUrl = data.cvUrl;
      if (data.ijazahUrl !== undefined) profileData.ijazahUrl = data.ijazahUrl;
      if (data.berkasUrl !== undefined) profileData.berkasUrl = data.berkasUrl;

      if (!existingProfile) {
        updateData.teacherProfile = {
          create: {
            ...(nipNbmValue ? { nip: nipNbmValue } : {}),
            ...profileData,
          },
        };
      } else if (Object.keys(profileData).length > 0) {
        updateData.teacherProfile = { update: profileData };
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        phone: true,
        nipNbm: true,
        role: true,
        isActive: true,
        subRole: true,
        subRole2: true,
        subRole3: true,
        subRole4: true,
        subRole5: true,
        avatarUrl: true,
        address: true,
        bankAccountHolder: true,
        teacherProfile: true,
      },
    });

    if (data.avatarUrl !== undefined) {
      this.triggerFaceNetSync(updated.id);
    }

    return updated;
  }

  async linkGoogleOAuth(
    userId: string,
    email: string,
    name?: string,
    avatarUrl?: string,
  ) {
    if (!email || !email.includes('@')) {
      throw new BadRequestException('Format email Google tidak valid');
    }

    const cleanEmail = email.trim().toLowerCase();

    // Cek apakah email sudah terdaftar pada user lain
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: { equals: cleanEmail, mode: 'insensitive' },
        NOT: { id: userId },
      },
    });

    if (existingUser) {
      throw new BadRequestException(
        `Email '${cleanEmail}' sudah terhubung ke akun '${existingUser.username}' (${existingUser.name}). Silakan gunakan email lain.`,
      );
    }

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new NotFoundException('Data pengguna tidak ditemukan');
    }

    const updateData: any = {
      email: cleanEmail,
    };

    if (!currentUser.avatarUrl && avatarUrl) {
      updateData.avatarUrl = avatarUrl;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        avatarUrl: true,
      },
    });

    await this.systemLogService.log({
      category: 'AUTH',
      level: 'INFO',
      action: 'GOOGLE_OAUTH_LINKED',
      message: `Akun '${currentUser.username}' (${currentUser.name}) berhasil dihubungkan dengan Google OAuth (${cleanEmail}).`,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
    });

    return {
      success: true,
      message: `Email ${cleanEmail} berhasil dihubungkan dengan akun Anda! Sekarang Anda dapat login dengan 1-klik melalui tombol Masuk dengan Google.`,
      user: updated,
    };
  }

  async remove(id: string, currentUser?: any) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        teacherProfile: {
          include: {
            homeroomClasses: true,
            schedules: true,
          },
        },
        student: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    // Proteksi Mutlak Akun GOD User (supermuhipo)
    if (user.username === 'supermuhipo') {
      throw new BadRequestException(
        'Akun GOD user (supermuhipo) adalah akun master sistem yang dilindungi dan tidak dapat dihapus.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Bersihkan relasi jika user memiliki TeacherProfile
      if (user.teacherProfile) {
        const teacherId = user.teacherProfile.id;
        await tx.class.updateMany({
          where: { homeroomTeacherId: teacherId },
          data: { homeroomTeacherId: null },
        });
        await tx.teacherSubject.deleteMany({
          where: { teacherId },
        });
        await tx.teachingJournal.deleteMany({
          where: { teacherId },
        });
        await tx.homeroomJournal.deleteMany({
          where: { teacherId },
        });
        const schedules = await tx.schedule.findMany({
          where: { teacherId },
          select: { id: true },
        });
        if (schedules.length > 0) {
          const scheduleIds = schedules.map((s) => s.id);
          await tx.attendance.deleteMany({
            where: { scheduleId: { in: scheduleIds } },
          });
          await tx.teachingJournal.deleteMany({
            where: { scheduleId: { in: scheduleIds } },
          });
          await tx.schedule.deleteMany({
            where: { id: { in: scheduleIds } },
          });
        }
        await tx.teacherProfile.deleteMany({
          where: { id: teacherId },
        });
      }

      // 2. Bersihkan relasi langsung user
      await tx.announcement.deleteMany({ where: { authorId: id } });
      await tx.dailyAttendance.deleteMany({ where: { userId: id } });
      await tx.presensiKegiatan.deleteMany({ where: { userId: id } });
      await tx.staffJournal.deleteMany({ where: { userId: id } });
      await tx.izinKeluar.deleteMany({ where: { userId: id } });
      await tx.userSession.deleteMany({ where: { userId: id } });
      await tx.notification.deleteMany({
        where: { OR: [{ userId: id }, { senderId: id }] },
      });
      await tx.characterAssessment.deleteMany({
        where: { evaluatorId: id },
      });
      await tx.systemLog.deleteMany({ where: { userId: id } });

      return tx.user.delete({
        where: { id },
      });
    });
  }

  async removeMany(ids: string[], currentUser?: any) {
    for (const id of ids) {
      await this.remove(id, currentUser).catch(() => null);
    }
    return { success: true, count: ids.length };
  }

  async toggleActive(id: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { student: true },
    });
    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    // Proteksi Mutlak Akun GOD User (supermuhipo)
    if (user.username === 'supermuhipo' && !isActive) {
      throw new BadRequestException(
        'Akun GOD user (supermuhipo) adalah akun master sistem yang dilindungi dan tidak dapat dinonaktifkan.',
      );
    }

    // Proteksi Superadmin tunggal agar tidak dinonaktifkan secara keliru
    if (user.role === 'SUPERADMIN' && !isActive) {
      const activeSuperadmins = await this.prisma.user.count({
        where: { role: 'SUPERADMIN', isActive: true },
      });
      if (activeSuperadmins <= 1) {
        throw new BadRequestException(
          'Tidak dapat menonaktifkan Superadmin terakhir dalam sistem.',
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isActive: true,
      },
    });

    // Jika memiliki relasi siswa, sinkronkan juga status Student
    if (user.student) {
      await this.prisma.student.update({
        where: { id: user.student.id },
        data: { isActive },
      });
    }

    return updated;
  }

  async bulkToggleActive(ids: string[], isActive: boolean) {
    let successCount = 0;
    for (const id of ids) {
      try {
        await this.toggleActive(id, isActive);
        successCount++;
      } catch {}
    }
    return { success: true, count: successCount, total: ids.length, isActive };
  }

  async getProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        nipNbm: true,
        role: true,
        isActive: true,
        subRole: true,
        subRole2: true,
        subRole3: true,
        subRole4: true,
        subRole5: true,
        avatarUrl: true,
        address: true,
        teacherProfile: {
          select: {
            id: true,
            nip: true,
            phone: true,
            lastEducation: true,
            certificationStatus: true,
            certificationYear: true,
          },
        },
        parentProfile: {
          select: {
            id: true,
            phone: true,
            occupation: true,
            address: true,
            students: {
              select: {
                relation: true,
                student: {
                  select: {
                    id: true,
                    name: true,
                    nis: true,
                    nisn: true,
                    class: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            nisn: true,
            nis: true,
            gender: true,
            isActive: true,
            bioData: true,
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    // Periksa apakah akun ini sedang diakses oleh admin dalam mode override atau spectator
    // Ambang batas keaktifan real-time: 2 menit (jika admin keluar / idle > 2 menit, notifikasi langsung hilang)
    const TWO_MINUTES_AGO = new Date(Date.now() - 2 * 60 * 1000);
    const activeOverrideSession = await this.prisma.userSession.findFirst({
      where: {
        userId: id,
        isActive: true,
        lastActiveAt: { gte: TWO_MINUTES_AGO },
        device: { contains: 'by ' },
      },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        device: true,
        lastActiveAt: true,
      },
    });

    let overrideAdminInfo: { adminName: string; mode: string } | null = null;
    const deviceStr = activeOverrideSession?.device || '';
    if (deviceStr) {
      const match = deviceStr.match(/\[(OVERRIDE|SPECTATOR)\] by (.+)$/i);
      if (match && match[1] && match[2]) {
        overrideAdminInfo = {
          mode: match[1].toLowerCase(),
          adminName: match[2].trim(),
        };
      }
    }

    return {
      ...user,
      activeOverrideByAdmin: overrideAdminInfo,
    };
  }

  async getLoginHistory(id: string) {
    return this.prisma.userSession.findMany({
      where: {
        userId: id,
      },
      orderBy: {
        lastActiveAt: 'desc',
      },
      take: 20,
      select: {
        id: true,
        device: true,
        browser: true,
        os: true,
        ipAddress: true,
        userAgent: true,
        isActive: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });
  }

  async unlinkSession(userId: string, sessionId: string) {
    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    await this.prisma.userSession.updateMany({
      where: { id: sessionId, userId },
      data: { isActive: false },
    });

    if (session) {
      await this.systemLogService.log({
        category: 'AUTH',
        level: 'INFO',
        action: 'UNLINK_SESSION',
        message: `Sesi perangkat '${session.device || session.userAgent || sessionId}' milik '${session.user?.username || userId}' telah diputus / dikeluarkan.`,
        userId: userId,
        userName: session.user?.name || undefined,
        userRole: session.user?.role || undefined,
        ipAddress: session.ipAddress || undefined,
        userAgent: session.userAgent || undefined,
        details: {
          sessionId,
          device: session.device,
          os: session.os,
          browser: session.browser,
        },
      });
    }

    return {
      success: true,
      message: 'Sesi perangkat berhasil diputus dan diakhiri.',
    };
  }

  async terminateSession(sessionId: string, adminUserId?: string) {
    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) {
      throw new NotFoundException('Sesi tidak ditemukan.');
    }

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    await this.systemLogService.log({
      category: 'AUTH',
      level: 'WARN',
      action: 'ADMIN_FORCE_LOGOUT',
      message: `Supervisor Superadmin memutuskan paksa sesi '${session.device || sessionId}' milik pengguna '${session.user?.username || session.userId}'`,
      userId: session.userId,
      userName: session.user?.name || undefined,
      userRole: session.user?.role || undefined,
      ipAddress: session.ipAddress || undefined,
      userAgent: session.userAgent || undefined,
      details: {
        sessionId,
        device: session.device,
        terminatedBy: adminUserId || 'SUPERADMIN',
      },
    });

    return {
      success: true,
      message: `Sesi ${session.user?.name || session.user?.username} (${session.device || 'Perangkat'}) berhasil diakhiri.`,
    };
  }

  async terminateAllSessions(
    adminUserId: string,
    excludeCurrentSessionId?: string,
  ) {
    const whereClause: any = {
      isActive: true,
      user: {
        role: { not: 'SUPERADMIN' },
      },
    };
    if (excludeCurrentSessionId) {
      whereClause.id = { not: excludeCurrentSessionId };
    }

    const activeSessions = await this.prisma.userSession.findMany({
      where: whereClause,
      select: { id: true },
    });

    const count = activeSessions.length;

    await this.prisma.userSession.updateMany({
      where: whereClause,
      data: { isActive: false },
    });

    await this.systemLogService.log({
      category: 'AUTH',
      level: 'WARN',
      action: 'ADMIN_FORCE_LOGOUT_ALL',
      message: `Superadmin memutuskan semua sesi pengguna aktif non-superadmin (${count} sesi telah diakhiri).`,
      userId: adminUserId,
      details: {
        totalTerminated: count,
        excludedSessionId: excludeCurrentSessionId,
      },
    });

    return {
      success: true,
      message: `Berhasil memutuskan dan mengakhiri ${count} sesi pengguna aktif (sesi Superadmin tetap aman terlindungi).`,
      terminatedCount: count,
    };
  }

  async deleteSingleSession(sessionId: string, adminUserId?: string) {
    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) {
      throw new NotFoundException(
        'Data riwayat sesi perangkat tidak ditemukan.',
      );
    }

    await this.prisma.userSession.delete({
      where: { id: sessionId },
    });

    await this.systemLogService.log({
      category: 'AUTH',
      level: 'WARN',
      action: 'ADMIN_DELETE_SESSION_LOG',
      message: `Superadmin menghapus riwayat sesi perangkat '${session.device || sessionId}' milik pengguna '${session.user?.username || session.userId}' dari basis data.`,
      userId: session.userId,
      userName: session.user?.name || undefined,
      userRole: session.user?.role || undefined,
      ipAddress: session.ipAddress || undefined,
      userAgent: session.userAgent || undefined,
      details: {
        sessionId,
        device: session.device,
        deletedBy: adminUserId || 'SUPERADMIN',
      },
    });

    return {
      success: true,
      message: `Riwayat sesi perangkat ${session.device || 'Perangkat'} berhasil dihapus dari database.`,
    };
  }

  async deleteAllSessionLogs(adminUserId?: string) {
    // Hanya menghapus riwayat sesi yang sudah tidak aktif (isActive: false)
    // Sesi pengguna yang sedang aktif (online/login) tetap dipertahankan utuh
    const { count } = await this.prisma.userSession.deleteMany({
      where: {
        isActive: false,
        user: {
          role: { not: 'SUPERADMIN' },
        },
      },
    });

    await this.systemLogService.log({
      category: 'AUTH',
      level: 'WARN',
      action: 'ADMIN_DELETE_ALL_SESSIONS_HISTORY',
      message: `Superadmin membersihkan seluruh riwayat sesi tidak aktif (${count} sesi) dari basis data (sesi pengguna aktif & Superadmin tetap dipertahankan).`,
      details: {
        totalDeleted: count,
        deletedBy: adminUserId || 'SUPERADMIN',
      },
    });

    return {
      success: true,
      message: `Berhasil menghapus ${count} riwayat sesi yang tidak aktif (sesi pengguna yang sedang aktif & Superadmin tetap aman terlindungi).`,
      deletedCount: count,
    };
  }

  async deleteUserSessions(targetUserId: string, adminUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, username: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    // Jika pengguna memiliki sesi aktif, hanya hapus riwayat sesi lamanya (isActive: false)
    // Jika tidak ada sesi aktif, hapus seluruh catatannya
    const activeCount = await this.prisma.userSession.count({
      where: { userId: targetUserId, isActive: true },
    });

    const whereCondition: any = { userId: targetUserId };
    if (activeCount > 0) {
      whereCondition.isActive = false;
    }

    const { count } = await this.prisma.userSession.deleteMany({
      where: whereCondition,
    });

    await this.systemLogService.log({
      category: 'AUTH',
      level: 'WARN',
      action: 'ADMIN_DELETE_ALL_USER_SESSIONS',
      message: `Superadmin menghapus riwayat (${count} sesi) perangkat milik '${user.username || user.name}' dari basis data (sesi aktif tetap dilindungi).`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      details: {
        totalDeleted: count,
        deletedBy: adminUserId || 'SUPERADMIN',
      },
    });

    const infoNote =
      activeCount > 0
        ? ` (${activeCount} sesi aktif saat ini tetap dipertahankan)`
        : '';

    return {
      success: true,
      message: `Berhasil menghapus ${count} riwayat sesi perangkat milik ${user.name || user.username} dari database${infoNote}.`,
      deletedCount: count,
    };
  }

  async getAllActiveSessions() {
    const ONLINE_THRESHOLD_MS = 3 * 60 * 1000;
    const nowTime = Date.now();

    const sessions = await this.prisma.userSession.findMany({
      orderBy: { lastActiveAt: 'desc' },
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            subRole: true,
          },
        },
      },
    });

    const userSessionMap = new Map<string, any>();

    for (const s of sessions) {
      const uId = s.userId;
      const lastActiveMs = s.lastActiveAt
        ? new Date(s.lastActiveAt).getTime()
        : 0;
      const isLiveOnline =
        s.isActive && nowTime - lastActiveMs <= ONLINE_THRESHOLD_MS;

      const sessionDetail = {
        id: s.id,
        device: s.device || 'Desktop / Browser',
        browser: s.browser || 'Web Browser',
        os: s.os || 'OS',
        ipAddress: s.ipAddress || '127.0.0.1',
        lastActiveAt: s.lastActiveAt,
        isActive: s.isActive,
        isLiveOnline,
      };

      if (!userSessionMap.has(uId)) {
        userSessionMap.set(uId, {
          userId: uId,
          primarySessionId: s.id,
          name: s.user?.name || s.user?.username || 'Pengguna',
          username: s.user?.username,
          role: s.user?.role,
          subRole: s.user?.subRole,
          device: s.device || 'Desktop / Browser',
          browser: s.browser || 'Web Browser',
          os: s.os || 'OS',
          ipAddress: s.ipAddress || '127.0.0.1',
          lastActiveAt: s.lastActiveAt,
          isActive: s.isActive,
          isLiveOnline,
          totalActiveDevices: isLiveOnline ? 1 : 0,
          sessions: [sessionDetail],
        });
      } else {
        const existing = userSessionMap.get(uId);
        existing.sessions.push(sessionDetail);
        if (isLiveOnline) {
          existing.isLiveOnline = true;
          existing.totalActiveDevices += 1;
        }
        if (s.isActive) {
          existing.isActive = true;
        }
      }
    }

    return Array.from(userSessionMap.values());
  }

  async sendPasswordResetLink(
    userId: string,
    adminUser?: { id: string; name?: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: true,
        teacherProfile: true,
        parentProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    const resetToken = randomBytes(24).toString('hex');
    const resetUrl = `/login?action=reset-password&token=${resetToken}&u=${encodeURIComponent(user.username)}`;

    const targetEmail = user.email;

    let emailResult: any = { status: 'SKIPPED' };
    if (targetEmail && targetEmail.includes('@')) {
      emailResult = await this.emailNotificationService.sendEmailNotification({
        to: targetEmail,
        subject: `[Reset Password] Akun ${user.username}`,
        title: 'Reset Kata Sandi',
        category: 'SISTEM',
        badgeLabel: 'RESET PASSWORD',
        recipientName: user.name,
        contentText: `Tautan reset password untuk akun ${user.username} telah dibuat oleh Admin.`,
        metaDetails: [
          { label: 'Username', value: user.username },
          { label: 'Peran Akun', value: user.role },
          { label: 'Masa Berlaku', value: '24 Jam' },
        ],
        actionUrl: resetUrl,
        actionText: 'Reset Kata Sandi',
      });
    }

    // Catat ke SystemLog
    await this.systemLogService.log({
      category: 'AUTH',
      level: 'INFO',
      action: 'ADMIN_SEND_RESET_LINK',
      message: `Superadmin mengirimkan tautan reset password ke ${user.name} (${user.username}) via Email (${targetEmail || 'N/A'})`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      details: {
        resetToken,
        targetEmail,
        sentBy: adminUser?.name || 'SUPERADMIN',
        emailStatus: emailResult?.success ? 'SENT' : 'SKIPPED_OR_FAILED',
      },
    });

    return {
      success: true,
      message: `Link reset password berhasil digenerate dan dikirim via Email ke ${user.name} (${targetEmail || 'Email Pengguna'}).`,
      resetUrl,
      targetEmail,
      recipientName: user.name,
      username: user.username,
    };
  }

  async getUnlinkLogs(userId: string) {
    return this.prisma.systemLog.findMany({
      where: {
        userId,
        category: 'AUTH',
        action: {
          in: ['UNLINK_SESSION', 'UNLINK_ALL_SESSIONS', 'LOGOUT_SESSION'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
      select: {
        id: true,
        action: true,
        message: true,
        level: true,
        ipAddress: true,
        userAgent: true,
        details: true,
        createdAt: true,
      },
    });
  }

  async deleteUnlinkLogs(userId: string) {
    await this.prisma.systemLog.deleteMany({
      where: {
        userId,
        category: 'AUTH',
        action: {
          in: ['UNLINK_SESSION', 'UNLINK_ALL_SESSIONS', 'LOGOUT_SESSION'],
        },
      },
    });
    return {
      success: true,
      message: 'Semua riwayat pemutusan sesi berhasil dihapus.',
    };
  }

  async deleteSingleUnlinkLog(userId: string, logId: string) {
    await this.prisma.systemLog.deleteMany({
      where: {
        id: logId,
        userId,
      },
    });
    return { success: true, message: 'Log riwayat berhasil dihapus.' };
  }

  async updateProfile(id: string, data: any) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.nipNbm !== undefined)
      updateData.nipNbm = data.nipNbm ? data.nipNbm.trim() : null;

    if (data.email !== undefined) {
      if (data.email && data.email.trim() !== '') {
        const cleanEmail = data.email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
          throw new BadRequestException('Format alamat email tidak valid');
        }
        const existingEmail = await this.prisma.user.findFirst({
          where: { email: cleanEmail, NOT: { id } },
        });
        if (existingEmail)
          throw new BadRequestException('Email sudah terdaftar pada akun lain');
        updateData.email = cleanEmail;
      } else {
        updateData.email = null;
      }
    }

    if (data.newPassword && data.newPassword.trim() !== '') {
      const currentUser = await this.prisma.user.findUnique({ where: { id } });
      if (!currentUser)
        throw new BadRequestException('Pengguna tidak ditemukan');
      if (data.oldPassword !== undefined) {
        const isMatch = await bcrypt.compare(
          data.oldPassword,
          currentUser.password,
        );
        if (!isMatch && currentUser.password !== data.oldPassword) {
          throw new BadRequestException(
            'Kata sandi lama yang Anda masukkan salah!',
          );
        }
      }
      updateData.password = await bcrypt.hash(data.newPassword.trim(), 10);
    }

    // Update teacherProfile fields if provided
    const tpFields: any = {};
    if (data.lastEducation !== undefined)
      tpFields.lastEducation = data.lastEducation;
    if (data.certificationStatus !== undefined)
      tpFields.certificationStatus = data.certificationStatus;
    if (data.certificationYear !== undefined)
      tpFields.certificationYear = data.certificationYear
        ? Number(data.certificationYear)
        : null;
    if (data.nipNbm !== undefined)
      tpFields.nip = data.nipNbm ? data.nipNbm.trim() : null;
    if (data.skUrl !== undefined) tpFields.skUrl = data.skUrl;
    if (data.cvUrl !== undefined) tpFields.cvUrl = data.cvUrl;
    if (data.ijazahUrl !== undefined) tpFields.ijazahUrl = data.ijazahUrl;
    if (data.berkasUrl !== undefined) tpFields.berkasUrl = data.berkasUrl;

    if (Object.keys(tpFields).length > 0) {
      const teacherProfile = await this.prisma.teacherProfile.findUnique({
        where: { userId: id },
      });
      if (teacherProfile) {
        updateData.teacherProfile = { update: tpFields };
      }
    }

    // Jika siswa mengubah alamat, sinkronkan juga ke bioData Student
    if (data.address !== undefined) {
      const student = await this.prisma.student.findUnique({
        where: { userId: id },
      });
      if (student) {
        let currentBio: any = {};
        if (student.bioData) {
          try {
            currentBio = typeof student.bioData === 'string' ? JSON.parse(student.bioData) : student.bioData;
          } catch (e) {
            currentBio = {};
          }
        }
        currentBio.alamat = data.address;
        await this.prisma.student.update({
          where: { id: student.id },
          data: { bioData: JSON.stringify(currentBio) },
        });
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        nipNbm: true,
        role: true,
        subRole: true,
        subRole2: true,
        avatarUrl: true,
        address: true,
        teacherProfile: {
          select: {
            nip: true,
            lastEducation: true,
            certificationStatus: true,
            certificationYear: true,
          },
        },
      },
    });

    if (data.avatarUrl !== undefined) {
      this.triggerFaceNetSync(updatedUser.id);
    }

    return updatedUser;
  }

  private triggerFaceNetSync(userId: string) {
    setTimeout(async () => {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          include: {
            student: true,
            teacherProfile: true,
          },
        });
        if (!user || !user.avatarUrl) return;

        const payload = {
          userId: user.id,
          name: user.name,
          role: user.role,
          identifier:
            user.student?.nis ||
            user.nipNbm ||
            user.teacherProfile?.nip ||
            user.username ||
            user.id,
          avatarUrl: user.avatarUrl,
        };

        const endpoints = [
          'http://127.0.0.1:8089/sync-user',
          'http://localhost:8089/sync-user',
        ];
        for (const ep of endpoints) {
          try {
            await fetch(ep, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              signal: AbortSignal.timeout(6000),
            });
            break;
          } catch {}
        }
      } catch (err) {
        // silent fail
      }
    }, 100);
  }

  /**
   * Mengambil daftar seluruh pengguna untuk modul Override Pengguna
   * Terdiri dari grup Pendidik/Tendik/Pegawai dan Siswa (termasuk wali murid terkait)
   */
  async getOverrideUsersList(requestingUser?: any) {
    const isSuperadminOrGod =
      requestingUser?.role === 'SUPERADMIN' ||
      requestingUser?.role === 'GOD' ||
      requestingUser?.role === 'GOD_USER' ||
      requestingUser?.username === 'supermuhipo';

    const whereClause: any = {};
    if (requestingUser && !isSuperadminOrGod) {
      // Admin IT dan Admin TU/BAU: Hanya dapat mengakses pegawai, guru, siswa, dan wali murid biasa
      // Dilarang keras mengakses atau melihat akun krusial: SUPERADMIN, GOD, KEPALA_SEKOLAH, dan akun KEUANGAN
      whereClause.role = {
        notIn: [
          'GOD',
          'GOD_USER',
          'SUPERADMIN',
          'KEPALA_SEKOLAH',
          'KEUANGAN',
          'KEUANGAN_ALL',
          'SUPERVISOR_KEUANGAN',
          'KEUANGAN_MASUK',
          'KEUANGAN_KELUAR',
        ],
      };
      whereClause.username = { not: 'supermuhipo' };
      // Pastikan subRole juga tidak mengandung peran krusial
      whereClause.subRole = {
        notIn: [
          'SUPERADMIN',
          'KEPALA_SEKOLAH',
          'KEUANGAN',
          'KEUANGAN_ALL',
          'SUPERVISOR_KEUANGAN',
          'KEUANGAN_MASUK',
          'KEUANGAN_KELUAR',
        ],
      };
    }

    // Ambil data users lengkap
    const users = await this.prisma.user.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        phone: true,
        nipNbm: true,
        role: true,
        employmentStatus: true,
        isActive: true,
        subRole: true,
        subRole2: true,
        subRole3: true,
        subRole4: true,
        subRole5: true,
        avatarUrl: true,
        createdAt: true,
        teacherProfile: {
          select: {
            nip: true,
            phone: true,
            lastEducation: true,
            certificationStatus: true,
          },
        },
        student: {
          select: {
            id: true,
            nis: true,
            nisn: true,
            gender: true,
            isActive: true,
            class: {
              select: {
                id: true,
                name: true,
                gradeLevel: true,
              },
            },
            parentRelations: {
              select: {
                relation: true,
                parent: {
                  select: {
                    id: true,
                    userId: true,
                    phone: true,
                    occupation: true,
                    user: {
                      select: {
                        id: true,
                        name: true,
                        username: true,
                        email: true,
                        phone: true,
                        role: true,
                        isActive: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        parentProfile: {
          select: {
            id: true,
            phone: true,
            occupation: true,
            students: {
              select: {
                relation: true,
                student: {
                  select: {
                    id: true,
                    name: true,
                    nis: true,
                    nisn: true,
                    class: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Ambil juga seluruh siswa dari tabel Student yang mungkin belum dibuatkan user akunnya atau sudah dibuatkan
    const allStudents = await this.prisma.student.findMany({
      include: {
        class: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            role: true,
            isActive: true,
            avatarUrl: true,
          },
        },
        parentRelations: {
          include: {
            parent: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    email: true,
                    phone: true,
                    role: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      users,
      students: allStudents,
    };
  }

  /**
   * Menghasilkan token Override atau Spectator bagi Superadmin, Admin IT, dan Admin TU
   * Mode 'override': Full Access sebagai user target
   * Mode 'spectator': Read Only (isReadOnly: true)
   */
  async generateOverrideToken(
    targetUserId: string,
    mode: 'override' | 'spectator',
    adminUser: any,
    clientIp?: string,
    userAgent?: string,
  ) {
    if (!adminUser) {
      throw new ForbiddenException('Autentikasi admin diperlukan.');
    }

    // Jika pemanggil saat ini sedang dalam sesi override (misal ingin switch dari Spectator ke Override atau sebaliknya),
    // ambil identitas dan role admin asli yang melakukan override
    const effectiveAdminId = adminUser.isOverrideSession
      ? adminUser.overrideByAdminId || adminUser.id
      : adminUser.id;

    // Ambil data admin asli dari basis data untuk memastikan hak akses terkini
    const dbAdmin = await this.prisma.user.findUnique({
      where: { id: effectiveAdminId },
    });

    if (!dbAdmin) {
      throw new ForbiddenException('Data akun admin tidak ditemukan.');
    }

    const adminRoles = [
      dbAdmin.role,
      dbAdmin.subRole,
      dbAdmin.subRole2,
      dbAdmin.subRole3,
      dbAdmin.subRole4,
      dbAdmin.subRole5,
    ].filter(Boolean);

    const isGod =
      dbAdmin.username === 'supermuhipo' ||
      dbAdmin.role === 'GOD' ||
      dbAdmin.role === 'GOD_USER';
    const isSuperadmin = adminRoles.includes('SUPERADMIN') || isGod;
    const isAdminIT = adminRoles.includes('ADMIN_IT');
    const isAdminTU =
      adminRoles.includes('ADMIN_TU') ||
      adminRoles.includes('BAU') ||
      adminRoles.includes('TATA_USAHA');

    if (!isSuperadmin && !isAdminIT && !isAdminTU) {
      throw new ForbiddenException(
        'Akses ditolak. Fitur Override dan Spectator hanya diperuntukkan bagi Superadmin, Admin IT, dan Admin TU.',
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        student: true,
        teacherProfile: true,
        parentProfile: {
          include: {
            students: {
              include: {
                student: true,
              },
            },
          },
        },
      },
    });

    if (!targetUser) {
      throw new NotFoundException('Pengguna target tidak ditemukan.');
    }

    // Dilarang meng-override akun sendiri
    if (targetUser.id === dbAdmin.id) {
      throw new ForbiddenException(
        'Anda tidak dapat meng-override atau menjadi spectator pada akun Anda sendiri.',
      );
    }

    // Proteksi akun GOD (supermuhipo): Hanya GOD sendiri yang dapat override
    if (
      (targetUser.username === 'supermuhipo' ||
        targetUser.role === 'GOD' ||
        targetUser.role === 'GOD_USER') &&
      !isGod
    ) {
      throw new ForbiddenException(
        'Akun master GOD dilindungi dan tidak dapat di-override oleh siapapun kecuali pemilik akun GOD.',
      );
    }

    // Proteksi Pengguna Krusial (Superadmin, Kepala Sekolah, & Bagian Keuangan)
    // Aturan: Hanya Superadmin dan GOD yang berhak meng-override pengguna krusial ini.
    // Admin IT dan Admin TU/BAU hanya diizinkan untuk guru, karyawan/pegawai, dan siswa/wali murid biasa.
    const targetRoles = [
      targetUser.role,
      targetUser.subRole,
      targetUser.subRole2,
      targetUser.subRole3,
      targetUser.subRole4,
      targetUser.subRole5,
    ].filter(Boolean);

    const isTargetCrucial =
      targetRoles.includes('SUPERADMIN') ||
      targetRoles.includes('KEPALA_SEKOLAH') ||
      targetRoles.includes('KEUANGAN') ||
      targetRoles.includes('KEUANGAN_ALL') ||
      targetRoles.includes('SUPERVISOR_KEUANGAN') ||
      targetRoles.includes('KEUANGAN_MASUK') ||
      targetRoles.includes('KEUANGAN_KELUAR');

    if (isTargetCrucial && !isSuperadmin) {
      throw new ForbiddenException(
        'Akses ditolak. Akun pengguna krusial (Kepala Sekolah, Keuangan, dan Superadmin) hanya dapat di-override oleh Superadmin dan GOD User.',
      );
    }

    const isReadOnly = mode === 'spectator';

    // Buat sesi aktif override baru
    let devType = 'Desktop / Laptop';
    let devOs = 'Windows';
    let devBrowser = 'Browser';

    if (userAgent) {
      if (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          userAgent,
        )
      ) {
        devType = 'Ponsel / Tablet';
      }
      if (/Windows/i.test(userAgent)) devOs = 'Windows';
      else if (/Android/i.test(userAgent)) devOs = 'Android';
      else if (/iPhone|iPad|iPod/i.test(userAgent)) devOs = 'iOS';
      else if (/Macintosh|Mac OS/i.test(userAgent)) devOs = 'macOS';
      else if (/Linux/i.test(userAgent)) devOs = 'Linux';

      if (/Edg/i.test(userAgent)) devBrowser = 'Microsoft Edge';
      else if (/Chrome/i.test(userAgent)) devBrowser = 'Google Chrome';
      else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent))
        devBrowser = 'Safari';
      else if (/Firefox/i.test(userAgent)) devBrowser = 'Mozilla Firefox';
    }

    // Nonaktifkan sesi override sebelumnya untuk user ini jika ada (agar tidak tertumpuk)
    await this.prisma.userSession.updateMany({
      where: {
        userId: targetUser.id,
        device: { contains: 'by ' },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    const sessionRecord = await this.prisma.userSession.create({
      data: {
        userId: targetUser.id,
        ipAddress: clientIp || '127.0.0.1',
        userAgent: userAgent || 'Admin Override Session',
        device: `${devType} (${devOs}) - [${mode.toUpperCase()}] by ${dbAdmin.name || dbAdmin.username}`,
        os: devOs,
        browser: devBrowser,
        isActive: true,
        lastActiveAt: new Date(),
      },
    });

    // Sign JWT token untuk target user dengan flag override metadata
    const payload = {
      sub: targetUser.id,
      sessionId: sessionRecord.id,
      email: targetUser.email,
      username: targetUser.username,
      nipNbm: targetUser.nipNbm || targetUser.teacherProfile?.nip || null,
      name: targetUser.name,
      role: targetUser.role,
      isActive: targetUser.isActive !== false,
      subRole: targetUser.subRole,
      subRole2: targetUser.subRole2,
      subRole3: targetUser.subRole3,
      subRole4: targetUser.subRole4,
      subRole5: targetUser.subRole5,
      // Metadata Override & Spectator
      isOverrideSession: true,
      overrideMode: mode,
      isReadOnly: isReadOnly,
      overrideByAdminId: dbAdmin.id,
      overrideByAdminName: dbAdmin.name || dbAdmin.username,
      overrideByAdminRole: dbAdmin.role,
    };

    const token = this.jwtService.sign(payload);

    await this.systemLogService.log({
      category: 'AUTH',
      level: 'INFO',
      action: mode === 'override' ? 'USER_OVERRIDE_START' : 'USER_SPECTATOR_START',
      message: `Admin '${dbAdmin.username}' (${dbAdmin.name} - ${dbAdmin.role}) mengaktifkan mode ${mode.toUpperCase()} pada akun '${targetUser.username}' (${targetUser.name} - ${targetUser.role}).`,
      userId: dbAdmin.id,
      userName: dbAdmin.name,
      userRole: dbAdmin.role,
      ipAddress: clientIp,
      userAgent,
    });

    return {
      access_token: token,
      sessionId: sessionRecord.id,
      mode,
      isReadOnly,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        username: targetUser.username,
        nipNbm: targetUser.nipNbm || targetUser.teacherProfile?.nip || null,
        name: targetUser.name,
        role: targetUser.role,
        isActive: targetUser.isActive !== false,
        subRole: targetUser.subRole,
        subRole2: targetUser.subRole2,
        subRole3: targetUser.subRole3,
        subRole4: targetUser.subRole4,
        subRole5: targetUser.subRole5,
        isOverrideSession: true,
        overrideMode: mode,
        isReadOnly: isReadOnly,
        overrideByAdminId: dbAdmin.id,
        overrideByAdminName: dbAdmin.name || dbAdmin.username,
        overrideByAdminRole: dbAdmin.role,
      },
    };
  }

  async deactivateOverrideSession(userId: string, adminId?: string) {
    if (!userId) return { success: false };
    await this.prisma.userSession.updateMany({
      where: {
        userId,
        device: { contains: 'by ' },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
    return { success: true };
  }
}

