import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  NotificationsService,
  NotificationType,
  NotificationPriority,
  NotificationChannel,
} from './notifications.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VirusScannerUtil } from '../../core/utils/virus-scanner.util';

@Injectable()
export class PaymentNotificationsService {
  private readonly logger = new Logger(PaymentNotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Send notification when new tagihan is created
   */
  async notifyTagihanCreated(
    tagihanId: string,
    studentId: string,
    createdBy?: string,
  ): Promise<void> {
    try {
      const tagihan = await this.prisma.tagihan.findUnique({
        where: { id: tagihanId },
        include: {
          student: {
            include: {
              user: true,
              class: true,
            },
          },
        },
      });

      if (!tagihan || !tagihan.student.user) {
        this.logger.warn(
          `Cannot send notification - tagihan or student user not found: ${tagihanId}`,
        );
        return;
      }

      const dueDate = tagihan.dueDate
        ? new Date(tagihan.dueDate).toLocaleDateString('id-ID')
        : 'Tidak ditentukan';
      const amount = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(tagihan.amount);

      const vaInfo = tagihan.student.virtualAccount
        ? ` | VA BNI: ${tagihan.student.virtualAccount}`
        : '';

      await this.notificationsService.createNotification({
        userId: tagihan.student.user.id,
        senderId: createdBy,
        type: NotificationType.TAGIHAN_CREATED,
        title: 'Tagihan Baru Dibuat',
        message: `Tagihan ${tagihan.type} sebesar ${amount} telah dibuat. Jatuh tempo: ${dueDate}${vaInfo}`,
        data: {
          tagihanId: tagihan.id,
          studentId: tagihan.studentId,
          type: tagihan.type,
          amount: tagihan.amount,
          dueDate: tagihan.dueDate,
          month: tagihan.month,
          year: tagihan.year,
          virtualAccount: tagihan.student.virtualAccount || null,
        },
        priority: NotificationPriority.NORMAL,
        channel: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      });

      // Also notify parents connected to this student via Email and In-App
      const parentRelations = await this.prisma.parentStudent.findMany({
        where: { studentId: tagihan.studentId },
        include: { parent: { include: { user: true } } },
      });

      for (const rel of parentRelations) {
        if (rel.parent?.user?.id) {
          await this.notificationsService.createNotification({
            userId: rel.parent.user.id,
            senderId: createdBy,
            type: NotificationType.TAGIHAN_CREATED,
            title: 'Pemberitahuan Tagihan SPP Siswa',
            message: `Tagihan ${tagihan.type} untuk ananda ${tagihan.student.name} sebesar ${amount} telah diterbitkan. Jatuh tempo: ${dueDate}${vaInfo}`,
            data: {
              tagihanId: tagihan.id,
              studentId: tagihan.studentId,
              studentName: tagihan.student.name,
              type: tagihan.type,
              amount: tagihan.amount,
              dueDate: tagihan.dueDate,
              month: tagihan.month,
              year: tagihan.year,
            },
            priority: NotificationPriority.NORMAL,
            channel: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
          });
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to send tagihan created notification: ${error.message}`,
      );
    }
  }

  /**
   * Send notification when payment proof is uploaded
   */
  async notifyPaymentProofUploaded(proofId: string): Promise<void> {
    try {
      const proof = await this.prisma.paymentProof.findUnique({
        where: { id: proofId },
        include: {
          student: {
            include: {
              user: true,
              class: true,
            },
          },
          tagihan: true,
        },
      });

      if (!proof) {
        this.logger.warn(`Payment proof not found: ${proofId}`);
        return;
      }

      const amount = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(proof.amount);

      // Notify student
      if (proof.student.user) {
        await this.notificationsService.createNotification({
          userId: proof.student.user.id,
          type: NotificationType.PAYMENT_UPLOADED,
          title: 'Bukti Pembayaran Berhasil Diupload',
          message: `Bukti pembayaran sebesar ${amount} telah berhasil diupload dan sedang menunggu verifikasi dari tim keuangan.`,
          data: {
            proofId: proof.id,
            studentId: proof.studentId,
            amount: proof.amount,
            tagihanId: proof.tagihanId,
          },
          priority: NotificationPriority.NORMAL,
          channel: [NotificationChannel.IN_APP],
        });
      }

      // Notify finance staff
      const financeStaff = await this.getFinanceStaff();
      for (const staff of financeStaff) {
        await this.notificationsService.createNotification({
          userId: staff.id,
          type: NotificationType.PAYMENT_UPLOADED,
          title: 'Bukti Pembayaran Baru',
          message: `${proof.student.name} (${proof.student.class.name}) telah mengupload bukti pembayaran sebesar ${amount}.`,
          data: {
            proofId: proof.id,
            studentId: proof.studentId,
            studentName: proof.student.name,
            className: proof.student.class.name,
            amount: proof.amount,
            tagihanId: proof.tagihanId,
          },
          priority: NotificationPriority.HIGH,
          channel: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to send payment proof uploaded notification: ${error.message}`,
      );
    }
  }

  /**
   * Send notification when payment proof is verified
   */
  async notifyPaymentProofVerified(
    proofId: string,
    status: 'DIVERIFIKASI' | 'DITOLAK',
    verifiedBy: string,
    notes?: string,
  ): Promise<void> {
    try {
      const proof = await this.prisma.paymentProof.findUnique({
        where: { id: proofId },
        include: {
          student: {
            include: {
              user: true,
              class: true,
            },
          },
          tagihan: true,
          verifiedUser: true,
        },
      });

      if (!proof || !proof.student.user) {
        this.logger.warn(
          `Cannot send notification - proof or student user not found: ${proofId}`,
        );
        return;
      }

      const amount = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(proof.amount);

      const isApproved = status === 'DIVERIFIKASI';
      const title = isApproved
        ? 'Pembayaran Diverifikasi'
        : 'Pembayaran Ditolak';
      const message = isApproved
        ? `Bukti pembayaran sebesar ${amount} telah diverifikasi dan diterima. Tagihan telah lunas.`
        : `Bukti pembayaran sebesar ${amount} ditolak. ${notes ? `Alasan: ${notes}` : 'Silakan upload ulang bukti pembayaran yang benar.'}`;

      await this.notificationsService.createNotification({
        userId: proof.student.user.id,
        senderId: verifiedBy,
        type: isApproved
          ? NotificationType.PAYMENT_VERIFIED
          : NotificationType.PAYMENT_REJECTED,
        title,
        message,
        data: {
          proofId: proof.id,
          studentId: proof.studentId,
          amount: proof.amount,
          tagihanId: proof.tagihanId,
          status,
          notes,
          verifiedBy: proof.verifiedUser?.name,
        },
        priority: isApproved
          ? NotificationPriority.HIGH
          : NotificationPriority.URGENT,
        channel: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      });

      // Also notify parents connected to this student
      const parentRelations = await this.prisma.parentStudent.findMany({
        where: { studentId: proof.studentId },
        include: { parent: { include: { user: true } } },
      });

      for (const rel of parentRelations) {
        if (rel.parent?.user?.id) {
          await this.notificationsService.createNotification({
            userId: rel.parent.user.id,
            senderId: verifiedBy,
            type: isApproved
              ? NotificationType.PAYMENT_VERIFIED
              : NotificationType.PAYMENT_REJECTED,
            title: isApproved
              ? 'Kwitansi Lunas: Pembayaran SPP Terverifikasi'
              : 'Pemberitahuan: Bukti Pembayaran Perlu Diperbaiki',
            message: isApproved
              ? `Pembayaran ${proof.tagihan?.type || 'SPP'} untuk ananda ${proof.student.name} sebesar ${amount} telah diverifikasi lunas oleh staf keuangan. Kwitansi digital telah tersedia.`
              : `Bukti pembayaran untuk ananda ${proof.student.name} sebesar ${amount} ditolak. ${notes ? `Alasan: ${notes}` : 'Silakan upload ulang bukti yang valid.'}`,
            data: {
              proofId: proof.id,
              studentId: proof.studentId,
              studentName: proof.student.name,
              amount: proof.amount,
              tagihanId: proof.tagihanId,
              status,
              notes,
              verifiedBy: proof.verifiedUser?.name,
            },
            priority: isApproved
              ? NotificationPriority.HIGH
              : NotificationPriority.URGENT,
            channel: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
          });
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to send payment proof verification notification: ${error.message}`,
      );
    }
  }

  /**
   * Send notification when bulk tagihan is created
   */
  async notifyBulkTagihanCreated(
    classId: string,
    tagihanType: string,
    amount: number,
    count: number,
    createdBy?: string,
  ): Promise<void> {
    try {
      // Jika classId === 'ALL', cari seluruh siswa aktif
      let studentsTarget: any[] = [];
      let classNameLabel = 'Semua Siswa';

      if (classId && classId !== 'ALL') {
        const classInfo = await this.prisma.class.findUnique({
          where: { id: classId },
          include: {
            students: {
              include: {
                user: true,
              },
            },
          },
        });
        if (classInfo) {
          studentsTarget = classInfo.students;
          classNameLabel = `Kelas ${classInfo.name}`;
        }
      } else {
        studentsTarget = await this.prisma.student.findMany({
          include: {
            user: true,
            class: { select: { name: true } },
          },
        });
      }

      const formattedAmount = amount > 0
        ? new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
          }).format(amount)
        : '';

      const tagihanMessage = tagihanType === 'PAKET_TAHUNAN'
        ? `Paket Tagihan Administrasi Sekolah Tahun Ajaran baru telah diterbitkan untuk ${classNameLabel}.`
        : `Tagihan ${tagihanType} ${formattedAmount ? `sebesar ${formattedAmount}` : ''} telah dibuat untuk ${classNameLabel}.`;

      // Send notification to each student
      for (const student of studentsTarget) {
        if (student.user?.id) {
          await this.notificationsService.createNotification({
            userId: student.user.id,
            senderId: createdBy,
            type: NotificationType.BULK_TAGIHAN_CREATED,
            title: 'Tagihan Baru Diterbitkan',
            message: tagihanMessage,
            data: {
              classId,
              className: classNameLabel,
              tagihanType,
              amount,
              studentId: student.id,
              bulkCount: count,
            },
            priority: NotificationPriority.NORMAL,
            channel: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
          });
        }

        // Send notification to parents
        const parentRelations = await this.prisma.parentStudent.findMany({
          where: { studentId: student.id },
          include: { parent: { include: { user: true } } },
        });

        for (const rel of parentRelations) {
          if (rel.parent?.user?.id) {
            await this.notificationsService.createNotification({
              userId: rel.parent.user.id,
              senderId: createdBy,
              type: NotificationType.BULK_TAGIHAN_CREATED,
              title: '[Wali Murid] Tagihan Administrasi Diterbitkan',
              message: `Tagihan ${tagihanType === 'PAKET_TAHUNAN' ? 'Administrasi Sekolah' : tagihanType} untuk ananda ${student.name} telah diterbitkan. Silakan cek rincian pada menu Tagihan Siswa.`,
              data: {
                classId,
                className: classNameLabel,
                studentId: student.id,
                studentName: student.name,
                tagihanType,
                amount,
              },
              priority: NotificationPriority.NORMAL,
              channel: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
            });
          }
        }
      }

      this.logger.log(
        `Sent bulk tagihan notifications to ${studentsTarget.length} students (${classNameLabel})`,
      );

      // Notify finance staff about the bulk creation
      const financeStaff = await this.getFinanceStaff();
      const staffNotificationPromises = financeStaff.map((staff) =>
        this.notificationsService.createNotification({
          userId: staff.id,
          senderId: createdBy,
          type: NotificationType.BULK_TAGIHAN_CREATED,
          title: 'Tagihan Massal Dibuat',
          message: `${count} tagihan ${tagihanType} ${formattedAmount ? `sebesar ${formattedAmount}` : ''} telah dibuat untuk ${classNameLabel}.`,
          data: {
            classId,
            className: classNameLabel,
            tagihanType,
            amount,
            bulkCount: count,
            isStaffNotification: true,
          },
          priority: NotificationPriority.LOW,
          channel: [NotificationChannel.IN_APP],
        }),
      );

      await Promise.all(staffNotificationPromises);
    } catch (error) {
      this.logger.error(
        `Failed to send bulk tagihan notifications: ${error.message}`,
      );
    }
  }

  /**
   * Cron job to send payment due reminders
   * Runs daily at 9:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendPaymentDueReminders(): Promise<void> {
    this.logger.log('Running payment due reminders job...');

    try {
      const now = new Date();
      const threeDaysFromNow = new Date(
        now.getTime() + 3 * 24 * 60 * 60 * 1000,
      );
      const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

      // Find tagihans due in 3 days (warning)
      const tagihansWarning = await this.prisma.tagihan.findMany({
        where: {
          status: 'BELUM_LUNAS',
          dueDate: {
            gte: now,
            lte: threeDaysFromNow,
          },
        },
        include: {
          student: {
            include: {
              user: true,
              class: true,
            },
          },
        },
      });

      // Find tagihans due in 1 day (urgent)
      const tagihansUrgent = await this.prisma.tagihan.findMany({
        where: {
          status: 'BELUM_LUNAS',
          dueDate: {
            gte: now,
            lte: oneDayFromNow,
          },
        },
        include: {
          student: {
            include: {
              user: true,
              class: true,
            },
          },
        },
      });

      // Send warning notifications
      for (const tagihan of tagihansWarning) {
        if (tagihan.student.user) {
          await this.sendPaymentReminderNotification(
            tagihan,
            NotificationPriority.NORMAL,
          );
        }
      }

      // Send urgent notifications
      for (const tagihan of tagihansUrgent) {
        if (tagihan.student.user) {
          await this.sendPaymentReminderNotification(
            tagihan,
            NotificationPriority.URGENT,
          );
        }
      }

      this.logger.log(
        `Sent ${tagihansWarning.length} warning and ${tagihansUrgent.length} urgent payment reminders`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send payment due reminders: ${error.message}`,
      );
    }
  }

  /**
   * Send payment reminder notification
   */
  private async sendPaymentReminderNotification(
    tagihan: any,
    priority: NotificationPriority,
  ): Promise<void> {
    const dueDate = new Date(tagihan.dueDate).toLocaleDateString('id-ID');
    const amount = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(tagihan.amount);

    const daysUntilDue = Math.ceil(
      (new Date(tagihan.dueDate).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24),
    );

    let title: string;
    let message: string;

    if (daysUntilDue <= 1) {
      title = 'Pembayaran Segera Jatuh Tempo!';
      message = `Tagihan ${tagihan.type} sebesar ${amount} akan jatuh tempo pada ${dueDate}. Segera lakukan pembayaran untuk menghindari kendala administrasi.`;
    } else {
      title = 'Pengingat Pembayaran';
      message = `Tagihan ${tagihan.type} sebesar ${amount} akan jatuh tempo dalam ${daysUntilDue} hari (${dueDate}). Mohon segera lakukan pembayaran.`;
    }

    if (tagihan.student?.user?.id) {
      await this.notificationsService.createNotification({
        userId: tagihan.student.user.id,
        type: NotificationType.PAYMENT_DUE,
        title,
        message,
        data: {
          tagihanId: tagihan.id,
          studentId: tagihan.studentId,
          type: tagihan.type,
          amount: tagihan.amount,
          dueDate: tagihan.dueDate,
          daysUntilDue,
        },
        priority,
        channel: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      });
    }

    // Kirim notifikasi ke wali murid siswa
    const parentRelations = await this.prisma.parentStudent.findMany({
      where: { studentId: tagihan.studentId },
      include: { parent: { include: { user: true } } },
    });

    for (const rel of parentRelations) {
      if (rel.parent?.user?.id) {
        await this.notificationsService.createNotification({
          userId: rel.parent.user.id,
          type: NotificationType.PAYMENT_DUE,
          title: `[Wali Murid] ${title}`,
          message: `Tagihan ${tagihan.type} untuk ananda ${tagihan.student?.name || 'Siswa'} sebesar ${amount} jatuh tempo pada ${dueDate}.`,
          data: {
            tagihanId: tagihan.id,
            studentId: tagihan.studentId,
            studentName: tagihan.student?.name,
            type: tagihan.type,
            amount: tagihan.amount,
            dueDate: tagihan.dueDate,
            daysUntilDue,
          },
          priority,
          channel: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        });
      }
    }
  }

  /**
   * Cron job to send overdue payment notifications
   * Runs daily at 10:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async sendOverduePaymentNotifications(): Promise<void> {
    this.logger.log('Running overdue payment notifications job...');

    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const overdueTagihans = await this.prisma.tagihan.findMany({
        where: {
          status: { in: ['BELUM_LUNAS', 'ANGSURAN'] },
          dueDate: {
            lt: now,
          },
        },
        include: {
          student: {
            include: {
              user: true,
              class: true,
            },
          },
        },
      });

      // Filter tagihan SPP berkala (hanya kirim notifikasi jika bulan tagihan <= bulan berjalan atau ada angsuran)
      const validOverdue = overdueTagihans.filter((t: any) => {
        const paid = t.amountPaid || 0;
        const remaining = Math.max(0, t.amount - paid);
        if (remaining <= 0) return false;

        if (t.type.toUpperCase() === 'SPP' && t.year && t.month) {
          if (t.year < currentYear) return true;
          if (t.year === currentYear && t.month <= currentMonth) return true;
          if (t.status === 'ANGSURAN' || paid > 0) return true;
          return false;
        }
        return true;
      });

      for (const tagihan of validOverdue) {
        if (tagihan.dueDate) {
          const daysOverdue = Math.ceil(
            (now.getTime() - new Date(tagihan.dueDate).getTime()) /
              (1000 * 60 * 60 * 24),
          );

          const amount = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
          }).format(tagihan.amount - (tagihan.amountPaid || 0));

          if (tagihan.student?.user?.id) {
            await this.notificationsService.createNotification({
              userId: tagihan.student.user.id,
              type: NotificationType.PAYMENT_OVERDUE,
              title: 'Pembayaran Terlambat',
              message: `Tagihan ${tagihan.type} sebesar ${amount} sudah terlambat ${daysOverdue} hari. Mohon segera lakukan pembayaran untuk menghindari kendala administrasi.`,
              data: {
                tagihanId: tagihan.id,
                studentId: tagihan.studentId,
                type: tagihan.type,
                amount: tagihan.amount,
                dueDate: tagihan.dueDate,
                daysOverdue,
              },
              priority: NotificationPriority.URGENT,
              channel: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
            });
          }

          // Kirim juga ke akun wali murid
          const parentRelations = await this.prisma.parentStudent.findMany({
            where: { studentId: tagihan.studentId },
            include: { parent: { include: { user: true } } },
          });

          for (const rel of parentRelations) {
            if (rel.parent?.user?.id) {
              await this.notificationsService.createNotification({
                userId: rel.parent.user.id,
                type: NotificationType.PAYMENT_OVERDUE,
                title: 'Pemberitahuan Keterlambatan Pembayaran',
                message: `Tagihan ${tagihan.type} ananda ${tagihan.student?.name || 'Siswa'} sebesar ${amount} terlambat ${daysOverdue} hari. Mohon segera diselesaikan.`,
                data: {
                  tagihanId: tagihan.id,
                  studentId: tagihan.studentId,
                  studentName: tagihan.student?.name,
                  type: tagihan.type,
                  amount: tagihan.amount,
                  dueDate: tagihan.dueDate,
                  daysOverdue,
                },
                priority: NotificationPriority.URGENT,
                channel: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
              });
            }
          }
        }
      }

      this.logger.log(
        `Sent ${validOverdue.length} overdue payment notifications`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send overdue payment notifications: ${error.message}`,
      );
    }
  }

  /**
   * Cron job to cleanup expired notifications
   * Runs daily at 2:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredNotifications(): Promise<void> {
    this.logger.log('Running expired notifications cleanup job...');

    try {
      const count =
        await this.notificationsService.cleanupExpiredNotifications();
      this.logger.log(`Cleaned up ${count} expired notifications`);
    } catch (error) {
      this.logger.error(
        `Failed to cleanup expired notifications: ${error.message}`,
      );
    }
  }

  /**
   * Cron job to cleanup old quarantine files
   * Runs weekly on Sunday at 3:00 AM
   */
  @Cron(CronExpression.EVERY_WEEK)
  async cleanupQuarantineFiles(): Promise<void> {
    this.logger.log('Running quarantine cleanup job...');

    try {
      const count = await VirusScannerUtil.cleanOldQuarantineFiles();
      this.logger.log(`Cleaned up ${count} old quarantine files`);
    } catch (error) {
      this.logger.error(`Failed to cleanup quarantine files: ${error.message}`);
    }
  }

  /**
   * Get finance staff users
   */
  private async getFinanceStaff(): Promise<any[]> {
    return this.prisma.user.findMany({
      where: {
        OR: [
          {
            subRole: {
              in: ['KEUANGAN_ALL', 'KEUANGAN_MASUK', 'KEUANGAN_KELUAR'],
            },
          },
          {
            subRole2: {
              in: ['KEUANGAN_ALL', 'KEUANGAN_MASUK', 'KEUANGAN_KELUAR'],
            },
          },
          {
            subRole3: {
              in: ['KEUANGAN_ALL', 'KEUANGAN_MASUK', 'KEUANGAN_KELUAR'],
            },
          },
          {
            subRole4: {
              in: ['KEUANGAN_ALL', 'KEUANGAN_MASUK', 'KEUANGAN_KELUAR'],
            },
          },
          {
            subRole5: {
              in: ['KEUANGAN_ALL', 'KEUANGAN_MASUK', 'KEUANGAN_KELUAR'],
            },
          },
          { role: 'ADMIN_IT' },
          { role: 'SUPERADMIN' },
        ],
      },
    });
  }

  /**
   * Send security notification for suspicious file activity
   */
  async notifySecurityIncident(
    userId: string,
    incidentType: string,
    details: any,
  ): Promise<void> {
    try {
      // Notify the user
      await this.notificationsService.createNotification({
        userId,
        type: NotificationType.SUSPICIOUS_ACTIVITY,
        title: 'Aktivitas Keamanan Terdeteksi',
        message: `Aktivitas yang mencurigakan terdeteksi pada akun Anda: ${incidentType}. Jika ini bukan Anda, segera hubungi administrator.`,
        data: {
          incidentType,
          details,
          timestamp: new Date(),
        },
        priority: NotificationPriority.URGENT,
        channel: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      });

      // Notify admin IT
      const adminUsers = await this.prisma.user.findMany({
        where: { role: 'ADMIN_IT' },
      });

      for (const admin of adminUsers) {
        await this.notificationsService.createNotification({
          userId: admin.id,
          type: NotificationType.SUSPICIOUS_ACTIVITY,
          title: 'Insiden Keamanan',
          message: `Aktivitas mencurigakan terdeteksi dari user ${userId}: ${incidentType}`,
          data: {
            affectedUserId: userId,
            incidentType,
            details,
            timestamp: new Date(),
          },
          priority: NotificationPriority.URGENT,
          channel: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to send security notification: ${error.message}`,
      );
    }
  }
}
