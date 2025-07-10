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
} from 'react-native';
import { notificationsApi } from '@/lib/api';
import { Notification } from '@/types';

const COLORS = {
  dark: {
    background: '#18181b',
    card: '#232326',
    border: '#27272a',
    text: '#f3f4f6',
    textSecondary: '#a1a1aa',
    primary: '#60a5fa',
    buttonBg: '#60a5fa',
    buttonText: '#fff',
    spinner: '#60a5fa',
    unreadBg: '#1e3a8a',
    unreadBorder: '#60a5fa',
  },
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme() || 'dark';
  const C = COLORS.dark;

  const loadNotifications = async (refresh = false) => {
    try {
      const response = await notificationsApi.getAll();
      if (response.status === 'success') {
        setNotifications(response.data);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
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

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        { backgroundColor: C.card, borderColor: C.border },
        !item.is_read && { backgroundColor: C.unreadBg, borderLeftColor: C.unreadBorder },
      ]}
      onPress={() => markAsRead(item.notification_id)}
    >
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationText, { color: C.text }]}>{item.notification_text}</Text>
        <Text style={[styles.notificationDate, { color: C.textSecondary }]}>
          {new Date(item.notification_date).toLocaleDateString()}
        </Text>
      </View>
      {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: C.primary }]} />}
    </TouchableOpacity>
  );

  if (loading && notifications.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.spinner} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {notifications.length > 0 && (
        <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
          <Text style={[styles.headerTitle, { color: C.text }]}>Notifications</Text>
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={[styles.markAllReadText, { color: C.primary }]}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.notification_id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.spinner]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: C.text }]}>No notifications</Text>
            <Text style={[styles.emptySubtext, { color: C.textSecondary }]}>
              You're all caught up! New notifications will appear here.
            </Text>
          </View>
        }
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
    padding: 15,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  markAllReadText: {
    fontSize: 14,
    fontWeight: '500',
  },
  notificationCard: {
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 5,
  },
  notificationDate: {
    fontSize: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
}); 