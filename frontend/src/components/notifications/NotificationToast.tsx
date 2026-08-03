'use client'

import { useEffect } from 'react'
import { X, AlertTriangle, CheckCircle, Info, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface NotificationToastProps {
  notification: {
    id: string
    type: string
    title: string
    message: string
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
    data?: any
    sender?: {
      id: string
      name: string
    }
  }
  onClose: () => void
  onAction?: (actionType: string) => void
  autoClose?: boolean
  duration?: number
}

const priorityConfig = {
  URGENT: {
    icon: AlertTriangle,
    bgColor: 'bg-red-50 dark:bg-red-950/20',
    borderColor: 'border-red-200 dark:border-red-800',
    textColor: 'text-red-900 dark:text-red-100',
    iconColor: 'text-red-600 dark:text-red-400',
    badgeColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    duration: 10000,
  },
  HIGH: {
    icon: AlertTriangle,
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    textColor: 'text-orange-900 dark:text-orange-100',
    iconColor: 'text-orange-600 dark:text-orange-400',
    badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    duration: 8000,
  },
  NORMAL: {
    icon: Info,
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-900 dark:text-blue-100',
    iconColor: 'text-blue-600 dark:text-blue-400',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    duration: 5000,
  },
  LOW: {
    icon: Info,
    bgColor: 'bg-slate-50 dark:bg-slate-950/20',
    borderColor: 'border-slate-200 dark:border-slate-800',
    textColor: 'text-slate-900 dark:text-slate-100',
    iconColor: 'text-slate-600 dark:text-slate-400',
    badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
    duration: 3000,
  },
}

const typeIcons = {
  PAYMENT_DUE: '💰',
  PAYMENT_OVERDUE: '⚠️',
  PAYMENT_UPLOADED: '📤',
  PAYMENT_VERIFIED: '✅',
  PAYMENT_REJECTED: '❌',
  TAGIHAN_CREATED: '📋',
  BULK_TAGIHAN_CREATED: '📋',
  SUSPICIOUS_ACTIVITY: '🔒',
  FILE_QUARANTINED: '🛡️',
  SYSTEM_MAINTENANCE: '🔧',
}

export default function NotificationToast({
  notification,
  onClose,
  onAction,
  autoClose = true,
  duration: customDuration,
}: NotificationToastProps) {
  const config = priorityConfig[notification.priority] || priorityConfig.NORMAL
  const Icon = config.icon
  const duration = customDuration || config.duration

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [autoClose, duration, onClose])

  const handleAction = (actionType: string) => {
    if (onAction) {
      onAction(actionType)
    }
  }

  const getActionButtons = () => {
    const actions = []

    if (notification.type === 'PAYMENT_DUE' && notification.data?.tagihanId) {
      actions.push(
        <Button
          key="pay"
          size="sm"
          className="text-xs"
          onClick={() => handleAction('view_payment')}
        >
          Lihat Tagihan
        </Button>
      )
    }

    if (notification.type === 'PAYMENT_UPLOADED' && notification.data?.proofId) {
      actions.push(
        <Button
          key="view"
          size="sm"
          variant="outline"
          className="text-xs"
          onClick={() => handleAction('view_proof')}
        >
          Lihat Bukti
        </Button>
      )
    }

    if (notification.type === 'SYSTEM_MAINTENANCE') {
      actions.push(
        <Button
          key="details"
          size="sm"
          variant="outline"
          className="text-xs"
          onClick={() => handleAction('view_maintenance')}
        >
          Detail
        </Button>
      )
    }

    return actions
  }

  return (
    <Card className={`${config.bgColor} ${config.borderColor} border-l-4 shadow-lg animate-in slide-in-from-right-full duration-300`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-sm">
              <span className="text-lg">
                {typeIcons[notification.type as keyof typeof typeIcons] || '📢'}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <h4 className={`font-semibold text-sm ${config.textColor}`}>
                  {notification.title}
                </h4>
                <Badge 
                  className={`text-xs ${config.badgeColor}`}
                  variant="secondary"
                >
                  {notification.priority}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onClose}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            <p className={`text-sm ${config.textColor} mb-3 leading-relaxed`}>
              {notification.message}
            </p>

            {/* Metadata */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs opacity-75">
                {notification.sender && (
                  <span>dari {notification.sender.name}</span>
                )}
                <Clock className="w-3 h-3" />
                <span>Baru saja</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {getActionButtons()}
              </div>
            </div>

            {/* Progress bar for auto-close */}
            {autoClose && (
              <div className="mt-3 w-full bg-white/20 rounded-full h-1 overflow-hidden">
                <div 
                  className="h-full bg-current opacity-50 animate-progress"
                  style={{
                    animationDuration: `${duration}ms`,
                    animationTimingFunction: 'linear',
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// CSS for progress animation (add to global styles)
const progressKeyframes = `
@keyframes progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

.animate-progress {
  animation-name: progress;
  animation-fill-mode: forwards;
}
`

// Export CSS for injection
export const notificationToastStyles = progressKeyframes