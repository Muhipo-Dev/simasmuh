import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.class.findMany({
      include: {
        _count: {
          select: { students: true },
        },
        homeroomTeacher: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.class.findUnique({
      where: { id },
      include: {
        students: true,
        schedules: {
          include: { subject: true },
        },
        homeroomTeacher: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async create(data: {
    name: string;
    gradeLevel: number;
    academicYear: string;
    homeroomTeacherId?: string;
  }) {
    return this.prisma.class.create({ data });
  }

  async createBulk(
    dataArray: { name: string; gradeLevel: number; academicYear: string; homeroomTeacherId?: string }[],
  ) {
    return this.prisma.$transaction(
      dataArray.map((data) => this.prisma.class.create({ data })),
    );
  }

  async update(
    id: string,
    data: { name?: string; gradeLevel?: number; academicYear?: string; homeroomTeacherId?: string },
  ) {
    return this.prisma.class.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.class.delete({ where: { id } });
  }
}
