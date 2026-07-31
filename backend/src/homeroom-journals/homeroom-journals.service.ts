import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HomeroomJournalsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.homeroomJournal.findMany({
      include: { teacher: { include: { user: true } } },
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
