import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SystemLogService } from '../services/system-log.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private systemLogService: SystemLogService,
  ) {}

  async login(emailOrUsername: string, password: string, ipAddress?: string, userAgent?: string) {
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
      throw new UnauthorizedException('Email, username, nomor HP, atau NIP/NIS salah');
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
    if (!isValid && user.role === 'WALI_MURID' && user.parentProfile?.students) {
      const studentNisMatches = user.parentProfile.students.some(
        (ps) =>
          ps.student &&
          (password === ps.student.nis ||
            password === ps.student.nisn ||
            password === user.phone ||
            password === user.username)
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

    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      nipNbm: user.nipNbm || user.teacherProfile?.nip || null,
      name: user.name,
      role: user.role,
      subRole: user.subRole,
      subRole2: user.subRole2,
      subRole3: user.subRole3,
    };
    const token = this.jwtService.sign(payload);

    // Parse Device Information for Active Session
    let devType = 'Desktop / Laptop';
    let devOs = 'Windows';
    let devBrowser = 'Browser';

    if (userAgent) {
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
        devType = 'Ponsel / Tablet';
      }
      if (/Windows/i.test(userAgent)) devOs = 'Windows';
      else if (/Android/i.test(userAgent)) devOs = 'Android';
      else if (/iPhone|iPad|iPod/i.test(userAgent)) devOs = 'iOS';
      else if (/Macintosh|Mac OS/i.test(userAgent)) devOs = 'macOS';
      else if (/Linux/i.test(userAgent)) devOs = 'Linux';

      if (/Edg/i.test(userAgent)) devBrowser = 'Microsoft Edge';
      else if (/Chrome/i.test(userAgent)) devBrowser = 'Google Chrome';
      else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) devBrowser = 'Safari';
      else if (/Firefox/i.test(userAgent)) devBrowser = 'Mozilla Firefox';
    }

    // Buat atau perbarui sesi aktif pengguna
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
        subRole: user.subRole,
        subRole2: user.subRole2,
        subRole3: user.subRole3,
      },
    };
  }

  async logoutSession(userId: string, sessionId?: string) {
    if (sessionId) {
      await this.prisma.userSession.updateMany({
        where: { id: sessionId, userId },
        data: { isActive: false },
      });
    } else {
      await this.prisma.userSession.updateMany({
        where: { userId },
        data: { isActive: false },
      });
    }

    return { success: true, message: 'Sesi perangkat berhasil di-unlink / diakhiri.' };
  }
}

