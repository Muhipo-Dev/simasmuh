'use client'

import { useState } from 'react'
import { Bell, Check, X, Trash2, CheckCheck, Settings, AlertTriangle, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useNotifications } from '@/hooks/useNotifications'

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-800 border-gray-200',
  NORMAL: 'bg-blue-100 text-blue-800 border-blue-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  URGENT: 'bg-red-100 text-red-800 border-red-200',
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

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const {
    notifications,
    unreadCount,
    total,
    socketConnected,
    socketError,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    handleNotificationClick,
    soundEnabled,
    setSoundEnabled,
    formatTimeAgo,
    isMarkingAllAsRead,
    isDeletingNotification,
  } = useNotifications({
    enableRealtime: true,
    enableToast: true,
    autoMarkAsRead: false,
  })

  if (showSettings) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger render={
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        } />
        
        <PopoverContent className="w-80 p-0" align="end">
          <Card className="border-none shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Pengaturan Notifikasi</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Connection Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {socketConnected ? (
                    <>
                      <Wifi className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-600">Terhubung Real-time</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-600">Mode Polling</span>
                    </>
                  )}
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </div>

              {socketError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-600">{socketError}</p>
                </div>
              )}

              {/* Sound Settings */}
              <div className="flex items-center justify-between">
                <Label htmlFor="sound-notifications" className="text-sm font-medium">
                  Suara Notifikasi
                </Label>
                <Switch
                  id="sound-notifications"
                  checked={soundEnabled}
                  onCheckedChange={setSoundEnabled}
                />
              </div>

              <Separator />
              
              {/* Stats */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Statistik</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-blue-50 rounded">
                    <div className="font-semibold text-blue-700">{total}</div>
                    <div className="text-blue-600">Total</div>
                  </div>
                  <div className="p-2 bg-red-50 rounded">
                    <div className="font-semibold text-red-700">{unreadCount}</div>
                    <div className="text-red-600">Belum Dibaca</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger render={
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          {!socketConnected && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white" />
          )}
        </Button>
      } />
      
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-none shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Notifikasi</CardTitle>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllAsRead()}
                    disabled={isMarkingAllAsRead}
                    className="text-xs"
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Tandai Semua
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowSettings(true)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              {unreadCount > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {unreadCount} notifikasi belum dibaca
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Semua notifikasi sudah dibaca
                </p>
              )}
              <div className="flex items-center gap-1">
                {socketConnected ? (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Real-time
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-orange-600">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    Polling
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-80">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Tidak ada notifikasi</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification, index) => (
                    <div key={notification.id}>
                      <div
                        className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors group ${
                          !notification.isRead ? 'bg-blue-50/80 border-l-4 border-l-blue-500' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-lg mt-0.5">
                            {typeIcons[notification.type as keyof typeof typeIcons] || '📢'}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className={`text-sm font-medium line-clamp-1 ${
                                !notification.isRead ? 'font-semibold' : ''
                              }`}>
                                {notification.title}
                              </h4>
                              <div className="flex items-center gap-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                                  priorityColors[notification.priority]
                                }`}>
                                  {notification.priority}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteNotification(notification.id)
                                  }}
                                  disabled={isDeletingNotification}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground">
                                {formatTimeAgo(notification.createdAt)}
                              </span>
                              {notification.sender && (
                                <span className="text-xs text-muted-foreground">
                                  dari {notification.sender.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {index < notifications.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {notifications.length > 0 && (
              <>
                <Separator />
                <div className="p-3">
                  <Button variant="outline" className="w-full text-sm">
                    Lihat Semua Notifikasi
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}