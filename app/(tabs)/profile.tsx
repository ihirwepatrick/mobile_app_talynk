import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { userApi } from '@/lib/api';
import { User, Post } from '@/types';

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
    logoutButton: '#ef4444',
    logoutButtonText: '#fff',
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
    logoutButton: '#b91c1c',
    logoutButtonText: '#fff',
  },
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme() || 'light';
  const C = COLORS[colorScheme];

  const loadUserPosts = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const response = await userApi.getUserPosts(user.id);
      if (response.status === 'success') {
        setUserPosts(response.data);
      }
    } catch (error) {
      console.error('Error loading user posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserPosts();
  }, [user?.id]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      {(item.image || item.imageUrl || item.video_url || item.videoUrl) && (
        <Image
          source={{
            uri: item.image || item.imageUrl || item.video_url || item.videoUrl || '',
          }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}
      {item.caption && (
        <Text style={styles.postCaption} numberOfLines={2}>
          {item.caption}
        </Text>
      )}
    </View>
  );

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: C.text }]}>Profile</Text>
          <TouchableOpacity 
            style={[styles.settingsButton, { backgroundColor: C.primary }]}
            onPress={() => router.push('/(tabs)/settings')}
          >
            <Text style={[styles.settingsButtonText, { color: C.buttonText }]}>⚙️</Text>
          </TouchableOpacity>
        </View>
        <Image
          source={{
            uri: user.avatar || user.profile_picture || 'https://via.placeholder.com/100',
          }}
          style={styles.profileImage}
        />
        <Text style={[styles.username, { color: C.text }]}>{user.name}</Text>
        {user.username && (
          <Text style={[styles.handle, { color: C.textSecondary }]}>@{user.username}</Text>
        )}
        {user.bio && (
          <Text style={[styles.bio, { color: C.textSecondary }]}>{user.bio}</Text>
        )}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: C.text }]}>{user.posts_count || userPosts.length}</Text>
          <Text style={[styles.statLabel, { color: C.textSecondary }]}>Posts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: C.text }]}>{user.followers_count || 0}</Text>
          <Text style={[styles.statLabel, { color: C.textSecondary }]}>Followers</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: C.text }]}>{user.following_count || 0}</Text>
          <Text style={[styles.statLabel, { color: C.textSecondary }]}>Following</Text>
        </View>
      </View>

      <View style={[styles.actionsContainer, { backgroundColor: C.card }]}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: C.button }]}>
          <Text style={[styles.actionButtonText, { color: C.buttonText }]}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: C.logoutButton }]} onPress={handleLogout}>
          <Text style={[styles.logoutButtonText, { color: C.logoutButtonText }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.postsSection}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>Your Posts</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        ) : userPosts.length > 0 ? (
          <View style={styles.postsGrid}>
            {userPosts.map((post) => (
              <View key={post.id} style={styles.postCard}>
                {(post.image || post.imageUrl || post.video_url || post.videoUrl) && (
                  <Image
                    source={{
                      uri: post.image || post.imageUrl || post.video_url || post.videoUrl || '',
                    }}
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                )}
                {post.caption && (
                  <Text style={[styles.postCaption, { color: C.text }]} numberOfLines={2}>
                    {post.caption}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: C.text }]}>No posts yet</Text>
            <Text style={[styles.emptySubtext, { color: C.textSecondary }]}>
              Create your first post to get started!
            </Text>
            <TouchableOpacity
              style={[styles.createPostButton, { backgroundColor: C.primary }]}
              onPress={() => router.push('/(tabs)/create')}
            >
              <Text style={[styles.createPostButtonText, { color: C.buttonText }]}>Create Post</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
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
  header: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  settingsButton: {
    borderRadius: 8,
    padding: 8,
  },
  settingsButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  handle: {
    fontSize: 16,
  },
  bio: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 5,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  postsSection: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  postCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  postImage: {
    width: '100%',
    height: 150,
  },
  postCaption: {
    fontSize: 12,
    padding: 8,
    lineHeight: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  createPostButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 20,
  },
  createPostButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 