import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  handshake: any;
  disconnect(): this;
  join(room: string): void;
  emit(event: string, data: any): boolean;
}

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedUsers = new Map<string, AuthenticatedSocket[]>();

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Authenticate client using JWT token
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        this.logger.warn('Client connection rejected: No token provided');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub || payload.id;
      client.userRole = payload.role;

      // Add client to user's connections
      if (client.userId && !this.connectedUsers.has(client.userId)) {
        this.connectedUsers.set(client.userId, []);
      }
      if (client.userId) {
        this.connectedUsers.get(client.userId)!.push(client);

        // Join user to their personal room
        client.join(`user:${client.userId}`);
      }

      // Join role-based rooms
      if (client.userRole) {
        client.join(`role:${client.userRole}`);
      }
      if (payload.subRole) client.join(`role:${payload.subRole}`);
      if (payload.subRole2) client.join(`role:${payload.subRole2}`);
      if (payload.subRole3) client.join(`role:${payload.subRole3}`);

      this.logger.log(`User ${client.userId} connected to notifications`);

      // Send connection success
      client.emit('connection:success', {
        message: 'Connected to notification service',
        userId: client.userId,
      });

    } catch (error) {
      this.logger.warn(`Client connection rejected: Invalid token - ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      // Remove client from user's connections
      const userConnections = this.connectedUsers.get(client.userId);
      if (userConnections) {
        const index = userConnections.indexOf(client);
        if (index > -1) {
          userConnections.splice(index, 1);
        }
        
        // If no more connections, remove user from map
        if (userConnections.length === 0) {
          this.connectedUsers.delete(client.userId);
        }
      }

      this.logger.log(`User ${client.userId} disconnected from notifications`);
    }
  }

  /**
   * Subscribe to notification updates
   */
  @SubscribeMessage('notifications:subscribe')
  handleSubscribe(@ConnectedSocket() client: AuthenticatedSocket) {
    client.emit('notifications:subscribed', {
      message: 'Subscribed to notification updates',
      userId: client.userId,
    });
  }

  /**
   * Handle notification read status update
   */
  @SubscribeMessage('notifications:mark-read')
  handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string }
  ) {
    // Broadcast to all user's connected devices
    this.server.to(`user:${client.userId}`).emit('notifications:marked-read', {
      notificationId: data.notificationId,
      userId: client.userId,
    });
  }

  /**
   * Handle real-time notification events
   */
  @OnEvent('notification.created')
  handleNotificationCreated(notification: any) {
    // Send to specific user
    this.server.to(`user:${notification.userId}`).emit('notifications:new', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      data: notification.data,
      createdAt: notification.createdAt,
      sender: notification.sender,
    });

    // Log notification sent
    this.logger.log(`Real-time notification sent to user ${notification.userId}: ${notification.type}`);
  }

  /**
   * Handle broadcast notifications (system-wide)
   */
  @OnEvent('notification.broadcast')
  handleBroadcastNotification(data: {
    title: string;
    message: string;
    type: string;
    priority?: string;
    targetRoles?: string[];
  }) {
    if (data.targetRoles && data.targetRoles.length > 0) {
      // Send to specific roles
      data.targetRoles.forEach(role => {
        this.server.to(`role:${role}`).emit('notifications:broadcast', {
          type: data.type,
          title: data.title,
          message: data.message,
          priority: data.priority || 'NORMAL',
          timestamp: new Date(),
        });
      });
    } else {
      // Send to all connected users
      this.server.emit('notifications:broadcast', {
        type: data.type,
        title: data.title,
        message: data.message,
        priority: data.priority || 'NORMAL',
        timestamp: new Date(),
      });
    }

    this.logger.log(`Broadcast notification sent: ${data.type}`);
  }

  /**
   * Handle payment status updates
   */
  @OnEvent('payment.status.updated')
  handlePaymentStatusUpdated(data: {
    studentId: string;
    proofId: string;
    status: string;
    message: string;
  }) {
    // This would be called when payment status changes
    // Find student's user ID and send notification
    this.server.to(`user:${data.studentId}`).emit('payment:status-updated', {
      proofId: data.proofId,
      status: data.status,
      message: data.message,
      timestamp: new Date(),
    });
  }

  /**
   * Send notification to specific user (programmatically)
   */
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Send notification to specific role (programmatically)
   */
  sendToRole(role: string, event: string, data: any) {
    this.server.to(`role:${role}`).emit(event, data);
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get user connection status
   */
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Broadcast system maintenance notification
   */
  @OnEvent('system.maintenance')
  handleSystemMaintenance(data: {
    title: string;
    message: string;
    scheduledTime: Date;
    duration: string;
  }) {
    this.server.emit('system:maintenance', {
      title: data.title,
      message: data.message,
      scheduledTime: data.scheduledTime,
      duration: data.duration,
      timestamp: new Date(),
    });

    this.logger.log('System maintenance notification broadcast');
  }
}