'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useNotificationSocket } from '@/hooks/useSocket'
import NotificationToast from './NotificationToast'
import { AnimatePresence, motion } from 'framer-motion'

interface NotificationContextType {
  showToast: (notification: any) => void
  clearToast: (id: string) => void
  clearAllToasts: () => void
  toasts: any[]
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotificationContext() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
  maxToasts?: number
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center'
}

export default function NotificationProvider({ 
  children, 
  maxToasts = 5,
  position = 'top-right' 
}: NotificationProviderProps) {
  const [toasts, setToasts] = useState<any[]>([])
  const socket = useNotificationSocket()

  // Handle new notifications from WebSocket
  useEffect(() => {
    if (socket.newNotification) {
      showToast(socket.newNotification)
    }
  }, [socket.newNotification])

  // Handle broadcast notifications
  useEffect(() => {
    if (socket.broadcastNotification) {
      showToast({
        ...socket.broadcastNotification,
        isBroadcast: true,
      })
    }
  }, [socket.broadcastNotification])

  const showToast = (notification: any) => {
    const newToast = {
      ...notification,
      id: notification.id || `toast-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    }

    setToasts(prev => {
      // Remove oldest toast if we exceed max
      const updated = prev.length >= maxToasts ? prev.slice(1) : prev
      return [...updated, newToast]
    })

    // Play sound for high priority notifications
    if (['HIGH', 'URGENT'].includes(notification.priority)) {
      playNotificationSound()
    }
  }

  const clearToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const clearAllToasts = () => {
    setToasts([])
  }

  const handleToastAction = (toastId: string, actionType: string) => {
    const toast = toasts.find(t => t.id === toastId)
    if (!toast) return

    // Handle different action types
    switch (actionType) {
      case 'view_payment':
        // Navigate to payment page or open payment modal
        if (toast.data?.tagihanId) {
          console.log('Navigate to payment for tagihan:', toast.data.tagihanId)
          // You can use router or emit events here
        }
        break
      
      case 'view_proof':
        // Navigate to payment proof page
        if (toast.data?.proofId) {
          console.log('Navigate to payment proof:', toast.data.proofId)
        }
        break
      
      case 'view_maintenance':
        // Show maintenance details
        console.log('Show maintenance details:', toast.data)
        break
    }

    // Close the toast after action
    clearToast(toastId)
  }

  const playNotificationSound = () => {
    try {
      // Create audio context for notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      
      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      console.warn('Could not play notification sound:', error)
    }
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4'
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2'
      default:
        return 'top-4 right-4'
    }
  }

  const contextValue: NotificationContextType = {
    showToast,
    clearToast,
    clearAllToasts,
    toasts,
  }

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      
      {/* Toast Container */}
      <div className={`fixed z-50 ${getPositionClasses()} max-w-sm w-full`}>
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {toasts.map((toast, index) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 300, scale: 0.3 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 300, scale: 0.5, transition: { duration: 0.2 } }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 30,
                  delay: index * 0.1 
                }}
                layout
              >
                <NotificationToast
                  notification={toast}
                  onClose={() => clearToast(toast.id)}
                  onAction={(actionType) => handleToastAction(toast.id, actionType)}
                  autoClose={!toast.isBroadcast} // Don't auto-close broadcast notifications
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </NotificationContext.Provider>
  )
}