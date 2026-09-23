import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class TeachingJournalsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { userId?: string; teacherId?: string; date?: string; scheduleId?: string }) {
    const where: any = {};
    if (query?.scheduleId) {
      where.scheduleId = query.scheduleId;
    }
    if (query?.teacherId) {
      where.teacherId = query.teacherId;
    }
    if (query?.userId) {
      where.schedule = {
        teacher: { userId: query.userId },
      };
    }
    if (query?.date) {
      const startOfDay = new Date(query.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(query.date);
      endOfDay.setHours(23, 59, 59, 999);
      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }
    return this.prisma.teachingJournal.findMany({
      where,
      include: {
        schedule: {
          include: {
            class: true,
            subject: true,
            teacher: { include: { user: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.teachingJournal.findUnique({
      where: { id },
      include: { schedule: true },
    });
  }

  async create(data: any) {
    return this.prisma.teachingJournal.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.teachingJournal.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.teachingJournal.delete({ where: { id } });
  }
}
