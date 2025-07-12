import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  FlatList,
  Modal,
  Share,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { userApi, followsApi, postsApi } from '@/lib/api';
import { User, Post } from '@/types';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
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

export default function ExternalUserProfileScreen() {
  const { id } = useLocalSearchParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { sendFollowAction } = useRealtime();
  const colorScheme = useColorScheme() || 'light';
  const C = COLORS[colorScheme];

  // Fetch profile info
  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return;
      
      setLoadingProfile(true);
      setProfileError(null);
      try {
        const response = await userApi.getUserById(id as string);
        if (response.status === 'success' && response.data) {
          setProfile(response.data);
        } else {
          setProfileError(response.message || 'Failed to fetch user profile');
        }
      } catch (err: any) {
        setProfileError(err.message || 'Failed to fetch user profile');
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [id]);

  // Fetch follow state
  useEffect(() => {
    const checkFollow = async () => {
      if (!currentUser || !id || currentUser.id === id) return;
      try {
        const response = await followsApi.checkFollowing(id as string);
        setIsFollowing(!!response.data?.isFollowing);
      } catch {
        setIsFollowing(false);
      }
    };
    checkFollow();
  }, [id, currentUser]);

  // Fetch user posts
  useEffect(() => {
    const fetchPosts = async () => {
      if (!id) return;
      
      setLoadingPosts(true);
      setPostsError(null);
      try {
        const response = await userApi.getUserPosts(id as string);
        if (response.status === 'success' && response.data) {
          setPosts(response.data);
        } else {
          setPostsError(response.message || 'Failed to fetch posts');
        }
      } catch (err: any) {
        setPostsError(err.message || 'Failed to fetch posts');
      } finally {
        setLoadingPosts(false);
      }
    };
    fetchPosts();
  }, [id]);

  // Refresh function
  const onRefresh = () => {
    setRefreshing(true);
    // Re-fetch profile and posts
    const fetchData = async () => {
      try {
        if (id) {
          const [profileResponse, postsResponse] = await Promise.all([
            userApi.getUserById(id as string),
            userApi.getUserPosts(id as string)
          ]);
          
          if (profileResponse.status === 'success' && profileResponse.data) {
            setProfile(profileResponse.data);
          }
          
          if (postsResponse.status === 'success' && postsResponse.data) {
            setPosts(postsResponse.data);
          }
        }
      } catch (err: any) {
        console.error('Error refreshing data:', err);
      } finally {
        setRefreshing(false);
      }
    };
    fetchData();
  };

  const handleFollow = async () => {
    if (!id || !currentUser) return;
    
    setFollowLoading(true);
    try {
      const response = await followsApi.follow(id as string);
      if (response.status === 'success') {
        setIsFollowing(true);
        // Update followers count
        if (profile) {
          setProfile(prev => prev ? { ...prev, followers_count: (prev.followers_count || 0) + 1 } : null);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to follow user');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!id || !currentUser) return;
    
    setFollowLoading(true);
    try {
      const response = await followsApi.unfollow(id as string);
      if (response.status === 'success') {
        setIsFollowing(false);
        // Update followers count
        if (profile) {
          setProfile(prev => prev ? { ...prev, followers_count: Math.max(0, (prev.followers_count || 0) - 1) } : null);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to unfollow user');
    } finally {
      setFollowLoading(false);
    }
  };

  const handlePostPress = (post: Post) => {
    setSelectedPost(post);
    setPostModalVisible(true);
  };

  const handleClosePostModal = () => {
    setPostModalVisible(false);
    setSelectedPost(null);
  };

  const handleSharePost = async () => {
    if (!selectedPost) return;
    
    try {
      const mediaUrl = selectedPost.video_url || selectedPost.image;
      await Share.share({
        message: mediaUrl || 'Check out this post!',
        title: 'Share Post',
        url: mediaUrl,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share post');
    }
  };

  const handleDownloadPost = async () => {
    if (!selectedPost) return;
    
    try {
      const mediaUrl = selectedPost.video_url || selectedPost.image;
      if (mediaUrl) {
        // For now, just share the URL
        await Share.share({
          message: mediaUrl,
          title: 'Download Post',
          url: mediaUrl,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to download post');
    }
  };

  function getPostMedia(post: Post) {
    const url = post.video_url || post.image;
    const type = post.video_url ? 'video' : 'image';
    return { url, type };
  }

  function getCategoryString(category: string | object) {
    if (typeof category === 'string') return category;
    if (typeof category === 'object' && category !== null) {
      return (category as any).name || 'Unknown';
    }
    return 'Unknown';
  }

  if (loadingProfile) {
    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={[styles.loadingText, { color: C.textSecondary }]}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (profileError || !profile) {
    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="error-outline" size={48} color={C.textSecondary} />
          <Text style={[styles.errorText, { color: C.textSecondary }]}>
            {profileError || 'Failed to load profile'}
          </Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: C.primary }]} 
            onPress={onRefresh}
          >
            <Text style={[styles.retryButtonText, { color: C.buttonText }]}>Reload Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header with back button */}
      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
      >
        {/* Profile Info */}
        <View style={[styles.profileSection, { backgroundColor: C.card, borderBottomColor: C.border }]}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarShadowWrapper}>
              <Image
                source={profile?.profile_picture ? { uri: profile.profile_picture } : require('../../assets/images/icon.png')}
                style={styles.avatarLarge}
                resizeMode="cover"
              />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: C.text }]}>{profile?.name || profile?.username || 'User'}</Text>
              <Text style={[styles.profileUsername, { color: C.textSecondary }]}>@{profile?.username}</Text>
              {profile?.bio && <Text style={[styles.profileBio, { color: C.text }]}>{profile.bio}</Text>}
            </View>
          </View>

          {/* Contact Info */}
          <View style={styles.contactInfo}>
            {profile?.email && (
              <View style={styles.contactItem}>
                <MaterialIcons name="email" size={16} color={C.textSecondary} />
                <Text style={[styles.contactText, { color: C.text }]}>{profile.email}</Text>
              </View>
            )}
            {(profile as any)?.phone1 && (
              <View style={styles.contactItem}>
                <MaterialIcons name="phone" size={16} color={C.textSecondary} />
                <Text style={[styles.contactText, { color: C.text }]}>{(profile as any).phone1}</Text>
              </View>
            )}
            {(profile as any)?.phone2 && (
              <View style={styles.contactItem}>
                <MaterialIcons name="phone" size={16} color={C.textSecondary} />
                <Text style={[styles.contactText, { color: C.text }]}>{(profile as any).phone2}</Text>
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: C.text }]}>{posts.length}</Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>Posts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: C.text }]}>{profile?.followers_count ?? 0}</Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: C.text }]}>{profile?.following_count ?? 0}</Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>Following</Text>
            </View>
          </View>

          {/* Follow Button */}
          {currentUser && currentUser.id !== id && (
            <TouchableOpacity 
              onPress={isFollowing ? handleUnfollow : handleFollow}
              disabled={followLoading}
              style={[
                styles.followButton,
                { backgroundColor: isFollowing ? 'transparent' : C.primary, borderColor: C.primary }
              ]}
            >
              <Text style={[
                styles.followButtonText,
                { color: isFollowing ? C.primary : C.buttonText }
              ]}>
                {followLoading ? '...' : (isFollowing ? 'Following' : 'Follow')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Posts Section */}
        <View style={styles.postsSection}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Posts</Text>
          
          {loadingPosts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={C.primary} />
            </View>
          ) : postsError ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.errorText, { color: 'red' }]}>{postsError}</Text>
            </View>
          ) : posts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="photo-library" size={48} color={C.textSecondary} />
              <Text style={[styles.emptyText, { color: C.textSecondary }]}>No posts yet</Text>
            </View>
          ) : (
            <FlatList
              data={posts}
              renderItem={({ item }) => {
                const { url: mediaUrl, type: mediaType } = getPostMedia(item);
                return (
                  <TouchableOpacity 
                    onPress={() => handlePostPress(item)}
                    style={styles.postCard}
                  >
                    {/* User Info Header */}
                    <View style={styles.postHeader}>
                      <View style={styles.postUserInfo}>
                        <Image
                          source={{ uri: profile?.profile_picture || 'https://via.placeholder.com/24' }}
                          style={styles.postUserAvatar}
                        />
                        <Text style={[styles.postUsername, { color: C.text }]}>@{profile?.username}</Text>
                      </View>
                    </View>
                    
                    {/* Media */}
                    {mediaUrl ? (
                      mediaType === 'video' ? (
                        <View>
                          <Video
                            source={{ uri: mediaUrl }}
                            style={styles.postImage}
                            resizeMode={ResizeMode.COVER}
                            useNativeControls={false}
                            shouldPlay={false}
                            isLooping={false}
                          />
                          <View style={styles.playIconOverlay}>
                            <MaterialIcons name="play-circle-outline" size={48} color="#fff" />
                          </View>
                        </View>
                      ) : (
                        <Image source={{ uri: mediaUrl }} style={styles.postImage} resizeMode="cover" />
                      )
                    ) : null}
                    
                    {/* Caption and Category */}
                    <View style={styles.postFooter}>
                      <Text style={[styles.postCaption, { color: C.text }]} numberOfLines={2}>
                        {item.caption || ''}
                      </Text>
                      <View style={styles.postFooterActions}>
                        <View style={styles.postAction}>
                          <Feather 
                            name="heart" 
                            size={16} 
                            color={(item.likes || 0) > 0 ? "#ff2d55" : C.textSecondary} 
                            fill={(item.likes || 0) > 0 ? "#ff2d55" : "none"}
                          />
                          <Text style={[styles.postActionText, { color: C.textSecondary }]}>{item.likes || 0}</Text>
                        </View>
                        <View style={styles.postAction}>
                          <Feather name="message-circle" size={16} color={C.textSecondary} />
                          <Text style={[styles.postActionText, { color: C.textSecondary }]}>{item.comments_count || 0}</Text>
                        </View>
                      </View>
                      {item.category && (
                        <View style={[styles.categoryTag, { backgroundColor: C.primary }]}>
                          <Text style={[styles.categoryText, { color: C.buttonText }]}>
                            {getCategoryString(item.category)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
              keyExtractor={item => item.id}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: 'space-between' }}
              scrollEnabled={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          )}
        </View>
      </ScrollView>

      {/* Post Modal Overlay */}
      <Modal visible={postModalVisible} animationType="slide" transparent onRequestClose={handleClosePostModal}>
        <View style={styles.overlayBackdrop}>
          <View style={styles.overlayContent}>
            <TouchableOpacity style={styles.overlayClose} onPress={handleClosePostModal}>
              <MaterialIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            {selectedPost && (() => {
              const { url: mediaUrl, type: mediaType } = getPostMedia(selectedPost);
              return (
                <View style={styles.overlayMediaContainer}>
                  {mediaType === 'video' ? (
                    <Video
                      source={{ uri: mediaUrl || '' }}
                      style={styles.overlayMedia}
                      resizeMode={ResizeMode.CONTAIN}
                      useNativeControls={true}
                      shouldPlay={true}
                      isLooping={true}
                    />
                  ) : (
                    <Image source={{ uri: mediaUrl || '' }} style={styles.overlayMedia} resizeMode="contain" />
                  )}
                  <View style={styles.overlayActions}>
                    <TouchableOpacity style={styles.overlayAction} onPress={handleSharePost}>
                      <MaterialIcons name="share" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.overlayAction} onPress={handleDownloadPost}>
                      <MaterialIcons name="download" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
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
  scrollView: {
    flex: 1,
  },
  profileSection: {
    padding: 20,
    borderBottomWidth: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarShadowWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginRight: 16,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 14,
    marginBottom: 8,
  },
  profileBio: {
    fontSize: 14,
    lineHeight: 20,
  },
  contactInfo: {
    marginBottom: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  followButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  postsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '48%',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  postUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postUserAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  postUsername: {
    fontSize: 12,
    fontWeight: '500',
  },
  postImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  playIconOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
  },
  postFooter: {
    padding: 12,
  },
  postCaption: {
    fontSize: 12,
    marginBottom: 8,
  },
  postFooterActions: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  postActionText: {
    fontSize: 12,
    marginLeft: 4,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
  },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
  overlayMediaContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayMedia: {
    width: '100%',
    height: '80%',
  },
  overlayActions: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
  },
  overlayAction: {
    marginHorizontal: 20,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
  },
}); 