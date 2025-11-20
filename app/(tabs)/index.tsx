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
import { router, useFocusEffect } from 'expo-router';
import { postsApi, likesApi } from '@/lib/api';
import { Post } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { useCache } from '@/lib/cache-context';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { 
  addLikedPost, 
  removeLikedPost, 
  setPostLikeCount, 
  setPostLikeCounts,
  updateLikeCount,
  clearLikes,
} from '@/lib/store/slices/likesSlice';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRealtime } from '@/lib/realtime-context';
import { useRealtimePost } from '@/lib/hooks/use-realtime-post';
import { useLikesManager } from '@/lib/hooks/use-likes-manager';
import ReportModal from '@/components/ReportModal';
import CommentsModal from '@/components/CommentsModal';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Global mute context
const MuteContext = createContext({ isMuted: false, setIsMuted: (v: boolean) => {} });
const useMute = () => useContext(MuteContext);

// Global video manager to ensure only one video plays at a time
const activeVideoRef = { current: null as Video | null };
const pauseAllVideosExcept = async (currentVideo: Video | null) => {
  if (activeVideoRef.current && activeVideoRef.current !== currentVideo) {
    try {
      const status = await activeVideoRef.current.getStatusAsync();
      if (status?.isLoaded && status.isPlaying) {
        await activeVideoRef.current.pauseAsync();
      }
    } catch (error) {
      // Silently handle errors
    }
  }
  activeVideoRef.current = currentVideo;
};

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

