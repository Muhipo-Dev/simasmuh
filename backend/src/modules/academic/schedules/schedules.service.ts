import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { userId?: string; teacherId?: string }) {
    const where: any = {};
    if (query?.teacherId) {
      where.teacherId = query.teacherId;
    }
    if (query?.userId) {
      where.teacher = { userId: query.userId };
    }
    return this.prisma.schedule.findMany({
      where,
      include: {
        class: true,
        subject: true,
        teacher: { include: { user: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findOne(id: string) {
    return this.prisma.schedule.findUnique({
      where: { id },
      include: {
        class: true,
        subject: true,
        teacher: { include: { user: true } },
      },
    });
  }

  async create(data: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    classId: string;
    subjectId: string;
    teacherId: string;
  }) {
    return this.prisma.schedule.create({ data });
  }

  async createBulk(dataArray: any[], replaceExisting: boolean = true) {
    // Jika replaceExisting true (default saat import XML), bersihkan jadwal lama terlebih dahulu agar tertumpuk/tergantikan
    if (replaceExisting) {
      await this.prisma.$transaction(async (tx) => {
        const existingSchedules = await tx.schedule.findMany({ select: { id: true } });
        if (existingSchedules.length > 0) {
          const scheduleIds = existingSchedules.map((s) => s.id);
          await tx.attendance.deleteMany({
            where: { scheduleId: { in: scheduleIds } },
          });
          await tx.teachingJournal.deleteMany({
            where: { scheduleId: { in: scheduleIds } },
          });
          await tx.schedule.deleteMany({});
        }
      });
    }

    const createdSchedules: any[] = [];
    let currentSubjectCount: number | undefined = undefined;

    for (const data of dataArray) {
      let classId = data.classId;
      if (!classId && data.className) {
        let cls = await this.prisma.class.findFirst({
          where: { name: { equals: data.className, mode: 'insensitive' } },
        });
        if (!cls) {
          const setting = await this.prisma.setting.findFirst({
            select: { academicYear: true },
          });
          const academicYear = setting?.academicYear || '2026/2027';
          cls = await this.prisma.class.create({
            data: {
              name: data.className,
              gradeLevel: 10,
              academicYear,
            },
          });
        }
        classId = cls.id;
      }

      let subjectId = data.subjectId;
      if (!subjectId && data.subjectName) {
        let subject = await this.prisma.subject.findFirst({
          where: { name: { equals: data.subjectName, mode: 'insensitive' } },
        });
        if (!subject) {
          // get the current max count of subjects if not fetched yet
          if (currentSubjectCount === undefined) {
            currentSubjectCount = await this.prisma.subject.count();
          }
          currentSubjectCount++;
          const prefix = currentSubjectCount.toString().padStart(2, '0');
          const words = data.subjectName
            .split(' ')
            .filter((w: string) => w.trim().length > 0);
          let abbr = '';
          if (words.length === 1) {
            abbr = words[0].substring(0, 5).toUpperCase();
          } else {
            abbr = words
              .map((w: string) => w[0])
              .join('')
              .toUpperCase();
          }
          const code = `${prefix}-${abbr}`;

          subject = await this.prisma.subject.create({
            data: { name: data.subjectName, code },
          });
        }
        subjectId = subject.id;
      }

      let teacherId = data.teacherId;
      if (!teacherId && data.teacherName) {
        let teacherProf = await this.prisma.teacherProfile.findFirst({
          where: {
            user: {
              name: { equals: data.teacherName, mode: 'insensitive' },
            },
          },
          include: { user: true },
        });

        if (!teacherProf) {
          const defaultPassword = await bcrypt.hash('Guru123!', 10);
          const baseUsername = data.teacherName
            .replace(/\s+/g, '')
            .toLowerCase()
            .substring(0, 15);
          const randomNum = Math.floor(Math.random() * 1000);
          const uniqueUsername = `${baseUsername}${randomNum}`;

          const newUser = await this.prisma.user.create({
            data: {
              name: data.teacherName,
              username: uniqueUsername,
              password: defaultPassword,
              role: 'GURU',
            },
          });

          teacherProf = await this.prisma.teacherProfile.create({
            data: {
              userId: newUser.id,
            },
            include: { user: true },
          });
        }
        teacherId = teacherProf.id;
      }

      if (classId && subjectId && teacherId) {
        const schedule = await this.prisma.schedule.create({
          data: {
            dayOfWeek: Number(data.dayOfWeek),
            startTime: data.startTime,
            endTime: data.endTime,
            classId: classId,
            subjectId: subjectId,
            teacherId: teacherId,
          },
        });
        createdSchedules.push(schedule);
      }
    }

    return createdSchedules;
  }

  async deleteAllSchedules(userId: string, passwordConfirm: string) {
    if (!userId || !passwordConfirm) {
      throw new Error('Identitas user dan password otorisasi wajib diisi.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Pengguna tidak ditemukan.');
    }

    const isAuthorizedRole = [
      'SUPERADMIN',
      'ADMIN_IT',
      'ADMIN_TU',
      'BAU',
      'TATA_USAHA',
    ].includes(user.role);

    if (!isAuthorizedRole) {
      throw new Error('Anda tidak memiliki izin otorisasi untuk menghapus semua jadwal.');
    }

    const isPasswordValid = await bcrypt.compare(passwordConfirm, user.password);
    if (!isPasswordValid) {
      throw new Error('Password otorisasi yang Anda masukkan salah.');
    }

    return this.prisma.$transaction(async (tx) => {
      const allSchedules = await tx.schedule.findMany({ select: { id: true } });
      const totalCount = allSchedules.length;

      if (totalCount > 0) {
        const scheduleIds = allSchedules.map((s) => s.id);
        await tx.attendance.deleteMany({
          where: { scheduleId: { in: scheduleIds } },
        });
        await tx.teachingJournal.deleteMany({
          where: { scheduleId: { in: scheduleIds } },
        });
        await tx.schedule.deleteMany({});
      }

      return {
        success: true,
        message: `Berhasil menghapus seluruh ${totalCount} data jadwal pelajaran sekolah. Data kelas, guru, dan mata pelajaran tetap aman terjaga.`,
        deletedCount: totalCount,
      };
    });
  }

  async update(id: string, data: any) {
    return this.prisma.schedule.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.schedule.delete({ where: { id } });
  }
}
