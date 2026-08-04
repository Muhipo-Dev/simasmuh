import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import {
  RequirePermissions,
  PaymentPermission,
} from '../../core/auth/roles.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Get user's notifications
   */
  @Get()
  async getUserNotifications(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.notificationsService.getUserNotifications(req.user.id, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      status,
      type,
    });
  }

  /**
   * Get notification statistics for current user
   */
  @Get('stats')
  async getNotificationStats(@Req() req: any) {
    return this.notificationsService.getNotificationStats(req.user.id);
  }

  /**
   * Get all notification statistics (admin only)
   */
  @Get('stats/all')
  @RequirePermissions(PaymentPermission.VIEW_AUDIT_LOGS)
  async getAllNotificationStats() {
    return this.notificationsService.getNotificationStats();
  }

  /**
   * Mark notification as read
   */
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  /**
   * Mark all notifications as read
   */
  @Patch('read-all')
  async markAllAsRead(@Req() req: any) {
    const count = await this.notificationsService.markAllAsRead(req.user.id);
    return { message: `${count} notifications marked as read` };
  }

  /**
   * Delete notification
   */
  @Delete(':id')
  async deleteNotification(@Param('id') id: string, @Req() req: any) {
    await this.notificationsService.deleteNotification(id, req.user.id);
    return { message: 'Notification deleted successfully' };
  }

  /**
   * Bulk delete notifications
   */
  @Delete()
  async bulkDeleteNotifications(
    @Body('notificationIds') notificationIds: string[],
    @Req() req: any,
  ) {
    const count = await this.notificationsService.bulkDeleteNotifications(
      notificationIds,
      req.user.id,
    );
    return { message: `${count} notifications deleted successfully` };
  }

  /**
   * Manual notification creation (admin only)
   */
  @Post()
  @RequirePermissions(PaymentPermission.SYSTEM_CONFIGURATION)
  async createNotification(@Body() data: any, @Req() req: any) {
    return this.notificationsService.createNotification({
      ...data,
      senderId: req.user.id,
    });
  }

  /**
   * Create notification from template (admin only)
   */
  @Post('from-template')
  @RequirePermissions(PaymentPermission.SYSTEM_CONFIGURATION)
  async createFromTemplate(
    @Body()
    data: {
      templateType: string;
      userId: string;
      templateData: any;
      options?: any;
    },
    @Req() req: any,
  ) {
    return this.notificationsService.createFromTemplate(
      data.templateType,
      data.userId,
      data.templateData,
      {
        ...data.options,
        senderId: req.user.id,
      },
    );
  }

  /**
   * Clean up expired notifications (admin only)
   */
  @Post('cleanup-expired')
  @RequirePermissions(PaymentPermission.SYSTEM_CONFIGURATION)
  async cleanupExpiredNotifications() {
    const count = await this.notificationsService.cleanupExpiredNotifications();
    return { message: `${count} expired notifications cleaned up` };
  }
}
