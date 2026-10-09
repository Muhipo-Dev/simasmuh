import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SystemLogService } from '../services/system-log.service';
import { EmailNotificationService } from '../../communication/notifications/email.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private systemLogService: SystemLogService,
    private emailNotificationService: EmailNotificationService,
    private maintenanceService: MaintenanceService,
  ) {}

  async login(
    emailOrUsername: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          { username: emailOrUsername },
          { phone: emailOrUsername },
          { nipNbm: emailOrUsername },
          { teacherProfile: { nip: emailOrUsername } },
          { student: { nis: emailOrUsername } },
          { student: { nisn: emailOrUsername } },
          { parentProfile: { phone: emailOrUsername } },
        ],
      },
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

    if (!user) {
      await this.systemLogService.log({
        category: 'AUTH',
        level: 'WARN',
        action: 'LOGIN_FAILED',
        message: `Percobaan login gagal: Akun '${emailOrUsername}' tidak ditemukan.`,
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException(
        'Email, username, nomor HP, atau NIP/NIS salah',
      );
    }

    // Support both hashed and plain passwords (for dev seeded data)
    let isValid = false;
    if (user.password.startsWith('$2')) {
      isValid = await bcrypt.compare(password, user.password);
    } else {
      isValid = user.password === password;
    }

    // Provide robust fallback for students who might type their NIS, NISN, or username directly
    if (!isValid && user.role === 'SISWA' && user.student) {
      if (
        password === user.student.nis ||
        password === user.student.nisn ||
        password === user.username ||
        password === `siswa${user.student.nis}` ||
        password === `siswa${user.student.nisn}`
      ) {
        isValid = true;
      }
    }

    // Provide robust fallback for WALI_MURID who might type NIS/NISN of connected students
    if (
      !isValid &&
      user.role === 'WALI_MURID' &&
      user.parentProfile?.students
    ) {
      const studentNisMatches = user.parentProfile.students.some(
        (ps) =>
          ps.student &&
          (password === ps.student.nis ||
            password === ps.student.nisn ||
            password === user.phone ||
            password === user.username),
      );
      if (studentNisMatches) {
        isValid = true;
      }
    }

    if (!isValid) {
      await this.systemLogService.log({
        category: 'AUTH',
        level: 'WARN',
        action: 'LOGIN_FAILED_PASSWORD',
        message: `Percobaan login gagal untuk '${user.username}' (${user.name}): Kata sandi salah.`,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Email, username, atau kata sandi salah');
    }

    // 🔒 Pemeriksaan Mode Pemeliharaan Sistem (Maintenance Mode)
    if (this.maintenanceService.isMaintenanceActive()) {
      const isAllowed = this.maintenanceService.isRoleAllowedDuringMaintenance(user);
      if (!isAllowed) {
        await this.systemLogService.log({
          category: 'AUTH',
          level: 'WARN',
          action: 'LOGIN_MAINTENANCE_BLOCKED',
          message: `Login ditolak: Sistem sedang pemeliharaan untuk '${user.username}' (${user.name} - ${user.role}).`,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          ipAddress,
          userAgent,
        });
        throw new BadRequestException(
          `MAINTENANCE:${this.maintenanceService.maintenanceMessage || 'Layanan SIMASMUH sedang dalam pemeliharaan berkala untuk optimalisasi sistem. Akses sementara dibatasi untuk Administrator.'}`,
        );
      }
    }

    // Parse Device Information for Active Session
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

    // Buat record sesi aktif pengguna baru
    const sessionRecord = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        ipAddress: ipAddress || '127.0.0.1',
        userAgent: userAgent || 'Web Browser',
        device: `${devType} (${devOs})`,
        os: devOs,
        browser: devBrowser,
        isActive: true,
        lastActiveAt: new Date(),
      },
    });

    const payload = {
      sub: user.id,
      sessionId: sessionRecord.id,
      email: user.email,
      username: user.username,
      nipNbm: user.nipNbm || user.teacherProfile?.nip || null,
      name: user.name,
      role: user.role,
      isActive: user.isActive !== false,
      subRole: user.subRole,
      subRole2: user.subRole2,
      subRole3: user.subRole3,
      subRole4: user.subRole4,
      subRole5: user.subRole5,
    };
    const token = this.jwtService.sign(payload);

    await this.systemLogService.log({
      category: 'AUTH',
      level: 'INFO',
      action: 'LOGIN_SUCCESS',
      message: `User '${user.username}' (${user.name} - ${user.role}) berhasil masuk ke sistem.`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      ipAddress,
      userAgent,
    });

    return {
      access_token: token,
      sessionId: sessionRecord.id,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        nipNbm: user.nipNbm || user.teacherProfile?.nip || null,
        name: user.name,
        role: user.role,
        isActive: user.isActive !== false,
        subRole: user.subRole,
        subRole2: user.subRole2,
        subRole3: user.subRole3,
        subRole4: user.subRole4,
        subRole5: user.subRole5,
      },
    };
  }

  async loginWithGoogle(
    googlePayload: {
      email: string;
      name?: string;
      image?: string;
      googleId?: string;
    },
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (!googlePayload.email) {
      throw new BadRequestException('Email Google tidak valid atau kosong.');
    }

    const cleanEmail = googlePayload.email.trim().toLowerCase();

    // 1. Cari user berdasarkan email
    const user = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: cleanEmail,
          mode: 'insensitive',
        },
      },
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

    // 3. Jika akun belum terdaftar sama sekali di sistem
    if (!user) {
      await this.systemLogService.log({
        category: 'AUTH',
        level: 'WARN',
        action: 'GOOGLE_LOGIN_UNREGISTERED',
        message: `Percobaan Google Login akun '${cleanEmail}' gagal: Email belum terdaftar di SIMASMUH.`,
        ipAddress,
        userAgent,
      });
      throw new NotFoundException(
        `Email Google (${cleanEmail}) belum terdaftar di SIMASMUH. Silakan hubungi Administrator atau gunakan akun yang telah terdaftar.`,
      );
    }

    // Update avatar jika belum ada dan ada foto dari Google
    if (!user.avatarUrl && googlePayload.image) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: googlePayload.image },
      }).catch(() => {});
    }

    // 🔒 Pemeriksaan Mode Pemeliharaan Sistem (Maintenance Mode)
    if (this.maintenanceService.isMaintenanceActive()) {
      const isAllowed = this.maintenanceService.isRoleAllowedDuringMaintenance(user);
      if (!isAllowed) {
        await this.systemLogService.log({
          category: 'AUTH',
          level: 'WARN',
          action: 'GOOGLE_LOGIN_MAINTENANCE_BLOCKED',
          message: `Google Login ditolak: Sistem sedang pemeliharaan untuk '${user.username}' (${user.name} - ${user.role}).`,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          ipAddress,
          userAgent,
        });
        throw new BadRequestException(
          `MAINTENANCE:${this.maintenanceService.maintenanceMessage || 'Layanan SIMASMUH sedang dalam pemeliharaan berkala untuk optimalisasi sistem. Akses sementara dibatasi untuk Administrator.'}`,
        );
      }
    }

    // Parse Device Information
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

    // Buat record sesi aktif
    const sessionRecord = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        ipAddress: ipAddress || '127.0.0.1',
        userAgent: userAgent || 'Google OAuth Login',
        device: `${devType} (${devOs}) - Google OAuth`,
        os: devOs,
        browser: devBrowser,
        isActive: true,
        lastActiveAt: new Date(),
      },
    });

    const payload = {
      sub: user.id,
      sessionId: sessionRecord.id,
      email: user.email || cleanEmail,
      username: user.username,
      nipNbm: user.nipNbm || user.teacherProfile?.nip || null,
      name: user.name,
      role: user.role,
      isActive: user.isActive !== false,
      subRole: user.subRole,
      subRole2: user.subRole2,
      subRole3: user.subRole3,
      subRole4: user.subRole4,
      subRole5: user.subRole5,
    };
    const token = this.jwtService.sign(payload);

    await this.systemLogService.log({
      category: 'AUTH',
      level: 'INFO',
      action: 'GOOGLE_LOGIN_SUCCESS',
      message: `User '${user.username}' (${user.name} - ${user.role}) berhasil masuk via Google OAuth (${cleanEmail}).`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      ipAddress,
      userAgent,
    });

    return {
      access_token: token,
      sessionId: sessionRecord.id,
      user: {
        id: user.id,
        email: user.email || cleanEmail,
        username: user.username,
        nipNbm: user.nipNbm || user.teacherProfile?.nip || null,
        name: user.name,
        role: user.role,
        isActive: user.isActive !== false,
        subRole: user.subRole,
        subRole2: user.subRole2,
        subRole3: user.subRole3,
        subRole4: user.subRole4,
        subRole5: user.subRole5,
      },
    };
  }

  async logoutSession(
    userId: string,
    sessionId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (sessionId) {
      const session = await this.prisma.userSession.findUnique({
        where: { id: sessionId },
      });
      await this.prisma.userSession.updateMany({
        where: { id: sessionId, userId },
        data: { isActive: false },
      });

      await this.systemLogService.log({
        category: 'AUTH',
        level: 'INFO',
        action: 'LOGOUT_SESSION',
        message: `Sesi perangkat '${session?.device || sessionId}' milik '${user?.username || userId}' telah dikeluarkan / logout.`,
        userId,
        userName: user?.name || undefined,
        userRole: user?.role || undefined,
        ipAddress: ipAddress || session?.ipAddress || undefined,
        userAgent: userAgent || session?.userAgent || undefined,
        details: {
          sessionId,
          device: session?.device,
          os: session?.os,
          browser: session?.browser,
        },
      });
    } else {
      await this.prisma.userSession.updateMany({
        where: { userId },
        data: { isActive: false },
      });

      await this.systemLogService.log({
        category: 'AUTH',
        level: 'INFO',
        action: 'UNLINK_ALL_SESSIONS',
        message: `Seluruh sesi perangkat milik '${user?.username || userId}' (${user?.name}) telah diputuskan / logout serentak.`,
        userId,
        userName: user?.name || undefined,
        userRole: user?.role || undefined,
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
      });
    }

    return {
      success: true,
      message: 'Sesi perangkat berhasil dikeluarkan / diakhiri.',
    };
  }

  /**
   * Request Single-Use OTP for Password Reset via Official Email
   */
  async requestPasswordResetOtp(
    emailOrUsername: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const cleanQuery = (emailOrUsername || '').trim();
    if (!cleanQuery) {
      throw new BadRequestException('Email, Username, NIS, atau NIP wajib diisi.');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanQuery },
          { username: cleanQuery },
          { phone: cleanQuery },
          { nipNbm: cleanQuery },
          { teacherProfile: { nip: cleanQuery } },
          { student: { nis: cleanQuery } },
          { student: { nisn: cleanQuery } },
          { parentProfile: { phone: cleanQuery } },
        ],
      },
      include: {
        student: true,
        teacherProfile: true,
        parentProfile: true,
      },
    });

    if (!user) {
      await this.systemLogService.log({
        category: 'AUTH',
        level: 'WARN',
        action: 'OTP_REQUEST_FAILED',
        message: `Permintaan OTP reset password gagal: Akun '${cleanQuery}' tidak ditemukan.`,
        ipAddress,
        userAgent,
      });
      throw new NotFoundException('Akun tidak ditemukan. Periksa kembali username, NIS, atau email Anda.');
    }

    // Resolve target email
    const targetEmail = user.email?.trim() || null;
    if (!targetEmail || !targetEmail.includes('@')) {
      await this.systemLogService.log({
        category: 'AUTH',
        level: 'WARN',
        action: 'OTP_REQUEST_NO_EMAIL',
        message: `Permintaan OTP reset password gagal: Akun '${user.username}' belum memiliki email aktif.`,
        ipAddress,
        userAgent,
        userId: user.id,
      });
      throw new BadRequestException(
        `Akun '${user.username}' belum memiliki alamat email terdaftar. Silakan hubungi Administrator atau Helpdesk SIMASMUH.`,
      );
    }

    // Invalidate previous unused OTPs for this user to keep only the newest one active
    await this.prisma.passwordResetOtp.updateMany({
      where: {
        userId: user.id,
        isUsed: false,
      },
      data: {
        isUsed: true,
      },
    });

    // Generate secure 6-digit numeric OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Persist OTP record in database (no expiry, single-use)
    await this.prisma.passwordResetOtp.create({
      data: {
        userId: user.id,
        email: targetEmail,
        otpCode,
        isUsed: false,
        ipAddress,
        userAgent,
      },
    });

    // Mask email for user privacy (e.g. j***@gmail.com)
    const [namePart, domainPart] = targetEmail.split('@');
    const maskedName =
      namePart.length <= 2
        ? `${namePart[0]}*`
        : `${namePart.slice(0, 2)}${'*'.repeat(Math.max(1, namePart.length - 3))}${namePart.slice(-1)}`;
    const maskedEmail = `${maskedName}@${domainPart}`;

    // Send high-priority security OTP email
    const emailResult = await this.emailNotificationService.sendEmailNotification({
      to: targetEmail,
      subject: `Kode OTP Reset Kata Sandi SIMASMUH: ${otpCode}`,
      title: 'Kode OTP Reset Kata Sandi',
      category: 'SISTEM',
      recipientName: user.name,
      badgeLabel: 'KODE KEAMANAN OTP',
      contentHtml: `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin: 20px 0;">
          <p style="font-size: 13px; color: #64748b; margin: 0 0 10px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Kode OTP Reset Kata Sandi</p>
          <div style="font-size: 38px; font-family: 'Courier New', Courier, monospace; font-weight: 900; letter-spacing: 10px; color: #1e3a8a; background: #ffffff; padding: 16px 24px; border-radius: 10px; border: 2px dashed #2563eb; display: inline-block; margin: 8px 0; box-shadow: 0 2px 8px rgba(37,99,235,0.12);">
            ${otpCode}
          </div>
          <p style="font-size: 13px; color: #334155; margin: 14px 0 0 0; line-height: 1.5;">
            Kode OTP di atas bersifat <strong>sekali pakai</strong> untuk memperbarui kata sandi akun SIMASMUH Anda.
          </p>
        </div>
        <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; border-radius: 6px; margin: 16px 0;">
          <p style="font-size: 12px; color: #1e40af; margin: 0; line-height: 1.5;">
            <strong>Penting:</strong> Jangan berikan kode OTP ini kepada siapapun termasuk pihak yang mengaku sebagai petugas sekolah.
          </p>
        </div>
      `,
      contentText: `Kode OTP reset kata sandi akun SIMASMUH Anda adalah ${otpCode}. Kode ini bersifat sekali pakai.`,
      metaDetails: [
        { label: 'Username Akun', value: user.username },
        { label: 'Nama Pengguna', value: user.name },
        { label: 'Waktu Permintaan', value: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB' },
        { label: 'Sifat Kode', value: 'Sekali Pakai (Single-Use, Tanpa Expire)' },
      ],
    });

    await this.systemLogService.log({
      category: 'AUTH',
      level: 'INFO',
      action: 'OTP_REQUESTED',
      message: `Kode OTP reset password untuk akun '${user.username}' berhasil dikirim ke email '${targetEmail}'.`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      ipAddress,
      userAgent,
      details: {
        maskedEmail,
        deliveryStatus: (emailResult as any)?.status || 'SENT',
      },
    });

    return {
      success: true,
      message: `Kode OTP berhasil dikirim ke email ${maskedEmail}.`,
      maskedEmail,
      username: user.username,
      userId: user.id,
    };
  }

  /**
   * Verify Single-Use OTP before Password Reset
   */
  async verifyPasswordResetOtp(
    emailOrUsername: string,
    otpCode: string,
  ) {
    const cleanQuery = (emailOrUsername || '').trim();
    const cleanOtp = (otpCode || '').trim().replace(/\s+/g, '');

    if (!cleanQuery || !cleanOtp) {
      throw new BadRequestException('Akun dan kode OTP 6-digit wajib diisi.');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanQuery },
          { username: cleanQuery },
          { phone: cleanQuery },
          { nipNbm: cleanQuery },
          { teacherProfile: { nip: cleanQuery } },
          { student: { nis: cleanQuery } },
          { student: { nisn: cleanQuery } },
          { parentProfile: { phone: cleanQuery } },
        ],
      },
    });

    if (!user) {
      throw new NotFoundException('Akun tidak ditemukan.');
    }

    const validOtp = await this.prisma.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
        otpCode: cleanOtp,
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!validOtp) {
      throw new BadRequestException('Kode OTP salah, tidak valid, atau sudah pernah digunakan.');
    }

    return {
      valid: true,
      message: 'Kode OTP valid dan siap digunakan untuk reset kata sandi.',
      userId: user.id,
      username: user.username,
    };
  }

  /**
   * Execute Password Reset with Single-Use OTP
   */
  async resetPasswordWithOtp(
    emailOrUsername: string,
    otpCode: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const cleanQuery = (emailOrUsername || '').trim();
    const cleanOtp = (otpCode || '').trim().replace(/\s+/g, '');

    if (!cleanQuery || !cleanOtp || !newPassword) {
      throw new BadRequestException('Akun, kode OTP, dan kata sandi baru wajib diisi.');
    }

    if (newPassword.length < 6) {
      throw new BadRequestException('Kata sandi baru minimal harus 6 karakter.');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanQuery },
          { username: cleanQuery },
          { phone: cleanQuery },
          { nipNbm: cleanQuery },
          { teacherProfile: { nip: cleanQuery } },
          { student: { nis: cleanQuery } },
          { student: { nisn: cleanQuery } },
          { parentProfile: { phone: cleanQuery } },
        ],
      },
    });

    if (!user) {
      throw new NotFoundException('Akun tidak ditemukan.');
    }

    // Look up the active unused OTP
    const validOtp = await this.prisma.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
        otpCode: cleanOtp,
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!validOtp) {
      throw new BadRequestException('Kode OTP salah, tidak valid, atau sudah pernah digunakan sebelumnya.');
    }

    // Hash new password securely
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Mark OTP as used immediately (Single-Use Guarantee)
    await this.prisma.passwordResetOtp.update({
      where: { id: validOtp.id },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });

    // Terminate existing active sessions for security
    await this.prisma.userSession.updateMany({
      where: { userId: user.id },
      data: { isActive: false },
    });

    // Send confirmation email
    if (user.email && user.email.includes('@')) {
      this.emailNotificationService
        .sendEmailNotification({
          to: user.email,
          subject: 'Kata Sandi SIMASMUH Berhasil Diperbarui',
          title: 'Kata Sandi Berhasil Diperbarui',
          category: 'SISTEM',
          recipientName: user.name,
          badgeLabel: 'KEAMANAN AKUN',
          contentHtml: `
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">
              Kata sandi akun SIMASMUH Anda (<strong>${user.username}</strong>) telah berhasil diperbarui menggunakan verifikasi kode OTP Email.
            </p>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; margin: 16px 0;">
              <p style="font-size: 13px; color: #166534; margin: 0; font-weight: 600;">
                ✓ Seluruh sesi akun lama telah di-logout otomatis untuk melindungi privasi akun Anda.
              </p>
            </div>
            <p style="font-size: 13px; color: #64748b; line-height: 1.6;">
              Jika Anda tidak merasa melakukan perubahan kata sandi ini, segera hubungi Administrator SIMASMUH.
            </p>
          `,
          contentText: `Kata sandi akun SIMASMUH Anda (${user.username}) telah berhasil diperbarui.`,
        })
        .catch(() => {});
    }

    // Log security activity
    await this.systemLogService.log({
      category: 'AUTH',
      level: 'INFO',
      action: 'PASSWORD_RESET_SUCCESS',
      message: `Kata sandi akun '${user.username}' (${user.name}) berhasil diatur ulang dengan kode OTP sekali pakai.`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: 'Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.',
    };
  }
}

