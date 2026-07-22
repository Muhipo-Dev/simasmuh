import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.student.findMany({
      include: { class: true }
    });
  }

  async findOne(id: string) {
    return this.prisma.student.findUnique({
      where: { id },
      include: { class: true }
    });
  }

  async create(data: { nisn: string; nis: string; name: string; gender: string; classId: string }) {
    return this.prisma.student.create({ data });
  }

  async update(id: string, data: { nisn?: string; nis?: string; name?: string; gender?: string; classId?: string }) {
    return this.prisma.student.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.student.delete({ where: { id } });
  }
}
