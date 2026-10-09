import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { EmailNotificationService } from './email.service';
import {
  NotificationsService,
  NotificationType,
  NotificationPriority,
  NotificationChannel,
} from './notifications.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ScheduleNotificationsService {
  private readonly logger = new Logger(ScheduleNotificationsService.name);

  // Set cache in memory untuk mencegah duplicate sending di hari yang sama
  private sentDailySummaries = new Set<string>(); // key: `${YYYY-MM-DD}_student_${studentId}`
  private sentUpcomingReminders = new Set<string>(); // key: `${YYYY-MM-DD}_schedule_${scheduleId}_student_${studentId}`

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private emailNotificationService: EmailNotificationService,
  ) {}

  /**
   * Helper konversi nama hari ke Indonesia
   */
  private getDayNameIndo(dayNumber: number): string {
    const days: Record<number, string> = {
      1: 'Senin',
      2: 'Selasa',
      3: 'Rabu',
      4: 'Kamis',
      5: 'Jumat',
      6: 'Sabtu',
      7: 'Minggu',
    };
    return days[dayNumber] || 'Hari Ini';
  }

  /**
   * Helper parse string 'HH:mm' atau 'HH.mm' menjadi total menit sejak 00:00
   */
  private parseTimeToMinutes(timeStr?: string | null): number | null {
    if (!timeStr) return null;
    const clean = timeStr.trim().replace('.', ':');
    const parts = clean.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  /**
   * Helper format waktu WIB saat ini
   */
  private getWibDate(): {
    dateObj: Date;
    dateFormatted: string;
    dayOfWeek: number; // 1 (Senin) .. 7 (Minggu)
    currentMinutes: number;
    todayKey: string;
  } {
    // WIB adalah UTC+7
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const wibDate = new Date(utcTime + 7 * 3600000);

    const year = wibDate.getFullYear();
    const month = String(wibDate.getMonth() + 1).padStart(2, '0');
    const date = String(wibDate.getDate()).padStart(2, '0');
    const todayKey = `${year}-${month}-${date}`;

    // JS getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
    const jsDay = wibDate.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay; // 1: Senin .. 5: Jumat, 6: Sabtu, 7: Minggu

    const currentMinutes = wibDate.getHours() * 60 + wibDate.getMinutes();

    const dateFormatted = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }).format(wibDate);

    return {
      dateObj: wibDate,
      dateFormatted,
      dayOfWeek,
      currentMinutes,
      todayKey,
    };
  }

  /**
   * CRON: Pengiriman Notifikasi Ringkasan Jadwal Pelajaran Hari Ini ke Email Siswa
   * Berjalan otomatis 1x sehari setiap pagi pukul 06:00 WIB pada hari sekolah aktif (Senin s.d. Jumat)
   */
  @Cron('0 6 * * 1-5')
  async handleDailyScheduleMorningSummaryCron() {
    this.logger.log('[CRON] Menjalankan pengiriman ringkasan jadwal pelajaran hari ini pukul 06:00 WIB...');
    await this.sendDailyScheduleSummaries();
    await this.sendTeacherDailyScheduleSummaries();
  }

  /**
   * CRON: Pengingat 10 Menit Sebelum Mata Pelajaran Dimulai
   * Berjalan otomatis setiap 5 menit pada jam aktif sekolah (06:45 - 16:00 WIB) Senin s.d. Jumat
   */
  @Cron('*/5 7-16 * * 1-5')
  async handleUpcomingLessonReminderCron() {
    await this.checkAndSendUpcomingLessonReminders();
  }

  /**
   * Membersihkan memori cache key harian setiap pergantian hari pukul 00:05 WIB
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  handleCleanupCache() {
    this.sentDailySummaries.clear();
    this.sentUpcomingReminders.clear();
    this.logger.log('[CACHE] Cache notifikasi jadwal harian telah dibersihkan untuk hari baru.');
  }

  /**
   * Fungsi Eksekusi: Kirim Ringkasan Jadwal Pelajaran Hari Ini ke Seluruh Siswa
   */
  async sendDailyScheduleSummaries(targetClassId?: string, targetStudentId?: string) {
    const { dayOfWeek, dateFormatted, todayKey } = this.getWibDate();

    // Hanya untuk hari kerja (Senin s.d. Jumat: 1..5)
    if (dayOfWeek < 1 || dayOfWeek > 5) {
      return {
        success: true,
        message: 'Hari ini bukan hari efektif sekolah (Senin - Jumat).',
        dispatchedCount: 0,
      };
    }

    const dayName = this.getDayNameIndo(dayOfWeek);

    // Ambil seluruh jadwal hari ini
    const scheduleWhere: any = {
      dayOfWeek,
    };
    if (targetClassId) {
      scheduleWhere.classId = targetClassId;
    }

    const todaySchedules = await this.prisma.schedule.findMany({
      where: scheduleWhere,
      include: {
        class: true,
        subject: true,
        teacher: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    if (todaySchedules.length === 0) {
      this.logger.log(`Tidak ada jadwal pelajaran terdaftar untuk hari ${dayName} (${dateFormatted}).`);
      return {
        success: true,
        message: `Tidak ada jadwal pelajaran hari ${dayName}.`,
        dispatchedCount: 0,
      };
    }

    // Kelompokkan jadwal berdasarkan classId
    const schedulesByClass = new Map<string, typeof todaySchedules>();
    for (const sch of todaySchedules) {
      if (!schedulesByClass.has(sch.classId)) {
        schedulesByClass.set(sch.classId, []);
      }
      schedulesByClass.get(sch.classId)!.push(sch);
    }

    // Ambil siswa aktif yang memiliki akun user & email
    const studentWhere: any = {
      isActive: true,
      classId: { in: Array.from(schedulesByClass.keys()) },
      user: {
        email: { contains: '@' },
      },
    };

    if (targetStudentId) {
      studentWhere.id = targetStudentId;
    }

    const students = await this.prisma.student.findMany({
      where: studentWhere,
      include: {
        user: true,
        class: true,
      },
    });

    let dispatchedCount = 0;

    for (const student of students) {
      if (!student.user?.email || !student.user.email.includes('@')) continue;

      // Cek preferensi notifikasi siswa jika ada (default true)
      const prefs = (student.user.notificationPreferences as any) || {};
      if (prefs.notifJadwalPelajaran === false) {
        continue;
      }

      const cacheKey = `${todayKey}_student_${student.id}`;
      if (!targetStudentId && this.sentDailySummaries.has(cacheKey)) {
        continue;
      }

      const classSchedules = schedulesByClass.get(student.classId) || [];
      if (classSchedules.length === 0) continue;

      // Buat Baris Tabel HTML Jadwal Hari Ini
      const scheduleRowsHtml = classSchedules
        .map((sch, idx) => {
          const teacherName = sch.teacher?.user?.name || sch.teacher?.nip || 'Guru Pengampu';
          return `
          <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="padding: 10px 12px; font-weight: 700; color: #1e40af; font-size: 13px; width: 25%; font-family: monospace;">
              ${sch.startTime} - ${sch.endTime}
            </td>
            <td style="padding: 10px 12px; font-weight: 700; color: #0f172a; font-size: 13px;">
              ${sch.subject?.name || 'Mata Pelajaran'}
            </td>
            <td style="padding: 10px 12px; color: #475569; font-size: 13px;">
              ${teacherName}
            </td>
          </tr>
        `;
        })
        .join('');

      const contentHtml = `
        <div style="margin-bottom: 16px;">
          <p style="margin: 0 0 10px 0; color: #334155; font-size: 14px; line-height: 1.6;">
            Berikut adalah susunan jadwal mata pelajaran dan guru pengampu Anda untuk hari <strong>${dayName}, ${dateFormatted}</strong> di kelas <strong>${student.class.name}</strong>:
          </p>
          <div style="overflow-x: auto; border: 1px solid #cbd5e1; border-radius: 8px; margin-top: 12px;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="background-color: #1e3a8a; color: #ffffff;">
                  <th style="padding: 10px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Waktu</th>
                  <th style="padding: 10px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Mata Pelajaran</th>
                  <th style="padding: 10px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Guru Pengampu</th>
                </tr>
              </thead>
              <tbody>
                ${scheduleRowsHtml}
              </tbody>
            </table>
          </div>
          <p style="margin: 14px 0 0 0; color: #64748b; font-size: 13px; line-height: 1.5;">
            💡 <em>Persiapkan buku pelajaran, modul ajar, dan tugas Anda sebelum pembelajaran dimulai. Selamat belajar dan semoga sukses!</em>
          </p>
        </div>
      `;

      // 1. Kirim Email Resmi SIMASMUH
      await this.emailNotificationService.sendEmailNotification({
        to: student.user.email,
        subject: `[Jadwal Hari Ini] ${dayName} - Kelas ${student.class.name}`,
        title: `Jadwal Pelajaran Hari ${dayName}`,
        category: 'AKADEMIK',
        badgeLabel: 'JADWAL HARI INI',
        recipientName: student.name,
        contentHtml,
        metaDetails: [
          { label: 'Nama Siswa', value: student.name },
          { label: 'Kelas', value: student.class.name },
          { label: 'Hari & Tanggal', value: `${dayName}, ${dateFormatted}` },
          { label: 'Total Sesi Pembelajaran', value: `${classSchedules.length} Sesi Mapel` },
        ],
        actionUrl: '/akademik/jadwal-pelajaran',
        actionText: 'Lihat Jadwal Lengkap di Dashboard',
      });

      // 2. Kirim Notifikasi In-App Dashboard
      await this.notificationsService.createNotification({
        userId: student.user.id,
        type: NotificationType.JADWAL_PELAJARAN_TODAY,
        title: `Jadwal Pelajaran Hari ${dayName}`,
        message: `Halo ${student.name}, Anda memiliki ${classSchedules.length} mata pelajaran terjadwal untuk hari ${dayName}. Siapkan perlengkapan belajar Anda!`,
        priority: NotificationPriority.NORMAL,
        channel: [NotificationChannel.IN_APP],
        data: {
          classId: student.classId,
          className: student.class.name,
          dateFormatted,
          dayName,
          totalLessons: classSchedules.length,
        },
      });

      this.sentDailySummaries.add(cacheKey);
      dispatchedCount++;
    }

    this.logger.log(`[JADWAL SUMMARY] Berhasil mengirim ringkasan jadwal hari ini ke ${dispatchedCount} siswa.`);

    return {
      success: true,
      message: `Berhasil mendistribusikan ringkasan jadwal hari ini ke ${dispatchedCount} siswa.`,
      dispatchedCount,
    };
  }

  /**
   * Fungsi Eksekusi: Cek & Kirim Reminder Jadwal Pelajaran Terdekat (10 Menit Sebelumnya)
   */
  async checkAndSendUpcomingLessonReminders() {
    const { dayOfWeek, currentMinutes, todayKey, dateFormatted } = this.getWibDate();

    // Hanya berjalan hari kerja (Senin..Jumat)
    if (dayOfWeek < 1 || dayOfWeek > 5) return;

    // Cari jadwal hari ini
    const todaySchedules = await this.prisma.schedule.findMany({
      where: { dayOfWeek },
      include: {
        class: true,
        subject: true,
        teacher: {
          include: {
            user: true,
          },
        },
      },
    });

    if (todaySchedules.length === 0) return;

    for (const sch of todaySchedules) {
      const startMinutes = this.parseTimeToMinutes(sch.startTime);
      if (startMinutes === null) continue;

      // Selisih waktu antara jam mulai mapel dan waktu sekarang (dalam menit)
      const diffMinutes = startMinutes - currentMinutes;

      // Cek apakah persis 10 menit sebelum mulai (toleransi 9..11 menit)
      if (diffMinutes >= 9 && diffMinutes <= 11) {
        await this.dispatchUpcomingScheduleReminder(sch, diffMinutes, todayKey, dateFormatted);
      }
    }
  }

  /**
   * Helper Dispatch Pengingat 10 Menit Sebelum Mapel Dimulai
   */
  private async dispatchUpcomingScheduleReminder(
    sch: any,
    diffMinutes: number,
    todayKey: string,
    dateFormatted: string,
  ) {
    const students = await this.prisma.student.findMany({
      where: {
        classId: sch.classId,
        isActive: true,
        user: {
          email: { contains: '@' },
        },
      },
      include: {
        user: true,
        class: true,
      },
    });

    const teacherName = sch.teacher?.user?.name || sch.teacher?.nip || 'Guru Pengampu';
    const mapelName = sch.subject?.name || 'Mata Pelajaran';

    for (const student of students) {
      if (!student.user?.email || !student.user.email.includes('@')) continue;

      // Cek preferensi notifikasi siswa
      const prefs = (student.user.notificationPreferences as any) || {};
      if (prefs.notifReminderJadwal === false) {
        continue;
      }

      const reminderKey = `${todayKey}_reminder_${sch.id}_student_${student.id}`;
      if (this.sentUpcomingReminders.has(reminderKey)) {
        continue;
      }

      const contentHtml = `
        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 18px; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="background-color: #2563eb; color: #ffffff; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">
              MULAI DALAM 10 MENIT
            </span>
          </div>
          <h3 style="margin: 6px 0 10px 0; color: #1e3a8a; font-size: 18px; font-weight: 800;">
            ${mapelName}
          </h3>
          <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.6;">
            Pelajaran <strong>${mapelName}</strong> untuk kelas <strong>${student.class.name}</strong> akan segera dimulai pada pukul <strong>${sch.startTime} - ${sch.endTime} WIB</strong>.
          </p>
        </div>
        <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
          📍 Mohon segera bersiap dan berada di ruang kelas dengan tertib sebelum guru pengampu memasuki kelas.
        </p>
      `;

      // 1. Email Reminder 10 Menit Sebelumnya
      await this.emailNotificationService.sendEmailNotification({
        to: student.user.email,
        subject: `[Pengingat 10 Menit] ${mapelName} (${sch.startTime}) - ${teacherName}`,
        title: `Pengingat Pelajaran: ${mapelName}`,
        category: 'AKADEMIK',
        badgeLabel: 'PENGINGAT 10 MENIT',
        recipientName: student.name,
        contentHtml,
        metaDetails: [
          { label: 'Mata Pelajaran', value: mapelName },
          { label: 'Jam Pelajaran', value: `${sch.startTime} - ${sch.endTime} WIB (Mulai 10 Menit Lagi)` },
          { label: 'Guru Pengampu', value: teacherName },
          { label: 'Kelas', value: student.class.name },
        ],
        actionUrl: '/akademik/jadwal-pelajaran',
        actionText: 'Buka Jadwal Pelajaran',
      });

      // 2. In-App Dashboard Notification
      await this.notificationsService.createNotification({
        userId: student.user.id,
        type: NotificationType.JADWAL_PELAJARAN_REMINDER,
        title: `Pengingat: ${mapelName} Mulai 10 Menit Lagi`,
        message: `Mata pelajaran ${mapelName} bersama ${teacherName} akan dimulai pukul ${sch.startTime} WIB. Segera bersiap di kelas!`,
        priority: NotificationPriority.HIGH,
        channel: [NotificationChannel.IN_APP],
        data: {
          scheduleId: sch.id,
          subjectName: mapelName,
          teacherName,
          startTime: sch.startTime,
          endTime: sch.endTime,
          className: student.class.name,
        },
      });

      this.sentUpcomingReminders.add(reminderKey);
      this.logger.log(`[REMINDER 10 MENIT] Terkirim ke siswa ${student.name} (${student.user.email}) untuk mapel ${mapelName} jam ${sch.startTime}`);
    }
  }

  /**
   * Fungsi Eksekusi: Kirim Ringkasan Jadwal Mengajar Hari Ini ke Seluruh Guru Pengampu
   */
  async sendTeacherDailyScheduleSummaries(targetTeacherId?: string) {
    const { dayOfWeek, dateFormatted, todayKey } = this.getWibDate();

    // Hanya untuk hari kerja (Senin s.d. Jumat: 1..5)
    if (dayOfWeek < 1 || dayOfWeek > 5) {
      return {
        success: true,
        message: 'Hari ini bukan hari efektif sekolah (Senin - Jumat).',
        dispatchedCount: 0,
      };
    }

    const dayName = this.getDayNameIndo(dayOfWeek);

    const scheduleWhere: any = { dayOfWeek };
    if (targetTeacherId) {
      scheduleWhere.teacherId = targetTeacherId;
    }

    const todaySchedules = await this.prisma.schedule.findMany({
      where: scheduleWhere,
      include: {
        class: true,
        subject: true,
        teacher: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    if (todaySchedules.length === 0) {
      return {
        success: true,
        message: `Tidak ada jadwal mengajar guru untuk hari ${dayName}.`,
        dispatchedCount: 0,
      };
    }

    // Kelompokkan jadwal berdasarkan teacherId
    const schedulesByTeacher = new Map<string, typeof todaySchedules>();
    for (const sch of todaySchedules) {
      if (!sch.teacherId || !sch.teacher) continue;
      if (!schedulesByTeacher.has(sch.teacherId)) {
        schedulesByTeacher.set(sch.teacherId, []);
      }
      schedulesByTeacher.get(sch.teacherId)!.push(sch);
    }

    let dispatchedCount = 0;

    for (const [teacherId, teacherSchedules] of schedulesByTeacher.entries()) {
      const teacher = teacherSchedules[0]?.teacher;
      const user = teacher?.user;

      if (!user || !user.email || !user.email.includes('@')) continue;

      // Cek preferensi notifikasi guru
      const prefs = (user.notificationPreferences as any) || {};
      if (prefs.notifJadwalMengajar === false) continue;

      const cacheKey = `${todayKey}_teacher_${teacherId}`;
      if (!targetTeacherId && this.sentDailySummaries.has(cacheKey)) continue;

      const scheduleRowsHtml = teacherSchedules
        .map((sch, idx) => `
          <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="padding: 10px 12px; font-weight: 700; color: #0f766e; font-size: 13px; width: 25%; font-family: monospace;">
              ${sch.startTime} - ${sch.endTime}
            </td>
            <td style="padding: 10px 12px; font-weight: 700; color: #1e3a8a; font-size: 13px;">
              ${sch.class?.name || '-'}
            </td>
            <td style="padding: 10px 12px; color: #0f172a; font-size: 13px;">
              ${sch.subject?.name || 'Mata Pelajaran'}
            </td>
            <td style="padding: 10px 12px; color: #64748b; font-size: 13px;">
              Ruang Kelas ${sch.class?.name || ''}
            </td>
          </tr>
        `)
        .join('');

      // 1. Kirim Email Notifikasi Jadwal Mengajar Guru
      await this.emailNotificationService.sendTeacherDailyScheduleNotification({
        toEmail: user.email,
        teacherName: user.name,
        dayName,
        dateFormatted,
        totalSessions: teacherSchedules.length,
        scheduleTableHtml: scheduleRowsHtml,
      });

      // 2. In-App Notification
      await this.notificationsService.createNotification({
        userId: user.id,
        type: NotificationType.JADWAL_PELAJARAN_TODAY,
        title: `Jadwal Mengajar Hari ${dayName}`,
        message: `Yth. ${user.name}, Anda memiliki ${teacherSchedules.length} sesi mengajar kelas hari ini (${dayName}, ${dateFormatted}).`,
        priority: NotificationPriority.NORMAL,
        channel: [NotificationChannel.IN_APP],
        data: {
          teacherId,
          totalSessions: teacherSchedules.length,
          dateFormatted,
          dayName,
        },
      });

      this.sentDailySummaries.add(cacheKey);
      dispatchedCount++;
    }

    this.logger.log(`[JADWAL MENGAJAR GURU] Berhasil mendistribusikan jadwal harian ke ${dispatchedCount} guru.`);
    return {
      success: true,
      message: `Berhasil mendistribusikan ringkasan jadwal mengajar ke ${dispatchedCount} guru.`,
      dispatchedCount,
    };
  }

  /**
   * Endpoint Manual Trigger / Test Broadcast Jadwal Pelajaran (Admin/Guru/TU)
   */
  async triggerTestScheduleNotification(studentUserId: string) {
    const student = await this.prisma.student.findFirst({
      where: { userId: studentUserId },
      include: {
        class: true,
        user: true,
      },
    });

    if (student) {
      return this.sendDailyScheduleSummaries(student.classId, student.id);
    }

    const teacher = await this.prisma.teacher.findFirst({
      where: { userId: studentUserId },
      include: { user: true },
    });

    if (teacher) {
      return this.sendTeacherDailyScheduleSummaries(teacher.id);
    }

    throw new Error('Data profil siswa/guru untuk akun ini tidak ditemukan.');
  }
}
