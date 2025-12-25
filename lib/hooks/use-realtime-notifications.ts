import { useEffect, useState, useCallback } from 'react';
import { useRealtime } from '../realtime-context';
import { NotificationUpdate } from '../websocket-service';

export const useRealtimeNotifications = () => {
  const { onNewNotification, isConnected } = useRealtime();
  const [newNotifications, setNewNotifications] = useState<NotificationUpdate['notification'][]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onNewNotification((update: NotificationUpdate) => {
      setNewNotifications(prev => [update.notification, ...prev]);
      if (!update.notification.isRead) {
        setUnreadCount(prev => prev + 1);
      }
    });

    return unsubscribe;
  }, [onNewNotification]);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNewNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, isRead: true }
          : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const clearNewNotifications = useCallback(() => {
    setNewNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    newNotifications,
    unreadCount,
    isConnected,
    markNotificationAsRead,
    clearNewNotifications,
  };
};
