import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { IzinKeluarService } from '../izin-keluar/izin-keluar.service';
import { WhatsAppService } from '../../communication/whatsapp/whatsapp.service';

@Injectable()
export class DailyAttendancesService {
  constructor(
    private prisma: PrismaService,
    private izinKeluarService: IzinKeluarService,
    private whatsAppService: WhatsAppService,
  ) {}

  getQrToken() {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const hour = today.getHours().toString().padStart(2, '0');
    const min = today.getMinutes().toString().padStart(2, '0');
    return { token: `SIAKAD-QR-${dateStr}-${hour}${min}` };
  }

  private getTimeString(date: Date) {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  async scanQr(userId: string, token: string) {
    if (!userId) throw new BadRequestException('User ID tidak ditemukan');

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const hour = today.getHours().toString().padStart(2, '0');
    const min = today.getMinutes().toString().padStart(2, '0');

    // Allow previous minute to account for network latency
    const prevDate = new Date(today.getTime() - 60000);
    const prevDateStr = prevDate.toISOString().split('T')[0];
    const prevHour = prevDate.getHours().toString().padStart(2, '0');
    const prevMin = prevDate.getMinutes().toString().padStart(2, '0');

    const expectedToken1 = `SIAKAD-QR-${dateStr}-${hour}${min}`;
    const expectedToken2 = `SIAKAD-QR-${prevDateStr}-${prevHour}${prevMin}`;

    if (token !== expectedToken1 && token !== expectedToken2) {
      throw new BadRequestException(
        'QR Code tidak valid atau sudah kadaluarsa',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: { include: { class: true } },
        teacherProfile: true,
      },
    });

    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await this.prisma.dailyAttendance.findFirst({
      where: {
        userId,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    const timeString = this.getTimeString(today);
    const dateFormatted = today.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (!existing) {
      // First scan of the day = Check-in
      const record = await this.prisma.dailyAttendance.create({
        data: {
          date: startOfDay,
          time: timeString,
          checkInTime: timeString,
          status: 'HADIR',
          userId,
        },
      });

      // Kirim Notifikasi WhatsApp Otomatis
      if (user) {
        this.whatsAppService.sendAttendanceNotification({
          studentOrUserName: user.name,
          role: user.role,
          phone: user.phone || user.teacherProfile?.phone || user.student?.phone || undefined,
          parentPhone: user.student?.parentPhone || undefined,
          className: user.student?.class?.name || undefined,
          scanType: 'MASUK',
          time: timeString,
          date: dateFormatted,
          method: 'Scan QR Code SIMASMUH',
        }).catch(() => {});
      }

      return {
        ...record,
        scanType: 'MASUK',
        message: `Absen Masuk berhasil dicatat pukul ${timeString}`,
      };
    }

    // Second scan = Check-out
    if (existing.checkOutTime) {
      throw new BadRequestException(
        'Anda sudah melakukan absen masuk dan absen pulang hari ini',
      );
    }

    if (existing.checkInTime) {
      const [inHour, inMin] = existing.checkInTime.split(':').map(Number);
      const [outHour, outMin] = timeString.split(':').map(Number);

      const inTotalMins = inHour * 60 + inMin;
      const outTotalMins = outHour * 60 + outMin;

      if (outTotalMins - inTotalMins < 5) {
        throw new BadRequestException(
          'Terlalu cepat. Tunggu setidaknya 5 menit setelah absen masuk untuk absen pulang.',
        );
      }
    }

    const updated = await this.prisma.dailyAttendance.update({
      where: { id: existing.id },
      data: { checkOutTime: timeString },
    });

    // Kirim Notifikasi WhatsApp Otomatis
    if (user) {
      this.whatsAppService.sendAttendanceNotification({
        studentOrUserName: user.name,
        role: user.role,
        phone: user.phone || user.teacherProfile?.phone || user.student?.phone || undefined,
        parentPhone: user.student?.parentPhone || undefined,
        className: user.student?.class?.name || undefined,
        scanType: 'PULANG',
        time: timeString,
        date: dateFormatted,
        method: 'Scan QR Code SIMASMUH',
      }).catch(() => {});
    }

    return {
      ...updated,
      scanType: 'PULANG',
      message: `Absen Pulang berhasil dicatat pukul ${timeString}`,
    };
  }

  async getTodayAttendance(userId?: string) {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    if (!userId || userId.trim() === '') {
      return this.prisma.dailyAttendance.findMany({
        where: { date: { gte: startOfDay, lte: endOfDay } },
        include: { user: true },
      });
    }

    return this.prisma.dailyAttendance.findFirst({
      where: {
        userId,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });
  }

  async getHistory(userId: string) {
    if (!userId) return [];

    return this.prisma.dailyAttendance.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 30,
    });
  }

  async getStaffAttendanceSummary(dateStr?: string) {
    let targetDate = new Date();
    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        targetDate = parsed;
      }
    }
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Ambil semua izin keluar yang DISETUJUI pada hari tersebut
    const approvedIzin =
      await this.izinKeluarService.getTodayApprovedAll(dateStr);
    // Buat map userId -> data izin untuk lookup O(1)
    const izinMap = new Map<
      string,
      { waktuKeluar: string; estimasiKembali?: string; alasan: string }
    >();
    for (const izin of approvedIzin) {
      izinMap.set(izin.userId, izin);
    }

    // Get all staff & teachers (not SISWA)
    const staffList = await this.prisma.user.findMany({
      where: { role: { not: 'SISWA' } },
      select: {
        id: true,
        name: true,
        dailyAttendances: {
          where: { date: { gte: startOfDay, lte: endOfDay } },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    // Format the result cleanly
    return staffList.map((user) => {
      const attendance = user.dailyAttendances?.[0] || null;
      const izin = izinMap.get(user.id) || null;

      let status = 'Belum Hadir';
      let checkIn = '-';
      let checkOut = '-';
      let keterangan = 'Belum melakukan presensi hari ini';

      if (attendance) {
        status = attendance.status; // HADIR
        checkIn = attendance.checkInTime || attendance.time || '-';
        checkOut = attendance.checkOutTime || '-';

        if (checkOut !== '-') {
          keterangan = `Hadir & Pulang (${checkIn} – ${checkOut})`;
        } else if (checkIn !== '-') {
          keterangan = `Sudah Hadir (Masuk: ${checkIn})`;
        }
      }

      // Jika ada izin keluar yang disetujui, tambahkan ke keterangan
      // dan override status menjadi IZIN KELUAR jika belum hadir
      if (izin) {
        const rentangIzin = izin.estimasiKembali
          ? `${izin.waktuKeluar}–${izin.estimasiKembali}`
          : `sejak ${izin.waktuKeluar}`;

        if (attendance) {
          // Sudah hadir, tapi juga ada izin keluar
          keterangan = `${keterangan} | Izin Keluar (${rentangIzin}): ${izin.alasan}`;
          status = 'HADIR + IZIN KELUAR';
        } else {
          // Belum hadir, izin keluar yang disetujui
          status = 'IZIN KELUAR';
          keterangan = `Izin Keluar (${rentangIzin}): ${izin.alasan}`;
        }
      }

      return {
        id: user.id,
        name: user.name,
        status,
        checkIn,
        checkOut,
        keterangan,
        hasIzin: !!izin,
        date: startOfDay.toISOString().split('T')[0],
      };
    });
  }

  async getMonthlyLog(userId: string, year: number, month: number) {
    if (!userId) return [];

    let targetUserId = userId;
    const parentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        parentProfile: {
          include: {
            students: {
              include: {
                student: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (parentUser?.role === 'WALI_MURID' || parentUser?.parentProfile?.students?.length) {
      const firstStudent = parentUser?.parentProfile?.students?.[0]?.student;
      if (firstStudent?.userId) {
        targetUserId = firstStudent.userId;
      }
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    const attendances = await this.prisma.dailyAttendance.findMany({
      where: {
        userId: targetUserId,
        date: { gte: startDate, lte: endDate },
      },
    });

    const izinKeluarList = await this.prisma.izinKeluar.findMany({
      where: {
        userId: targetUserId,
        status: 'DISETUJUI',
        date: { gte: startDate, lte: endDate },
      },
    });

    const result: any[] = [];
    const daysInMonth = endDate.getDate();
    const dayNames = [
      'Minggu',
      'Senin',
      'Selasa',
      'Rabu',
      'Kamis',
      'Jumat',
      'Sabtu',
    ];

    for (let d = 1; d <= daysInMonth; d++) {
      const currentDate = new Date(year, month - 1, d);
      const dayOfWeek = currentDate.getDay();

      // Only include weekdays (1 to 6)
      if (dayOfWeek >= 1 && dayOfWeek <= 6) {
        const att = attendances.find((a) => new Date(a.date).getDate() === d);
        const izin = izinKeluarList.find(
          (i) => new Date(i.date).getDate() === d,
        );

        let checkIn = '-';
        let checkOut = '-';
        let keterangan = '-';
        const estimasiPenghasilan = 0; // Placeholder for finance feature

        if (att) {
          checkIn = att.checkInTime || att.time || '-';
          checkOut = att.checkOutTime || '-';

          if (att.status !== 'HADIR') {
            keterangan = att.status;
          }
        }

        if (izin) {
          const rentangIzin = izin.estimasiKembali
            ? `${izin.waktuKeluar}-${izin.estimasiKembali}`
            : `sejak ${izin.waktuKeluar}`;

          if (keterangan === '-') {
            keterangan = `Izin Keluar (${rentangIzin}): ${izin.alasan}`;
          } else {
            keterangan += ` | Izin Keluar (${rentangIzin}): ${izin.alasan}`;
          }
        }

        result.push({
          date: currentDate.toISOString().split('T')[0],
          dayName: dayNames[dayOfWeek],
          dayNumber: d,
          checkIn,
          checkOut,
          keterangan,
          estimasiPenghasilan,
        });
      }
    }

    return result;
  }
}
