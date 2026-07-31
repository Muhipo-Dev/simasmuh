import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeachingJournalsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.teachingJournal.findMany({
      include: { schedule: { include: { class: true } } },
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
