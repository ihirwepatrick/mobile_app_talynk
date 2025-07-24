import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  useColorScheme,
  Dimensions,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { productsApi } from '@/lib/products-api';
import { Product, Category } from '@/types';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, Searchbar, Chip, FAB } from 'react-native-paper';
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

const PRICE_RANGES = [
  { id: 'all', label: 'All Prices', min: 0, max: Infinity },
  { id: 'under-10k', label: 'Under 10,000 RWF', min: 0, max: 10000 },
  { id: '10k-50k', label: '10,000 - 50,000 RWF', min: 10000, max: 50000 },
  { id: '50k-100k', label: '50,000 - 100,000 RWF', min: 50000, max: 100000 },
  { id: 'over-100k', label: 'Over 100,000 RWF', min: 100000, max: Infinity },
];

export default function ExploreScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
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
      console.error('Error loading data:', error);
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

  const getFilteredProducts = () => {
    let filtered = [...products];

    // Apply price filter
    if (selectedPriceRange !== 'all') {
      const priceRange = PRICE_RANGES.find(r => r.id === selectedPriceRange);
      if (priceRange) {
        filtered = filtered.filter(p => p.price >= priceRange.min && p.price <= priceRange.max);
      }
    }

    return filtered;
  };

  const handleProductPress = (product: Product) => {
    router.push({
      pathname: '/product/[id]',
      params: { id: product.id }
    });
  };

  const handleQuickContact = async (product: Product) => {
    const message = `Hi! I'm interested in ${product.name}. Is it available?`;
    await WhatsAppService.contactSeller(product, message);
  };

  const formatPrice = (price: number, currency: string) => {
    return `${price.toLocaleString()} ${currency}`;
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || '#6b7280';
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <Card style={[styles.productCard, { backgroundColor: colors.card }]} mode="elevated">
      <TouchableOpacity onPress={() => handleProductPress(item)}>
        <View style={styles.productImageContainer}>
          <Image source={{ uri: item.image }} style={styles.productImage} />
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
            <Text style={styles.categoryBadgeText}>{item.category.toUpperCase()}</Text>
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
          
          <View style={styles.priceRow}>
            <Text style={[styles.productPrice, { color: colors.primary }]}>
              {formatPrice(item.price, item.currency)}
            </Text>
            <Text style={[styles.productUnit, { color: colors.textSecondary }]}>
              /{item.unit}
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
              style={[styles.quickContactButton, { backgroundColor: '#25d366' }]}
              onPress={() => handleQuickContact(item)}
              disabled={!item.inStock}
            >
              <MaterialIcons name="chat" size={14} color="#fff" />
              <Text style={styles.quickContactText}>Quick Contact</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.sellerInfo}>
            <MaterialIcons name="store" size={12} color={colors.textSecondary} />
            <Text style={[styles.sellerName, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.seller.name}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        { 
          backgroundColor: selectedCategory === item.id ? item.color : colors.surface,
          borderColor: item.color,
        }
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <MaterialIcons 
        name={item.icon as any} 
        size={16} 
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

  const renderPriceRange = ({ item }: { item: typeof PRICE_RANGES[0] }) => (
    <Chip
      mode={selectedPriceRange === item.id ? 'flat' : 'outlined'}
      selected={selectedPriceRange === item.id}
      onPress={() => setSelectedPriceRange(item.id)}
      style={styles.priceChip}
      textStyle={{ fontSize: 12 }}
    >
      {item.label}
    </Chip>
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Explore Products 🔍
        </Text>
        <TouchableOpacity 
          style={styles.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <MaterialIcons 
            name="tune" 
            size={24} 
            color={colors.text} 
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <Searchbar
          placeholder="Search farming products..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: colors.surface }]}
          inputStyle={{ color: colors.text }}
          iconColor={colors.textSecondary}
        />
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={[styles.filtersSection, { backgroundColor: colors.surface }]}>
          {/* Categories */}
          <Text style={[styles.filterTitle, { color: colors.text }]}>Categories</Text>
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
          
          {/* Price Ranges */}
          <Text style={[styles.filterTitle, { color: colors.text }]}>Price Range</Text>
          <FlatList
            data={PRICE_RANGES}
            renderItem={renderPriceRange}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.priceRangesList}
          />
        </View>
      )}

      {/* Products Grid */}
      <FlatList
        data={getFilteredProducts()}
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
            <MaterialIcons name="search-off" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              No products found
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Try adjusting your search or filters
            </Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <FAB
        icon="headset"
        label="Need Help?"
        style={[styles.fab, { backgroundColor: colors.secondary }]}
        onPress={() => WhatsAppService.contactBusiness('Hello! I need help finding farming products.')}
        color="#fff"
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
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
  filterToggle: {
    padding: 8,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    elevation: 0,
    borderRadius: 12,
  },
  filtersSection: {
    paddingVertical: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 16,
    marginBottom: 8,
  },
  categoriesList: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  priceRangesList: {
    paddingHorizontal: 16,
  },
  priceChip: {
    marginRight: 8,
    marginBottom: 4,
  },
  productsList: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    width: (screenWidth - 36) / 2,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  productImageContainer: {
    position: 'relative',
    height: 120,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
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
    fontSize: 12,
  },
  productContent: {
    padding: 12,
  },
  productName: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
    lineHeight: 16,
  },
  productDescription: {
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  productUnit: {
    fontSize: 10,
  },
  brandChip: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    height: 20,
  },
  productActions: {
    marginBottom: 8,
  },
  quickContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  quickContactText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sellerName: {
    fontSize: 10,
    flex: 1,
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