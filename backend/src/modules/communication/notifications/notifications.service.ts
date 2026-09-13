import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmailNotificationService } from './email.service';

export interface NotificationData {
  userId: string;
  senderId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  priority?: NotificationPriority;
  channel?: NotificationChannel[];
  expiresAt?: Date;
}

export enum NotificationType {
  // Payment related
  PAYMENT_DUE = 'PAYMENT_DUE',
  PAYMENT_OVERDUE = 'PAYMENT_OVERDUE',
  PAYMENT_REMINDER = 'PAYMENT_REMINDER',
  PAYMENT_UPLOADED = 'PAYMENT_UPLOADED',
  PAYMENT_VERIFIED = 'PAYMENT_VERIFIED',
  PAYMENT_REJECTED = 'PAYMENT_REJECTED',

  // Tagihan related
  TAGIHAN_CREATED = 'TAGIHAN_CREATED',
  TAGIHAN_UPDATED = 'TAGIHAN_UPDATED',
  TAGIHAN_DELETED = 'TAGIHAN_DELETED',
  BULK_TAGIHAN_CREATED = 'BULK_TAGIHAN_CREATED',

  // System notifications
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  SYSTEM_UPDATE = 'SYSTEM_UPDATE',

  // Security notifications
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  FILE_QUARANTINED = 'FILE_QUARANTINED',

