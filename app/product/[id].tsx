import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  useColorScheme,
  Share,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { productsApi } from '@/lib/products-api';
import { Product } from '@/types';
import { Card, Chip, Button, Divider } from 'react-native-paper';
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

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme() || 'light';
  const colors = COLORS[colorScheme];

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await productsApi.getById(id as string);
        if (response.status === 'success' && response.data) {
          setProduct(response.data);
        } else {
          setError(response.message || 'Failed to fetch product');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch product');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleWhatsAppContact = async () => {
    if (!product) return;
    const message = WhatsAppService.generateProductInquiryMessage(product);
    await WhatsAppService.contactSeller(product, message);
  };

  const handleCall = async () => {
    if (!product?.seller?.phone) return;
    
    const phoneUrl = `tel:${product.seller.phone}`;
    const canCall = await Linking.canOpenURL(phoneUrl);
    
    if (canCall) {
      Linking.openURL(phoneUrl);
    } else {
      Alert.alert('Error', 'Cannot make phone calls on this device');
    }
  };

  const handleShare = async () => {
    if (!product) return;
    
    try {
      await Share.share({
        message: `Check out this product: ${product.name} - ${product.price.toLocaleString()} ${product.currency}`,
        title: product.name,
        url: product.image,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return `${price.toLocaleString()} ${currency}`;
  };

  const getCategoryColor = (category: string) => {
    const categoryColors: { [key: string]: string } = {
      chemicals: '#ef4444',
      tools: '#f97316',
      seeds: '#22c55e',
      fertilizers: '#84cc16',
      equipment: '#3b82f6',
    };
    return categoryColors[category] || '#6b7280';
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading product...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <MaterialIcons name="error-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.text }]}>{error || 'Product not found'}</Text>
        <Button mode="contained" onPress={() => router.back()}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {product.name}
        </Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <MaterialIcons name="share" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: product.image }} style={styles.productImage} />
          {!product.inStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <Card style={[styles.infoCard, { backgroundColor: colors.card }]} mode="elevated">
          <View style={styles.cardContent}>
            <View style={styles.titleRow}>
              <Text style={[styles.productName, { color: colors.text }]}>
                {product.name}
              </Text>
              <Chip 
                mode="flat" 
                style={{ backgroundColor: getCategoryColor(product.category) }}
                textStyle={{ color: '#fff', fontSize: 12 }}
              >
                {product.category.toUpperCase()}
              </Chip>
            </View>

            <Text style={[styles.productDescription, { color: colors.textSecondary }]}>
              {product.description}
            </Text>

            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: colors.primary }]}>
                {formatPrice(product.price, product.currency)}
              </Text>
              <Text style={[styles.unit, { color: colors.textSecondary }]}>
                per {product.unit}
              </Text>
            </View>

            {product.brand && (
              <View style={styles.brandRow}>
                <MaterialIcons name="verified" size={16} color={colors.secondary} />
                <Text style={[styles.brandText, { color: colors.text }]}>
                  Brand: {product.brand}
                </Text>
              </View>
            )}

            <View style={styles.stockRow}>
              <MaterialIcons 
                name={product.inStock ? 'check-circle' : 'cancel'} 
                size={16} 
                color={product.inStock ? colors.primary : '#ef4444'} 
              />
              <Text style={[
                styles.stockText, 
                { color: product.inStock ? colors.primary : '#ef4444' }
              ]}>
                {product.inStock ? 'In Stock' : 'Out of Stock'}
                {product.stockQuantity && ` (${product.stockQuantity} ${product.unit} available)`}
              </Text>
            </View>
          </View>
        </Card>

        {/* Specifications */}
        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <Card style={[styles.specsCard, { backgroundColor: colors.card }]} mode="elevated">
            <View style={styles.cardContent}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Specifications
              </Text>
              <Divider style={{ marginVertical: 12 }} />
              {Object.entries(product.specifications).map(([key, value]) => (
                <View key={key} style={styles.specRow}>
                  <Text style={[styles.specKey, { color: colors.textSecondary }]}>
                    {key}:
                  </Text>
                  <Text style={[styles.specValue, { color: colors.text }]}>
                    {value}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Seller Info */}
        <Card style={[styles.sellerCard, { backgroundColor: colors.card }]} mode="elevated">
          <View style={styles.cardContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Seller Information
            </Text>
            <Divider style={{ marginVertical: 12 }} />
            
            <View style={styles.sellerRow}>
              <MaterialIcons name="store" size={20} color={colors.secondary} />
              <Text style={[styles.sellerText, { color: colors.text }]}>
                {product.seller.name}
              </Text>
            </View>
            
            <View style={styles.sellerRow}>
              <MaterialIcons name="phone" size={20} color={colors.secondary} />
              <Text style={[styles.sellerText, { color: colors.text }]}>
                {product.seller.phone}
              </Text>
            </View>
            
            {product.seller.location && (
              <View style={styles.sellerRow}>
                <MaterialIcons name="location-on" size={20} color={colors.secondary} />
                <Text style={[styles.sellerText, { color: colors.text }]}>
                  {product.seller.location}
                </Text>
              </View>
            )}
          </View>
        </Card>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
        <TouchableOpacity 
          style={[styles.callButton, { backgroundColor: colors.secondary }]}
          onPress={handleCall}
        >
          <MaterialIcons name="phone" size={20} color="#fff" />
          <Text style={styles.callButtonText}>Call</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.whatsappButton, { backgroundColor: '#25d366' }]}
          onPress={handleWhatsAppContact}
          disabled={!product.inStock}
        >
          <MaterialIcons name="chat" size={20} color="#fff" />
          <Text style={styles.whatsappButtonText}>
            {product.inStock ? 'WhatsApp Seller' : 'Out of Stock'}
          </Text>
        </TouchableOpacity>
      </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  shareButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    height: 250,
    backgroundColor: '#f0f0f0',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoCard: {
    margin: 16,
    borderRadius: 12,
  },
  specsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  sellerCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  cardContent: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productName: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 12,
    lineHeight: 26,
  },
  productDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8,
  },
  unit: {
    fontSize: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  specKey: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  specValue: {
    fontSize: 14,
    flex: 2,
    textAlign: 'right',
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sellerText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  callButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  whatsappButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  whatsappButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});