import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  useColorScheme,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { userApi, followsApi } from '@/lib/api';
import { User } from '@/types';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useRealtime } from '@/lib/realtime-context';

const COLORS = {
  light: {
    background: '#f5f5f5',
    card: '#fff',
    border: '#e5e7eb',
    text: '#222',
    textSecondary: '#666',
    primary: '#007AFF',
    button: '#007AFF',
    buttonText: '#fff',
    tabActive: '#007AFF',
    tabInactive: '#666',
  },
  dark: {
    background: '#18181b',
    card: '#232326',
    border: '#27272a',
    text: '#f3f4f6',
    textSecondary: '#a1a1aa',
    primary: '#60a5fa',
    button: '#60a5fa',
    buttonText: '#18181b',
    tabActive: '#60a5fa',
    tabInactive: '#a1a1aa',
  },
};

type TabType = 'followers' | 'following' | 'suggestions';

export default function FollowersScreen() {
  const { id, type } = useLocalSearchParams();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>((type as TabType) || 'followers');
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [profile, setProfile] = useState<User | null>(null);
  const colorScheme = useColorScheme() || 'light';
  const C = COLORS[colorScheme];

  // Fetch profile info
  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return;
      try {
        const response = await userApi.getUserById(id as string);
        if (response.status === 'success' && response.data) {
          setProfile(response.data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    fetchProfile();
  }, [id]);

  // Fetch followers
  const fetchFollowers = async () => {
    if (!id) return;
    setLoadingFollowers(true);
    try {
      const response = await followsApi.getFollowers(id as string);
      if (response.status === 'success' && response.data) {
        setFollowers(response.data);
      }
    } catch (error) {
      console.error('Error fetching followers:', error);
    } finally {
      setLoadingFollowers(false);
    }
  };

  // Fetch following
  const fetchFollowing = async () => {
    if (!id) return;
    setLoadingFollowing(true);
    try {
      const response = await followsApi.getFollowing(id as string);
      if (response.status === 'success' && response.data) {
        setFollowing(response.data);
      }
    } catch (error) {
      console.error('Error fetching following:', error);
    } finally {
      setLoadingFollowing(false);
    }
  };

  // Fetch suggestions
  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const response = await userApi.getSuggestions();
      if (response.status === 'success' && response.data) {
        setSuggestions(response.data);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Load data based on active tab
  useEffect(() => {
    setLoading(true);
    if (activeTab === 'followers') {
      fetchFollowers();
    } else if (activeTab === 'following') {
      fetchFollowing();
    } else if (activeTab === 'suggestions') {
      fetchSuggestions();
    }
    setLoading(false);
  }, [activeTab, id]);

  const handleFollow = async (userId: string) => {
    try {
      const response = await followsApi.follow(userId);
      if (response.status === 'success') {
        // Update the lists to reflect the follow action
        if (activeTab === 'suggestions') {
          setSuggestions(prev => prev.filter(user => user.id !== userId));
        }
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleUnfollow = async (userId: string) => {
    try {
      const response = await followsApi.unfollow(userId);
      if (response.status === 'success') {
        // Update the lists to reflect the unfollow action
        if (activeTab === 'following') {
          setFollowing(prev => prev.filter(user => user.id !== userId));
        }
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isFollowing = following.some(user => user.id === item.id);
    const isCurrentUser = currentUser?.id === item.id;

    return (
      <View style={[styles.userItem, { backgroundColor: C.card, borderColor: C.border }]}>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => router.push({
            pathname: '/user/[id]',
            params: { id: item.id }
          })}
        >
          <Image
            source={item.profile_picture ? { uri: item.profile_picture } : require('../../assets/images/icon.png')}
            style={styles.userAvatar}
            resizeMode="cover"
          />
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: C.text }]}>{item.name || item.username}</Text>
            <Text style={[styles.userUsername, { color: C.textSecondary }]}>@{item.username}</Text>
            {item.bio && (
              <Text style={[styles.userBio, { color: C.textSecondary }]} numberOfLines={2}>
                {item.bio}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        
        {!isCurrentUser && (
          <TouchableOpacity
            style={[
              styles.followButton,
              { 
                backgroundColor: isFollowing ? 'transparent' : C.primary,
                borderColor: C.primary
              }
            ]}
            onPress={() => isFollowing ? handleUnfollow(item.id) : handleFollow(item.id)}
          >
            <Text style={[
              styles.followButtonText,
              { color: isFollowing ? C.primary : C.buttonText }
            ]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'followers':
        return followers;
      case 'following':
        return following;
      case 'suggestions':
        return suggestions;
      default:
        return [];
    }
  };

  const getCurrentLoading = () => {
    switch (activeTab) {
      case 'followers':
        return loadingFollowers;
      case 'following':
        return loadingFollowing;
      case 'suggestions':
        return loadingSuggestions;
      default:
        return false;
    }
  };

  const getCurrentCount = () => {
    switch (activeTab) {
      case 'followers':
        return profile?.followers_count || 0;
      case 'following':
        return profile?.following_count || 0;
      case 'suggestions':
        return suggestions.length;
      default:
        return 0;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>
          {profile?.name || profile?.username || 'User'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabContainer, { borderBottomColor: C.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'followers' && { borderBottomColor: C.tabActive }]}
          onPress={() => setActiveTab('followers')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'followers' ? C.tabActive : C.tabInactive }
          ]}>
            Followers ({getCurrentCount()})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && { borderBottomColor: C.tabActive }]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'following' ? C.tabActive : C.tabInactive }
          ]}>
            Following ({profile?.following_count || 0})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'suggestions' && { borderBottomColor: C.tabActive }]}
          onPress={() => setActiveTab('suggestions')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'suggestions' ? C.tabActive : C.tabInactive }
          ]}>
            Suggestions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={getCurrentData()}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="people" size={48} color={C.textSecondary} />
              <Text style={[styles.emptyText, { color: C.textSecondary }]}>
                {activeTab === 'followers' && 'No followers yet'}
                {activeTab === 'following' && 'Not following anyone yet'}
                {activeTab === 'suggestions' && 'No suggestions available'}
              </Text>
            </View>
          }
          refreshing={getCurrentLoading()}
          onRefresh={() => {
            if (activeTab === 'followers') fetchFollowers();
            else if (activeTab === 'following') fetchFollowing();
            else if (activeTab === 'suggestions') fetchSuggestions();
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    marginBottom: 4,
  },
  userBio: {
    fontSize: 12,
    lineHeight: 16,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
}); 