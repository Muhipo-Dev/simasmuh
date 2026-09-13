import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class HomeroomJournalsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { teacherId?: string; userId?: string }) {
    const where: any = {};
    if (query?.teacherId) {
      where.teacherId = query.teacherId;
    } else if (query?.userId) {
      where.teacher = { userId: query.userId };
    }
    return this.prisma.homeroomJournal.findMany({
      where,
      include: { teacher: { include: { user: true, homeroomClasses: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.homeroomJournal.findUnique({
      where: { id },
      include: { teacher: { include: { user: true } } },
    });
  }

  async create(data: any) {
    return this.prisma.homeroomJournal.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.homeroomJournal.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.homeroomJournal.delete({ where: { id } });
  }
}
