import { useState, useCallback } from 'react';

export interface SocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  reconnectAttempts: number;
}

export interface SocketHookReturn {
  state: SocketState;
  connect: () => Promise<void>;
  disconnect: () => void;
  forceReconnect: () => void;
  markNotificationAsRead: (notificationId: string) => void;
  on: (event: string, callback: Function) => void;
  off: (event: string, callback: Function) => void;
}

export function useSocket(): SocketHookReturn {
  const [state] = useState<SocketState>({
    connected: false, // Force false so useNotifications falls back to HTTP polling
    connecting: false,
    error: null,
    reconnectAttempts: 0,
  });

  const noop = useCallback(() => {}, []);
  const noopAsync = useCallback(async () => {}, []);

  return {
    state,
    connect: noopAsync,
    disconnect: noop,
    forceReconnect: noop,
    markNotificationAsRead: noop,
    on: noop,
    off: noop,
  };
}

// Specialized hooks for specific socket events
export function useNotificationSocket() {
  const socket = useSocket();

  return {
    ...socket,
    newNotification: null as any,
    broadcastNotification: null as any,
    clearNewNotification: () => {},
    clearBroadcastNotification: () => {},
  };
}

export function usePaymentSocket() {
  const socket = useSocket();

  return {
    ...socket,
    paymentUpdate: null,
    clearPaymentUpdate: () => {},
  };
}

export function useSystemSocket() {
  const socket = useSocket();

  return {
    ...socket,
    maintenanceNotification: null,
    clearMaintenanceNotification: () => {},
  };
}