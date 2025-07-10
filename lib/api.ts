import { apiClient } from './api-client';
import { ApiResponse, Post, User, Notification, LoginResponseData, RegisterFormData } from '../types';

// Auth API
export const authApi = {
  login: async (usernameOrEmail: string, password: string): Promise<ApiResponse<LoginResponseData>> => {
    try {
      // If the input does not contain '@', treat as username and append @talynk.com
      const email = usernameOrEmail.includes('@') ? usernameOrEmail : `${usernameOrEmail}@talynk.com`;
      const response = await apiClient.post('/api/auth/login', { email, password, role: 'user' });
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message: error.response?.data?.message || 'Login failed',
        data: {} as LoginResponseData,
      };
    }
  },

  register: async (data: RegisterFormData): Promise<ApiResponse<LoginResponseData>> => {
    try {
      const response = await apiClient.post('/api/auth/register', data);
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message: error.response?.data?.message || 'Registration failed',
        data: {} as LoginResponseData,
      };
    }
  },

  refresh: async (refreshToken: string): Promise<ApiResponse<{ accessToken: string }>> => {
    try {
      const response = await apiClient.post('/api/auth/refresh', { refreshToken });
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message: 'Token refresh failed',
        data: { accessToken: '' },
      };
    }
  },
};

// Posts API
export const postsApi = {
  getAll: async (page = 1, limit = 10): Promise<ApiResponse<Post[]>> => {
    try {
      const response = await apiClient.get(`/api/posts/all?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message: 'Failed to fetch posts',
        data: [],
      };
    }
  },

  getById: async (id: string): Promise<ApiResponse<Post>> => {
    try {
      const response = await apiClient.get(`/api/posts/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message: 'Failed to fetch post',
        data: {} as Post,
      };
    }
  },

  create: async (data: FormData): Promise<ApiResponse<Post>> => {
    try {
      const response = await apiClient.post('/api/posts', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message: 'Failed to create post',
        data: {} as Post,
      };
    }
  },

  like: async (postId: string): Promise<ApiResponse<any>> => {
    try {
      const response = await apiClient.post(`/api/posts/${postId}/like`);
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message: 'Failed to like post',
        data: {},
      };
    }
  },

  unlike: async (postId: string): Promise<ApiResponse<any>> => {
    try {
      const response = await apiClient.delete(`/api/posts/${postId}/unlike`);
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message: 'Failed to unlike post',
        data: {},
      };
    }
  },

  search: async (query: string): Promise<ApiResponse<Post[]>> => {
    try {
      const response = await apiClient.get(`/api/posts/search?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message: 'Failed to search posts',
        data: [],
      };
    }
  },
};

// User API
export const userApi = {
  getProfile: async (): Promise<ApiResponse<User>> => {
    try {
      const response = await apiClient.get('/api/profile');
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message: 'Failed to fetch profile',
        data: {} as User,
      };
    }
  },

  getUserById: async (id: string): Promise<ApiResponse<User>> => {
    try {
      const response = await apiClient.get(`/api/users/${id}`);
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message: 'Failed to fetch user',
        data: {} as User,
      };
    }
  },

  getUserPosts: async (userId: string): Promise<ApiResponse<Post[]>> => {
    try {
      const response = await apiClient.get(`/api/users/${userId}/posts`);
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message: 'Failed to fetch user posts',
        data: [],
      };
    }
  },
};

// Notifications API
export const notificationsApi = {
  getAll: async (): Promise<ApiResponse<Notification[]>> => {
    try {
      const response = await apiClient.get('/api/user/notifications');
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message: 'Failed to fetch notifications',
        data: [],
      };
    }
  },

  markAsRead: async (notificationId: number): Promise<ApiResponse<any>> => {
    try {
      const response = await apiClient.post(`/api/user/notifications/${notificationId}/read`);
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message: 'Failed to mark notification as read',
        data: {},
      };
    }
  },

  markAllAsRead: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await apiClient.post('/api/user/notifications/read-all');
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message: 'Failed to mark all notifications as read',
        data: {},
      };
    }
  },
};