  // Persuratan & Disposisi
  DISPOSISI_ASSIGNED = 'DISPOSISI_ASSIGNED',
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private emailNotificationService: EmailNotificationService,
  ) {}

  /**
   * Create a new notification
   */
  async createNotification(data: NotificationData): Promise<any> {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId: data.userId,
          senderId: data.senderId,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data || {},
          priority: data.priority || NotificationPriority.NORMAL,
          channel: data.channel?.[0] || NotificationChannel.IN_APP,
          expiresAt: data.expiresAt,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Emit real-time notification event
      this.eventEmitter.emit('notification.created', notification);

      // Process additional channels (email, SMS, etc.)
      if (data.channel && data.channel.length > 1) {
        await this.processAdditionalChannels(notification, data.channel);
      }

      this.logger.log(
        `Notification created for user ${data.userId}: ${data.type}`,
      );
      return notification;
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: string;
      type?: string;
    } = {},
  ): Promise<{
    notifications: any[];
    total: number;
    unreadCount: number;
  }> {
    const { limit = 50, offset = 0, status, type } = options;

    const where: any = {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: {
          userId,
          status: 'UNREAD',
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<any> {
    return this.prisma.notification.update({
      where: {
        id: notificationId,
        userId, // Ensure user owns this notification
      },
      data: {
        status: 'READ',
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        status: 'UNREAD',
      },
      data: {
        status: 'READ',
        isRead: true,
        readAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Delete notification
   */
  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    await this.prisma.notification.delete({
      where: {
        id: notificationId,
        userId, // Ensure user owns this notification
      },
    });
  }

  /**
   * Bulk delete notifications
   */
  async bulkDeleteNotifications(
    notificationIds: string[],
    userId: string,
  ): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        id: { in: notificationIds },
        userId,
      },
    });

    return result.count;
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(userId?: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    recentActivity: any[];
  }> {
    const where = userId ? { userId } : {};

    const [total, unread, byType, byPriority, recentActivity] =
      await Promise.all([
        // Total notifications
        this.prisma.notification.count({ where }),

        // Unread notifications
        this.prisma.notification.count({
          where: { ...where, status: 'UNREAD' },
        }),

        // Group by type
        this.prisma.notification.groupBy({
          by: ['type'],
          where,
          _count: { _all: true },
        }),

        // Group by priority
        this.prisma.notification.groupBy({
          by: ['priority'],
          where,
          _count: { _all: true },
        }),

        // Recent activity (last 7 days)
        this.prisma.notification.findMany({
          where: {
            ...where,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          select: {
            type: true,
            priority: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
      ]);

    // Format results
    const typeStats = byType.reduce(
      (acc, item) => {
        acc[item.type] = item._count._all;
        return acc;
      },
      {} as Record<string, number>,
    );

    const priorityStats = byPriority.reduce(
      (acc, item) => {
        acc[item.priority] = item._count._all;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total,
      unread,
      byType: typeStats,
      byPriority: priorityStats,
      recentActivity,
    };
  }

  /**
   * Create notification from template
   */
  async createFromTemplate(
    templateType: string,
    userId: string,
    templateData: Record<string, any>,
    options: {
      senderId?: string;
      priority?: NotificationPriority;
      channel?: NotificationChannel[];
      expiresAt?: Date;
    } = {},
  ): Promise<any> {
    // Get template
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { type: templateType, isActive: true },
    });

    if (!template) {
      throw new Error(
        `Notification template '${templateType}' not found or inactive`,
      );
    }

    // Replace placeholders in template
    const replacePlaceholders = (
      text: string,
      data: Record<string, any>,
    ): string => {
      return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key]?.toString() || match;
      });
    };

    const title = replacePlaceholders(template.title, templateData);
    const message = replacePlaceholders(template.message, templateData);

    // Create notification
    return this.createNotification({
      userId,
      senderId: options.senderId,
      type: templateType as NotificationType,
      title,
      message,
      data: templateData,
      priority: options.priority || NotificationPriority.NORMAL,
      channel: options.channel || [NotificationChannel.IN_APP],
      expiresAt: options.expiresAt,
    });
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications(): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired notifications`);
    return result.count;
  }

  /**
   * Process additional notification channels (email, SMS, etc.)
   */
  private async processAdditionalChannels(
    notification: any,
    channels: NotificationChannel[],
  ): Promise<void> {
    for (const channel of channels) {
      if (channel === NotificationChannel.IN_APP) continue;

      try {
        switch (channel) {
          case NotificationChannel.EMAIL:
            await this.sendEmailNotification(notification);
            break;
          case NotificationChannel.SMS:
            await this.sendSMSNotification(notification);
            break;
          case NotificationChannel.PUSH:
            await this.sendPushNotification(notification);
            break;
        }
      } catch (error) {
        this.logger.error(
          `Failed to send ${channel} notification: ${error.message}`,
        );
      }
    }
  }

  /**
   * Send email notification directly using EmailNotificationService
   */
  private async sendEmailNotification(notification: any): Promise<void> {
    if (!notification.user?.email) {
      this.logger.warn(`User ${notification.userId} does not have a linked Google/email address.`);
      return;
    }

    this.logger.log(`Dispatching email notification to ${notification.user.email}`);

    let category: any = 'SISTEM';
    if (notification.type?.includes('PAYMENT') || notification.type?.includes('TAGIHAN')) {
      category = 'KEUANGAN';
    }

    await this.emailNotificationService.sendEmailNotification({
      to: notification.user.email,
      subject: notification.title,
      title: notification.title,
      category,
      recipientName: notification.user.name,
      contentText: notification.message,
      actionUrl: `${process.env.FRONTEND_URL || 'https://simasmuh.razagopo.my.id'}/dashboard`,
      actionText: 'Buka Dashboard',
    });

    // Emit event for other handlers if any
    this.eventEmitter.emit('notification.email.send', {
      to: notification.user.email,
      subject: notification.title,
      body: notification.message,
      template: notification.type,
      data: notification.data,
    });
  }

  /**
   * Get user's Google account link status and email notification preferences
   */
  async getUserEmailPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        username: true,
      },
    });

    if (!user) {
      throw new Error('Pengguna tidak ditemukan');
    }

    const isGoogleLinked = !!(user.email && user.email.includes('@'));

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isGoogleLinked,
      preferences: {
        notifPresensi: true,
        notifKeuangan: true,
        notifPengumuman: true,
        notifKedisiplinan: true,
        notifPerizinan: true,
      },
    };
  }

  /**
   * Update user's Google linked email or notification preferences
   */
  async updateUserEmailPreferences(userId: string, data: { email?: string; preferences?: any }) {
    if (data.email) {
      const emailTrimmed = data.email.trim().toLowerCase();
      // Check if email already used by another user
      const existing = await this.prisma.user.findFirst({
        where: {
          email: emailTrimmed,
          id: { not: userId },
        },
      });

      if (existing) {
        throw new Error('Alamat email Google ini sudah ditautkan ke akun lain.');
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: { email: emailTrimmed },
      });
    }

    return this.getUserEmailPreferences(userId);
  }

  /**
   * Send test push notification email to user's Google account
   */
  async sendTestEmail(userId: string, customEmail?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      throw new Error('Pengguna tidak ditemukan');
    }

    const targetEmail = customEmail || user.email;
    if (!targetEmail || !targetEmail.includes('@')) {
      throw new Error('Belum ada akun email aktif yang ditautkan ke profil Anda.');
    }

    const result = await this.emailNotificationService.sendEmailNotification({
      to: targetEmail,
      subject: `[Uji Coba] Email SIMASMUH`,
      title: 'Uji Coba Email Berhasil',
      category: 'SISTEM',
      badgeLabel: 'TEST EMAIL',
      recipientName: user.name,
      contentText: 'Email Anda terhubung dengan SIMASMUH. Notifikasi presensi, keuangan, dan pengumuman akan dikirim ke alamat ini.',
      metaDetails: [
        { label: 'Nama', value: user.name },
        { label: 'Peran', value: user.role },
        { label: 'Email', value: targetEmail },
        { label: 'Waktu', value: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB' },
      ],
      actionUrl: `${process.env.FRONTEND_URL || 'https://simasmuh.razagopo.my.id'}/pengaturan/notifikasi`,
      actionText: 'Pengaturan Notifikasi',
    });

    if (!result.success) {
      return {
        success: false,
        email: targetEmail,
        message: `Gagal mengirimkan email ke ${targetEmail}: ${result.error || 'Server SMTP menolak pengiriman. Periksa kembali host, port, dan kata sandi email.'}`,
        error: result.error,
        simulated: false,
      };
    }

    return {
      success: true,
      email: targetEmail,
      message: `Email uji coba berhasil dikirim ke ${targetEmail}`,
      simulated: result.simulated,
    };
  }

  /**
   * Superadmin: Get SMTP Server Configuration
   */
  getSmtpConfig() {
    return this.emailNotificationService.getSmtpConfig();
  }

  /**
   * Superadmin: Update SMTP Server Configuration
   */
  updateSmtpConfig(config: any) {
    return this.emailNotificationService.updateSmtpConfig(config);
  }

  /**
   * Superadmin: Test SMTP Server Connection
   */
  async testSmtpConnection(tempConfig?: any) {
    return this.emailNotificationService.testSmtpConnection(tempConfig);
  }

  /**
   * Superadmin: Audit Google Email Link Statistics across all user roles
   */
  async getUserEmailAuditStats() {
    const [totalUsers, linkedUsers, roleStats] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { email: { contains: '@' } },
      }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
    ]);

    const linkedByRole = await this.prisma.user.groupBy({
      by: ['role'],
      where: { email: { contains: '@' } },
      _count: { id: true },
    });

    const roleBreakdown = roleStats.map((r) => {
      const linked = linkedByRole.find((lr) => lr.role === r.role)?._count.id || 0;
      return {
        role: r.role,
        total: r._count.id,
        linked,
        percentage: r._count.id > 0 ? Math.round((linked / r._count.id) * 100) : 0,
      };
    });

    return {
      totalUsers,
      linkedUsers,
      unlinkedUsers: totalUsers - linkedUsers,
      linkedPercentage: totalUsers > 0 ? Math.round((linkedUsers / totalUsers) * 100) : 0,
      roleBreakdown,
    };
  }

  /**
   * Superadmin: Broadcast email to users based on target role
   */
  async broadcastEmail(data: {
    targetRole: 'SEMUA' | 'GURU' | 'SISWA' | 'WALI_MURID' | 'PEGAWAI';
    subject: string;
    title: string;
    category?: any;
    message: string;
    senderId?: string;
  }) {
    const where: any = {
      email: { contains: '@' },
    };

    if (data.targetRole !== 'SEMUA') {
      if (data.targetRole === 'WALI_MURID') {
        where.role = 'WALI_MURID';
      } else {
        where.role = data.targetRole;
      }
    }

    const recipients = await this.prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true },
    });

    if (recipients.length === 0) {
      throw new Error(`Tidak ada pengguna pada target ${data.targetRole} yang telah menautkan akun email.`);
    }

    let successCount = 0;
    let failedCount = 0;

    // Send emails
    for (const recipient of recipients) {
      if (!recipient.email) continue;
      try {
        const res = await this.emailNotificationService.sendEmailNotification({
          to: recipient.email,
          subject: data.subject,
          title: data.title,
          category: data.category || 'PENGUMUMAN',
          recipientName: recipient.name,
          contentText: data.message,
          actionUrl: `${process.env.FRONTEND_URL || 'https://simasmuh.razagopo.my.id'}/informasi/pengumuman`,
          actionText: 'Lihat Pengumuman',
        });

        if (res.success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (e) {
        failedCount++;
      }
    }

    return {
      totalTarget: recipients.length,
      successCount,
      failedCount,
      message: `Siaran email berhasil diproses: ${successCount} berhasil, ${failedCount} gagal dari total ${recipients.length} penerima.`,
    };
  }

  /**
   * Send SMS notification (placeholder implementation)
   */
  private async sendSMSNotification(notification: any): Promise<void> {
    this.logger.log(`SMS notification sent for user ${notification.userId}`);
    this.eventEmitter.emit('notification.sms.send', {
      userId: notification.userId,
      message: notification.message,
      priority: notification.priority,
    });
  }

  /**
   * Send push notification (placeholder implementation)
   */
  private async sendPushNotification(notification: any): Promise<void> {
    this.logger.log(`Push notification sent for user ${notification.userId}`);
    this.eventEmitter.emit('notification.push.send', {
      userId: notification.userId,
      title: notification.title,
      body: notification.message,
      data: notification.data,
    });
  }

  /**
   * Replace placeholders in template strings
   */
  private replacePlaceholders(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }
}
