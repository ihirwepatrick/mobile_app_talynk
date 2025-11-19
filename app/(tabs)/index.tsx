import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Share,
  Animated,
  Alert,
  Modal,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { router } from 'expo-router';
import { postsApi, likesApi } from '@/lib/api';
import { Post } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { useCache } from '@/lib/cache-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRealtime } from '@/lib/realtime-context';
import { useRealtimePost } from '@/lib/hooks/use-realtime-post';
import ReportModal from '@/components/ReportModal';
import CommentsModal from '@/components/CommentsModal';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Global mute context
const MuteContext = createContext({ isMuted: false, setIsMuted: (v: boolean) => {} });
const useMute = () => useContext(MuteContext);

// Feed tabs
const FEED_TABS = [
  { key: 'featured', label: 'Featured' },
  { key: 'foryou', label: 'For You' },
  { key: 'following', label: 'Following' },
];

// Utility functions
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
};

const timeAgo = (date: string): string => {
  const now = new Date();
  const postDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d`;
  return postDate.toLocaleDateString();
};

const getMediaUrl = (post: Post): string => {
  // Check for fullUrl first (from API response), then video_url/image, then imageUrl
  let url = (post as any).fullUrl || post.video_url || post.image || post.imageUrl || '';
  if (!url) return 'https://via.placeholder.com/300x500';
  return url;
};

interface PostItemProps {
  item: Post;
  index: number;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onReport: (postId: string) => void;
  onFollow: (userId: string) => void;
  onUnfollow: (userId: string) => void;
  isLiked: boolean;
  isFollowing: boolean;
  isActive: boolean;
  availableHeight: number;
}

const PostItem: React.FC<PostItemProps> = ({ 
  item, 
  index, 
  onLike, 
  onComment, 
  onShare, 
  onReport,
  onFollow,
  onUnfollow,
  isLiked, 
  isFollowing,
  isActive,
  availableHeight
}) => {
  const { user } = useAuth();
  const { sendLikeAction } = useRealtime();
  const { likes, comments, isLiked: realtimeIsLiked, updateLikesLocally } = useRealtimePost({
    postId: item.id,
    initialLikes: item.likes || 0,
    initialComments: item.comments_count || 0,
    initialIsLiked: isLiked,
  });
  const videoRef = useRef<Video>(null);
  const [isLiking, setIsLiking] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { isMuted, setIsMuted } = useMute();
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [useNativeControls, setUseNativeControls] = useState(false);
  const [decoderErrorDetected, setDecoderErrorDetected] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Like animation
  const likeScale = useRef(new Animated.Value(1)).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;

  // Handle video play/pause based on active state - improved with status checking
  useEffect(() => {
    if (!videoRef.current || useNativeControls) return;
    
    const managePlayback = async () => {
      try {
        if (isActive) {
          // Try to play - don't wait for videoLoaded
          const status = await videoRef.current?.getStatusAsync();
          if (status && status.isLoaded && !status.isPlaying) {
            await videoRef.current?.playAsync();
          } else if (!status || !status.isLoaded) {
            // Video not loaded yet, but shouldPlay prop will handle it
            console.log('Video not loaded yet, waiting for shouldPlay');
          }
        } else {
          // Pause if playing
          const status = await videoRef.current?.getStatusAsync();
          if (status && status.isLoaded && status.isPlaying) {
            await videoRef.current?.pauseAsync();
            setIsPlaying(false);
          }
        }
      } catch (error) {
        // Silently handle playback errors
        console.log('Playback management error:', error);
      }
    };
    
    managePlayback();
  }, [isActive, useNativeControls]);

  // Cleanup video on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const handleVideoTap = () => {
    setIsMuted(!isMuted);
  };

  const handleLike = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    // Prevent double clicks and rapid toggling
    if (isLiking) return;
    setIsLiking(true);
    
    // Get current like state
    const currentIsLiked = realtimeIsLiked;
    const newIsLiked = !currentIsLiked;
    
    // Optimistic update
    const newLikeCount = newIsLiked ? likes + 1 : Math.max(0, likes - 1);
    updateLikesLocally(newLikeCount, newIsLiked);
    
    // Animate like button
    Animated.sequence([
      Animated.timing(likeScale, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(likeScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    if (newIsLiked) {
      Animated.sequence([
        Animated.timing(likeOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(likeOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
    
    // Send realtime update
    sendLikeAction(item.id, newIsLiked);
    
    // Call API to toggle like
    try {
      await onLike(item.id);
    } catch (error) {
      // Revert on error
      updateLikesLocally(likes, currentIsLiked);
      console.error('Like error:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleFollow = () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    if (isFollowing) {
      onUnfollow(item.user?.id || '');
    } else {
      onFollow(item.user?.id || '');
    }
  };

  const handleComment = () => {
    // Allow viewing comments even if not logged in
    if (onComment) {
      onComment(item.id);
    }
  };

  const handleUserPress = () => {
            if (item.user?.id) {
              router.push({
                pathname: '/user/[id]',
                params: { id: item.user.id }
              });
            }
  };

  const handleCategoryPress = () => {
    const categoryName = typeof item.category === 'string' ? item.category : item.category?.name;
    if (categoryName) {
      router.push({
        pathname: '/category/[name]',
        params: { name: categoryName }
      });
    }
  };

  const mediaUrl = getMediaUrl(item);
  // Check if it's a video: use type field, video_url, or fullUrl extension
  const isVideo = item.type === 'video' || !!item.video_url || 
    (mediaUrl && (mediaUrl.includes('.mp4') || mediaUrl.includes('.mov') || mediaUrl.includes('.webm')));
  
  // Debug logging for media URL
  if (!mediaUrl || mediaUrl === 'https://via.placeholder.com/300x500') {
    console.warn('Post has no valid media URL:', {
      id: item.id,
      video_url: item.video_url,
      image: item.image,
      fullUrl: (item as any).fullUrl,
      type: item.type
    });
  } else if (isVideo) {
    console.log('Video post detected:', {
      id: item.id,
      mediaUrl: mediaUrl.substring(0, 60) + '...',
      isActive,
      useNativeControls: useNativeControls
    });
  }

  return (
    <View style={[styles.postContainer, { height: availableHeight }]}>
      {/* Media */}
      <View style={[styles.mediaContainer, { height: availableHeight }]}>
        {isVideo ? (
          videoError ? (
            <View style={styles.mediaWrapper}>
              <Image
                source={{ uri: mediaUrl || 'https://via.placeholder.com/300x500' }}
                style={styles.media}
                resizeMode="contain"
                onError={(error) => {
                  console.error('Video error fallback image failed:', error, 'URL:', mediaUrl);
                  setImageError(true);
                }}
              />
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.mediaWrapper} 
              activeOpacity={1} 
              onPress={handleVideoTap}
            >
              <Video
                ref={videoRef}
                source={{ uri: mediaUrl }}
                style={styles.media}
                resizeMode={ResizeMode.COVER}
                shouldPlay={useNativeControls ? false : (isActive && !decoderErrorDetected)}
                isLooping={!useNativeControls}
                isMuted={useNativeControls ? false : isMuted}
                usePoster={false}
                shouldCorrectPitch={true}
                volume={useNativeControls ? 1.0 : (isMuted ? 0.0 : 1.0)}
                onLoad={() => {
                  console.log('Video loaded successfully:', item.id, mediaUrl);
                  setVideoLoaded(true);
                  // Auto-play if active
                  if (isActive && !useNativeControls) {
                    videoRef.current?.playAsync().catch(console.log);
                  }
                }}
                onError={(error: any) => {
                  // Only log error if we haven't already detected decoder error
                  if (!decoderErrorDetected) {
                    const errorMessage = error?.message || error?.toString() || '';
                    console.log('Video error for post:', item.id, errorMessage);
                    if (errorMessage.includes('Decoder') || errorMessage.includes('decoder') || errorMessage.includes('OMX')) {
                      // Decoder error - switch to native controls silently
                      console.log('Switching to native controls for post:', item.id);
                      setDecoderErrorDetected(true);
                      setUseNativeControls(true);
                      setVideoError(false);
                      setVideoLoaded(true); // Mark as loaded so native controls can work
                    } else {
                      console.error('Non-decoder video error:', error);
                      setVideoError(true);
                    }
                  }
                }}
                useNativeControls={useNativeControls}
                onPlaybackStatusUpdate={(status: any) => {
                  if (status.isLoaded) {
                    if (!useNativeControls) {
                      setIsPlaying(status.isPlaying);
                    }
                    // If video loaded but not playing and should be active, try to play
                    if (isActive && !status.isPlaying && !useNativeControls && videoLoaded) {
                      videoRef.current?.playAsync().catch(console.log);
                    }
                  }
                }}
              />
            </TouchableOpacity>
          )
        ) : (
          <View style={styles.mediaWrapper}>
            <Image
              source={{ uri: imageError ? 'https://via.placeholder.com/300x500' : mediaUrl }}
              style={styles.media}
              resizeMode="cover"
              onError={(error) => {
                console.error('Image load error:', error, 'URL:', mediaUrl);
                setImageError(true);
              }}
              onLoad={() => {
                console.log('Image loaded successfully:', mediaUrl);
              }}
            />
          </View>
        )}

        {/* Mute/Unmute Icon - only show when not using native controls */}
        {isVideo && !useNativeControls && (
          <TouchableOpacity 
            style={styles.muteButton} 
            onPress={() => setIsMuted(!isMuted)}
          >
            <Feather name={isMuted ? 'volume-x' : 'volume-2'} size={24} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Right Side Actions - TikTok style, positioned lower */}
        <View style={[styles.rightActions, { bottom: -20 + insets.bottom }]}>
          {/* User Avatar */}
          <TouchableOpacity style={styles.avatarContainer} onPress={handleUserPress}>
            <Image 
              source={{ uri: item.user?.profile_picture || 'https://via.placeholder.com/48' }} 
              style={styles.userAvatar} 
            />
            {user && user.id !== item.user?.id && (
              <TouchableOpacity 
                style={styles.followIconButton}
                onPress={handleFollow}
              >
                <Feather 
                  name={isFollowing ? "check" : "plus"} 
                  size={16} 
                  color="#000" 
                />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {/* Like Button */}
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
              <Feather 
                name="heart" 
                size={24} 
                color={realtimeIsLiked ? "#ff2d55" : "#fff"} 
                fill={realtimeIsLiked ? "#ff2d55" : "none"}
              />
            </Animated.View>
            <Text style={styles.actionCount}>{formatNumber(likes)}</Text>
          </TouchableOpacity>
          
          {/* Like Animation Overlay */}
          <Animated.View 
            style={[
              styles.likeAnimationOverlay,
              { opacity: likeOpacity }
            ]}
          >
            <Feather name="heart" size={48} color="#ff2d55" fill="#ff2d55" />
          </Animated.View>

          {/* Comment Button */}
          <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
            <Feather name="message-circle" size={24} color="#fff" />
            <Text style={styles.actionCount}>{formatNumber(comments)}</Text>
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity style={styles.actionButton} onPress={() => onShare(item.id)}>
            <Feather name="share" size={24} color="#fff" />
          </TouchableOpacity>

          {/* More Actions */}
          <TouchableOpacity style={styles.actionButton} onPress={() => onReport(item.id)}>
            <Feather name="more-horizontal" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Bottom Info - positioned lower */}
        <View style={[styles.bottomInfo, { bottom: -20 + insets.bottom }]}>
          <View style={styles.bottomInfoContent}>
            <TouchableOpacity onPress={handleUserPress}>
              <Text style={styles.username}>@{item.user?.username || 'unknown'}</Text>
            </TouchableOpacity>
            
            <Text style={styles.caption} numberOfLines={3}>
              {item.title}
            </Text>
            <Text style={styles.caption} numberOfLines={3}>
              {item.description}
            </Text>
          </View>

          {/* Category Badge */}
          {item.category && (
            <TouchableOpacity style={styles.categoryBadge} onPress={handleCategoryPress}>
              <Text style={styles.categoryText}>
                #{typeof item.category === 'string' ? item.category : item.category.name}
              </Text>
            </TouchableOpacity>
          )}

          {/* Follow Button */}
          {user && user.id !== item.user?.id && (
            <TouchableOpacity 
              style={[
                styles.followButton,
                { backgroundColor: isFollowing ? 'rgba(255,255,255,0.2)' : '#60a5fa' }
              ]}
              onPress={handleFollow}
            >
              <Text style={[
                styles.followButtonText,
                { color: isFollowing ? '#fff' : '#000' }
              ]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

export default function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('featured');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [commentsPostTitle, setCommentsPostTitle] = useState<string>('');
  const [commentsPostAuthor, setCommentsPostAuthor] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { user } = useAuth();
  const { likedPosts, followedUsers, updateLikedPosts, updateFollowedUsers } = useCache();
  const insets = useSafeAreaInsets();
  
  // Calculate available height for posts (screen height - header - bottom navbar)
  // Header: insets.top (safe area) + ~50px (tabs content) + 8px (paddingBottom)
  // Bottom navbar: 60px + insets.bottom
  const headerContentHeight = 50; // Tabs container height
  const headerPaddingBottom = 8;
  const headerHeight = insets.top + headerContentHeight + headerPaddingBottom;
  const bottomNavHeight = 60 + insets.bottom; // Bottom navbar height
  const availableHeight = screenHeight - headerHeight - bottomNavHeight;

  const loadPosts = async (tab = 'featured', refresh = false) => {
    try {
      setLoading(refresh ? false : true);
      let response;
      
      console.log(`Loading posts for tab: ${tab}, refresh: ${refresh}`);
      
      // Add timestamp to force fresh data on refresh
      const timestamp = refresh ? `&t=${Date.now()}` : '';
      
      // Load different content based on tab
      switch (tab) {
        case 'featured':
          // Featured posts - get admin curated featured posts
          response = await postsApi.getFeatured(1, 20, timestamp);
          console.log('Featured posts response:', response);
          break;
        case 'foryou':
          // For you algorithm - get personalized posts (using all posts for now)
          response = await postsApi.getAll(1, 20, timestamp);
          console.log('For you posts response:', response);
          break;
        case 'following':
          if (user) {
            // Following posts - get posts from followed users
            response = await postsApi.getFollowing(1, 20, timestamp);
            console.log('Following posts response:', response);
          } else {
            response = { status: 'success', data: { posts: [], pagination: {}, filters: {} } };
          }
          break;
        default:
          response = await postsApi.getAll(1, 20, timestamp);
      }
      
      if (response.status === 'success') {
        // Handle nested response structure: data.posts instead of just data
        const posts = response.data.posts || response.data;
        console.log(`Setting ${posts?.length || 0} posts for ${tab} tab`);
        console.log(`Posts data structure:`, { 
          hasPosts: !!response.data.posts, 
          postsLength: posts?.length,
          firstPost: posts?.[0] 
        });
        setPosts(Array.isArray(posts) ? posts : []);
      } else {
        console.error('Failed to load posts:', response.message);
        console.log('Setting undefined posts for featured tab');
        setPosts([]);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPosts(activeTab);
  }, [activeTab]);

  // Reload posts when app comes back to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log('App became active, reloading posts...');
        loadPosts(activeTab, true);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPosts(activeTab, true);
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      return;
    }
    
    const isCurrentlyLiked = likedPosts.has(postId);
    
    // Optimistic update
    updateLikedPosts(postId, !isCurrentlyLiked);
    
    try {
      const response = await likesApi.toggle(postId);
      
      if (response.status === 'success' && response.data) {
        // Update with server response to ensure consistency
        const serverIsLiked = response.data.isLiked;
        const serverLikeCount = response.data.likeCount;
        
        // Only update if different from optimistic update
        if (serverIsLiked !== !isCurrentlyLiked) {
          updateLikedPosts(postId, serverIsLiked);
        }
      } else {
        // Revert on error
        updateLikedPosts(postId, isCurrentlyLiked);
        console.error('Like toggle failed:', response.message);
      }
    } catch (error: any) {
      // Revert on error
      updateLikedPosts(postId, isCurrentlyLiked);
      console.error('Like API error:', error);
    }
  };

  const handleFollow = async (userId: string) => {
    updateFollowedUsers(userId, true);
    try {
      await postsApi.like(userId); // Replace with follow API
    } catch (error) {
      updateFollowedUsers(userId, false);
    }
  };

  const handleUnfollow = async (userId: string) => {
    updateFollowedUsers(userId, false);
    try {
      await postsApi.unlike(userId); // Replace with unfollow API
    } catch (error) {
      updateFollowedUsers(userId, true);
    }
  };

  const handleComment = (postId: string) => {
    console.log('handleComment called with postId:', postId);
    const post = posts.find(p => p.id === postId);
    if (post) {
      console.log('Post found, opening comment modal');
      setCommentsPostId(postId);
      setCommentsPostTitle(post.title || post.description || '');
      setCommentsPostAuthor(post.user?.username || '');
      setCommentsModalVisible(true);
    } else {
      console.log('Post not found for postId:', postId);
    }
  };

  const handleShare = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      try {
        await Share.share({
          message: getMediaUrl(post),
          title: 'Check out this post on Talynk!',
          url: getMediaUrl(post),
        });
      } catch (error) {
        console.error('Share error:', error);
      }
    }
  };

  const handleReport = (postId: string) => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setReportPostId(postId);
    setReportModalVisible(true);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const visibleItem = viewableItems[0];
      const newIndex = visibleItem.index || 0;
      console.log('Viewable item changed - index:', newIndex, 'postId:', visibleItem.item?.id);
      setCurrentIndex(newIndex);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 100,
  }).current;

  if (loading && posts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent />
      
      {/* Header with tabs and search */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.tabsContainer}>
          {FEED_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.tabActive
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={() => router.push('/search')}
        >
          <Feather name="search" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <MuteContext.Provider value={{ isMuted, setIsMuted }}>
        <FlatList
          ref={flatListRef}
          data={posts}
          renderItem={({ item, index }) => (
            <PostItem
              item={item}
              index={index}
              onLike={handleLike}
              onComment={handleComment}
              onShare={handleShare}
              onReport={handleReport}
              onFollow={handleFollow}
              onUnfollow={handleUnfollow}
              isLiked={likedPosts.has(item.id)}
              isFollowing={followedUsers.has(item.user?.id || '')}
              isActive={currentIndex === index}
              availableHeight={availableHeight}
            />
          )}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={availableHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          style={{ marginTop: headerHeight }}
          contentContainerStyle={{ paddingBottom: 0 }}
          windowSize={4}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#60a5fa"
            />
          }
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="video" size={64} color="#666" />
              <Text style={styles.emptyText}>No posts available</Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'following' && !user 
                  ? 'Sign in to see posts from people you follow'
                  : 'Pull down to refresh'
                }
              </Text>
              </View>
          }
        />
      </MuteContext.Provider>

      {/* Report Modal */}
      <ReportModal
        isVisible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        postId={reportPostId}
        onReported={() => {
          setReportModalVisible(false);
          Alert.alert('Reported', 'Thank you for reporting this content. We will review it shortly.');
        }}
      />

      {/* Comments Modal */}
      <CommentsModal
        visible={commentsModalVisible && !!commentsPostId}
        onClose={() => {
          setCommentsModalVisible(false);
          setCommentsPostId(null);
        }}
        postId={commentsPostId || ''}
        postTitle={commentsPostTitle}
        postAuthor={commentsPostAuthor}
      />
    </SafeAreaView>
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
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  tabsContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'center',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#60a5fa',
  },
  tabText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  searchButton: {
    padding: 8,
  },
  postContainer: {
    width: screenWidth,
    backgroundColor: '#000',
  },
  mediaContainer: {
    width: screenWidth,
    position: 'relative',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mediaWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  media: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  muteButton: {
    position: 'absolute',
    top: 24,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },
  rightActions: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
    zIndex: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  followIconButton: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#60a5fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 16,
    minWidth: 40,
  },
  actionCount: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  likeAnimationOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
    zIndex: 100,
  },
  bottomInfo: {
    position: 'absolute',
    left: 16,
    right: 80,
    bottom: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  bottomInfoContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  caption: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(96, 165, 250, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  followButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: screenHeight,
    backgroundColor: '#000000',
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
});