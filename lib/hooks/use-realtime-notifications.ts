import { useEffect, useState } from 'react';
import websocketService, { NotificationUpdate } from '../websocket-service';

export const useRealtimeNotifications = () => {
  const [newNotifications, setNewNotifications] = useState<NotificationUpdate['notification'][]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handleNewNotification = (update: NotificationUpdate) => {
      setNewNotifications(prev => [update.notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    websocketService.on('newNotification', handleNewNotification);

    return () => {
      websocketService.off('newNotification', handleNewNotification);
    };
  }, []);

  const markNotificationAsRead = (notificationId: string) => {
    setNewNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, isRead: true }
          : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const clearNewNotifications = () => {
    setNewNotifications([]);
    setUnreadCount(0);
  };

  return {
    newNotifications,
    unreadCount,
    markNotificationAsRead,
    clearNewNotifications,
  };
}; 