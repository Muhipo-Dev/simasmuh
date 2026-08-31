import {
  Controller,
  Get,
  Post,
  Put,
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
   * Get current user's Google account link status and email preferences
   */
  @Get('email-preferences')
  async getEmailPreferences(@Req() req: any) {
    return this.notificationsService.getUserEmailPreferences(req.user.id);
  }

  /**
   * Update current user's email preferences or link Google email
   */
  @Put('email-preferences')
  async updateEmailPreferences(
    @Req() req: any,
    @Body() body: { email?: string; preferences?: any },
  ) {
    return this.notificationsService.updateUserEmailPreferences(req.user.id, body);
  }

  /**
   * Send test notification email to current user's linked Google email
   */
  @Post('test-email')
  async sendTestEmail(
    @Req() req: any,
    @Body() body?: { email?: string },
  ) {
    return this.notificationsService.sendTestEmail(req.user.id, body?.email);
  }

  /**
   * Superadmin: Get SMTP Server Configuration
   */
  @Get('smtp-config')
  @RequirePermissions(PaymentPermission.SYSTEM_CONFIGURATION)
  async getSmtpConfig() {
    return this.notificationsService.getSmtpConfig();
  }

  /**
   * Superadmin: Update SMTP Server Configuration
   */
  @Put('smtp-config')
  @RequirePermissions(PaymentPermission.SYSTEM_CONFIGURATION)
  async updateSmtpConfig(@Body() body: any) {
    return this.notificationsService.updateSmtpConfig(body);
  }

  /**
   * Superadmin: Test SMTP Server Connection
   */
  @Post('test-smtp')
  @RequirePermissions(PaymentPermission.SYSTEM_CONFIGURATION)
  async testSmtpConnection(@Body() body?: any) {
    return this.notificationsService.testSmtpConnection(body);
  }

  /**
   * Superadmin: Audit Google Email Link Statistics across all users
   */
  @Get('audit-stats')
  @RequirePermissions(PaymentPermission.SYSTEM_CONFIGURATION)
  async getUserEmailAuditStats() {
    return this.notificationsService.getUserEmailAuditStats();
  }

  /**
   * Superadmin: Broadcast email to target roles
   */
  @Post('broadcast-email')
  @RequirePermissions(PaymentPermission.SYSTEM_CONFIGURATION)
  async broadcastEmail(@Req() req: any, @Body() body: any) {
    return this.notificationsService.broadcastEmail({
      ...body,
      senderId: req.user.id,
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
