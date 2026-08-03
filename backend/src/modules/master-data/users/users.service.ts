import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      where: {
        role: {
          not: 'SISWA',
        },
      },
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
        createdAt: true,
        teacherProfile: true,
      },
    });
  }

  async create(data: any) {
    const usernameValue = data.username && data.username.trim() !== '' ? data.username.trim() : null;
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

    const existingUsername = await this.prisma.user.findFirst({
      where: { username: usernameValue },
    });
    if (existingUsername) {
      throw new BadRequestException('Username sudah terdaftar');
    }

    const emailValue = data.email && data.email.trim() !== '' ? data.email.trim() : null;
    if (emailValue) {
      const existingEmail = await this.prisma.user.findFirst({
        where: { email: emailValue },
      });
      if (existingEmail) {
        throw new BadRequestException('Email sudah terdaftar');
      }
    }

    const plainPassword = data.password && data.password.trim() !== '' ? data.password.trim() : usernameValue;
    
    const hashedPassword = await bcrypt.hash(
      plainPassword,
      10,
    );

    return this.prisma.user.create({
      data: {
        username: usernameValue,
        name: data.name,
        email: emailValue,
        nipNbm: nipNbmValue,
        password: hashedPassword,
        role: data.role || 'GURU',
        subRole: data.subRole || null,
        subRole2: data.subRole2 || null,
        subRole3: data.subRole3 || null,
        ...(data.role === 'GURU' ||
        data.subRole === 'GURU' ||
        data.subRole2 === 'GURU' ||
        data.subRole3 === 'GURU'
          ? {
              teacherProfile: {
                create: {
                  ...(nipNbmValue ? { nip: nipNbmValue } : {}),
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
        nipNbm: true,
        role: true,
        subRole: true,
        subRole2: true,
        subRole3: true,
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
    };

    if (data.username !== undefined) {
      const usernameValue = data.username ? data.username.trim() : '';
      if (!usernameValue) {
        throw new BadRequestException('Username wajib diisi');
      }
      const existingUsername = await this.prisma.user.findFirst({
        where: { username: usernameValue, NOT: { id } },
      });
      if (existingUsername) {
        throw new BadRequestException('Username sudah terdaftar pada akun lain');
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
      data.subRole3 === 'GURU'
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

    return this.prisma.user.update({
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
        subRole3: true,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
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

    return this.prisma.user.update({
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
  }
}
