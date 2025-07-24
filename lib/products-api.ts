import { apiClient } from './api-client';
import { ApiResponse, Product, Category } from '../types';

// Mock data for demonstration
const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Roundup Herbicide',
    description: 'Effective glyphosate-based herbicide for weed control. Suitable for all crop types.',
    price: 25000,
    currency: 'RWF',
    category: 'chemicals',
    image: 'https://images.pexels.com/photos/4022092/pexels-photo-4022092.jpeg',
    inStock: true,
    stockQuantity: 50,
    unit: 'liters',
    brand: 'Bayer',
    specifications: {
      'Active Ingredient': 'Glyphosate 480g/L',
      'Application Rate': '2-4L per hectare',
      'Packaging': '1L, 5L, 20L containers'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seller: {
      id: 'seller1',
      name: 'AgriSupply Rwanda',
      phone: '+250788123456',
      whatsapp: '+250788123456',
      location: 'Kigali, Rwanda'
    }
  },
  {
    id: '2',
    name: 'NPK Fertilizer 17-17-17',
    description: 'Balanced NPK fertilizer perfect for vegetable crops and general farming.',
    price: 45000,
    currency: 'RWF',
    category: 'fertilizers',
    image: 'https://images.pexels.com/photos/4022090/pexels-photo-4022090.jpeg',
    inStock: true,
    stockQuantity: 100,
    unit: 'kg',
    brand: 'Yara',
    specifications: {
      'NPK Ratio': '17-17-17',
      'Application Rate': '200-400kg per hectare',
      'Packaging': '50kg bags'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seller: {
      id: 'seller1',
      name: 'AgriSupply Rwanda',
      phone: '+250788123456',
      whatsapp: '+250788123456',
      location: 'Kigali, Rwanda'
    }
  },
  {
    id: '3',
    name: 'Hand Hoe - Premium',
    description: 'Durable steel hand hoe with comfortable wooden handle. Perfect for small-scale farming.',
    price: 8500,
    currency: 'RWF',
    category: 'tools',
    image: 'https://images.pexels.com/photos/4022091/pexels-photo-4022091.jpeg',
    inStock: true,
    stockQuantity: 25,
    unit: 'pieces',
    brand: 'FarmTools Pro',
    specifications: {
      'Material': 'High-carbon steel blade',
      'Handle': 'Hardwood 120cm',
      'Weight': '1.2kg'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seller: {
      id: 'seller2',
      name: 'Rwanda Farm Tools',
      phone: '+250789654321',
      whatsapp: '+250789654321',
      location: 'Musanze, Rwanda'
    }
  },
  {
    id: '4',
    name: 'Hybrid Maize Seeds',
    description: 'High-yield hybrid maize seeds resistant to drought and diseases.',
    price: 15000,
    currency: 'RWF',
    category: 'seeds',
    image: 'https://images.pexels.com/photos/4022093/pexels-photo-4022093.jpeg',
    inStock: true,
    stockQuantity: 200,
    unit: 'kg',
    brand: 'Pioneer',
    specifications: {
      'Variety': 'DK 8031',
      'Maturity': '120-130 days',
      'Yield Potential': '8-12 tons/hectare'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seller: {
      id: 'seller3',
      name: 'Seeds & More Ltd',
      phone: '+250787456123',
      whatsapp: '+250787456123',
      location: 'Huye, Rwanda'
    }
  },
  {
    id: '5',
    name: 'Tractor - Kubota L3301',
    description: 'Compact utility tractor perfect for small to medium farms. 33HP diesel engine.',
    price: 18500000,
    currency: 'RWF',
    category: 'equipment',
    image: 'https://images.pexels.com/photos/4022094/pexels-photo-4022094.jpeg',
    inStock: true,
    stockQuantity: 3,
    unit: 'units',
    brand: 'Kubota',
    specifications: {
      'Engine': '33HP Diesel',
      'Transmission': 'HST (Hydrostatic)',
      'PTO': '540 RPM'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seller: {
      id: 'seller4',
      name: 'Heavy Equipment Rwanda',
      phone: '+250785123789',
      whatsapp: '+250785123789',
      location: 'Kigali, Rwanda'
    }
  }
];

export const productsApi = {
  getAll: async (category?: string, search?: string): Promise<ApiResponse<Product[]>> => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let filteredProducts = [...MOCK_PRODUCTS];
      
      if (category && category !== 'all') {
        filteredProducts = filteredProducts.filter(p => p.category === category);
      }
      
      if (search) {
        const searchLower = search.toLowerCase();
        filteredProducts = filteredProducts.filter(p => 
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower) ||
          p.brand?.toLowerCase().includes(searchLower)
        );
      }
      
      return {
        status: 'success',
        message: 'Products fetched successfully',
        data: filteredProducts,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: 'Failed to fetch products',
        data: [],
      };
    }
  },

  getById: async (id: string): Promise<ApiResponse<Product>> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const product = MOCK_PRODUCTS.find(p => p.id === id);
      
      if (!product) {
        return {
          status: 'error',
          message: 'Product not found',
          data: {} as Product,
        };
      }
      
      return {
        status: 'success',
        message: 'Product fetched successfully',
        data: product,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: 'Failed to fetch product',
        data: {} as Product,
      };
    }
  },

  getCategories: async (): Promise<ApiResponse<Category[]>> => {
    try {
      const categories: Category[] = [
        { id: 'all', name: 'All Products', icon: 'apps', color: '#6b7280', description: 'Browse all available products' },
        { id: 'chemicals', name: 'Chemicals', icon: 'flask', color: '#ef4444', description: 'Pesticides, herbicides, fungicides' },
        { id: 'tools', name: 'Tools', icon: 'hammer', color: '#f97316', description: 'Hand tools, farming implements' },
        { id: 'seeds', name: 'Seeds', icon: 'spa', color: '#22c55e', description: 'Quality seeds for all crops' },
        { id: 'fertilizers', name: 'Fertilizers', icon: 'eco', color: '#84cc16', description: 'Organic and synthetic fertilizers' },
        { id: 'equipment', name: 'Equipment', icon: 'build', color: '#3b82f6', description: 'Tractors, machinery, equipment' },
      ];
      
      return {
        status: 'success',
        message: 'Categories fetched successfully',
        data: categories,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: 'Failed to fetch categories',
        data: [],
      };
    }
  },
};