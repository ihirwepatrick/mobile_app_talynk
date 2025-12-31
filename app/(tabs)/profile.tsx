import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { userApi, postsApi, likesApi } from '@/lib/api';
import { Post } from '@/types';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EditProfileModal } from '@/components/EditProfileModal';
import DotsSpinner from '@/components/DotsSpinner';
import { useLikesManager } from '@/lib/hooks/use-likes-manager';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { addLikedPost, removeLikedPost, setPostLikeCount } from '@/lib/store/slices/likesSlice';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoThumbnail } from '@/lib/hooks/use-video-thumbnail';

const { width: screenWidth } = Dimensions.get('window');
const POST_ITEM_SIZE = (screenWidth - 4) / 3; // 3 columns with 2px gaps

// Default avatar component
const DefaultAvatar = ({ size = 100, name = '' }: { size?: number; name?: string }) => {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  
  return (
    <LinearGradient
      colors={['#3b82f6', '#8b5cf6']}
      style={[styles.defaultAvatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.defaultAvatarText, { fontSize: size * 0.4 }]}>{initials}</Text>
    </LinearGradient>
  );
};

// Video thumbnail component with teaser playback
interface VideoThumbnailProps {
  post: Post;
  isActive: boolean;
  onPress: () => void;
  onOptionsPress?: () => void;
}

