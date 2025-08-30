import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserPreferences {
  theme: 'light' | 'dark';
  autoplay: boolean;
  dataUsage: 'low' | 'medium' | 'high';
  notifications: {
    likes: boolean;
    comments: boolean;
    follows: boolean;
    posts: boolean;
  };
  contentFilters: string[];
  language: string;
}

interface CacheContextType {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  likedPosts: Set<string>;
  followedUsers: Set<string>;
  updateLikedPosts: (postId: string, isLiked: boolean) => void;
  updateFollowedUsers: (userId: string, isFollowing: boolean) => void;
  clearCache: () => Promise<void>;
}

const defaultPreferences: UserPreferences = {
  theme: 'dark',
  autoplay: true,
  dataUsage: 'medium',
  notifications: {
    likes: true,
    comments: true,
    follows: true,
    posts: true,
  },
  contentFilters: [],
  language: 'en',
};

const CacheContext = createContext<CacheContextType | undefined>(undefined);

export const CacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCachedData();
  }, []);

  const loadCachedData = async () => {
    try {
      const [prefsData, likedData, followedData] = await Promise.all([
        AsyncStorage.getItem('user_preferences'),
        AsyncStorage.getItem('liked_posts'),
        AsyncStorage.getItem('followed_users'),
      ]);

      if (prefsData) {
        setPreferences({ ...defaultPreferences, ...JSON.parse(prefsData) });
      }

      if (likedData) {
        setLikedPosts(new Set(JSON.parse(likedData)));
      }

      if (followedData) {
        setFollowedUsers(new Set(JSON.parse(followedData)));
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    try {
      await AsyncStorage.setItem('user_preferences', JSON.stringify(newPreferences));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const updateLikedPosts = (postId: string, isLiked: boolean) => {
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (isLiked) {
        newSet.add(postId);
      } else {
        newSet.delete(postId);
      }
      // Save to storage
      AsyncStorage.setItem('liked_posts', JSON.stringify(Array.from(newSet))).catch(console.error);
      return newSet;
    });
  };

  const updateFollowedUsers = (userId: string, isFollowing: boolean) => {
    setFollowedUsers(prev => {
      const newSet = new Set(prev);
      if (isFollowing) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      // Save to storage
      AsyncStorage.setItem('followed_users', JSON.stringify(Array.from(newSet))).catch(console.error);
      return newSet;
    });
  };

  const clearCache = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem('user_preferences'),
        AsyncStorage.removeItem('liked_posts'),
        AsyncStorage.removeItem('followed_users'),
      ]);
      setPreferences(defaultPreferences);
      setLikedPosts(new Set());
      setFollowedUsers(new Set());
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  const value: CacheContextType = {
    preferences,
    updatePreferences,
    likedPosts,
    followedUsers,
    updateLikedPosts,
    updateFollowedUsers,
    clearCache,
  };

  return <CacheContext.Provider value={value}>{children}</CacheContext.Provider>;
};

export const useCache = (): CacheContextType => {
  const context = useContext(CacheContext);
  if (context === undefined) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
};