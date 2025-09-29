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
  let url = post.video_url || post.image || '';
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
  isActive
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
  const insets = useSafeAreaInsets();
  
  // Like animation
  const likeScale = useRef(new Animated.Value(1)).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;

  // Handle video play/pause based on active state
  useEffect(() => {
    if (videoRef.current && videoLoaded) {
      if (isActive) {
        videoRef.current.playAsync().catch(console.log);
      } else {
        videoRef.current.pauseAsync().catch(console.log);
        setIsPlaying(false);
      }
    }
  }, [isActive, videoLoaded]);

  const handleVideoTap = () => {
    setIsMuted(!isMuted);
  };

  const handleLike = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    if (isLiking) return;
    setIsLiking(true);
    
    const newIsLiked = !realtimeIsLiked;
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
    
    sendLikeAction(item.id, newIsLiked);
    await onLike(item.id);
    setIsLiking(false);
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
    if (!user) {
      router.push('/auth/login');
      return;
    }
    onComment(item.id);
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
  const isVideo = !!item.video_url;

  return (
    <View style={styles.postContainer}>
      {/* Media */}
      <View style={styles.mediaContainer}>
        {isVideo ? (
          videoError ? (
            <Image
              source={{ uri: mediaUrl }}
              style={styles.media}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <TouchableOpacity style={{ flex: 1, backgroundColor: '#000' }} activeOpacity={1} onPress={handleVideoTap}>
              <Video
                ref={videoRef}
                source={{ uri: mediaUrl }}
                style={[styles.media, { backgroundColor: '#000' }]}
                resizeMode={ResizeMode.COVER}
                shouldPlay={isActive}
                isLooping
                isMuted={isMuted}
                onLoad={() => setVideoLoaded(true)}
                onError={() => setVideoError(true)}
                useNativeControls={false}
                shouldCorrectPitch={true}
                volume={isMuted ? 0.0 : 1.0}
                posterStyle={{ resizeMode: 'cover' }}
                onPlaybackStatusUpdate={(status: any) => {
                  if (status.isLoaded) {
                    setIsPlaying(status.isPlaying);
                  }
                }}
              />
            </TouchableOpacity>
          )
        ) : (
          <Image
            source={{ uri: imageError ? 'https://via.placeholder.com/300x500' : mediaUrl }}
            style={[styles.media, { backgroundColor: '#000' }]}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        )}

        {/* Mute/Unmute Icon */}
        {isVideo && (
          <TouchableOpacity 
            style={[styles.muteButton, { top: insets.top + 60 }]} 
            onPress={() => setIsMuted(!isMuted)}
          >
            <Feather name={isMuted ? 'volume-x' : 'volume-2'} size={24} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Right Side Actions */}
        <View style={[styles.rightActions, { bottom: 120 + insets.bottom }]}>
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
                size={32} 
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
            <Feather name="message-circle" size={32} color="#fff" />
            <Text style={styles.actionCount}>{formatNumber(comments)}</Text>
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity style={styles.actionButton} onPress={() => onShare(item.id)}>
            <Feather name="share" size={32} color="#fff" />
          </TouchableOpacity>

          {/* More Actions */}
          <TouchableOpacity style={styles.actionButton} onPress={() => onReport(item.id)}>
            <Feather name="more-horizontal" size={32} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Bottom Info */}
        <View style={[styles.bottomInfo, { paddingBottom: 120 + insets.bottom }]}>
          <View style={styles.bottomInfoContent}>
            <TouchableOpacity onPress={handleUserPress}>
              <Text style={styles.username}>@{item.user?.username || 'unknown'}</Text>
            </TouchableOpacity>
            
            <Text style={styles.caption} numberOfLines={3}>
              {item.description || item.caption || item.title || ''}
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
  const [isMuted, setIsMuted] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { user } = useAuth();
  const { likedPosts, followedUsers, updateLikedPosts, updateFollowedUsers } = useCache();
  const insets = useSafeAreaInsets();

  const loadPosts = async (tab = 'featured', refresh = false) => {
    try {
      setLoading(refresh ? false : true);
      let response;
      
      // Load different content based on tab
      switch (tab) {
        case 'featured':
          response = await postsApi.getAll(1, 20); // Featured posts (admin curated)
          break;
        case 'foryou':
          response = await postsApi.getAll(1, 20); // For you algorithm
          break;
        case 'following':
          if (user) {
            response = await postsApi.getAll(1, 20); // Following posts
          } else {
            response = { status: 'success', data: [] };
          }
          break;
        default:
          response = await postsApi.getAll(1, 20);
      }
      
      if (response.status === 'success') {
        setPosts(response.data);
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

  const onRefresh = () => {
    setRefreshing(true);
    loadPosts(activeTab, true);
  };

  const handleLike = async (postId: string) => {
    const isCurrentlyLiked = likedPosts.has(postId);
    updateLikedPosts(postId, !isCurrentlyLiked);
    try {
      const response = await likesApi.toggle(postId);
      if (response.status !== 'success') {
        updateLikedPosts(postId, isCurrentlyLiked);
      }
    } catch (error) {
      updateLikedPosts(postId, isCurrentlyLiked);
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
    router.push({
      pathname: '/post/[id]',
      params: { id: postId }
    });
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
      setCurrentIndex(viewableItems[0].index || 0);
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
            />
          )}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={screenHeight}
          snapToAlignment="start"
          decelerationRate="fast"
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
    height: screenHeight,
    backgroundColor: '#000',
  },
  mediaContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
  },
  media: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  muteButton: {
    position: 'absolute',
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    marginBottom: 20,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    marginBottom: 20,
  },
  actionCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
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