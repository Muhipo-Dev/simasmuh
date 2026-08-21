import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WhatsAppService } from '../../communication/whatsapp/whatsapp.service';

@Injectable()
export class IzinKeluarService {
  constructor(
    private prisma: PrismaService,
    private whatsAppService: WhatsAppService,
  ) {}

  // Ajukan izin presensi (Pegawai, Guru, Siswa, atau Orang Tua mewakili Siswa)
  async create(
    userId: string,
    data: {
      date: string;
      waktuKeluar: string;
      estimasiKembali?: string;
      alasan: string;
      targetUserId?: string; // Jika wali murid/admin mengajukan untuk siswa tertentu
    },
  ) {
    const finalUserId = data.targetUserId || userId;
    const dateObj = new Date(data.date);
    dateObj.setHours(0, 0, 0, 0);

    const izin = await this.prisma.izinKeluar.create({
      data: {
        date: dateObj,
        waktuKeluar: data.waktuKeluar,
        estimasiKembali: data.estimasiKembali || null,
        alasan: data.alasan,
        status: 'MENUNGGU',
        userId: finalUserId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            subRole: true,
            phone: true,
            student: { select: { id: true, name: true, nis: true, nisn: true, phone: true, parentPhone: true, class: { select: { name: true } } } },
            teacherProfile: { select: { phone: true, nip: true } },
          },
        },
      },
    });

    return izin;
  }

  // Lihat izin saya sendiri atau anak saya (untuk siswa, guru, pegawai, wali murid)
  async findMy(userId: string) {
    // Cek apakah user adalah wali murid yang memiliki siswa
    const parentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        parentProfile: {
          include: {
            students: {
              include: {
                student: {
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
    });

    const userIds = [userId];
    if (parentUser?.parentProfile?.students?.length) {
      parentUser.parentProfile.students.forEach((s) => {
        if (s.student?.userId && !userIds.includes(s.student.userId)) {
          userIds.push(s.student.userId);
        }
      });
    }

    return this.prisma.izinKeluar.findMany({
      where: { userId: { in: userIds } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            subRole: true,
            student: { select: { name: true, nis: true, class: { select: { name: true } } } },
          },
        },
      },
      orderBy: { date: 'desc' },
      take: 50,
    });
  }

  // Superadmin / Admin / Guru: lihat semua izin dengan filter opsional (tanggal, role/kategori SISWA vs PEGAWAI)
  async findAll(date?: string, category?: 'SISWA' | 'PEGAWAI' | 'ALL') {
    const where: any = {};
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }

    if (category === 'SISWA') {
      where.user = { role: 'SISWA' };
    } else if (category === 'PEGAWAI') {
      where.user = { role: { not: 'SISWA' } };
    }

    return this.prisma.izinKeluar.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            subRole: true,
            phone: true,
            student: {
              select: {
                id: true,
                name: true,
                nis: true,
                nisn: true,
                phone: true,
                parentPhone: true,
                class: { select: { name: true } },
              },
            },
            teacherProfile: {
              select: {
                nip: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Superadmin / Admin: setujui izin dan otomatis sinkronkan catatan kehadiran & notifikasi WA
  async approve(id: string, catatanAdmin?: string) {
    const izin = await this.prisma.izinKeluar.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            student: { include: { class: true } },
            teacherProfile: true,
          },
        },
      },
    });

    if (!izin) throw new NotFoundException('Izin tidak ditemukan');

    const updated = await this.prisma.izinKeluar.update({
      where: { id },
      data: { status: 'DISETUJUI', catatanAdmin: catatanAdmin || null },
      include: {
        user: {
          select: {
            name: true,
            role: true,
            phone: true,
            student: { include: { class: true } },
            teacherProfile: true,
          },
        },
      },
    });

    // Otomatis sinkronkan status presensi harian di DailyAttendance jika belum ada rekaman hadir
    try {
      const startOfDay = new Date(izin.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(izin.date);
      endOfDay.setHours(23, 59, 59, 999);

      const existingDaily = await this.prisma.dailyAttendance.findFirst({
        where: {
          userId: izin.userId,
          date: { gte: startOfDay, lte: endOfDay },
        },
      });

      const rentang = izin.estimasiKembali
        ? `${izin.waktuKeluar} - ${izin.estimasiKembali}`
        : `sejak ${izin.waktuKeluar}`;

      if (!existingDaily) {
        await this.prisma.dailyAttendance.create({
          data: {
            date: startOfDay,
            time: izin.waktuKeluar,
            checkInTime: izin.waktuKeluar,
            status: 'IZIN',
            userId: izin.userId,
          },
        });
      }
    } catch (e) {
      // Ignore conflict error
    }

    // Kirim notifikasi WhatsApp pemberitahuan persetujuan izin
    if (izin.user) {
      const targetUser = izin.user;
      const dateFormatted = new Date(izin.date).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      this.whatsAppService
        .sendAttendanceNotification({
          studentOrUserName: targetUser.name,
          role: targetUser.role,
          phone: targetUser.phone || targetUser.teacherProfile?.phone || targetUser.student?.phone || undefined,
          parentPhone: targetUser.student?.parentPhone || undefined,
          className: targetUser.student?.class?.name || undefined,
          scanType: 'IZIN',
          time: izin.waktuKeluar,
          date: dateFormatted,
          method: 'Pengajuan Izin SIMASMUH (Disetujui)',
          notes: `Alasan: ${izin.alasan}${catatanAdmin ? ` | Catatan: ${catatanAdmin}` : ''}`,
        })
        .catch(() => {});
    }

    return updated;
  }

  // Superadmin / Admin: tolak izin
  async reject(id: string, catatanAdmin?: string) {
    const izin = await this.prisma.izinKeluar.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            student: { include: { class: true } },
            teacherProfile: true,
          },
        },
      },
    });

    if (!izin) throw new NotFoundException('Izin tidak ditemukan');

    const updated = await this.prisma.izinKeluar.update({
      where: { id },
      data: { status: 'DITOLAK', catatanAdmin: catatanAdmin || null },
      include: { user: { select: { name: true } } },
    });

    // Kirim notifikasi WhatsApp penolakan izin
    if (izin.user) {
      const targetUser = izin.user;
      const dateFormatted = new Date(izin.date).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const recipientPhones = [
        targetUser.phone,
        targetUser.teacherProfile?.phone,
        targetUser.student?.phone,
        targetUser.student?.parentPhone,
      ].filter(Boolean) as string[];

      for (const phone of recipientPhones) {
        this.whatsAppService
          .sendDirectMessage({
            to: phone,
            recipientName: targetUser.name,
            recipientRole: targetUser.role,
            category: 'ABSENSI',
            title: `Status Izin: Ditolak - ${targetUser.name}`,
            message: `*PEMBERITAHUAN STATUS IZIN - SMA MUHAMMADIYAH 1 PONOROGO*\n❌ Status: *IZIN TIDAK DISETUJUI / DITOLAK*\n\nNama: *${targetUser.name}*\nTanggal: *${dateFormatted}*\nAlasan Pengajuan: ${izin.alasan}\nCatatan Admin: *${catatanAdmin || 'Izin tidak dapat disetujui oleh pihak sekolah.'}*\n\nSilakan konfirmasi ke pihak tata usaha / kesiswaan jika ada pertanyaan lebih lanjut.`,
          })
          .catch(() => {});
      }
    }

    return updated;
  }

  // Hapus izin (pemilik atau admin)
  async remove(id: string, userId: string, role: string) {
    const izin = await this.prisma.izinKeluar.findUnique({ where: { id } });
    if (!izin) throw new NotFoundException('Izin tidak ditemukan');
    const isSuperAdmin = role === 'ADMIN_IT' || role === 'SUPERADMIN';
    if (izin.userId !== userId && !isSuperAdmin) {
      throw new ForbiddenException('Anda tidak berhak menghapus izin ini');
    }
    return this.prisma.izinKeluar.delete({ where: { id } });
  }

  // Ambil izin yang DISETUJUI hari ini per userId (untuk integrasi presensi)
  async getTodayApprovedByUser(userId: string) {
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return this.prisma.izinKeluar.findFirst({
      where: {
        userId,
        status: 'DISETUJUI',
        date: { gte: start, lte: end },
      },
    });
  }

  // Ambil semua izin DISETUJUI hari ini (untuk presensi publik)
  async getTodayApprovedAll(dateStr?: string): Promise<any[]> {
    let target = new Date();
    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) target = parsed;
    }
    const start = new Date(target);
    start.setHours(0, 0, 0, 0);
    const end = new Date(target);
    end.setHours(23, 59, 59, 999);
    return this.prisma.izinKeluar.findMany({
      where: {
        status: 'DISETUJUI',
        date: { gte: start, lte: end },
      },
      select: {
        userId: true,
        waktuKeluar: true,
        estimasiKembali: true,
        alasan: true,
        user: {
          select: {
            name: true,
            role: true,
            student: { select: { class: { select: { name: true } } } },
          },
        },
      },
    });
  }
}
