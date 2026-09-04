import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return (this.prisma.teacherProfile as any).findMany({
      where: {
        user: {
          OR: [
            { role: 'GURU' },
            { subRole: 'GURU' },
            { subRole2: 'GURU' },
            { subRole3: 'GURU' },
            { subRole4: 'GURU' },
            { subRole5: 'GURU' },
          ],
        },
      },
      include: {
        user: true,
        teacherSubjects: {
          include: {
            subject: true,
          },
        },
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
    return (this.prisma.teacherProfile as any).findUnique({
      where: { id },
      include: {
        user: true,
        teacherSubjects: {
          include: {
            subject: true,
          },
        },
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
    const username = data.username || data.nip || data.email;
    const plainPassword = data.password || username;
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Create User and TeacherProfile together
    return this.prisma.user.create({
      data: {
        username: username,
        email: data.email,
        password: hashedPassword,
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
    // Pre-hash all passwords concurrently
    const hashedDataArray = await Promise.all(
      dataArray.map(async (data) => {
        const username =
          data.username || data.nip || data.email || String(Math.random());
        const plainPassword = data.password || username;
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        return { ...data, username, password: hashedPassword };
      }),
    );

    // Execute multiple creations in a transaction
    return this.prisma.$transaction(
      hashedDataArray.map((data) =>
        this.prisma.user.create({
          data: {
            username: data.username,
            email: data.email,
            password: data.password,
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
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id },
      include: {
        homeroomClasses: true,
        schedules: true,
        teachingJournals: true,
        teacherSubjects: true,
        homeroomJournals: true,
      },
    });

    if (!teacher) {
      return null;
    }

    const userId = teacher.userId;

    // Bersihkan relasi TeacherProfile sebelum penghapusan agar tidak terblok foreign key constraint
    await this.prisma.$transaction(async (tx) => {
      // 1. Lepas jabatan wali kelas pada tabel Class
      if (teacher.homeroomClasses && teacher.homeroomClasses.length > 0) {
        await tx.class.updateMany({
          where: { homeroomTeacherId: teacher.id },
          data: { homeroomTeacherId: null },
        });
      }

      // 2. Hapus relasi mata pelajaran guru
      await tx.teacherSubject.deleteMany({
        where: { teacherId: teacher.id },
      });

      // 3. Hapus jurnal mengajar & jurnal wali kelas terkait guru ini
      await tx.teachingJournal.deleteMany({
        where: { teacherId: teacher.id },
      });
      await tx.homeroomJournal.deleteMany({
        where: { teacherId: teacher.id },
      });

      // 4. Hapus jadwal (Schedule) & kehadiran jadwal terkait profil guru ini
      const schedules = await tx.schedule.findMany({
        where: { teacherId: teacher.id },
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

      // 5. Bersihkan entitas User relasi jika ada: DailyAttendance, Pengeluaran, Announcement, dll
      await tx.announcement.deleteMany({
        where: { authorId: userId },
      });
      await tx.dailyAttendance.deleteMany({
        where: { userId },
      });
      await tx.presensiKegiatan.deleteMany({
        where: { userId },
      });
      await tx.staffJournal.deleteMany({
        where: { userId },
      });
      await tx.izinKeluar.deleteMany({
        where: { userId },
      });
      await tx.userSession.deleteMany({
        where: { userId },
      });
      await tx.notification.deleteMany({
        where: { OR: [{ userId }, { senderId: userId }] },
      });
      await tx.characterAssessment.deleteMany({
        where: { evaluatorId: userId },
      });
      await tx.systemLog.deleteMany({
        where: { userId },
      });

      // 6. Hapus profil guru dan akun User
      await tx.teacherProfile.deleteMany({
        where: { id: teacher.id },
      });

      if (userId) {
        await tx.user.delete({
          where: { id: userId },
        });
      }
    });

    return { success: true, message: 'Data guru berhasil dihapus' };
  }
}
