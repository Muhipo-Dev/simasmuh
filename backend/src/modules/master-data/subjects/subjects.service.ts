import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.subject.findMany();
  }

  async findOne(id: string) {
    return this.prisma.subject.findUnique({ where: { id } });
  }

  async create(data: { name: string; code: string }) {
    return this.prisma.subject.create({ data });
  }

  async createBulk(dataArray: { name: string; code: string }[]) {
    return this.prisma.$transaction(
      dataArray.map((data) => this.prisma.subject.create({ data })),
    );
  }

  async update(id: string, data: { name?: string; code?: string }) {
    return this.prisma.subject.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.subject.delete({ where: { id } });
  }
}
