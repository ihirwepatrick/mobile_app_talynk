import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  useColorScheme,
  Image,
  Dimensions,
} from 'react-native';
import { notificationsApi } from '@/lib/api';
import { router } from 'expo-router';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useRealtimeNotifications } from '@/lib/hooks/use-realtime-notifications';

const { width: screenWidth } = Dimensions.get('window');

// Updated Notification interface based on the actual API response
interface Notification {
  notification_id: number;
  user_id: string;
  notification_text: string;
  notification_date: string;
  is_read: boolean;
}

const COLORS = {
  dark: {
    background: '#000000',
    card: '#1a1a1a',
    border: '#2a2a2a',
    text: '#ffffff',
    textSecondary: '#8e8e93',
    textTertiary: '#666666',
    primary: '#ff2d55',
    secondary: '#5856d6',
    success: '#34c759',
    warning: '#ff9500',
    error: '#ff3b30',
    unreadBg: '#1e1e1e',
    unreadBorder: '#ff2d55',
    tabActive: '#ff2d55',
    tabInactive: '#2a2a2a',
    tabTextActive: '#ffffff',
    tabTextInactive: '#8e8e93',
  },
  light: {
    background: '#f8fafc',
    card: '#ffffff',
    border: '#e2e8f0',
    text: '#1e293b',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    primary: '#ff2d55',
    secondary: '#5856d6',
    success: '#34c759',
    warning: '#ff9500',
    error: '#ff3b30',
    unreadBg: '#fef2f2',
    unreadBorder: '#ff2d55',
    tabActive: '#ff2d55',
    tabInactive: '#f1f5f9',
    tabTextActive: '#ffffff',
    tabTextInactive: '#64748b',
  },
};

const TABS = [
  { key: 'unread', label: 'Unread', icon: 'notifications-active' },
  { key: 'read', label: 'Read', icon: 'notifications-none' },
];

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'unread' | 'read'>('unread');
  const { newNotifications, unreadCount: realtimeUnreadCount } = useRealtimeNotifications();
  const colorScheme = useColorScheme() || 'dark';
  const C = COLORS[colorScheme];

  const loadNotifications = async (refresh = false) => {
    try {
      const response = await notificationsApi.getAll();
      if (response.status === 'success' && response.data?.notifications && Array.isArray(response.data.notifications)) {
        // Filter out any invalid notifications
        const validNotifications = response.data.notifications.filter(
          (notification: any) => notification && typeof notification === 'object'
        );
        setNotifications(validNotifications);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications(true);
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notification =>
          notification.notification_id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, is_read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationType = (text: string) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('commented')) return 'comment';
    if (lowerText.includes('approved')) return 'approval';
    if (lowerText.includes('rejected')) return 'rejection';
    if (lowerText.includes('liked')) return 'like';
    if (lowerText.includes('followed')) return 'follow';
    if (lowerText.includes('mentioned')) return 'mention';
    return 'general';
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return { name: 'chat-bubble', color: C.secondary };
      case 'approval':
        return { name: 'check-circle', color: C.success };
      case 'rejection':
        return { name: 'cancel', color: C.error };
      case 'like':
        return { name: 'favorite', color: C.primary };
      case 'follow':
        return { name: 'person-add', color: C.warning };
      case 'mention':
        return { name: 'alternate-email', color: C.secondary };
      default:
        return { name: 'notifications', color: C.textSecondary };
    }
  };

  const getFilteredNotifications = () => {
    return notifications.filter(notification => 
      activeTab === 'unread' ? !notification.is_read : notification.is_read
    );
  };

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return 'Just now';
    
    try {
      const now = new Date();
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) return 'Just now';
      
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSeconds < 60) return `${diffInSeconds}s`;
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) return `${diffInMinutes}m`;
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h`;
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d`;
      return date.toLocaleDateString();
    } catch (error) {
      return 'Just now';
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    // Safety check for undefined notification
    if (!notification || !notification.notification_id) return;
    
    // Mark as read first
    markAsRead(notification.notification_id);
    
    // For now, just mark as read since we don't have post/user IDs in the response
    // In the future, you could extract post IDs from the notification text
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    // Safety check for undefined item
    if (!item) return null;
    
    const type = getNotificationType(item.notification_text);
    const icon = getNotificationIcon(type);
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          { backgroundColor: C.card, borderColor: C.border },
          !item.is_read && { backgroundColor: C.unreadBg, borderLeftColor: C.unreadBorder },
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        {/* Notification Icon */}
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: icon.color }]}>
            <MaterialIcons name={icon.name as any} size={20} color="#fff" />
          </View>
        </View>

        {/* Notification Content */}
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationText, { color: C.text }]}>
            {item.notification_text}
          </Text>
          <Text style={[styles.notificationDate, { color: C.textSecondary }]}>
            {formatTimeAgo(item.notification_date)}
          </Text>
        </View>

        {/* Unread Indicator */}
        {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: C.primary }]} />}
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter(n => !n.is_read).length + realtimeUnreadCount;
  const readCount = notifications.filter(n => n.is_read).length;

  if (loading && notifications.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
            <Text style={[styles.markAllReadText, { color: C.primary }]}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        {TABS.map((tab) => {
          const count = tab.key === 'unread' ? unreadCount : readCount;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                { backgroundColor: activeTab === tab.key ? C.tabActive : C.tabInactive }
              ]}
              onPress={() => setActiveTab(tab.key as 'unread' | 'read')}
            >
              <MaterialIcons 
                name={tab.icon as any} 
                size={16} 
                color={activeTab === tab.key ? C.tabTextActive : C.tabTextInactive} 
              />
              <Text style={[
                styles.tabLabel,
                { color: activeTab === tab.key ? C.tabTextActive : C.tabTextInactive }
              ]}>
                {tab.label} {count > 0 && `(${count})`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={getFilteredNotifications()}
        renderItem={renderNotification}
        keyExtractor={(item, index) => (item?.notification_id?.toString() || `notification-${index}`)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons 
              name={activeTab === 'unread' ? 'notifications-none' : 'notifications-off'} 
              size={80} 
              color={C.textSecondary} 
            />
            <Text style={[styles.emptyText, { color: C.text }]}>
              {activeTab === 'unread' ? 'No unread notifications' : 'No read notifications'}
            </Text>
            <Text style={[styles.emptySubtext, { color: C.textSecondary }]}>
              {activeTab === 'unread' 
                ? 'You\'re all caught up! New notifications will appear here.'
                : 'Notifications you\'ve read will appear here.'
              }
            </Text>
          </View>
        }
        contentContainerStyle={getFilteredNotifications().length === 0 ? { flex: 1 } : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  markAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  markAllReadText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    gap: 8,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  notificationCard: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    marginRight: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 6,
    fontWeight: '500',
  },
  notificationDate: {
    fontSize: 13,
    fontWeight: '400',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
}); 