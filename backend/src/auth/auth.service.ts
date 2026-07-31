import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
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

  async googleLogin(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email },
      include: {
        student: true,
        teacherProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User with this Google email not found');
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

  async linkGoogleAccount(email: string, username: string, password: string) {
    // Verify credentials by calling login
    const loginResult = await this.login(username, password);
    if (!loginResult) {
       throw new UnauthorizedException('Invalid credentials');
    }
    
    // Check if the email is already used by another user
    const existingUserWithEmail = await this.prisma.user.findFirst({
      where: { email },
    });
    
    if (existingUserWithEmail && existingUserWithEmail.id !== loginResult.user.id) {
       throw new UnauthorizedException('Email Google ini sudah ditautkan dengan akun lain.');
    }
    
    // Update user's email
    const updatedUser = await this.prisma.user.update({
      where: { id: loginResult.user.id },
      data: { email: email },
      include: {
        student: true,
        teacherProfile: true,
      },
    });
    
    // Generate new token with updated email
    const payload = {
      sub: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      nipNbm: updatedUser.nipNbm || updatedUser.teacherProfile?.nip || null,
      name: updatedUser.name,
      role: updatedUser.role,
      subRole: updatedUser.subRole,
      subRole2: updatedUser.subRole2,
      subRole3: updatedUser.subRole3,
    };
    const token = this.jwtService.sign(payload);
    
    return {
      access_token: token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        nipNbm: updatedUser.nipNbm || updatedUser.teacherProfile?.nip || null,
        name: updatedUser.name,
        role: updatedUser.role,
        subRole: updatedUser.subRole,
        subRole2: updatedUser.subRole2,
        subRole3: updatedUser.subRole3,
      },
    };
  }
}
