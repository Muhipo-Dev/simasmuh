import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { EmailNotificationService } from '../notifications/email.service';
import * as crypto from 'crypto';

@Injectable()
export class AnnouncementsService {
  constructor(
    private prisma: PrismaService,
    private emailNotificationService: EmailNotificationService,
  ) {}

  private generateQrToken(): string {
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `KEG-${timestamp}-${randomHex}`;
  }

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

    // Otomatis sinkronisasi ke Modul Kegiatan Sekolah Admin TU jika type adalah 'AGENDA' atau memiliki eventDate
    if (created.type === 'AGENDA' || created.eventDate) {
      try {
        const currentYear = new Date().getFullYear();
        const count = await this.prisma.kegiatanSekolah.count();
        const nomorKegiatan = `KEG-WEB-${currentYear}-${String(count + 1).padStart(3, '0')}`;
        const qrCodeToken = this.generateQrToken();
        const eventDate = created.eventDate ? new Date(created.eventDate) : new Date();

        await this.prisma.kegiatanSekolah.create({
          data: {
            nomorKegiatan,
            namaKegiatan: created.title,
            kategori: 'KEGIATAN_LAIN',
            sifatKegiatan: 'TERJADWAL',
            tanggal: eventDate,
            waktuMulai: '07:00',
            waktuSelesai: '12:00',
            tempat: 'SMA Muhammadiyah 1 Ponorogo',
            penanggungJawab: created.author?.name ? `${created.author.name} (Admin Web / Humas)` : 'Admin Web / Humas',
            ringkasanMateri: created.content ? created.content.replace(/<[^>]*>?/gm, '') : null,
            dokumentasiUrl: created.image || null,
            qrCodeToken,
            status: 'DIBUKA',
          },
        });
      } catch (err) {
        console.error('Gagal menyinkronkan Agenda Web ke Kegiatan Sekolah TU:', err);
      }
    }

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
                actionUrl: '/informasi/pengumuman',
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
    const oldAnnouncement = await this.prisma.announcement.findUnique({ where: { id } });

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

    const updated = await this.prisma.announcement.update({
      where: { id },
      data: payload,
      include: {
        author: { select: { name: true } },
      },
    });

    // Sinkronisasi pembaruan ke Kegiatan Sekolah TU
    if (updated.type === 'AGENDA' || updated.eventDate) {
      try {
        const existingKegiatan = await this.prisma.kegiatanSekolah.findFirst({
          where: {
            OR: [
              { namaKegiatan: oldAnnouncement?.title || updated.title },
              { ringkasanMateri: oldAnnouncement?.content ? oldAnnouncement.content.replace(/<[^>]*>?/gm, '') : undefined },
            ],
          },
        });

        if (existingKegiatan) {
          await this.prisma.kegiatanSekolah.update({
            where: { id: existingKegiatan.id },
            data: {
              namaKegiatan: updated.title,
              tanggal: updated.eventDate ? new Date(updated.eventDate) : existingKegiatan.tanggal,
              ringkasanMateri: updated.content ? updated.content.replace(/<[^>]*>?/gm, '') : existingKegiatan.ringkasanMateri,
              dokumentasiUrl: updated.image || existingKegiatan.dokumentasiUrl,
            },
          });
        } else {
          const currentYear = new Date().getFullYear();
          const count = await this.prisma.kegiatanSekolah.count();
          const nomorKegiatan = `KEG-WEB-${currentYear}-${String(count + 1).padStart(3, '0')}`;
          const qrCodeToken = this.generateQrToken();
          await this.prisma.kegiatanSekolah.create({
            data: {
              nomorKegiatan,
              namaKegiatan: updated.title,
              kategori: 'KEGIATAN_LAIN',
              sifatKegiatan: 'TERJADWAL',
              tanggal: updated.eventDate ? new Date(updated.eventDate) : new Date(),
              waktuMulai: '07:00',
              waktuSelesai: '12:00',
              tempat: 'SMA Muhammadiyah 1 Ponorogo',
              penanggungJawab: updated.author?.name ? `${updated.author.name} (Admin Web / Humas)` : 'Admin Web / Humas',
              ringkasanMateri: updated.content ? updated.content.replace(/<[^>]*>?/gm, '') : null,
              dokumentasiUrl: updated.image || null,
              qrCodeToken,
              status: 'DIBUKA',
            },
          });
        }
      } catch (err) {
        console.error('Gagal menyinkronkan pembaruan Agenda Web ke Kegiatan Sekolah:', err);
      }
    }

    return updated;
  }

  async remove(id: string) {
    const announcement = await this.prisma.announcement.findUnique({ where: { id } });
    if (announcement && (announcement.type === 'AGENDA' || announcement.eventDate)) {
      try {
        await this.prisma.kegiatanSekolah.deleteMany({
          where: {
            namaKegiatan: announcement.title,
          },
        });
      } catch (err) {
        console.error('Gagal menghapus sinkronisasi KegiatanSekolah:', err);
      }
    }

    return this.prisma.announcement.delete({
      where: { id },
    });
  }
}
