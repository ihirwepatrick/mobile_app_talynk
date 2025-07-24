import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  useColorScheme,
  Alert,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, TextInput, Button, Chip, HelperText } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { PRODUCT_CATEGORIES } from '@/lib/config';

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
    error: '#ef4444',
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
    error: '#f87171',
  },
};

const UNITS = ['kg', 'liters', 'pieces', 'bags', 'boxes', 'tons'];

export default function AddProductScreen() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    unit: 'kg',
    brand: '',
    stockQuantity: '',
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const colorScheme = useColorScheme() || 'light';
  const colors = COLORS[colorScheme];

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.price.trim()) {
      newErrors.price = 'Price is required';
    } else if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      newErrors.price = 'Please enter a valid price';
    }

    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }

    if (!selectedImage) {
      newErrors.image = 'Please select a product image';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library permissions.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setErrors(prev => ({ ...prev, image: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Success!',
        'Your product has been submitted for review. It will be available once approved.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setFormData({
                name: '',
                description: '',
                price: '',
                category: '',
                unit: 'kg',
                brand: '',
                stockQuantity: '',
              });
              setSelectedImage(null);
              router.replace('/(tabs)');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Add New Product 📦
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Upload */}
        <Card style={[styles.card, { backgroundColor: colors.card }]} mode="elevated">
          <View style={styles.cardContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Product Image
            </Text>
            
            <TouchableOpacity 
              style={[
                styles.imageUploadArea,
                { borderColor: errors.image ? colors.error : colors.outline }
              ]}
              onPress={pickImage}
            >
              {selectedImage ? (
                <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <MaterialIcons name="add-a-photo" size={48} color={colors.textSecondary} />
                  <Text style={[styles.uploadText, { color: colors.textSecondary }]}>
                    Tap to add product image
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            
            {errors.image && (
              <HelperText type="error" visible={!!errors.image}>
                {errors.image}
              </HelperText>
            )}
          </View>
        </Card>

        {/* Basic Information */}
        <Card style={[styles.card, { backgroundColor: colors.card }]} mode="elevated">
          <View style={styles.cardContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Basic Information
            </Text>
            
            <TextInput
              label="Product Name *"
              value={formData.name}
              onChangeText={(value) => updateFormData('name', value)}
              mode="outlined"
              style={styles.input}
              error={!!errors.name}
            />
            {errors.name && (
              <HelperText type="error" visible={!!errors.name}>
                {errors.name}
              </HelperText>
            )}
            
            <TextInput
              label="Description *"
              value={formData.description}
              onChangeText={(value) => updateFormData('description', value)}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
              error={!!errors.description}
            />
            {errors.description && (
              <HelperText type="error" visible={!!errors.description}>
                {errors.description}
              </HelperText>
            )}
            
            <TextInput
              label="Brand (Optional)"
              value={formData.brand}
              onChangeText={(value) => updateFormData('brand', value)}
              mode="outlined"
              style={styles.input}
            />
          </View>
        </Card>

        {/* Category Selection */}
        <Card style={[styles.card, { backgroundColor: colors.card }]} mode="elevated">
          <View style={styles.cardContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Category *
            </Text>
            
            <View style={styles.categoryGrid}>
              {PRODUCT_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryOption,
                    {
                      backgroundColor: formData.category === category.id ? category.color : colors.surface,
                      borderColor: category.color,
                    }
                  ]}
                  onPress={() => updateFormData('category', category.id)}
                >
                  <MaterialIcons 
                    name={category.icon as any} 
                    size={24} 
                    color={formData.category === category.id ? '#fff' : category.color} 
                  />
                  <Text style={[
                    styles.categoryOptionText,
                    { color: formData.category === category.id ? '#fff' : colors.text }
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {errors.category && (
              <HelperText type="error" visible={!!errors.category}>
                {errors.category}
              </HelperText>
            )}
          </View>
        </Card>

        {/* Pricing & Stock */}
        <Card style={[styles.card, { backgroundColor: colors.card }]} mode="elevated">
          <View style={styles.cardContent}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Pricing & Stock
            </Text>
            
            <View style={styles.priceRow}>
              <TextInput
                label="Price (RWF) *"
                value={formData.price}
                onChangeText={(value) => updateFormData('price', value)}
                mode="outlined"
                keyboardType="numeric"
                style={[styles.input, { flex: 2 }]}
                error={!!errors.price}
              />
              
              <View style={styles.unitSelector}>
                <Text style={[styles.unitLabel, { color: colors.text }]}>Unit</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {UNITS.map((unit) => (
                    <Chip
                      key={unit}
                      mode={formData.unit === unit ? 'flat' : 'outlined'}
                      selected={formData.unit === unit}
                      onPress={() => updateFormData('unit', unit)}
                      style={styles.unitChip}
                      textStyle={{ fontSize: 12 }}
                    >
                      {unit}
                    </Chip>
                  ))}
                </ScrollView>
              </View>
            </View>
            
            {errors.price && (
              <HelperText type="error" visible={!!errors.price}>
                {errors.price}
              </HelperText>
            )}
            
            <TextInput
              label="Stock Quantity (Optional)"
              value={formData.stockQuantity}
              onChangeText={(value) => updateFormData('stockQuantity', value)}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
            />
          </View>
        </Card>

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            contentStyle={styles.submitButtonContent}
            labelStyle={styles.submitButtonText}
          >
            {loading ? 'Submitting...' : 'Submit Product'}
          </Button>
          
          <Text style={[styles.submitNote, { color: colors.textSecondary }]}>
            Your product will be reviewed before being published
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    marginVertical: 8,
    borderRadius: 12,
  },
  cardContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  imageUploadArea: {
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadText: {
    marginTop: 8,
    fontSize: 14,
  },
  input: {
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    minWidth: (screenWidth - 80) / 2,
  },
  categoryOptionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  unitSelector: {
    flex: 1,
  },
  unitLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  unitChip: {
    marginRight: 4,
    marginBottom: 4,
  },
  submitSection: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  submitButton: {
    width: '100%',
    borderRadius: 12,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitNote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
});