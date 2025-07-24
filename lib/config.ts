/**
 * Farm Market Pro configuration constants
 * 
 * This file contains constants that can be safely imported anywhere
 * without causing circular dependencies.
 */

// API URL with fallback for production
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://farmmarket-api.example.com';

// JWT Secret
export const JWT_SECRET = process.env.JWT_SECRET || 'wUq9wpIDBRGr3n7KDw86GiV15gZlNEEK';

// WebSocket protocol based on environment
export const WS_PROTOCOL = process.env.NODE_ENV === 'production' ? 'wss:' : 'ws:';

// WebSocket URL derived from API URL
export const WS_URL = API_BASE_URL ? API_BASE_URL.replace(/^https?:/, WS_PROTOCOL) : '';

// Application name and version
export const APP_NAME = 'FarmMarket Pro';
export const APP_VERSION = '1.0.0';

// Mobile app specific config
export const MOBILE_APP_ID = 'com.farmmarket.pro';
export const MOBILE_APP_NAME = 'FarmMarket Pro';

// WhatsApp Business Number
export const WHATSAPP_BUSINESS_NUMBER = '+250788123456'; // Replace with actual business number

// Categories
export const PRODUCT_CATEGORIES = [
  { id: 'chemicals', name: 'Chemicals', icon: 'flask', color: '#ef4444' },
  { id: 'tools', name: 'Tools', icon: 'hammer', color: '#f97316' },
  { id: 'seeds', name: 'Seeds', icon: 'spa', color: '#22c55e' },
  { id: 'fertilizers', name: 'Fertilizers', icon: 'eco', color: '#84cc16' },
  { id: 'equipment', name: 'Equipment', icon: 'build', color: '#3b82f6' },
];