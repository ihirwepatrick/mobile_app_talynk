import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Modal,
  Share,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { userApi, postsApi } from '@/lib/api';
import { Post } from '@/types';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EditProfileModal } from '@/components/EditProfileModal';

const { width: screenWidth } = Dimensions.get('window');

const PROFILE_TABS = [
  { key: 'approved', label: 'Approved', icon: 'check-circle' },
  { key: 'pending', label: 'Pending', icon: 'schedule' },
  { key: 'rejected', label: 'Rejected', icon: 'cancel' },
  { key: 'reported', label: 'Reported', icon: 'report' },
];

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('approved');
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [totalLikes, setTotalLikes] = useState(0);
  const [videoRef, setVideoRef] = useState<Video | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [useNativeControls, setUseNativeControls] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    loadProfile();
    loadPosts();
  }, [user, activeTab]);

  // Cleanup video when modal closes
  useEffect(() => {
    if (!postModalVisible && videoRef && isVideoPlaying) {
      videoRef.pauseAsync().catch(() => {});
      resetVideoState();
    }
  }, [postModalVisible]);

  const loadProfile = async () => {
    try {
      const response = await userApi.getProfile();
      if (response.status === 'success' && response.data) {
        const userData = (response.data as any).user || response.data;
        setProfile({
          ...userData,
          name: userData.username,
          followers_count: userData.follower_count || 0,
          following_count: userData.subscribers || 0,
          posts_count: userData.posts_count || 0,
          phone1: userData.phone1,
          phone2: userData.phone2,
          email: userData.email,
          profile_picture: userData.profile_picture,
          bio: userData.bio || '',
          username: userData.username,
          id: userData.id,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      const response = await userApi.getOwnPosts();
      if (response.status === 'success' && response.data?.posts) {
        let filteredPosts = response.data.posts;
        
        // Filter by tab
        switch (activeTab) {
          case 'pending':
            filteredPosts = filteredPosts.filter((p: any) => p.status === 'pending');
            break;
          case 'rejected':
            filteredPosts = filteredPosts.filter((p: any) => p.status === 'rejected');
            break;
          case 'reported':
            filteredPosts = filteredPosts.filter((p: any) => p.status === 'reported');
            break;
          default:
            filteredPosts = filteredPosts.filter((p: any) => (p.status || 'approved') === 'approved');
        }
        
        setPosts(filteredPosts);
        
        // Calculate total likes
        const likes = filteredPosts.reduce((sum: number, post: any) => sum + (post.likes || 0), 0);
        setTotalLikes(likes);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([loadProfile(), loadPosts()]).finally(() => setRefreshing(false));
  };

  const handleVideoPlayPause = async () => {
    if (videoRef) {
      try {
        if (isVideoPlaying) {
          await videoRef.pauseAsync();
          setIsVideoPlaying(false);
        } else {
          await videoRef.playAsync();
          setIsVideoPlaying(true);
        }
      } catch (error) {
        console.error('Video play/pause error:', error);
      }
    }
  };

  const handleVideoLoad = () => {
    setVideoError(false);
    console.log('Video loaded successfully');
  };

  const handleVideoError = (error: any) => {
    console.error('Video error:', error);
    setVideoError(true);
    setIsVideoPlaying(false);
    setVideoLoading(false);
    
    // Auto-fallback to native controls for decoder errors
    if (error?.message?.includes('Decoder') || error?.message?.includes('decoder')) {
      console.log('Decoder error detected, falling back to native controls');
      setUseNativeControls(true);
      setVideoError(false);
    }
  };

  const handleVideoLoadStart = () => {
    console.log('Video loading started');
    setVideoError(false);
    setVideoLoading(true);
  };

  const handleVideoLoadEnd = () => {
    console.log('Video loading completed');
    setVideoLoading(false);
  };

  const handlePlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setIsVideoPlaying(status.isPlaying);
    }
  };

  const resetVideoState = () => {
    setIsVideoPlaying(false);
    setVideoError(false);
    setVideoLoading(false);
    setUseNativeControls(false);
    setVideoRef(null);
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await postsApi.deletePost(postId);
            setPosts(prev => prev.filter(p => p.id !== postId));
            setPostModalVisible(false);
          } catch (error) {
            Alert.alert('Error', 'Failed to delete post');
          }
        }}
      ]
    );
  };

  const renderPost = ({ item }: { item: Post }) => {
    const mediaUrl = item.video_url || item.image || '';
    const isVideo = !!item.video_url;

    return (
      <TouchableOpacity 
        style={styles.postItem}
        onPress={() => {
          setSelectedPost(item);
          resetVideoState();
          setPostModalVisible(true);
        }}
        activeOpacity={0.8}
      >
        {isVideo ? (
          <Video
            source={{ uri: mediaUrl }}
            style={styles.postMedia}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            isMuted={true}
            useNativeControls={false}
            posterStyle={{ resizeMode: 'cover' }}
          />
        ) : (
          <Image 
            source={{ uri: mediaUrl }} 
            style={styles.postMedia}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.postOverlay}>
          <View style={styles.postStats}>
            <Feather name="heart" size={12} color="#fff" />
            <Text style={styles.postStatText}>{formatNumber(item.likes || 0)}</Text>
          </View>
          
          {/* Status indicator */}
          <View style={[
            styles.statusIndicator,
            { backgroundColor: getStatusColor(item.status || 'approved') }
          ]}>
            <MaterialIcons 
              name={getStatusIcon(item.status || 'approved')} 
              size={10} 
              color="#fff" 
            />
          </View>
        </View>
        
        {/* Video play indicator */}
        {isVideo && (
          <View style={styles.videoPlayIndicator}>
            <Feather name="play" size={16} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'rejected': return '#ef4444';
      case 'reported': return '#8b5cf6';
      default: return '#10b981';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return 'check-circle';
      case 'pending': return 'schedule';
      case 'rejected': return 'cancel';
      case 'reported': return 'report';
      default: return 'check-circle';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  if (!user || !profile) {
    return (
      <View style={styles.container}>
        <View style={styles.loginPrompt}>
          <Feather name="user" size={64} color="#666" />
          <Text style={styles.loginPromptText}>Sign in to view your profile</Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.loginButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuButton}>
          <Feather name="more-horizontal" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60a5fa" />
        }
      >
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <Image
            source={{ uri: profile.profile_picture || 'https://via.placeholder.com/100' }}
            style={styles.avatar}
          />
          <Text style={styles.username}>@{profile.username}</Text>
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
          
          {/* Stats */}
          <View style={styles.statsContainer}>
            <TouchableOpacity style={styles.stat}>
              <Text style={styles.statValue}>{profile.posts_count || 0}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.stat}
              onPress={() => router.push({
                pathname: '/followers/[id]',
                params: { id: profile.id, type: 'followers' }
              })}
            >
              <Text style={styles.statValue}>{profile.followers_count || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.stat}
              onPress={() => router.push({
                pathname: '/followers/[id]',
                params: { id: profile.id, type: 'following' }
              })}
            >
              <Text style={styles.statValue}>{profile.following_count || 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{totalLikes}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
          </View>

          {/* Edit Profile Button */}
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => setEditModalVisible(true)}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {PROFILE_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.tabActive
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <MaterialIcons 
                name={tab.icon as any} 
                size={16} 
                color={activeTab === tab.key ? '#60a5fa' : '#666'} 
              />
              <Text style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Posts Grid */}
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          numColumns={3}
          scrollEnabled={false}
          contentContainerStyle={styles.postsGrid}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="video-library" size={48} color="#666" />
              <Text style={styles.emptyText}>No {activeTab} posts</Text>
              {activeTab === 'approved' && (
                <TouchableOpacity 
                  style={styles.createButton}
                  onPress={() => router.push('/(tabs)/create')}
                >
                  <Text style={styles.createButtonText}>Create your first post</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      </ScrollView>

      {/* Menu Modal */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.menuOverlay} 
          onPress={() => setMenuVisible(false)}
          activeOpacity={1}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setEditModalVisible(true);
              }}
            >
              <Feather name="edit" size={20} color="#fff" />
              <Text style={styles.menuItemText}>Edit Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                router.push('/settings');
              }}
            >
              <Feather name="settings" size={20} color="#fff" />
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.menuItem, styles.menuItemDanger]}
              onPress={() => {
                setMenuVisible(false);
                Alert.alert(
                  'Log Out',
                  'Are you sure you want to log out?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Log Out', style: 'destructive', onPress: logout }
                  ]
                );
              }}
            >
              <Feather name="log-out" size={20} color="#ef4444" />
              <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Post Detail Modal */}
      <Modal visible={postModalVisible} transparent animationType="slide">
        <View style={styles.postModalOverlay}>
          <View style={styles.postModalContainer}>
            <TouchableOpacity 
              style={styles.postModalClose}
              onPress={() => {
                if (videoRef && isVideoPlaying) {
                  videoRef.pauseAsync();
                }
                setPostModalVisible(false);
                resetVideoState();
              }}
            >
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            
            {selectedPost && (
              <>
                {/* Media */}
                <View style={styles.postModalMedia}>
                  {selectedPost.video_url ? (
                    videoError ? (
                      <View style={styles.videoErrorContainer}>
                        <MaterialIcons name="error-outline" size={48} color="#666" />
                        <Text style={styles.videoErrorText}>Video failed to load</Text>
                        <TouchableOpacity 
                          style={styles.retryButton}
                          onPress={() => {
                            setVideoError(false);
                            resetVideoState();
                          }}
                        >
                          <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.retryButton, { backgroundColor: '#10b981', marginTop: 8 }]}
                          onPress={() => {
                            setVideoError(false);
                            setUseNativeControls(true);
                            resetVideoState();
                          }}
                        >
                          <Text style={styles.retryButtonText}>Use Native Player</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={styles.videoContainer}
                        activeOpacity={1}
                        onPress={handleVideoPlayPause}
                      >
                        <Video
                          ref={setVideoRef}
                          source={{ 
                            uri: selectedPost.video_url,
                            headers: {
                              'User-Agent': 'Talynk-Mobile-App'
                            }
                          }}
                          style={styles.modalMedia}
                          resizeMode={ResizeMode.CONTAIN}
                          useNativeControls={useNativeControls}
                          shouldPlay={useNativeControls ? true : false}
                          isLooping={false}
                          isMuted={false}
                          volume={1.0}
                          rate={1.0}
                          shouldCorrectPitch={true}
                          progressUpdateInterval={1000}
                          onLoad={handleVideoLoad}
                          onError={handleVideoError}
                          onLoadStart={handleVideoLoadStart}
                          onLoadEnd={handleVideoLoadEnd}
                          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                          posterSource={{ uri: selectedPost.image || '' }}
                          usePoster={true}
                        />
                        {/* Play/Pause Overlay */}
                        {!useNativeControls && (
                          <View style={styles.videoOverlay}>
                            {videoLoading ? (
                              <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#60a5fa" />
                                <Text style={styles.loadingText}>Loading video...</Text>
                              </View>
                            ) : (
                              <TouchableOpacity 
                                style={styles.playPauseButton}
                                onPress={handleVideoPlayPause}
                              >
                                <MaterialIcons 
                                  name={isVideoPlaying ? "pause" : "play-arrow"} 
                                  size={48} 
                                  color="#fff" 
                                />
                              </TouchableOpacity>
                            )}
                            {/* Fallback to native controls button */}
                            <TouchableOpacity 
                              style={styles.nativeControlsButton}
                              onPress={() => setUseNativeControls(true)}
                            >
                              <MaterialIcons name="settings" size={20} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </TouchableOpacity>
                    )
                  ) : (
                    <Image 
                      source={{ uri: selectedPost.image || '' }} 
                      style={styles.modalMedia} 
                    />
                  )}
                </View>
                
                {/* Actions */}
                <View style={styles.postModalActions}>
                  <TouchableOpacity 
                    style={styles.modalActionButton}
                    onPress={() => Share.share({
                      message: selectedPost.caption || '',
                      url: selectedPost.video_url || selectedPost.image || '',
                    })}
                  >
                    <Feather name="share" size={20} color="#fff" />
                    <Text style={styles.modalActionText}>Share</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modalActionButton, styles.modalActionButtonDanger]}
                    onPress={() => handleDeletePost(selectedPost.id)}
                  >
                    <Feather name="trash-2" size={20} color="#ef4444" />
                    <Text style={[styles.modalActionText, { color: '#ef4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isVisible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        user={profile}
        onProfileUpdated={(updatedUser) => {
          setProfile(updatedUser);
          setEditModalVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loginPromptText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#60a5fa',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  loginButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  menuButton: {
    padding: 8,
  },
  profileSection: {
    alignItems: 'center',
    padding: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  username: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  bio: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  statLabel: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  editButton: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 20,
    marginHorizontal: 2,
    backgroundColor: '#1a1a1a',
  },
  tabActive: {
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
  },
  tabText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  tabTextActive: {
    color: '#60a5fa',
  },
  postsGrid: {
    padding: 2,
  },
  postItem: {
    width: (screenWidth - 6) / 3,
    aspectRatio: 0.75, // 3:4 aspect ratio for better previews
    margin: 1,
    position: 'relative',
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  postMedia: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
  },
  postOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postStatText: {
    color: '#fff',
    fontSize: 10,
    marginLeft: 3,
    fontWeight: '600',
  },
  statusIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    width: screenWidth,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#60a5fa',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#232326',
  },
  menuItemDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  menuItemText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  postModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postModalContainer: {
    width: '90%',
    backgroundColor: '#18181b',
    borderRadius: 20,
    padding: 16,
    position: 'relative',
  },
  postModalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  postModalMedia: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  modalMedia: {
    width: '100%',
    height: '100%',
  },
  postModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#232326',
  },
  modalActionButtonDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  modalActionText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playPauseButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 30,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
  },
  videoErrorText: {
    color: '#666',
    fontSize: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#60a5fa',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
  },
  nativeControlsButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});