import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { IzinKeluarService } from '../izin-keluar/izin-keluar.service';
import { EmailNotificationService } from '../../communication/notifications/email.service';

@Injectable()
export class DailyAttendancesService {
  constructor(
    private prisma: PrismaService,
    private izinKeluarService: IzinKeluarService,
    private emailNotificationService: EmailNotificationService,
  ) {}

  getQrToken() {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const hour = today.getHours().toString().padStart(2, '0');
    const min = today.getMinutes().toString().padStart(2, '0');
    return { token: `SIAKAD-QR-${dateStr}-${hour}${min}` };
  }

  private getTimeString(date: Date) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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

      // Kirim Notifikasi Email Otomatis (Gratis & Bebas Blokir)
      if (user) {
        // Ke Akun User jika ada email
        if (user.email && user.email.includes('@')) {
          this.emailNotificationService
            .sendAttendanceNotification({
              toEmail: user.email,
              studentOrUserName: user.name,
              status: 'HADIR (MASUK)',
              time: timeString,
              dateFormatted,
              role: user.role,
              type: 'MASUK',
            })
            .catch(() => {});
        }

        // Ke Orang Tua / Wali jika siswa
        if (user.student?.id) {
          this.prisma.parentStudent
            .findMany({
              where: { studentId: user.student.id },
              include: { parent: { include: { user: true } } },
            })
            .then((parentRels) => {
              for (const rel of parentRels) {
                if (rel.parent?.user?.email && rel.parent.user.email.includes('@')) {
                  this.emailNotificationService
                    .sendAttendanceNotification({
                      toEmail: rel.parent.user.email,
                      studentOrUserName: user.name,
                      status: 'HADIR (MASUK)',
                      time: timeString,
                      dateFormatted,
                      role: 'SISWA',
                      type: 'MASUK',
                    })
                    .catch(() => {});
                }
              }
            })
            .catch(() => {});
        }
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

    // Kirim Notifikasi Email Otomatis Pulang
    if (user) {
      if (user.email && user.email.includes('@')) {
        this.emailNotificationService
          .sendAttendanceNotification({
            toEmail: user.email,
            studentOrUserName: user.name,
            status: 'PULANG',
            time: timeString,
            dateFormatted,
            role: user.role,
            type: 'PULANG',
          })
          .catch(() => {});
      }

      if (user.student?.id) {
        this.prisma.parentStudent
          .findMany({
            where: { studentId: user.student.id },
            include: { parent: { include: { user: true } } },
          })
          .then((parentRels) => {
            for (const rel of parentRels) {
              if (rel.parent?.user?.email && rel.parent.user.email.includes('@')) {
                this.emailNotificationService
                  .sendAttendanceNotification({
                    toEmail: rel.parent.user.email,
                    studentOrUserName: user.name,
                    status: 'PULANG',
                    time: timeString,
                    dateFormatted,
                    role: 'SISWA',
                    type: 'PULANG',
                  })
                  .catch(() => {});
              }
            }
          })
          .catch(() => {});
      }
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

    // Get all staff & teachers (not SISWA or WALI_MURID)
    const staffList = await this.prisma.user.findMany({
      where: { role: { notIn: ['SISWA', 'WALI_MURID'] } },
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

    if (
      parentUser?.role === 'WALI_MURID' ||
      parentUser?.parentProfile?.students?.length
    ) {
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
          // Parse tipe izin & bersihkan string alasan dari tag internal
          const rawAlasan = izin.alasan || '';
          const isDisp =
            rawAlasan.includes('[IZIN DISPENSASI]') ||
            rawAlasan.includes('[DISPENSASI');
          const isSakit = rawAlasan.includes('[IZIN SAKIT]');
          const isKeluarga = rawAlasan.includes('[IZIN KELUARGA]');

          const cleanAlasan = rawAlasan
            .replace(/\[IZIN [^\]]+\]\s*/g, '')
            .replace(/\[DISPENSASI[^\]]*\]\s*/g, '')
            .replace(/\n?\[LAMPIRAN_SURAT\]:[^\n]*/g, '')
            .trim();

          let labelKategori = 'Izin Resmi';
          if (isDisp) {
            labelKategori = 'Dispensasi Resmi Sekolah';
          } else if (isSakit) {
            labelKategori = 'Izin Sakit (Wali Murid)';
          } else if (isKeluarga) {
            labelKategori = 'Izin Keperluan Keluarga';
          }

          const rentangIzin = isDisp
            ? `(Jam: ${izin.waktuKeluar} - ${izin.estimasiKembali || 'Selesai'})`
            : izin.estimasiKembali?.startsWith('s/d ')
              ? `(${izin.estimasiKembali})`
              : '(1 Hari)';

          const detailIzin = `${labelKategori} ${rentangIzin}: ${cleanAlasan}`;

          if (keterangan === '-' || keterangan === 'IZIN') {
            keterangan = detailIzin;
          } else {
            keterangan += ` | ${detailIzin}`;
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

  async getClassAttendanceSummary(classId: string, period: 'daily' | 'weekly' | 'monthly', dateStr?: string) {
    if (!classId) return [];

    let targetDate = new Date();
    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) targetDate = parsed;
    }

    let startDate = new Date(targetDate);
    let endDate = new Date(targetDate);

    if (period === 'daily') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'weekly') {
      // Senin - Sabtu pekan berjalan
      const day = targetDate.getDay(); // 0: Sun, 1: Mon, ...
      const diffToMon = day === 0 ? -6 : 1 - day;
      startDate.setDate(targetDate.getDate() + diffToMon);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 5);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'monthly') {
      startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    // Ambil semua siswa di kelas ini
    const students = await this.prisma.student.findMany({
      where: { classId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const studentUserIds: string[] = students
      .map((s) => s.user?.id || s.userId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    // Ambil seluruh log presensi siswa di rentang waktu
    const attendances = await this.prisma.dailyAttendance.findMany({
      where: {
        userId: { in: studentUserIds },
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    // Ambil seluruh izin siswa yang disetujui di rentang waktu
    const izinList = await this.prisma.izinKeluar.findMany({
      where: {
        userId: { in: studentUserIds },
        status: 'DISETUJUI',
        date: { gte: startDate, lte: endDate },
      },
    });

    return students.map((std) => {
      const uId = std.user?.id || std.userId;
      const stdAtts = attendances.filter(a => a.userId === uId);
      const stdIzins = izinList.filter(i => i.userId === uId);

      const totalHadir = stdAtts.filter(a => a.status === 'HADIR').length;
      const totalIzin = stdIzins.length + stdAtts.filter(a => a.status === 'IZIN').length;
      const totalTerlambat = stdAtts.filter(a => {
        if (!a.checkInTime) return false;
        const [h, m] = a.checkInTime.split(':').map(Number);
        return (h * 60 + m) > (7 * 60); // Masuk lewat dari pukul 07:00
      }).length;

      // Ambil rekaman terbaru / hari target
      const todayAtt = stdAtts.find(a => {
        const d = new Date(a.date);
        return d.toDateString() === targetDate.toDateString();
      });
      const todayIzin = stdIzins.find(i => {
        const d = new Date(i.date);
        return d.toDateString() === targetDate.toDateString();
      });

      let statusHariIni = 'BELUM HADIR';
      let checkInHariIni = '-';
      let checkOutHariIni = '-';
      let keteranganHariIni = 'Belum scan presensi';

      if (todayAtt) {
        statusHariIni = todayAtt.status;
        checkInHariIni = todayAtt.checkInTime || todayAtt.time || '-';
        checkOutHariIni = todayAtt.checkOutTime || '-';
        if (checkOutHariIni !== '-') {
          keteranganHariIni = `Hadir & Pulang (${checkInHariIni} – ${checkOutHariIni})`;
        } else if (checkInHariIni !== '-') {
          keteranganHariIni = `Hadir Masuk (${checkInHariIni})`;
        }
      }

      if (todayIzin) {
        statusHariIni = 'IZIN';
        keteranganHariIni = `Izin Disetujui: ${todayIzin.alasan}`;
      }

      return {
        studentId: std.id,
        userId: uId,
        nis: std.nis,
        nisn: std.nisn,
        name: std.name,
        gender: std.gender,
        program: std.program,
        statusHariIni,
        checkInHariIni,
        checkOutHariIni,
        keteranganHariIni,
        summary: {
          hadir: totalHadir,
          izin: totalIzin,
          terlambat: totalTerlambat,
        },
        logs: stdAtts.map(a => ({
          date: a.date.toISOString().split('T')[0],
          time: a.time,
          checkIn: a.checkInTime,
          checkOut: a.checkOutTime,
          status: a.status,
        })),
        izins: stdIzins.map(i => ({
          id: i.id,
          date: i.date.toISOString().split('T')[0],
          alasan: i.alasan,
          waktu: i.waktuKeluar,
          status: i.status,
        })),
      };
    });
  }
}

