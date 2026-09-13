import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { EmailNotificationService } from '../notifications/email.service';

@Injectable()
export class SystemAnnouncementsService {
  constructor(
    private prisma: PrismaService,
    private emailNotificationService: EmailNotificationService,
  ) {}

  async create(data: {
    title: string;
    content: string;
    target?: string;
    authorId: string;
    type?: string;
    image?: string;
    isUrgent?: boolean;
  }) {
    const payload: any = {
      title: data.title,
      content: data.content,
      target: data.target || 'SEMUA',
      authorId: data.authorId,
      type: data.type || 'PENGUMUMAN',
      image: data.image || null,
      isUrgent: data.isUrgent === true,
    };

    const created = await this.prisma.systemAnnouncement.create({
      data: payload,
      include: {
        author: { select: { name: true, role: true } },
      },
    });

    // Kirim Notifikasi Siaran Informasi Sistem via Email ke penerima target
    const targetRole = created.target || 'SEMUA';
    const whereRole: any = { email: { contains: '@' } };
    if (targetRole !== 'SEMUA' && targetRole !== 'ALL' && targetRole !== 'PUBLIC') {
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
                subject: `[Sistem SIMASMUH] ${created.title}`,
                title: created.title,
                category: 'PENGUMUMAN',
                badgeLabel: created.type || 'PENGUMUMAN SISTEM',
                recipientName: r.name,
                contentText: cleanContent,
                metaDetails: [
                  { label: 'Kategori', value: created.type || 'Informasi Sistem' },
                  { label: 'Ditujukan Untuk', value: created.target },
                  { label: 'Diterbitkan Oleh', value: created.author?.name || 'Admin Sistem' },
                ],
                actionUrl: `${process.env.FRONTEND_URL || 'https://simasmuh.razagopo.my.id'}/dashboard`,
                actionText: 'Lihat Dashboard',
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

    return this.prisma.systemAnnouncement.findMany({
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
    return this.prisma.systemAnnouncement.findUnique({
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

    if (payload.image !== undefined && !payload.image) {
      payload.image = null;
    }

    return this.prisma.systemAnnouncement.update({
      where: { id },
      data: payload,
    });
  }

  async remove(id: string) {
    return this.prisma.systemAnnouncement.delete({
      where: { id },
    });
  }
}
