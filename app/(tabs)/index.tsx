import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  useColorScheme,
  Dimensions,
  StatusBar,
  SafeAreaView,
  TextInput,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { productsApi } from '@/lib/products-api';
import { Product, Category } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Chip, Searchbar, FAB, Badge } from 'react-native-paper';
import { WhatsAppService } from '@/lib/whatsapp-service';

const { width: screenWidth } = Dimensions.get('window');

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

export default function HomeScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() || 'light';
  const colors = COLORS[colorScheme];

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, searchQuery]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [productsResponse, categoriesResponse] = await Promise.all([
        productsApi.getAll(),
        productsApi.getCategories(),
      ]);

      if (productsResponse.status === 'success') {
        setProducts(productsResponse.data);
      }

      if (categoriesResponse.status === 'success') {
        setCategories(categoriesResponse.data);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await productsApi.getAll(
        selectedCategory === 'all' ? undefined : selectedCategory,
        searchQuery
      );

      if (response.status === 'success') {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const handleProductPress = (product: Product) => {
    router.push({
      pathname: '/product/[id]',
      params: { id: product.id }
    });
  };

  const handleWhatsAppContact = async (product: Product) => {
    const message = WhatsAppService.generateProductInquiryMessage(product);
    await WhatsAppService.contactSeller(product, message);
  };

  const formatPrice = (price: number, currency: string) => {
    return `${price.toLocaleString()} ${currency}`;
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.icon || 'category';
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <Card style={[styles.productCard, { backgroundColor: colors.card }]} mode="elevated">
      <TouchableOpacity onPress={() => handleProductPress(item)}>
        <View style={styles.productImageContainer}>
          <Image source={{ uri: item.image }} style={styles.productImage} />
          <View style={styles.categoryBadge}>
            <MaterialIcons 
              name={getCategoryIcon(item.category) as any} 
              size={16} 
              color="#fff" 
            />
          </View>
          {!item.inStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
        </View>
        
        <View style={styles.productContent}>
          <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          
          <Text style={[styles.productDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
          
          <View style={styles.productMeta}>
            <Text style={[styles.productPrice, { color: colors.primary }]}>
              {formatPrice(item.price, item.currency)}
            </Text>
            <Text style={[styles.productUnit, { color: colors.textSecondary }]}>
              per {item.unit}
            </Text>
          </View>
          
          {item.brand && (
            <Chip 
              mode="outlined" 
              compact 
              style={styles.brandChip}
              textStyle={{ fontSize: 10 }}
            >
              {item.brand}
            </Chip>
          )}
          
          <View style={styles.productActions}>
            <TouchableOpacity 
              style={[styles.whatsappButton, { backgroundColor: '#25d366' }]}
              onPress={() => handleWhatsAppContact(item)}
            >
              <MaterialIcons name="chat" size={16} color="#fff" />
              <Text style={styles.whatsappButtonText}>WhatsApp</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.detailsButton, { backgroundColor: colors.secondary }]}
              onPress={() => handleProductPress(item)}
            >
              <Text style={styles.detailsButtonText}>Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        { 
          backgroundColor: selectedCategory === item.id ? item.color : colors.surface,
          borderColor: item.color,
        }
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <MaterialIcons 
        name={item.icon as any} 
        size={24} 
        color={selectedCategory === item.id ? '#fff' : item.color} 
      />
      <Text style={[
        styles.categoryText,
        { color: selectedCategory === item.id ? '#fff' : colors.text }
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading products...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.background} 
      />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
              Welcome to
            </Text>
            <Text style={[styles.appTitle, { color: colors.text }]}>
              FarmMarket Pro 🌾
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.searchToggle}
            onPress={() => setSearchVisible(!searchVisible)}
          >
            <MaterialIcons 
              name={searchVisible ? 'close' : 'search'} 
              size={24} 
              color={colors.text} 
            />
          </TouchableOpacity>
        </View>
        
        {searchVisible && (
          <Searchbar
            placeholder="Search products, brands..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={[styles.searchBar, { backgroundColor: colors.background }]}
            inputStyle={{ color: colors.text }}
            iconColor={colors.textSecondary}
          />
        )}
      </View>

      {/* Categories */}
      <View style={styles.categoriesSection}>
        <FlatList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Products Grid */}
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.productsList}
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
            <MaterialIcons name="inventory-2" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              No products found
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Try adjusting your search or category filter
            </Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <FAB
        icon="chat"
        label="Contact Us"
        style={[styles.fab, { backgroundColor: '#25d366' }]}
        onPress={() => WhatsAppService.contactBusiness('Hello! I need help with farming products.')}
        color="#fff"
      />
    </SafeAreaView>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '400',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  searchToggle: {
    padding: 8,
    borderRadius: 20,
  },
  searchBar: {
    marginTop: 12,
    elevation: 0,
  },
  categoriesSection: {
    paddingVertical: 16,
  },
  categoriesList: {
    paddingHorizontal: 20,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 25,
    borderWidth: 1,
    minWidth: 100,
  },
  categoryText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  productsList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    width: (screenWidth - 48) / 2,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  productImageContainer: {
    position: 'relative',
    height: 140,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: 4,
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  productContent: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    lineHeight: 18,
  },
  productDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 4,
  },
  productUnit: {
    fontSize: 12,
  },
  brandChip: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    height: 24,
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  whatsappButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  whatsappButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  detailsButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  detailsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 80,
  },
});