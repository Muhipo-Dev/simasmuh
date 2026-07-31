import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    title: string;
    content: string;
    target: string;
    authorId: string;
    type?: string;
    eventDate?: string | Date;
    image?: string;
  }) {
    // Pastikan eventDate diformat ke DateTime jika ada, hapus jika kosong
    const payload: any = { ...data };
    if (payload.eventDate) {
      payload.eventDate = new Date(payload.eventDate);
    } else {
      payload.eventDate = null;
    }

    if (!payload.image) {
      payload.image = null;
    }

    return this.prisma.announcement.create({
      data: payload,
    });
  }

  async findAll(targetFilter?: string[]) {
    const whereClause: any = {};
    if (targetFilter && targetFilter.length > 0) {
      whereClause.target = { in: targetFilter };
    }

    return this.prisma.announcement.findMany({
      where: whereClause,
      include: {
        author: {
          select: { name: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.announcement.findUnique({
      where: { id },
      include: {
        author: {
          select: { name: true, role: true },
        },
      },
    });
  }

  async update(id: string, data: any) {
    const payload: any = { ...data };

    if (payload.eventDate !== undefined) {
      if (payload.eventDate) {
        payload.eventDate = new Date(payload.eventDate);
      } else {
        payload.eventDate = null;
      }
    }

    if (payload.image !== undefined && !payload.image) {
      payload.image = null;
    }

    return this.prisma.announcement.update({
      where: { id },
      data: payload,
    });
  }

  async remove(id: string) {
    return this.prisma.announcement.delete({
      where: { id },
    });
  }
}
