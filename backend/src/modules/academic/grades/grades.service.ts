import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class GradesService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter?: { nis?: string; studentId?: string }) {
    const where: any = {};
    if (filter?.studentId) {
      where.studentId = filter.studentId;
    } else if (filter?.nis) {
      where.student = { nis: filter.nis };
    }

    return this.prisma.grade.findMany({
      where,
      include: {
        student: {
          include: {
            class: true,
          },
        },
        subject: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.grade.findUnique({
      where: { id },
      include: { student: true, subject: true },
    });
  }

  async create(data: any) {
    return this.prisma.grade.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.grade.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.grade.delete({ where: { id } });
  }
}
