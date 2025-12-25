import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { notificationsApi } from '@/lib/api';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRealtime } from '@/lib/realtime-context';

interface Notification {
  notification_id: number;
  user_id: string;
  notification_text: string;
  notification_date: string;
  is_read: boolean;
  type?: string;
  related_post_id?: string;
  related_user_id?: string;
  related_user?: {
    username?: string;
    profile_picture?: string;
  };
}

const NOTIFICATION_TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
];

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { isConnected, onNewNotification } = useRealtime();

  // Load notifications on mount and when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadNotifications();
      }
    }, [user])
  );

  // Subscribe to real-time notifications
  useEffect(() => {
    const unsubscribe = onNewNotification((update) => {
      const newNotification: Notification = {
        notification_id: parseInt(update.notification.id) || Date.now(),
        user_id: user?.id || '',
        notification_text: update.notification.text,
        notification_date: update.notification.createdAt,
        is_read: update.notification.isRead,
        type: update.notification.type,
      };
      
      setNotifications(prev => [newNotification, ...prev]);
    });

    return unsubscribe;
  }, [onNewNotification, user?.id]);

  const loadNotifications = async () => {
    try {
      const response = await notificationsApi.getAll();
      if (response.status === 'success' && response.data?.notifications) {
        setNotifications(response.data.notifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
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

  const getFilteredNotifications = () => {
    if (activeTab === 'unread') {
      return notifications.filter(n => !n.is_read);
    }
    return notifications;
  };

  const getNotificationIcon = (text: string, type?: string) => {
    const lowerText = text.toLowerCase();
    if (type === 'like' || lowerText.includes('liked')) return { name: 'favorite', color: '#ff2d55', bg: 'rgba(255, 45, 85, 0.15)' };
    if (type === 'comment' || lowerText.includes('commented')) return { name: 'chat-bubble', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)' };
    if (type === 'follow' || lowerText.includes('followed')) return { name: 'person-add', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
    if (lowerText.includes('approved')) return { name: 'check-circle', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
    if (lowerText.includes('rejected')) return { name: 'cancel', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
    if (lowerText.includes('mention')) return { name: 'alternate-email', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' };
    return { name: 'notifications', color: '#666', bg: 'rgba(102, 102, 102, 0.15)' };
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      const now = new Date();
      const date = new Date(dateString);
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSeconds < 60) return 'just now';
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return 'recently';
    }
  };

  const handleNotificationPress = (item: Notification) => {
    // Mark as read first
    if (!item.is_read) {
      markAsRead(item.notification_id);
    }
    
    // Navigate based on notification type
    const lowerText = item.notification_text.toLowerCase();
    if (item.related_post_id) {
      router.push({
        pathname: '/post/[id]',
        params: { id: item.related_post_id }
      });
    } else if (item.related_user_id) {
      router.push({
        pathname: '/user/[id]',
        params: { id: item.related_user_id }
      });
    } else if (lowerText.includes('post')) {
      // Try to extract post reference
      router.push('/(tabs)');
    }
  };

  const renderNotification = ({ item, index }: { item: Notification; index: number }) => {
    const icon = getNotificationIcon(item.notification_text, item.type);
    
    return (
      <Animated.View>
        <TouchableOpacity
          style={[
            styles.notificationItem,
            !item.is_read && styles.notificationItemUnread
          ]}
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.notificationIcon, { backgroundColor: icon.bg }]}>
            <MaterialIcons name={icon.name as any} size={20} color={icon.color} />
          </View>
          
          <View style={styles.notificationContent}>
            <Text style={[
              styles.notificationText,
              !item.is_read && styles.notificationTextUnread
            ]}>
              {item.notification_text}
            </Text>
            <Text style={styles.notificationTime}>
              {formatTimeAgo(item.notification_date)}
            </Text>
          </View>
          
          {!item.is_read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        
        <View style={styles.loginPrompt}>
          <View style={styles.loginIconContainer}>
            <Feather name="bell" size={48} color="#60a5fa" />
          </View>
          <Text style={styles.loginPromptTitle}>Stay in the loop</Text>
          <Text style={styles.loginPromptText}>
            Sign in to see your notifications
          </Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/auth/login')}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const filteredNotifications = getFilteredNotifications();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {isConnected && (
            <View style={styles.connectedIndicator}>
              <View style={styles.connectedDot} />
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
            <Feather name="check-circle" size={14} color="#60a5fa" />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {NOTIFICATION_TABS.map((tab) => {
          const count = tab.key === 'unread' ? unreadCount : notifications.length;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.tabActive
              ]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive
              ]}>
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={[
                  styles.tabBadge,
                  activeTab === tab.key && styles.tabBadgeActive
                ]}>
                  <Text style={[
                    styles.tabBadgeText,
                    activeTab === tab.key && styles.tabBadgeTextActive
                  ]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#60a5fa" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.notification_id.toString()}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#60a5fa"
              colors={['#60a5fa']}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Feather 
                  name={activeTab === 'unread' ? 'check-circle' : 'bell'} 
                  size={48} 
                  color="#3b82f6" 
                />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === 'unread' ? 'All caught up!' : 'No notifications yet'}
              </Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'unread' 
                  ? 'You\'ve read all your notifications'
                  : 'Notifications will appear here when you get activity'
                }
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  connectedIndicator: {
    padding: 4,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.2)',
  },
  markAllText: {
    color: '#60a5fa',
    fontSize: 13,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#60a5fa',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#000',
  },
  tabBadge: {
    backgroundColor: '#333',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  tabBadgeText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
  },
  tabBadgeTextActive: {
    color: '#000',
  },
  listContent: {
    paddingBottom: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  notificationItemUnread: {
    backgroundColor: 'rgba(96, 165, 250, 0.05)',
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTextUnread: {
    color: '#fff',
    fontWeight: '500',
  },
  notificationTime: {
    color: '#666',
    fontSize: 12,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#60a5fa',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
  },
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loginIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loginPromptTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  loginPromptText: {
    color: '#888',
    fontSize: 15,
    marginBottom: 32,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#60a5fa',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 25,
  },
  loginButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
