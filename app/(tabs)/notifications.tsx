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
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, Chip, Button, Badge } from 'react-native-paper';
import { WhatsAppService } from '@/lib/whatsapp-service';

const COLORS = {
  light: {
    background: '#f8fafc',
    card: '#ffffff',
    text: '#1e293b',
    textSecondary: '#64748b',
    primary: '#22c55e',
    secondary: '#3b82f6',
    accent: '#f59e0b',
    surface: '#ffffff',
    outline: '#e2e8f0',
  },
  dark: {
    background: '#0f172a',
    card: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    primary: '#22c55e',
    secondary: '#60a5fa',
    accent: '#fbbf24',
    surface: '#1e293b',
    outline: '#334155',
  },
};

// Mock orders data
const MOCK_ORDERS = [
  {
    id: '1',
    productName: 'Roundup Herbicide',
    productImage: 'https://images.pexels.com/photos/4022092/pexels-photo-4022092.jpeg',
    quantity: 2,
    unit: 'liters',
    totalPrice: 50000,
    currency: 'RWF',
    status: 'pending',
    orderDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    seller: {
      name: 'AgriSupply Rwanda',
      phone: '+250788123456',
    },
  },
  {
    id: '2',
    productName: 'NPK Fertilizer 17-17-17',
    productImage: 'https://images.pexels.com/photos/4022090/pexels-photo-4022090.jpeg',
    quantity: 5,
    unit: 'kg',
    totalPrice: 225000,
    currency: 'RWF',
    status: 'confirmed',
    orderDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    seller: {
      name: 'AgriSupply Rwanda',
      phone: '+250788123456',
    },
  },
  {
    id: '3',
    productName: 'Hand Hoe - Premium',
    productImage: 'https://images.pexels.com/photos/4022091/pexels-photo-4022091.jpeg',
    quantity: 1,
    unit: 'pieces',
    totalPrice: 8500,
    currency: 'RWF',
    status: 'delivered',
    orderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    seller: {
      name: 'Rwanda Farm Tools',
      phone: '+250789654321',
    },
  },
];

const ORDER_STATUSES = [
  { key: 'all', label: 'All Orders', color: '#6b7280' },
  { key: 'pending', label: 'Pending', color: '#f59e0b' },
  { key: 'confirmed', label: 'Confirmed', color: '#3b82f6' },
  { key: 'delivered', label: 'Delivered', color: '#22c55e' },
  { key: 'cancelled', label: 'Cancelled', color: '#ef4444' },
];

export default function OrdersScreen() {
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const colorScheme = useColorScheme() || 'light';
  const colors = COLORS[colorScheme];

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const getFilteredOrders = () => {
    if (selectedStatus === 'all') return orders;
    return orders.filter(order => order.status === selectedStatus);
  };

  const getStatusColor = (status: string) => {
    const statusConfig = ORDER_STATUSES.find(s => s.key === status);
    return statusConfig?.color || '#6b7280';
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleContactSeller = async (order: any) => {
    const message = `Hello! I'm contacting you regarding my order #${order.id} for ${order.productName}. Could you please provide an update?`;
    await WhatsAppService.sendMessage(order.seller.phone, message);
  };

  const renderOrder = ({ item }: { item: any }) => (
    <Card style={[styles.orderCard, { backgroundColor: colors.card }]} mode="elevated">
      <View style={styles.orderContent}>
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={[styles.orderId, { color: colors.textSecondary }]}>
              Order #{item.id}
            </Text>
            <Text style={[styles.orderDate, { color: colors.textSecondary }]}>
              {formatTimeAgo(item.orderDate)}
            </Text>
          </View>
          <Chip 
            mode="flat"
            style={{ backgroundColor: getStatusColor(item.status) }}
            textStyle={{ color: '#fff', fontSize: 10 }}
          >
            {item.status.toUpperCase()}
          </Chip>
        </View>

        <View style={styles.productInfo}>
          <Image source={{ uri: item.productImage }} style={styles.productImage} />
          <View style={styles.productDetails}>
            <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
              {item.productName}
            </Text>
            <Text style={[styles.productQuantity, { color: colors.textSecondary }]}>
              Qty: {item.quantity} {item.unit}
            </Text>
            <Text style={[styles.productPrice, { color: colors.primary }]}>
              {item.totalPrice.toLocaleString()} {item.currency}
            </Text>
          </View>
        </View>

        <View style={styles.sellerInfo}>
          <MaterialIcons name="store" size={16} color={colors.textSecondary} />
          <Text style={[styles.sellerName, { color: colors.textSecondary }]}>
            {item.seller.name}
          </Text>
        </View>

        <View style={styles.orderActions}>
          <Button
            mode="outlined"
            onPress={() => handleContactSeller(item)}
            style={styles.contactButton}
            labelStyle={{ fontSize: 12 }}
            icon="chat"
          >
            Contact Seller
          </Button>
          
          {item.status === 'delivered' && (
            <Button
              mode="contained"
              style={[styles.reviewButton, { backgroundColor: colors.secondary }]}
              labelStyle={{ fontSize: 12 }}
              icon="star"
            >
              Review
            </Button>
          )}
        </View>
      </View>
    </Card>
  );

  const renderStatusFilter = ({ item }: { item: typeof ORDER_STATUSES[0] }) => (
    <Chip
      mode={selectedStatus === item.key ? 'flat' : 'outlined'}
      selected={selectedStatus === item.key}
      onPress={() => setSelectedStatus(item.key)}
      style={[
        styles.statusChip,
        selectedStatus === item.key && { backgroundColor: item.color }
      ]}
      textStyle={{ 
        fontSize: 12,
        color: selectedStatus === item.key ? '#fff' : colors.text
      }}
    >
      {item.label}
    </Chip>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          My Orders 📋
        </Text>
        <Badge 
          style={{ backgroundColor: colors.primary }}
          visible={orders.filter(o => o.status === 'pending').length > 0}
        >
          {orders.filter(o => o.status === 'pending').length}
        </Badge>
      </View>

      {/* Status Filters */}
      <View style={styles.filtersSection}>
        <FlatList
          data={ORDER_STATUSES}
          renderItem={renderStatusFilter}
          keyExtractor={(item) => item.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusFiltersList}
        />
      </View>

      {/* Orders List */}
      <FlatList
        data={getFilteredOrders()}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.ordersList}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="shopping-cart" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              No orders found
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              {selectedStatus === 'all' 
                ? 'Start shopping to see your orders here'
                : `No ${selectedStatus} orders found`
              }
            </Text>
            <Button
              mode="contained"
              onPress={() => router.push('/(tabs)')}
              style={[styles.shopButton, { backgroundColor: colors.primary }]}
            >
              Start Shopping
            </Button>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  filtersSection: {
    paddingVertical: 12,
  },
  statusFiltersList: {
    paddingHorizontal: 16,
  },
  statusChip: {
    marginRight: 8,
  },
  ordersList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  orderCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  orderContent: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 11,
    marginTop: 2,
  },
  productInfo: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  productQuantity: {
    fontSize: 12,
    marginTop: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  sellerName: {
    fontSize: 12,
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  contactButton: {
    flex: 1,
    borderRadius: 8,
  },
  reviewButton: {
    flex: 1,
    borderRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  shopButton: {
    borderRadius: 12,
  },
});