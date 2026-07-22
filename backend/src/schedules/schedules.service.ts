import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.schedule.findMany({
      include: { 
        class: true,
        subject: true,
        teacher: { include: { user: true } }
      }
    });
  }

  async findOne(id: string) {
    return this.prisma.schedule.findUnique({
      where: { id },
      include: { 
        class: true,
        subject: true,
        teacher: { include: { user: true } }
      }
    });
  }

  async create(data: { dayOfWeek: number; startTime: string; endTime: string; classId: string; subjectId: string; teacherId: string }) {
    return this.prisma.schedule.create({ data });
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