const getMediaUrl = (post: Post): string | null => {
  // Check for fullUrl first (from API response), then video_url/image, then imageUrl
  const url = (post as any).fullUrl || post.video_url || post.image || post.imageUrl || '';
  // Return null if no valid URL instead of placeholder
  return url && url.trim() !== '' ? url : null;
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
  const dispatch = useAppDispatch();
  const likedPosts = useAppSelector(state => state.likes.likedPosts);
  const postLikeCounts = useAppSelector(state => state.likes.postLikeCounts);
  
  // Check if post is liked using Redux
  const isPostLiked = likedPosts.includes(item.id);
  
  // Get like count from Redux if available, otherwise use post data
  const cachedLikeCount = postLikeCounts[item.id];
  const initialLikeCount = cachedLikeCount !== undefined ? cachedLikeCount : (item.likes || 0);
  
  const { likes, comments, isLiked: realtimeIsLiked, updateLikesLocally } = useRealtimePost({
    postId: item.id,
    initialLikes: initialLikeCount,
    initialComments: item.comments_count || 0,
    initialIsLiked: isPostLiked || isLiked,
  });
  
  // Use the realtime hook's isLiked state as the source of truth
  // The hook handles optimistic updates and server sync internally
  // No need to sync from parent prop - the hook manages its own state
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

  const mediaUrl = getMediaUrl(item);
  const isVideo = item.type === 'video' || !!item.video_url || 
    (mediaUrl !== null && (mediaUrl.includes('.mp4') || mediaUrl.includes('.mov') || mediaUrl.includes('.webm')));

  // Simple video play/pause control - KISS principle
  useEffect(() => {
    if (!videoRef.current || useNativeControls || !isVideo) return;
    
    const managePlayback = async () => {
      try {
        const currentVideo = videoRef.current;
        if (!currentVideo) return;
        
        const status = await currentVideo.getStatusAsync();
        if (!status?.isLoaded) return;
        
        if (isActive) {
          // Pause all other videos first
          await pauseAllVideosExcept(currentVideo);
          // Play this video if not already playing
          if (!status.isPlaying) {
            await currentVideo.playAsync();
          }
        } else {
          // Pause if playing
          if (status.isPlaying) {
            await currentVideo.pauseAsync();
          }
          if (activeVideoRef.current === currentVideo) {
            activeVideoRef.current = null;
          }
        }
      } catch (error) {
        // Silently handle errors
      }
    };
    
    managePlayback();
  }, [isActive, useNativeControls, isVideo]);

  // Cleanup video on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        if (activeVideoRef.current === videoRef.current) {
          activeVideoRef.current = null;
        }
        videoRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const handleVideoTap = () => {
    setIsMuted(!isMuted);
  };

  const handleLike = async () => {
    // Check if user is logged in - show alert and redirect
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please log in to like posts and interact with the community.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Log In',
            onPress: () => router.push('/auth/login')
          }
        ]
      );
      return;
    }
    
    // Prevent double clicks and rapid toggling
    if (isLiking) return;
    setIsLiking(true);
    
    // Get current like state
    const currentIsLiked = realtimeIsLiked;
    const newIsLiked = !currentIsLiked;
    
    // Optimistic update - update Redux immediately
    if (newIsLiked) {
      dispatch(addLikedPost(item.id));
    } else {
      dispatch(removeLikedPost(item.id));
    }
    
    // Update like count in Redux
    const newLikeCount = newIsLiked ? likes + 1 : Math.max(0, likes - 1);
    dispatch(setPostLikeCount({ postId: item.id, count: newLikeCount }));
    
    // Update realtime hook
    updateLikesLocally(newLikeCount, newIsLiked);
    
    // Also update parent cache immediately for UI consistency
    onLike(item.id);
    
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
    
    // Call API to toggle like directly
    try {
      const response = await likesApi.toggle(item.id);
      
      if (response.status === 'success' && response.data) {
        // Update with server response
        const serverIsLiked = response.data.isLiked;
        const serverLikeCount = response.data.likeCount;
        
        // Update Redux with server response
        if (serverIsLiked) {
          dispatch(addLikedPost(item.id));
        } else {
          dispatch(removeLikedPost(item.id));
        }
        dispatch(setPostLikeCount({ postId: item.id, count: serverLikeCount }));
        
        // Update local state with server response
        updateLikesLocally(serverLikeCount, serverIsLiked);
      } else {
        // Revert on error
        updateLikesLocally(likes, currentIsLiked);
        // Check if it's an auth error
        if (response.message?.includes('User not found') || response.message?.includes('log in')) {
          Alert.alert(
            'Session Expired',
            'Your session has expired. Please log in again.',
            [
              {
                text: 'OK',
                onPress: () => router.push('/auth/login')
              }
            ]
          );
        }
      }
    } catch (error: any) {
      // Revert on error
      updateLikesLocally(likes, currentIsLiked);
      
      // Handle authentication errors
      if (error?.status === 404 || error?.status === 401 || 
          error?.data?.message?.includes('User not found') ||
          error?.data?.message?.includes('log in')) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again to continue.',
          [
            {
              text: 'OK',
              onPress: () => router.push('/auth/login')
            }
          ]
        );
      }
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

  const handleComment = useCallback(() => {
    if (onComment && item.id) {
      onComment(item.id);
    }
  }, [onComment, item.id]);

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

  return (
    <View style={[styles.postContainer, { height: availableHeight }]}>
      {/* Media */}
      <View style={[styles.mediaContainer, { height: availableHeight }]}>
        {isVideo ? (
          videoError ? (
            <View style={styles.mediaWrapper}>
              {mediaUrl ? (
                <Image
                  source={{ uri: mediaUrl }}
                  style={styles.media}
                  resizeMode="contain"
                  onError={() => {
                    setImageError(true);
                  }}
                />
              ) : (
                <View style={[styles.media, styles.placeholderContainer]}>
                  <Feather name="video-off" size={48} color="#666" />
                  <Text style={styles.placeholderText}>Video unavailable</Text>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.mediaWrapper} 
              activeOpacity={1} 
              onPress={handleVideoTap}
            >
              <Video
                ref={videoRef}
                source={{ uri: mediaUrl || '' }}
                style={styles.media}
                resizeMode={ResizeMode.COVER}
                shouldPlay={useNativeControls ? false : (isActive && !decoderErrorDetected)}
                isLooping={!useNativeControls}
                isMuted={useNativeControls ? false : isMuted}
                usePoster={false}
                shouldCorrectPitch={true}
                volume={useNativeControls ? 1.0 : (isMuted ? 0.0 : 1.0)}
                onLoad={() => {
                  setVideoLoaded(true);
                  // Auto-play if active
                  if (isActive && !useNativeControls && videoRef.current) {
                    pauseAllVideosExcept(videoRef.current).then(() => {
                      videoRef.current?.playAsync().catch(() => {});
                    });
                  }
                }}
                onError={(error: any) => {
                  if (!decoderErrorDetected) {
                    const errorMessage = error?.message || error?.toString() || '';
                    if (errorMessage.includes('Decoder') || errorMessage.includes('decoder') || errorMessage.includes('OMX')) {
                      // Decoder error - switch to native controls
                      setDecoderErrorDetected(true);
                      setUseNativeControls(true);
                      setVideoError(false);
                      setVideoLoaded(true);
                    } else {
                      setVideoError(true);
                    }
                  }
                }}
                useNativeControls={useNativeControls}
                onPlaybackStatusUpdate={(status: any) => {
                  if (status.isLoaded && !useNativeControls) {
                    if (status.isPlaying !== isPlaying) {
                      setIsPlaying(status.isPlaying);
                    }
                  }
                }}
              />
            </TouchableOpacity>
          )
        ) : (
          <View style={styles.mediaWrapper}>
            {mediaUrl && !imageError ? (
              <Image
                source={{ uri: mediaUrl }}
                style={styles.media}
                resizeMode="cover"
                onError={() => {
                  setImageError(true);
                }}
                onLoad={() => {}}
              />
            ) : (
              <View style={[styles.media, styles.placeholderContainer]}>
                <Feather name="image" size={48} color="#666" />
                <Text style={styles.placeholderText}>Image unavailable</Text>
              </View>
            )}
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
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => {
              handleComment();
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
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
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const lastActiveIndexRef = useRef(0);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [commentsPostTitle, setCommentsPostTitle] = useState<string>('');
  const [commentsPostAuthor, setCommentsPostAuthor] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { user } = useAuth();
  const { followedUsers, updateFollowedUsers, syncLikedPostsFromServer } = useCache();
  const dispatch = useAppDispatch();
  const likedPosts = useAppSelector(state => state.likes.likedPosts);
  const postLikeCounts = useAppSelector(state => state.likes.postLikeCounts);
  const insets = useSafeAreaInsets();
  
  // Efficient likes manager for batch checking
  const likesManager = useLikesManager();
  
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
      
      // Add timestamp to force fresh data on refresh
      const timestamp = refresh ? `&t=${Date.now()}` : '';
      
      // Load different content based on tab
      switch (tab) {
        case 'featured':
          response = await postsApi.getFeatured(1, 20, timestamp);
          break;
        case 'foryou':
          response = await postsApi.getAll(1, 20, timestamp);
          break;
        case 'following':
          if (user) {
            response = await postsApi.getFollowing(1, 20, timestamp);
          } else {
            response = { status: 'success', data: { posts: [], pagination: {}, filters: {} } };
          }
          break;
        default:
          response = await postsApi.getAll(1, 20, timestamp);
      }
      
      if (response.status === 'success') {
        const posts = response.data.posts || response.data;
        const postsArray = Array.isArray(posts) ? posts : [];
        
        // Update like counts in Redux
        const likeCountsMap: Record<string, number> = {};
        postsArray.forEach((post: Post) => {
          if (post.likes !== undefined) {
            likeCountsMap[post.id] = post.likes;
          }
        });
        if (Object.keys(likeCountsMap).length > 0) {
          dispatch(setPostLikeCounts(likeCountsMap));
        }
        
        // Sync liked posts from server if user is logged in
        if (user && postsArray.length > 0) {
          const postIds = postsArray.map((p: Post) => p.id);
          syncLikedPostsFromServer(postIds).catch(console.error);
        }
        
        setPosts(postsArray);
      } else {
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

  // Sync liked posts when user logs in or posts change
  useEffect(() => {
    if (user && posts.length > 0) {
      const postIds = posts.map(p => p.id);
      // Use batch checking for efficiency
      syncLikedPostsFromServer(postIds).catch(console.error);
    } else if (!user) {
      // Clear liked posts when user logs out
      dispatch(clearLikes());
    }
  }, [user?.id, posts.length]); // Sync when user changes or posts load

  // Reload posts when app comes back to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        loadPosts(activeTab, true);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [activeTab]);

  // Handle screen focus/blur - preserve video state
  const currentIndexRef = useRef(currentIndex);
  
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      if (lastActiveIndexRef.current >= 0) {
        setCurrentIndex(lastActiveIndexRef.current);
      }
      return () => {
        const savedIndex = currentIndexRef.current;
        setIsScreenFocused(false);
        lastActiveIndexRef.current = savedIndex;
        pauseAllVideosExcept(null);
      };
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadPosts(activeTab, true);
  };

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

    // Use efficient likes manager for optimistic updates
    await likesManager.toggleLike(postId);
    
    // Update the post's like count in the posts array for UI consistency
    const newLikeCount = likesManager.getLikeCount(postId);
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, likes: newLikeCount }
          : post
      )
    );
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

  const handleComment = useCallback((postId: string) => {
    if (!postId) return;
    
    const post = posts.find(p => p.id === postId);
    setCommentsPostId(postId);
    setCommentsPostTitle(post?.title || post?.description || '');
    setCommentsPostAuthor(post?.user?.username || '');
    setCommentsModalVisible(true);
  }, [posts]);

  const handleShare = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      try {
        const mediaUrl = getMediaUrl(post);
        await Share.share({
          message: mediaUrl || post.caption || 'Check out this post on Talynk!',
          title: 'Check out this post on Talynk!',
          url: mediaUrl || undefined,
        });
      } catch (error) {
        // Silently handle share errors
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
      const postId = visibleItem.item?.id;
      
      // Add post to batch like status check queue
      if (postId) {
        likesManager.onPostVisible(postId);
      }
      
      if (activeVideoRef.current) {
        pauseAllVideosExcept(null);
      }
      setCurrentIndex(newIndex);
      lastActiveIndexRef.current = newIndex;
    } else {
      pauseAllVideosExcept(null);
      setCurrentIndex(-1);
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
              isLiked={likedPosts.includes(item.id)}
              isFollowing={followedUsers.has(item.user?.id || '')}
              isActive={isScreenFocused && currentIndex === index}
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
          // Lazy loading optimizations for better performance
          windowSize={3}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={true}
          getItemLayout={(data, index) => ({
            length: availableHeight,
            offset: availableHeight * index,
            index,
          })}
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
          setTimeout(() => {
            setCommentsPostId(null);
          }, 300);
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
    minWidth: 50,
    minHeight: 50,
    justifyContent: 'center',
    padding: 8,
    zIndex: 20,
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
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  placeholderText: {
    color: '#666',
    fontSize: 14,
    marginTop: 12,
  },
});