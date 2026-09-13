import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { EmailNotificationService } from '../notifications/email.service';

@Injectable()
export class AnnouncementsService {
  constructor(
    private prisma: PrismaService,
    private emailNotificationService: EmailNotificationService,
  ) {}

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

    const created = await this.prisma.announcement.create({
      data: payload,
      include: {
        author: { select: { name: true } },
      },
    });

    // Kirim Notifikasi Siaran Berita / Pengumuman via Email ke penerima target
    const targetRole = created.target || 'SEMUA';
    const whereRole: any = { email: { contains: '@' } };
    if (targetRole !== 'SEMUA' && targetRole !== 'ALL') {
      whereRole.role = targetRole;
    }

    this.prisma.user
      .findMany({
        where: whereRole,
        select: { email: true, name: true },
        take: 100,
      })
      .then((recipients) => {
        const cleanContent = created.content ? created.content.replace(/<[^>]*>?/gm, '') : '';
        for (const r of recipients) {
          if (r.email) {
            this.emailNotificationService
              .sendEmailNotification({
                to: r.email,
                subject: `[Pengumuman SIMASMUH] ${created.title}`,
                title: created.title,
                category: 'PENGUMUMAN',
                badgeLabel: created.type || 'PENGUMUMAN RESMI',
                recipientName: r.name,
                contentText: cleanContent,
                metaDetails: [
                  { label: 'Kategori', value: created.type || 'Informasi Umum' },
                  { label: 'Ditujukan Untuk', value: created.target },
                  { label: 'Diterbitkan Oleh', value: created.author?.name || 'Pihak Sekolah' },
                ],
                actionUrl: `${process.env.FRONTEND_URL || 'https://simasmuh.razagopo.my.id'}/informasi/pengumuman`,
                actionText: 'Lihat Pengumuman',
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});

    return created;
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
