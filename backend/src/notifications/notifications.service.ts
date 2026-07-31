import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

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

      this.logger.log(`Notification created for user ${data.userId}: ${data.type}`);
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
    } = {}
  ): Promise<{
    notifications: any[];
    total: number;
    unreadCount: number;
  }> {
    const { limit = 50, offset = 0, status, type } = options;

    const where: any = {
      userId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
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
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
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
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      })
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
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
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
  async bulkDeleteNotifications(notificationIds: string[], userId: string): Promise<number> {
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

    const [total, unread, byType, byPriority, recentActivity] = await Promise.all([
      // Total notifications
      this.prisma.notification.count({ where }),
      
      // Unread notifications
      this.prisma.notification.count({
        where: { ...where, status: 'UNREAD' }
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
    const typeStats = byType.reduce((acc, item) => {
      acc[item.type] = item._count._all;
      return acc;
    }, {} as Record<string, number>);

    const priorityStats = byPriority.reduce((acc, item) => {
      acc[item.priority] = item._count._all;
      return acc;
    }, {} as Record<string, number>);

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
    } = {}
  ): Promise<any> {
    // Get template
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { type: templateType, isActive: true },
    });

    if (!template) {
      throw new Error(`Notification template '${templateType}' not found or inactive`);
    }

    // Replace placeholders in template
    const replacePlaceholders = (text: string, data: Record<string, any>): string => {
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
    channels: NotificationChannel[]
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
        this.logger.error(`Failed to send ${channel} notification: ${error.message}`);
      }
    }
  }

  /**
   * Send email notification (placeholder implementation)
   */
  private async sendEmailNotification(notification: any): Promise<void> {
    // This would integrate with email service (SendGrid, AWS SES, etc.)
    this.logger.log(`Email notification sent to ${notification.user.email}`);
    
    // Emit event for email service to handle
    this.eventEmitter.emit('notification.email.send', {
      to: notification.user.email,
      subject: notification.title,
      body: notification.message,
      template: notification.type,
      data: notification.data,
    });
  }

  /**
   * Send SMS notification (placeholder implementation)
   */
  private async sendSMSNotification(notification: any): Promise<void> {
    // This would integrate with SMS service (Twilio, AWS SNS, etc.)
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
    // This would integrate with push notification service (FCM, APNS, etc.)
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