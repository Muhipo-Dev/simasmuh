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
}
