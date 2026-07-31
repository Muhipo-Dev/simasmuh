import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StaffJournalsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId?: string) {
    const whereClause = userId ? { userId } : {};
    return this.prisma.staffJournal.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string) {
    const journal = await this.prisma.staffJournal.findUnique({
      where: { id },
      include: {
        user: { select: { name: true } },
      },
    });
    if (!journal) throw new NotFoundException('Staff Journal not found');
    return journal;
  }

  async create(data: any) {
    return this.prisma.staffJournal.create({
      data: {
        date: new Date(data.date),
        activity: data.activity,
        notes: data.notes || null,
        evidence: data.evidence || null,
        userId: data.userId,
      },
    });
  }

  async update(id: string, data: any) {
    const updateData: any = {};
    if (data.date) updateData.date = new Date(data.date);
    if (data.activity) updateData.activity = data.activity;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.evidence !== undefined) updateData.evidence = data.evidence;

    return this.prisma.staffJournal.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    return this.prisma.staffJournal.delete({
      where: { id },
    });
  }
}
