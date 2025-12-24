/**
 * Mobile app configuration constants
 * 
 * This file contains constants that can be safely imported anywhere
 * without causing circular dependencies.
 */

// API URL with fallback for production
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.75:3000';

// JWT Secret
export const JWT_SECRET = process.env.JWT_SECRET || 'wUq9wpIDBRGr3n7KDw86GiV15gZlNEEK';

// WebSocket protocol based on environment
export const WS_PROTOCOL = process.env.NODE_ENV === 'production' ? 'wss:' : 'ws:';

// WebSocket URL derived from API URL
export const WS_URL = API_BASE_URL ? API_BASE_URL.replace(/^https?:/, WS_PROTOCOL) : '';

// Application name and version
export const APP_NAME = 'Talynk';
export const APP_VERSION = '1.0.0';

// Mobile app specific config
export const MOBILE_APP_ID = 'com.talynk.mobile';
export const MOBILE_APP_NAME = 'Talentix';


// Other config values can be added here 