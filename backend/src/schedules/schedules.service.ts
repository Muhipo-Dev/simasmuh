import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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

  async createBulk(dataArray: any[]) {
    const createdSchedules: any[] = [];
    let currentSubjectCount: number | undefined = undefined;

    for (const data of dataArray) {
      let classId = data.classId;
      if (!classId && data.className) {
        let cls = await this.prisma.class.findFirst({
          where: { name: { equals: data.className, mode: 'insensitive' } },
        });
        if (!cls) {
          cls = await this.prisma.class.create({
            data: {
              name: data.className,
              gradeLevel: 10,
              academicYear: '2026/2027',
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
            user: { name: { equals: data.teacherName, mode: 'insensitive' } },
          },
          include: { user: true },
        });

        if (!teacherProf) {
          const defaultPassword = await bcrypt.hash('guru123', 10);
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
