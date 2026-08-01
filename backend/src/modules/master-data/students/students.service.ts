import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.student.findMany({
      include: { class: true, user: true },
    });
  }

  async findOne(id: string) {
    return this.prisma.student.findUnique({
      where: { id },
      include: { class: true, user: true },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.student.findFirst({
      where: { userId },
      include: { class: true },
    });
  }

  async create(data: any) {
    // Create User and Student together
    const username = data.username || data.nis;
    const plainPassword = data.password || username; // default to username (NIS)
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    return this.prisma.user.create({
      data: {
        username: username,
        email: data.nis,
        password: hashedPassword,
        name: data.name,
        role: 'SISWA',
        student: {
          create: {
            nisn: data.nisn,
            nis: data.nis,
            name: data.name,
            gender: data.gender,
            classId: data.classId,
          },
        },
      },
      include: {
        student: true,
      },
    });
  }

  async createBulk(dataArray: any[]) {
    // Pre-hash all passwords concurrently
    const hashedDataArray = await Promise.all(
      dataArray.map(async (data) => {
        const username = data.username || data.nis || String(Math.random());
        const plainPassword = data.password || username; // Default password is username
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        return { ...data, username, password: hashedPassword };
      }),
    );

    return this.prisma.$transaction(
      hashedDataArray.map((data) => {
        return this.prisma.user.upsert({
          where: { username: data.username },
          update: {
            // Only update what is safely updatable from Excel
            name: data.name,
            password: data.password,
            student: {
              upsert: {
                update: {
                  nisn: data.nisn,
                  nis: data.nis,
                  name: data.name,
                  gender: data.gender,
                  classId: data.classId,
                },
                create: {
                  nisn: data.nisn,
                  nis: data.nis,
                  name: data.name,
                  gender: data.gender,
                  classId: data.classId,
                },
              },
            },
          },
          create: {
            username: data.username,
            password: data.password,
            name: data.name,
            role: 'SISWA',
            student: {
              create: {
                nisn: data.nisn,
                nis: data.nis,
                name: data.name,
                gender: data.gender,
                classId: data.classId,
              },
            },
          },
        });
      }),
      { timeout: 60000 }, // Increase timeout to 60 seconds
    );
  }

  async update(id: string, data: any) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new Error('Student not found');

    let finalPassword = data.password;
    if (finalPassword && !finalPassword.startsWith('$2')) {
      finalPassword = await bcrypt.hash(finalPassword, 10);
    }

    return this.prisma.student.update({
      where: { id },
      data: {
        nisn: data.nisn,
        nis: data.nis,
        name: data.name,
        gender: data.gender,
        ...(data.classId && { class: { connect: { id: data.classId } } }),
        ...(student.userId && {
          user: {
            update: {
              name: data.name,
              ...(data.username && { username: data.username }),
              ...(finalPassword && { password: finalPassword }),
            },
          },
        }),
      },
      include: { user: true },
    });
  }

  async remove(id: string) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (student) {
      if (student.userId) {
        return this.prisma.user.delete({ where: { id: student.userId } });
      } else {
        return this.prisma.student.delete({ where: { id } });
      }
    }
    return null;
  }
}
