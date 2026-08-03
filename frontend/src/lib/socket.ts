import { io, Socket } from 'socket.io-client';
import { getBackendUrl } from './api-config';

class SocketManager {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private listeners: Map<string, Function[]> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  async connect(token: string): Promise<void> {
    if (this.socket?.connected) {
      return;
    }

    const backendUrl = getBackendUrl();
    
    try {
      this.socket = io(`${backendUrl}/notifications`, {
        auth: {
          token: token,
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionAttempts: this.maxReconnectAttempts,
        forceNew: true, // Force new connection
      });

      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Failed to create socket'));
          return;
        }

        const connectTimeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        // Connection success
        this.socket.on('connect', () => {
          clearTimeout(connectTimeout);
          console.log('🔗 WebSocket connected to notifications');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        // Connection success confirmation
        this.socket.on('connection:success', (data) => {
          console.log('✅ Notification service ready:', data);
        });

        // Connection error
        this.socket.on('connect_error', (error) => {
          clearTimeout(connectTimeout);
          console.error('❌ WebSocket connection error:', error);
          this.isConnected = false;
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts: ${error.message}`));
          } else {
            this.reconnectAttempts++;
            console.log(`🔄 Retrying connection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          }
        });

        // Disconnection
        this.socket.on('disconnect', (reason) => {
          console.warn('🔌 WebSocket disconnected:', reason);
          this.isConnected = false;
          
          // Notify all listeners about disconnection
          this.emit('connection:lost', { reason });
        });

        // Reconnection
        this.socket.on('reconnect', (attemptNumber) => {
          console.log('🔄 WebSocket reconnected after', attemptNumber, 'attempts');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Re-subscribe to notifications
          this.socket?.emit('notifications:subscribe');
          this.emit('connection:restored', { attemptNumber });
        });

        // Handle new notifications
        this.socket.on('notifications:new', (notification) => {
          console.log('📬 New notification:', notification);
          this.emit('notification:new', notification);
        });

        // Handle broadcast notifications
        this.socket.on('notifications:broadcast', (notification) => {
          console.log('📢 Broadcast notification:', notification);
          this.emit('notification:broadcast', notification);
        });

        // Handle notification read status updates
        this.socket.on('notifications:marked-read', (data) => {
          this.emit('notification:read', data);
        });

        // Handle payment status updates
        this.socket.on('payment:status-updated', (data) => {
          console.log('💰 Payment status updated:', data);
          this.emit('payment:status-updated', data);
        });

        // Handle system maintenance notifications
        this.socket.on('system:maintenance', (data) => {
          console.log('🔧 System maintenance:', data);
          this.emit('system:maintenance', data);
        });

        // Subscribe to notifications once connected
        this.socket.on('connect', () => {
          this.socket?.emit('notifications:subscribe');
        });
      });

    } catch (error: any) {
      console.error('Failed to create socket connection:', error);
      throw new Error(`Socket connection failed: ${error.message}`);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
      console.log('🔌 WebSocket disconnected manually');
    }
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in socket event listener:', error);
        }
      });
    }
  }

  markNotificationAsRead(notificationId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('notifications:mark-read', { notificationId });
    }
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  getConnectionStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    socketId?: string;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id,
    };
  }

  // Force reconnection
  forceReconnect(token: string): void {
    this.disconnect();
    setTimeout(() => {
      this.connect(token);
    }, 1000);
  }
}

// Export singleton instance
export const socketManager = new SocketManager();

// Export type definitions
export interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  data?: any;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
  };
}

export interface PaymentStatusData {
  proofId: string;
  status: string;
  message: string;
  timestamp: Date;
}

export interface SystemMaintenanceData {
  title: string;
  message: string;
  scheduledTime: Date;
  duration: string;
  timestamp: Date;
}