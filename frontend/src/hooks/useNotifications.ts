import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotificationSocket } from './useSocket';
import { useAuthenticatedFetch } from './useAuthenticatedFetch';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'UNREAD' | 'READ' | 'DISMISSED';
  isRead: boolean;
  data?: any;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
  };
}

interface NotificationResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

interface NotificationHookOptions {
  enableRealtime?: boolean;
  enableToast?: boolean;
  autoMarkAsRead?: boolean;
  pollInterval?: number;
}

export function useNotifications(options: NotificationHookOptions = {}) {
  const {
    enableRealtime = true,
    enableToast = true,
    autoMarkAsRead = false,
    pollInterval = 30000, // Fallback polling interval
  } = options;

  const queryClient = useQueryClient();
  const socket = useNotificationSocket();
  const authenticatedFetch = useAuthenticatedFetch();
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Main notifications query
  const { data: notificationData, isLoading, error, refetch } = useQuery<NotificationResponse>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/notifications?limit=50');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
    // Only use polling if WebSocket is not connected
    refetchInterval: socket.state.connected ? false : pollInterval,
    refetchOnWindowFocus: true,
  });

  // Notification statistics query
  const { data: stats } = useQuery({
    queryKey: ['notification-stats'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/notifications/stats');
      if (!res.ok) throw new Error('Failed to fetch notification stats');
      return res.json();
    },
    refetchInterval: 60000, // Update stats every minute
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await authenticatedFetch(`/api-backend/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed to mark as read');
      return res.json();
    },
    onSuccess: (_, notificationId) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
      
      // Emit WebSocket event
      socket.markNotificationAsRead(notificationId);
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await authenticatedFetch('/api-backend/notifications/read-all', {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed to mark all as read');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
      
      if (enableToast) {
        toast.success('Semua notifikasi ditandai sudah dibaca');
      }
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await authenticatedFetch(`/api-backend/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete notification');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
      
      if (enableToast) {
        toast.success('Notifikasi dihapus');
      }
    },
  });

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      // Create audio context for notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      // Fallback: try to play a system beep or ignore
      console.warn('Could not play notification sound:', error);
    }
  }, [soundEnabled]);

  // Show notification toast
  const showNotificationToast = useCallback((notification: Notification) => {
    if (!enableToast) return;

    const priorityConfig = {
      URGENT: { duration: 10000, style: 'destructive' as const },
      HIGH: { duration: 8000, style: 'default' as const },
      NORMAL: { duration: 5000, style: 'default' as const },
      LOW: { duration: 3000, style: 'default' as const },
    };

    const config = priorityConfig[notification.priority] || priorityConfig.NORMAL;
    
    // Choose appropriate toast method based on priority
    const toastMethod = notification.priority === 'URGENT' ? toast.error : 
                      notification.priority === 'HIGH' ? toast.warning :
                      toast.info;

    toastMethod(notification.title, {
      description: notification.message,
      duration: config.duration,
      action: autoMarkAsRead ? {
        label: 'Tandai Dibaca',
        onClick: () => markAsReadMutation.mutate(notification.id),
      } : undefined,
    });
  }, [enableToast, autoMarkAsRead, markAsReadMutation]);

  // Handle real-time notifications
  useEffect(() => {
    if (!enableRealtime) return;

    // Handle new notifications
    if (socket.newNotification) {
      const notification = socket.newNotification;
      
      // Play sound for high priority notifications
      if (['HIGH', 'URGENT'].includes(notification.priority)) {
        playNotificationSound();
      }
      
      // Show toast
      showNotificationToast(notification as Notification);
      
      // Refresh notifications list
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
      
      // Auto mark as read if enabled
      if (autoMarkAsRead) {
        setTimeout(() => {
          markAsReadMutation.mutate(notification.id);
        }, 2000);
      }
    }

    // Handle broadcast notifications
    if (socket.broadcastNotification) {
      const notification = socket.broadcastNotification;
      
      // Always play sound for broadcast notifications
      playNotificationSound();
      
      // Show toast with different styling
      toast.info(`📢 ${notification.title}`, {
        description: notification.message,
        duration: 10000,
      });
    }
  }, [
    socket.newNotification,
    socket.broadcastNotification,
    enableRealtime,
    playNotificationSound,
    showNotificationToast,
    autoMarkAsRead,
    markAsReadMutation,
    queryClient,
  ]);

  // Handle notification click
  const handleNotificationClick = useCallback(async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    // Handle notification actions based on type
    if (notification.type === 'PAYMENT_DUE' && notification.data?.tagihanId) {
      // You can emit events or use router to navigate
      console.log('Navigate to payment for tagihan:', notification.data.tagihanId);
    } else if (notification.type === 'PAYMENT_UPLOADED' && notification.data?.proofId) {
      console.log('Navigate to payment proof:', notification.data.proofId);
    }
  }, [markAsReadMutation]);

  // Format time ago helper
  const formatTimeAgo = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Baru saja';
    if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} jam lalu`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} hari lalu`;
    
    return date.toLocaleDateString('id-ID');
  }, []);

  return {
    // Data
    notifications: notificationData?.notifications || [],
    unreadCount: notificationData?.unreadCount || 0,
    total: notificationData?.total || 0,
    stats,
    
    // Loading states
    isLoading,
    error,
    
    // Socket state
    socketConnected: socket.state.connected,
    socketError: socket.state.error,
    
    // Actions
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    handleNotificationClick,
    refetch,
    
    // Settings
    soundEnabled,
    setSoundEnabled,
    
    // Helpers
    formatTimeAgo,
    
    // Loading states for mutations
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isDeletingNotification: deleteNotificationMutation.isPending,
  };
}