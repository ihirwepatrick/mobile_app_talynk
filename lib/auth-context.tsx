import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthState, User } from '../types';
import { authApi } from './api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: any) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_TOKEN'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_AUTHENTICATED'; payload: boolean };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: true };
    case 'SET_TOKEN':
      return { ...state, token: action.payload };
    case 'LOGOUT':
      return { ...state, user: null, token: null, isAuthenticated: false };
    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };
    default:
      return state;
  }
};

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: true,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [token, userData] = await Promise.all([
        AsyncStorage.getItem('talynk_token'),
        AsyncStorage.getItem('talynk_user'),
      ]);

      if (token && userData) {
        const user = JSON.parse(userData);
        dispatch({ type: 'SET_TOKEN', payload: token });
        dispatch({ type: 'SET_USER', payload: user });
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authApi.login(email, password);
      
      if (response.status === 'success') {
        const { accessToken, user } = response.data;
        
        await Promise.all([
          AsyncStorage.setItem('talynk_token', accessToken),
          AsyncStorage.setItem('talynk_user', JSON.stringify(user)),
        ]);

        dispatch({ type: 'SET_TOKEN', payload: accessToken });
        dispatch({ type: 'SET_USER', payload: user });
        return true;
      } else {
        console.error('Login failed:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const register = async (data: any): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authApi.register(data);
      
      if (response.status === 'success') {
        const { accessToken, user } = response.data;
        
        await Promise.all([
          AsyncStorage.setItem('talynk_token', accessToken),
          AsyncStorage.setItem('talynk_user', JSON.stringify(user)),
        ]);

        dispatch({ type: 'SET_TOKEN', payload: accessToken });
        dispatch({ type: 'SET_USER', payload: user });
        return true;
      } else {
        console.error('Registration failed:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const logout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem('talynk_token'),
        AsyncStorage.removeItem('talynk_user'),
      ]);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
    dispatch({ type: 'LOGOUT' });
  };

  const refreshToken = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('talynk_refresh_token');
      if (refreshToken) {
        const response = await authApi.refresh(refreshToken);
        if (response.status === 'success') {
          await AsyncStorage.setItem('talynk_token', response.data.accessToken);
          dispatch({ type: 'SET_TOKEN', payload: response.data.accessToken });
        }
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 