const VideoThumbnail = ({ post, isActive, onPress, onOptionsPress }: VideoThumbnailProps) => {
  const videoRef = useRef<Video>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  
  const videoUrl = post.video_url || post.videoUrl || '';
  const isVideo = !!videoUrl;
  
  // Get fallback image URL
  const fallbackImageUrl = (post as any).thumbnail_url || post.image || (post as any).thumbnail || '';
  
  // Generate thumbnail for videos, use image directly for non-videos
  const generatedThumbnail = useVideoThumbnail(
    isVideo ? videoUrl : null,
    fallbackImageUrl,
    1000 // Extract thumbnail at 1 second
  );
  
  // For videos: use generated thumbnail, fallback to provided image
  // For images: use image directly
  const staticThumbnailUrl = isVideo 
    ? (generatedThumbnail || fallbackImageUrl)
    : (post.image || post.imageUrl || post.fullUrl || '');

  useEffect(() => {
    if (isActive && isVideo && videoUrl) {
      // Small delay before showing video to ensure smooth transition
      const timer = setTimeout(() => {
        setShowVideo(true);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setShowVideo(false);
      setIsLoaded(false);
      // Stop video when not active
      if (videoRef.current) {
        videoRef.current.pauseAsync().catch(() => {});
      }
    }
  }, [isActive, isVideo, videoUrl]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsLoaded(true);
      // Loop the teaser after 3 seconds
      if (status.positionMillis && status.positionMillis > 3000) {
        videoRef.current?.setPositionAsync(0);
      }
    }
  };

  return (
    <TouchableOpacity 
      style={styles.postItem}
      onPress={onPress}
      onLongPress={onOptionsPress}
      activeOpacity={0.9}
    >
      {/* Static thumbnail image - always visible in background */}
      {staticThumbnailUrl ? (
        <Image 
          source={{ uri: staticThumbnailUrl }} 
          style={styles.postMedia}
          resizeMode="cover"
          onError={() => {
            // If generated thumbnail fails, fallback to provided image
            if (isVideo && fallbackImageUrl && staticThumbnailUrl !== fallbackImageUrl) {
              // This will be handled by the hook's fallback
            }
          }}
        />
      ) : (
        <View style={[styles.postMedia, styles.noMediaPlaceholder]}>
          {isVideo && !staticThumbnailUrl ? (
            <ActivityIndicator size="small" color="#60a5fa" />
          ) : (
            <MaterialIcons name={isVideo ? "video-library" : "image"} size={28} color="#444" />
          )}
        </View>
      )}

      {/* Video teaser overlay - only when active */}
      {showVideo && isVideo && videoUrl && isActive && (
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={[styles.postMedia, styles.teaserVideo]}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isActive}
          isLooping={false}
          isMuted={true}
          volume={0}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        />
      )}
      
      {/* Overlay with stats */}
      <View style={styles.postOverlay}>
        <View style={styles.postStats}>
          <Feather name="heart" size={12} color="#fff" />
          <Text style={styles.postStatText}>{formatNumber(post.likes || 0)}</Text>
        </View>
        
        {/* Status indicator */}
        <View style={[
          styles.statusIndicator,
          { backgroundColor: getStatusColor(post.status || 'approved') }
        ]}>
          <MaterialIcons 
            name={getStatusIcon(post.status || 'approved') as any} 
            size={10} 
            color="#fff" 
          />
        </View>
      </View>
      
      {/* Video play indicator / Active indicator */}
      {isVideo && (
        <View style={[
          styles.videoPlayIndicator,
          isActive && styles.videoPlayIndicatorActive
        ]}>
          {isActive ? (
            <View style={styles.playingDot} />
          ) : (
            <Feather name="play" size={14} color="#fff" />
          )}
        </View>
      )}
      
      {/* Options button (3 dots) */}
      {onOptionsPress && (
        <TouchableOpacity
          style={styles.postOptionsButton}
          onPress={(e) => {
            e.stopPropagation();
            onOptionsPress();
          }}
          activeOpacity={0.7}
        >
          <Feather name="more-vertical" size={16} color="#fff" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

// Helper functions moved outside component for use in VideoThumbnail
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

const PROFILE_TABS = [
  { key: 'approved', label: 'Active Posts', icon: 'check-circle' },
  { key: 'draft', label: 'Drafts', icon: 'drafts' },
  { key: 'rejected', label: 'Suspended', icon: 'cancel' },
];

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const dispatch = useAppDispatch();
  const likedPosts = useAppSelector(state => state.likes.likedPosts);
  const postLikeCounts = useAppSelector(state => state.likes.postLikeCounts);
  const likesManager = useLikesManager();
  
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('approved');
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [postOptionsModalVisible, setPostOptionsModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [totalLikes, setTotalLikes] = useState(0);
  const [videoRef, setVideoRef] = useState<Video | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [useNativeControls, setUseNativeControls] = useState(false);
  const [decoderErrorDetected, setDecoderErrorDetected] = useState(false);
  
  // Error and loading states
  const [error, setError] = useState<{ type: 'network' | 'server' | 'unknown'; message: string } | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [likingPostId, setLikingPostId] = useState<string | null>(null);
  
  // Video teaser playback state
  const [activeTeaserIndex, setActiveTeaserIndex] = useState(0);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const teaserIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const insets = useSafeAreaInsets();

  // Cycle through video teasers - one at a time
  useEffect(() => {
    if (isScreenFocused && posts.length > 0) {
      // Find video posts only
      const videoPosts = posts.filter(p => !!p.video_url);
      
      if (videoPosts.length > 0) {
        // Clear any existing interval
        if (teaserIntervalRef.current) {
          clearInterval(teaserIntervalRef.current);
        }
        
        // Cycle through video posts every 4 seconds
        teaserIntervalRef.current = setInterval(() => {
          setActiveTeaserIndex(prev => {
            const videoIndices = posts
              .map((p, i) => p.video_url ? i : -1)
              .filter(i => i !== -1);
            
            if (videoIndices.length === 0) return 0;
            
            const currentVideoPosition = videoIndices.indexOf(prev);
            const nextPosition = (currentVideoPosition + 1) % videoIndices.length;
            return videoIndices[nextPosition] ?? 0;
          });
        }, 4000);
      }
    }
    
    return () => {
      if (teaserIntervalRef.current) {
        clearInterval(teaserIntervalRef.current);
      }
    };
  }, [isScreenFocused, posts]);

  // Handle screen focus for video playback
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => {
        setIsScreenFocused(false);
      };
    }, [])
  );

  useEffect(() => {
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    loadProfile();
    loadPosts();
  }, [user, activeTab]);


  const loadProfile = async (showLoading = false) => {
    try {
      setError(null);
      if (showLoading) setLoadingProfile(true);
      
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
      } else {
        setError({ type: 'server', message: response.message || 'Failed to load profile' });
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      const isNetworkError = error?.message?.includes('Network') || error?.code === 'NETWORK_ERROR' || !error?.response;
      setError({
        type: isNetworkError ? 'network' : 'server',
        message: isNetworkError 
          ? 'No internet connection. Please check your network and try again.' 
          : error?.message || 'Failed to load profile. Please try again.'
      });
    } finally {
      setLoading(false);
      setLoadingProfile(false);
    }
  };

  const loadPosts = async (showLoading = false) => {
    try {
      setError(null);
      if (showLoading) setLoadingPosts(true);
      
      // Fetch drafts separately if draft tab is active
      let response;
      if (activeTab === 'draft') {
        response = await postsApi.getDrafts(1, 100);
        if (response.status === 'success' && response.data?.posts) {
          setPosts(response.data.posts);
          setTotalLikes(0); // Drafts don't have likes yet
          return;
        }
      }
      
      response = await userApi.getOwnPosts();
      if (response.status === 'success' && response.data?.posts) {
        let filteredPosts = response.data.posts;
        
        // Filter by tab
        switch (activeTab) {
          case 'approved':
            filteredPosts = filteredPosts.filter((p: any) => p.status === 'approved' || !p.status);
            break;
          case 'draft':
            filteredPosts = filteredPosts.filter((p: any) => p.status === 'draft');
            break;
          case 'rejected':
            filteredPosts = filteredPosts.filter((p: any) => p.status === 'rejected' || p.status === 'reported');
            break;
          default:
            filteredPosts = filteredPosts.filter((p: any) => (p.status || 'approved') === 'approved');
        }
        
        setPosts(filteredPosts);
        
        // Calculate total likes
        const likes = filteredPosts.reduce((sum: number, post: any) => {
          const cachedCount = postLikeCounts[post.id];
          return sum + (cachedCount !== undefined ? cachedCount : (post.likes || 0));
        }, 0);
        setTotalLikes(likes);
      } else {
        setError({ type: 'server', message: response.message || 'Failed to load posts' });
      }
    } catch (error: any) {
      console.error('Error loading posts:', error);
      const isNetworkError = error?.message?.includes('Network') || error?.code === 'NETWORK_ERROR' || !error?.response;
      setError({
        type: isNetworkError ? 'network' : 'server',
        message: isNetworkError 
          ? 'No internet connection. Please check your network and try again.' 
          : error?.message || 'Failed to load posts. Please try again.'
      });
    } finally {
      setLoadingPosts(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setError(null);
    Promise.all([loadProfile(true), loadPosts(true)]).finally(() => setRefreshing(false));
  };

  // Optimistic like handler
  const handleLike = async (postId: string) => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please log in to like posts.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/auth/login') }
        ]
      );
      return;
    }

    if (likingPostId === postId) return; // Prevent double clicks
    setLikingPostId(postId);

    const isCurrentlyLiked = likedPosts.includes(postId);
    const currentCount = postLikeCounts[postId] || posts.find(p => p.id === postId)?.likes || 0;

    // Optimistic update - update UI immediately
    const newIsLiked = !isCurrentlyLiked;
    const newCount = newIsLiked ? currentCount + 1 : Math.max(0, currentCount - 1);

    if (newIsLiked) {
      dispatch(addLikedPost(postId));
    } else {
      dispatch(removeLikedPost(postId));
    }
    dispatch(setPostLikeCount({ postId, count: newCount }));

    // Update local posts array
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, likes: newCount }
          : post
      )
    );

    // Update total likes
    setTotalLikes(prev => newIsLiked ? prev + 1 : Math.max(0, prev - 1));

    // Background API call
    try {
      const response = await likesApi.toggle(postId);
      
      if (response.status === 'success' && response.data) {
        // Update with server response
        const serverIsLiked = response.data.isLiked;
        const serverLikeCount = response.data.likeCount;

        if (serverIsLiked) {
          dispatch(addLikedPost(postId));
        } else {
          dispatch(removeLikedPost(postId));
        }
        dispatch(setPostLikeCount({ postId, count: serverLikeCount }));

        // Update local posts array with server response
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === postId 
              ? { ...post, likes: serverLikeCount }
              : post
          )
        );

        // Update total likes with server response
        const diff = serverLikeCount - newCount;
        setTotalLikes(prev => Math.max(0, prev + diff));
      } else {
        // Revert on error
        if (isCurrentlyLiked) {
          dispatch(addLikedPost(postId));
        } else {
          dispatch(removeLikedPost(postId));
        }
        dispatch(setPostLikeCount({ postId, count: currentCount }));
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === postId 
              ? { ...post, likes: currentCount }
              : post
          )
        );
        setTotalLikes(prev => {
          const diff = currentCount - newCount;
          return Math.max(0, prev + diff);
        });
        
        // Only show alert for non-404 errors (post not found should be silent)
        const isPostNotFound = response.message?.includes('not found') || response.message?.includes('Post not found');
        if (!isPostNotFound) {
          Alert.alert('Error', 'Failed to update like. Please try again.');
        }
      }
    } catch (error: any) {
      // Revert on error
      if (isCurrentlyLiked) {
        dispatch(addLikedPost(postId));
      } else {
        dispatch(removeLikedPost(postId));
      }
      dispatch(setPostLikeCount({ postId, count: currentCount }));
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { ...post, likes: currentCount }
            : post
        )
      );
      setTotalLikes(prev => {
        const diff = currentCount - newCount;
        return Math.max(0, prev + diff);
      });

      const isNetworkError = error?.message?.includes('Network') || error?.code === 'NETWORK_ERROR';
      const isPostNotFound = error?.message?.includes('not found') || error?.message?.includes('Post not found');
      
      // Only show alerts for network errors, not for post not found
      if (isNetworkError) {
        Alert.alert(
          'Network Error',
          'Unable to update like. Your action will be synced when connection is restored.',
          [{ text: 'OK' }]
        );
      } else if (!isPostNotFound) {
        // Silent fail for post not found, show alert for other errors
        Alert.alert('Error', 'Failed to update like. Please try again.');
      }
    } finally {
      setLikingPostId(null);
    }
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
    const errorMessage = error?.message || error?.toString() || '';
    
    // Check for decoder errors - but we're already using native controls, so just log
    if (errorMessage.includes('Decoder') || errorMessage.includes('decoder') || errorMessage.includes('OMX')) {
      // Native controls should handle this better, but if it still fails, show error
      console.warn('Video decoder error (using native controls):', errorMessage);
      setVideoError(true);
      setVideoLoading(false);
      setIsVideoPlaying(false);
    } else {
      // Other errors (network, format, etc.)
      console.error('Video error:', errorMessage);
      setVideoError(true);
      setIsVideoPlaying(false);
      setVideoLoading(false);
    }
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
    setDecoderErrorDetected(false);
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
            setPostOptionsModalVisible(false);
            setSelectedPost(null);
          } catch (error) {
            Alert.alert('Error', 'Failed to delete post');
          }
        }}
      ]
    );
  };

  const renderPost = ({ item, index }: { item: Post; index: number }) => {
    const isActiveTeaser = isScreenFocused && activeTeaserIndex === index;
    
    return (
      <VideoThumbnail
        post={item}
        isActive={isActiveTeaser}
        onPress={() => {
          // Navigate to full-screen profile feed with current post as initial
          router.push({
            pathname: '/profile-feed/[userId]',
            params: { 
              userId: user?.id || '', 
              initialPostId: item.id,
              status: activeTab 
            }
          });
        }}
        onOptionsPress={() => {
          // Open options modal when 3 dots is clicked
          setSelectedPost(item);
          setPostOptionsModalVisible(true);
        }}
      />
    );
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
          {profile.profile_picture ? (
            <Image
              source={{ uri: profile.profile_picture }}
              style={styles.avatar}
            />
          ) : (
            <DefaultAvatar size={100} name={profile.username || profile.name || ''} />
          )}
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

      {/* Post Options Modal */}
      <Modal visible={postOptionsModalVisible} transparent animationType="slide">
        <TouchableOpacity 
          style={styles.menuOverlay} 
          onPress={() => setPostOptionsModalVisible(false)}
          activeOpacity={1}
        >
          <View style={styles.menuContainer}>
            {/* Post Preview */}
            {selectedPost && (
              <View style={styles.postOptionsPreview}>
                <View style={styles.postOptionsPreviewMedia}>
                  {selectedPost.video_url ? (
                    <View style={styles.postOptionsThumbnail}>
                      <Feather name="video" size={24} color="#60a5fa" />
                    </View>
                  ) : selectedPost.image ? (
                    <Image 
                      source={{ uri: selectedPost.image }} 
                      style={styles.postOptionsThumbnail}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.postOptionsThumbnail}>
                      <MaterialIcons name="image" size={24} color="#666" />
                    </View>
                  )}
                </View>
                <View style={styles.postOptionsInfo}>
                  <Text style={styles.postOptionsCaption} numberOfLines={2}>
                    {selectedPost.caption || selectedPost.description || selectedPost.title || 'No caption'}
                  </Text>
                  <View style={styles.postOptionsStats}>
                    <Text style={styles.postOptionsStatText}>
                      {formatNumber(selectedPost.likes || 0)} likes
                    </Text>
                    <Text style={styles.postOptionsStatText}>
                      • {formatNumber(selectedPost.comments_count || 0)} comments
                    </Text>
                  </View>
                </View>
              </View>
            )}
            
            <View style={styles.menuDivider} />
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setPostOptionsModalVisible(false);
                if (selectedPost) {
                  Share.share({
                    message: selectedPost.caption || selectedPost.description || '',
                    url: selectedPost.video_url || selectedPost.image || '',
                  });
                }
              }}
            >
              <Feather name="share" size={20} color="#fff" />
              <Text style={styles.menuItemText}>Share Post</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.menuItem, styles.menuItemDanger]}
              onPress={() => {
                setPostOptionsModalVisible(false);
                if (selectedPost) {
                  handleDeletePost(selectedPost.id);
                }
              }}
            >
              <Feather name="trash-2" size={20} color="#ef4444" />
              <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Delete Post</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => setPostOptionsModalVisible(false)}
            >
              <Feather name="x" size={20} color="#fff" />
              <Text style={styles.menuItemText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
    minWidth: 24,
    minHeight: 24,
  },
  videoPlayIndicatorActive: {
    backgroundColor: '#ef4444',
  },
  playingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  postOptionsButton: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 28,
    minHeight: 28,
  },
  teaserVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  noMediaPlaceholder: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    color: '#fff',
    fontWeight: '700',
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
    paddingBottom: 32,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 8,
  },
  postOptionsPreview: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#232326',
    borderRadius: 12,
    marginBottom: 8,
  },
  postOptionsPreviewMedia: {
    marginRight: 12,
  },
  postOptionsThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  postOptionsInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  postOptionsCaption: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 18,
  },
  postOptionsStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postOptionsStatText: {
    color: '#999',
    fontSize: 12,
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
    maxHeight: '90%',
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
  postModalInfo: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  postModalCaption: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  postModalStats: {
    flexDirection: 'row',
    gap: 16,
  },
  postModalStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postModalStatText: {
    color: '#999',
    fontSize: 12,
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