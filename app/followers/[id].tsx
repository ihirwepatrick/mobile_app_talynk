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
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { userApi, followsApi } from '@/lib/api';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  },
};

const TABS = [
  { key: 'followers', label: 'Followers' },
  { key: 'following', label: 'Following' },
  { key: 'suggestions', label: 'Suggestions' },
];

export default function FollowersScreen() {
  const { id, type } = useLocalSearchParams();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState(type as string || 'followers');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const colorScheme = useColorScheme() || 'light';
  const C = COLORS[colorScheme];

  // Hide the parent navigation header
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Fetch profile info to get username
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

  // Fetch users based on active tab
  const fetchUsers = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let response;
      
      if (activeTab === 'followers') {
        response = await followsApi.getFollowers(id as string);
      } else if (activeTab === 'following') {
        response = await followsApi.getFollowing(id as string);
      } else if (activeTab === 'suggestions') {
        response = await userApi.getSuggestions();
      }
      
      if (response && response.status === 'success') {
        // Handle different response structures
        let userData = response.data;
        if (Array.isArray(userData)) {
          setUsers(userData);
        } else if (userData && Array.isArray(userData.users)) {
          setUsers(userData.users);
        } else if (userData && Array.isArray(userData.followers)) {
          setUsers(userData.followers);
        } else if (userData && Array.isArray(userData.following)) {
          setUsers(userData.following);
        } else {
          setUsers([]);
        }
      } else {
        setError(response?.message || 'Failed to fetch users');
        setUsers([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeTab, id]);

  const handleFollow = async (userId: string) => {
    setFollowLoading(userId);
    try {
      const response = await followsApi.follow(userId);
      if (response.status === 'success') {
        // Update the user's follow status in the list
        setUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, isFollowing: true } : user
        ));
      }
    } catch (error) {
      console.error('Failed to follow user:', error);
    } finally {
      setFollowLoading(null);
    }
  };

  const handleUnfollow = async (userId: string) => {
    setFollowLoading(userId);
    try {
      const response = await followsApi.unfollow(userId);
      if (response.status === 'success') {
        // Update the user's follow status in the list
        setUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, isFollowing: false } : user
        ));
      }
    } catch (error) {
      console.error('Failed to unfollow user:', error);
    } finally {
      setFollowLoading(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers().finally(() => setRefreshing(false));
  };

  const renderUser = ({ item }: { item: any }) => (
    <View style={[styles.userCard, { backgroundColor: C.card, borderColor: C.border }]}>
      <Image
        source={{ uri: item.profile_picture || 'https://via.placeholder.com/50' }}
        style={styles.userAvatar}
      />
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: C.text }]}>
          {item.name || item.username || 'User'}
        </Text>
        <Text style={[styles.userUsername, { color: C.textSecondary }]}>
          @{item.username}
        </Text>
        {item.bio && (
          <Text style={[styles.userBio, { color: C.textSecondary }]} numberOfLines={2}>
            {item.bio}
          </Text>
        )}
      </View>
      {activeTab !== 'suggestions' ? (
        <View style={styles.followingBadge}>
          <Text style={styles.followingBadgeText}>Following</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.followButton,
            { 
              backgroundColor: item.isFollowing ? 'transparent' : C.primary,
              borderColor: C.primary 
            }
          ]}
          onPress={() => item.isFollowing ? handleUnfollow(item.id) : handleFollow(item.id)}
          disabled={followLoading === item.id}
        >
          <Text style={[
            styles.followButtonText,
            { color: item.isFollowing ? C.primary : C.buttonText }
          ]}>
            {followLoading === item.id ? '...' : (item.isFollowing ? 'Following' : 'Follow')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={[styles.loadingText, { color: C.textSecondary }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      {profile && (
        <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.text }]}>
            {profile.username}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      )}

      {/* Tab Switcher */}
      <View style={[styles.tabBar, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              activeTab === tab.key && { borderBottomColor: C.primary }
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[
              styles.tabLabel,
              { color: activeTab === tab.key ? C.primary : C.textSecondary }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: C.textSecondary }]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: C.primary }]}
            onPress={fetchUsers}
          >
            <Text style={[styles.retryButtonText, { color: C.buttonText }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="people" size={48} color={C.textSecondary} />
              <Text style={[styles.emptyText, { color: C.textSecondary }]}>
                No {activeTab} found
              </Text>
            </View>
          }
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
    paddingVertical: 16,
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    marginBottom: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  followingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#007AFF',
    borderRadius: 15,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  followingBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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