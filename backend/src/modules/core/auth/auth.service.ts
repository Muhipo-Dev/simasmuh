import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(emailOrUsername: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          { username: emailOrUsername },
          { nipNbm: emailOrUsername },
          { teacherProfile: { nip: emailOrUsername } },
          { student: { nis: emailOrUsername } },
          { student: { nisn: emailOrUsername } },
        ],
      },
      include: {
        student: true,
        teacherProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email, username, atau NIP/NBM salah');
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

    if (!isValid) {
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
