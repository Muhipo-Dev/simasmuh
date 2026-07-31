import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.teacherProfile.findMany({
      where: {
        user: {
          OR: [
            { role: 'GURU' },
            { subRole: 'GURU' },
            { subRole2: 'GURU' },
            { subRole3: 'GURU' },
          ],
        },
      },
      include: {
        user: true,
        schedules: {
          include: {
            subject: true,
            class: true,
          },
        },
        homeroomClasses: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.teacherProfile.findUnique({
      where: { id },
      include: {
        user: true,
        schedules: {
          include: {
            subject: true,
            class: true,
          },
        },
        homeroomClasses: true,
      },
    });
  }

  async create(data: any) {
    // Create User and TeacherProfile together
    return this.prisma.user.create({
      data: {
        username: data.username || data.nip || data.email,
        email: data.email,
        password: data.password || 'guru123', // Default password if not provided
        name: data.name,
        role: 'GURU',
        teacherProfile: {
          create: {
            nip: data.nip,
            phone: data.phone,
          },
        },
      },
      include: {
        teacherProfile: true,
      },
    });
  }

  async createBulk(dataArray: any[]) {
    // Execute multiple creations in a transaction
    return this.prisma.$transaction(
      dataArray.map((data) =>
        this.prisma.user.create({
          data: {
            username: data.username || data.nip || data.email,
            email: data.email,
            password: data.password || 'guru123',
            name: data.name,
            role: 'GURU',
            teacherProfile: {
              create: {
                nip: data.nip,
                phone: data.phone,
              },
            },
          },
        }),
      ),
      { timeout: 60000 }, // Increase timeout to 60 seconds
    );
  }

  async update(id: string, data: any) {
    return this.prisma.teacherProfile.update({
      where: { id },
      data: {
        nip: data.nip,
        phone: data.phone,
        user: {
          update: {
            username: data.username || data.nip || data.email,
            email: data.email,
            name: data.name,
            ...(data.password && { password: data.password }),
          },
        },
      },
      include: { user: true },
    });
  }

  async remove(id: string) {
    // Because onDelete: Cascade is on TeacherProfile -> User, if we delete User, TeacherProfile is deleted.
    // Wait, the schema says TeacherProfile belongs to User. If we delete TeacherProfile, User remains?
    // Let's delete the TeacherProfile and its associated User.
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id },
    });
    if (teacher) {
      // Deleting the user will cascade and delete the teacher profile if configured,
      // but in our schema User has teacherProfile? and TeacherProfile has User @relation(onDelete: Cascade).
      // So if we delete User, TeacherProfile is deleted.
      return this.prisma.user.delete({ where: { id: teacher.userId } });
    }
    return null;
  }
}
