import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SystemLogService } from '../../core/services/system-log.service';
import { WhatsAppService } from '../../communication/whatsapp/whatsapp.service';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private systemLogService: SystemLogService,
    private whatsAppService: WhatsAppService,
  ) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        phone: true,
        nipNbm: true,
        role: true,
        subRole: true,
        subRole2: true,
        subRole3: true,
        subRole4: true,
        subRole5: true,
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
        : '088293733330';

    return this.prisma.user.create({
      data: {
        username: usernameValue,
        name: data.name,
        email: emailValue,
        nipNbm: nipNbmValue,
        phone: phoneValue,
        password: hashedPassword,
        role: data.role || 'GURU',
        subRole: data.subRole || null,
        subRole2: data.subRole2 || null,
        subRole3: data.subRole3 || null,
        subRole4: data.subRole4 || null,
        subRole5: data.subRole5 || null,
        ...(data.role === 'GURU' ||
        data.subRole === 'GURU' ||
        data.subRole2 === 'GURU' ||
        data.subRole3 === 'GURU' ||
        data.subRole4 === 'GURU' ||
        data.subRole5 === 'GURU'
          ? {
              teacherProfile: {
                create: {
                  ...(nipNbmValue ? { nip: nipNbmValue } : {}),
                  phone: phoneValue,
                },
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
        subRole: true,
        subRole2: true,
        subRole3: true,
        subRole4: true,
        subRole5: true,
      },
    });
  }

  async update(id: string, data: any) {
    const updateData: any = {
      name: data.name,
      role: data.role,
      subRole: data.subRole || null,
      subRole2: data.subRole2 || null,
      subRole3: data.subRole3 || null,
      subRole4: data.subRole4 || null,
      subRole5: data.subRole5 || null,
    };

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
          : '088293733330';
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

    if (
      data.role === 'GURU' ||
      data.subRole === 'GURU' ||
      data.subRole2 === 'GURU' ||
      data.subRole3 === 'GURU' ||
      data.subRole4 === 'GURU' ||
      data.subRole5 === 'GURU'
    ) {
      const existingProfile = await this.prisma.teacherProfile.findUnique({
        where: { userId: id },
      });
      if (!existingProfile) {
        updateData.teacherProfile = {
          create: { ...(nipNbmValue ? { nip: nipNbmValue } : {}) },
        };
      } else if (nipNbmValue !== undefined) {
        updateData.teacherProfile = { update: { nip: nipNbmValue } };
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
        subRole: true,
        subRole2: true,
        subRole3: true,
        subRole4: true,
        subRole5: true,
        avatarUrl: true,
      },
    });

    if (data.avatarUrl !== undefined) {
      this.triggerFaceNetSync(updated.id);
    }

    return updated;
  }

  async remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async removeMany(ids: string[]) {
    return this.prisma.user.deleteMany({
      where: { id: { in: ids } },
    });
  }

  async getProfile(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        nipNbm: true,
        role: true,
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
        student: {
          select: {
            nisn: true,
            nis: true,
            class: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
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

    const targetPhone =
      user.phone ||
      user.student?.phone ||
      user.teacherProfile?.phone ||
      user.parentProfile?.phone ||
      '088293733330';

    const message =
      `*🔑 LINK RESET PASSWORD RESMI - SIMASMUH*\n\n` +
      `Halo *${user.name}* (${user.role}),\n` +
      `Superadmin / Helpdesk IT SIMASMUH telah membuatkan tautan pemulihan sandi resmi untuk akun Anda:\n\n` +
      `👤 *Username:* ${user.username}\n` +
      `🔗 *Tautan Reset:* ${resetUrl}\n` +
      `⏱️ *Masa Berlaku:* 24 Jam\n\n` +
      `*SOP Keamanan:*\n` +
      `1. Klik tautan di atas melalui browser Anda.\n` +
      `2. Buat kata sandi baru yang kuat (minimal 6 karakter).\n` +
      `3. Jangan bagikan tautan ini kepada siapapun.\n\n` +
      `_Pesan otomatis dari Supervisor Task Manager SIMASMUH._`;

    // Kirim notifikasi WhatsApp ganda
    let waResult: any = { status: 'SKIPPED' };
    if (targetPhone) {
      waResult = await this.whatsAppService.sendDirectMessage({
        to: targetPhone,
        message,
        recipientName: user.name,
        recipientRole: user.role,
        category: 'SISTEM',
        title: 'Pemulihan Sandi Pengguna (Superadmin Task Manager)',
      });
    }

    // Catat ke SystemLog
    await this.systemLogService.log({
      category: 'AUTH',
      level: 'INFO',
      action: 'ADMIN_SEND_RESET_LINK',
      message: `Superadmin mengirimkan tautan reset password ke ${user.name} (${user.username}) via WhatsApp (${targetPhone})`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      details: {
        resetToken,
        targetPhone,
        sentBy: adminUser?.name || 'SUPERADMIN',
        waStatus: waResult?.status,
      },
    });

    return {
      success: true,
      message: `Link reset password berhasil digenerate dan dikirim via WhatsApp ke ${user.name} (${targetPhone}).`,
      resetUrl,
      targetPhone,
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
        const existingEmail = await this.prisma.user.findFirst({
          where: { email: data.email.trim(), NOT: { id } },
        });
        if (existingEmail)
          throw new BadRequestException('Email sudah terdaftar pada akun lain');
        updateData.email = data.email.trim();
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

    if (Object.keys(tpFields).length > 0) {
      const teacherProfile = await this.prisma.teacherProfile.findUnique({
        where: { userId: id },
      });
      if (teacherProfile) {
        updateData.teacherProfile = { update: tpFields };
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
}
