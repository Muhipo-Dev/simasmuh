import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendancesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.attendance.findMany({
      include: { student: true, schedule: { include: { subject: true } } }
    });
  }

  async findOne(id: string) {
    return this.prisma.attendance.findUnique({ where: { id }, include: { student: true, schedule: true } });
  }

  async create(data: any) {
    return this.prisma.attendance.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.attendance.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.attendance.delete({ where: { id } });
  }
}
