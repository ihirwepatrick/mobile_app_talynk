import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  TextInput,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { router } from 'expo-router';
import { postsApi } from '@/lib/api';
import { Post } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
 

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const COLORS = {
  light: {
    background: '#000000',
    text: '#ffffff',
    textSecondary: '#cccccc',
    primary: '#ff2d55',
    overlay: 'rgba(0, 0, 0, 0.3)',
    searchBg: 'rgba(255, 255, 255, 0.1)',
    tabActive: '#ffffff',
    tabInactive: '#8e8e93',
  },
  dark: {
    background: '#000000',
    text: '#ffffff',
    textSecondary: '#cccccc',
    primary: '#ff2d55',
    overlay: 'rgba(0, 0, 0, 0.3)',
    searchBg: 'rgba(255, 255, 255, 0.1)',
    tabActive: '#ffffff',
    tabInactive: '#8e8e93',
  },
};

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

const isVideoUrl = (url?: string): boolean => {
  if (!url) return false;
  const urlLower = url.toLowerCase();
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.wmv', '.m4v', '.mpg', '.mpeg', '.3gp', '.3g2', '.mkv', '.ogg'];
  return videoExtensions.some(ext => urlLower.endsWith(ext)) ||
         urlLower.includes('/video/') ||
         urlLower.includes('/videos/') ||
         urlLower.includes('video_url=') ||
         urlLower.includes('videourl=');
};

const getMediaUrl = (post: Post): string => {
  let url = post.video_url || post.image || post.user?.profile_picture;
  if (!url) return 'https://via.placeholder.com/300x500';
  url = url.replace('http://localhost:3000', '');
  return url;
};

interface PostItemProps {
  item: Post;
  index: number;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onReport: (postId: string) => void;
  isLiked: boolean;
  isActive: boolean;
}

const PostItem: React.FC<PostItemProps> = ({ 
  item, 
  index, 
  onLike, 
  onComment, 
  onShare, 
  onReport,
  isLiked, 
  isActive
}) => {
  const { user } = useAuth();
  const videoRef = useRef<Video>(null);
  const [isLiking, setIsLiking] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [localMuted, setLocalMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Like animation
  const likeScale = useRef(new Animated.Value(1)).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;

  // Handle video play/pause based on active state
  useEffect(() => {
    if (videoRef.current && videoLoaded) {
      if (isActive) {
        videoRef.current.playAsync().catch((error) => {
          console.log('Video play failed:', error);
        });
      } else {
        videoRef.current.pauseAsync().catch((error) => {
          console.log('Video pause failed:', error);
        });
        setIsPlaying(false);
      }
    }
  }, [isActive, videoLoaded]);

  // Reset progress when video becomes inactive
  useEffect(() => {
    if (!isActive) {
      setVideoProgress(0);
      setIsPlaying(false);
    }
  }, [isActive]);

  const handleVideoTap = () => {
    setLocalMuted(!localMuted);
  };

  const handleVideoLoad = () => {
    setVideoLoaded(true);
  };

  const handleVideoError = (error: any) => {
    console.log('Video error for post:', item.id, error);
    setVideoError(true);
    setIsPlaying(false);
  };

  const handlePlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setVideoDuration(status.durationMillis || 0);
      setVideoProgress(status.positionMillis || 0);
      setIsPlaying(status.isPlaying);
    }
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    
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

    // Show like animation if liking
    if (!isLiked) {
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
    
    await onLike(item.id);
    setIsLiking(false);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: getMediaUrl(item),
        title: 'Share Talynk Post',
        url: getMediaUrl(item),
      });
    } catch (e) {
      // Handle error silently
    }
  };

  const mediaUrl = getMediaUrl(item);
  const isVideo = !!item.video_url && (item.video_url.endsWith('.mp4') || item.video_url.endsWith('.webm'));

  return (
    <View style={styles.postContainer}>

      {/* Report Menu */}
      {showReportMenu && (
        <View style={styles.reportMenu}>
          <TouchableOpacity 
            style={styles.reportMenuItem}
            onPress={() => {
              onReport(item.id);
              setShowReportMenu(false);
            }}
          >
            <MaterialIcons name="report" size={20} color="#ff6b6b" />
            <Text style={styles.reportMenuText}>Report</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.reportMenuItem}
            onPress={() => setShowReportMenu(false)}
          >
            <MaterialIcons name="close" size={20} color="#fff" />
            <Text style={styles.reportMenuText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.mediaContainer}>
        {isVideo ? (
          videoError ? (
            <Image
              source={{ uri: mediaUrl }}
              style={styles.image}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleVideoTap}>
              <Video
                ref={videoRef}
                source={{ uri: mediaUrl }}
                style={styles.video}
                resizeMode={ResizeMode.COVER}
                shouldPlay={isActive}
                isLooping
                isMuted={localMuted}
                onLoad={handleVideoLoad}
                onError={handleVideoError}
                useNativeControls={false}
                shouldCorrectPitch={true}
                volume={localMuted ? 0.0 : 1.0}
                posterStyle={{ resizeMode: 'cover' }}
                onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              />
              {/* Mute/Unmute Icon Top Right */}
              <TouchableOpacity style={[styles.muteIconTopRight, { top: insets.top + 120 }]} onPress={handleVideoTap}>
                <Feather name={localMuted ? 'volume-x' : 'volume-2'} size={28} color="#fff" />
              </TouchableOpacity>
            </TouchableOpacity>
          )
        ) : (
          <Image
            source={{ uri: imageError ? 'https://via.placeholder.com/300x500' : mediaUrl }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        )}

        {/* Right Side Actions (avatar + buttons) */}
        <View style={[styles.rightActions, { bottom: 200 + insets.bottom }]}>
          {/* User Avatar */}
          <TouchableOpacity onPress={() => item.user?.id && router.push({ pathname: '/user/[id]', params: { id: item.user.id } })}>
            <Image
              source={{ uri: item.user?.profile_picture || 'https://via.placeholder.com/48' }}
              style={{ width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: '#fff', marginBottom: 18 }}
            />
          </TouchableOpacity>
          {/* Like Button */}
          <TouchableOpacity style={styles.actionButton} onPress={handleLike} disabled={isLiking}>
            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
              <Feather 
                name="heart" 
                size={32} 
                color={isLiked ? "#ff2d55" : "#fff"} 
                style={{ marginBottom: 5 }}
                fill={isLiked ? "#ff2d55" : "none"}
              />
            </Animated.View>
            <Text style={styles.actionCount}>{formatNumber(item.likes || 0)}</Text>
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
          <TouchableOpacity style={styles.actionButton} onPress={() => onComment(item.id)}>
            <View style={styles.actionIconContainer}>
              <Feather name="message-circle" size={32} color="#fff" style={{ marginBottom: 5 }} />
              {(item.comments_count || 0) > 0 && (
                <View style={styles.commentCountBadge}>
                  <Text style={styles.commentCountText}>{formatNumber(item.comments_count || 0)}</Text>
                </View>
              )}
            </View>
            <Text style={styles.actionCount}>{formatNumber(item.comments_count || 0)}</Text>
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Feather name="share-2" size={32} color="#fff" style={{ marginBottom: 5 }} />
            <Text style={styles.actionCount}>Share</Text>
          </TouchableOpacity>

          {/* More (Report) */}
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowReportMenu(!showReportMenu)}>
            <Feather name="more-vertical" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Bottom Info Overlay */}
        <View style={[styles.bottomOverlay, { paddingBottom: 150 + insets.bottom }]}>
          <View style={styles.gradient} />
          <View style={styles.bottomInfoRow}>
            <View style={styles.bottomContent}>
              {/* Video Progress Bar - Above Caption */}
              {isVideo && videoDuration > 0 && (
                <View style={styles.videoProgressContainer}>
                  <View style={styles.videoProgressBar}>
                    <View 
                      style={[
                        styles.videoProgressFill, 
                        { width: `${(videoProgress / videoDuration) * 100}%` }
                      ]} 
                    />
                  </View>
                  <View style={styles.videoTimeContainer}>
                    <Text style={styles.videoTimeText}>{formatTime(videoProgress)}</Text>
                    <Text style={styles.videoTimeText}>{formatTime(videoDuration)}</Text>
                  </View>
                </View>
              )}
              
              {/* Username and meta */}
              <Text style={styles.usernameMeta} numberOfLines={1}>
                @{item.user?.username || 'unknown'}  •  {(typeof item.category === 'string' ? item.category : item.category?.name) || 'Following'}  •  {timeAgo(item.createdAt || '')}
              </Text>
              {/* Caption */}
              <Text style={styles.caption} numberOfLines={3}>
                {item.description || item.title || item.caption || ''}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default function CreatePostScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  // Removed top tabs/search to maximize video space
  const flatListRef = useRef<FlatList>(null);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const colors = COLORS.dark;

  const loadPosts = async (pageNum = 1, refresh = false) => {
    try {
      const response = await postsApi.getAll(pageNum, 10);
      if (response.status === 'success') {
        const newPosts = response.data;
        if (refresh) {
          setPosts(newPosts);
        } else {
          setPosts(prev => [...prev, ...newPosts]);
        }
        setHasMore(newPosts.length === 10);

        // Load like statuses for new posts
        if (user) {
          const likeStatuses = await Promise.all(
            newPosts.map(async (post) => {
              try {
                const likeResponse = await postsApi.checkLikeStatus(post.id);
                return {
                  postId: post.id,
                  liked: likeResponse.status === 'success' ? likeResponse.data.liked : false
                };
              } catch (error) {
                return { postId: post.id, liked: false };
              }
            })
          );

          // Update liked posts set
          setLikedPosts(prev => {
            const newSet = new Set(prev);
            likeStatuses.forEach(({ postId, liked }) => {
              if (liked) {
                newSet.add(postId);
              } else {
                newSet.delete(postId);
              }
            });
            return newSet;
          });
        }
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadPosts(1, true);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadPosts(nextPage);
    }
  };

  const handleLike = async (postId: string) => {
    const isCurrentlyLiked = likedPosts.has(postId);
    
    // Optimistic update for liked posts set
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (isCurrentlyLiked) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });

    // Optimistic update for posts array
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const currentLikes = post.likes || 0;
        const newLikes = isCurrentlyLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
        return { ...post, likes: newLikes };
      }
      return post;
    }));

    try {
      const response = isCurrentlyLiked 
        ? await postsApi.unlike(postId)
        : await postsApi.like(postId);
      
      if (response.status !== 'success') {
        // Revert optimistic updates on error
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          if (isCurrentlyLiked) {
            newSet.add(postId);
          } else {
            newSet.delete(postId);
          }
          return newSet;
        });
        
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            const currentLikes = post.likes || 0;
            const originalLikes = isCurrentlyLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1);
            return { ...post, likes: originalLikes };
          }
          return post;
        }));
      }
    } catch (error) {
      // Revert optimistic updates on error
      setLikedPosts(prev => {
        const newSet = new Set(prev);
        if (isCurrentlyLiked) {
          newSet.add(postId);
        } else {
          newSet.delete(postId);
        }
        return newSet;
      });
      
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          const currentLikes = post.likes || 0;
          const originalLikes = isCurrentlyLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1);
          return { ...post, likes: originalLikes };
        }
        return post;
      }));
    }
  };

  const handleComment = async (postId: string) => {
    // Navigate to post detail for comments
    router.push(`/post/${postId}` as any);
  };

  const handleShare = async (postId: string) => {
    // Share functionality is handled in PostItem
  };

  const handleReport = async (postId: string) => {
    // Handle report functionality
    console.log('Reporting post:', postId);
    // You can implement actual report logic here
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const currentPostId = viewableItems[0].item.id;
      setCurrentlyPlaying(currentPostId);
    } else {
      setCurrentlyPlaying(null);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 100,
  }).current;

  if (loading && posts.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}> 
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Top header and search removed to maximize video space */}

      {/* Feed */}
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
            isLiked={likedPosts.has(item.id)}
            isActive={currentlyPlaying === item.id}
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
            tintColor={colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        ListEmptyComponent={
          <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}> 
            <Text style={[styles.emptyText, { color: colors.text }]}>No posts yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Follow some users to see their posts</Text>
          </View>
        }
        ListFooterComponent={
          hasMore && posts.length > 0 ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />
    </View>
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
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  rightActions: {
    position: 'absolute',
    right: 16,
    bottom: 200,
    alignItems: 'center',
    zIndex: 10,
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 50,
    width: 60,
    height: 60,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
  },
  actionCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 100,
    zIndex: 20,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    height: 300,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  bottomInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 40,
    zIndex: 21,
  },
  caption: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  usernameMeta: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    height: screenHeight,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  muteIconTopRight: {
    position: 'absolute',
    right: 16,
    zIndex: 30,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 25,
    padding: 8,
    top: 120,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 25,
    paddingTop: 50,
  },
  postUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  postUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  postUserText: {
    flex: 1,
  },
  postUsername: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  postTime: {
    color: '#ccc',
    fontSize: 12,
  },
  postMenuButton: {
    padding: 4,
  },
  postHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followButtonSmall: {
    backgroundColor: '#60a5fa',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  followButtonTextSmall: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  bottomContent: {
    flex: 1,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#60a5fa',
    borderRadius: 16,
    height: 32,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  categoryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 32,
  },
  actionIconContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  commentCountBadge: {
    position: 'absolute',
    top: -3,
    right: -6,
    backgroundColor: '#ff2d55',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  commentCountText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  likeAnimationOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
    zIndex: 100,
  },
  videoProgressContainer: {
    marginBottom: 12,
  },
  videoProgressBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 5,
  },
  videoProgressFill: {
    height: '100%',
    backgroundColor: '#60a5fa',
    borderRadius: 2,
  },
  videoTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoTimeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  reportMenu: {
    position: 'absolute',
    top: 110,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 8,
    zIndex: 200,
    minWidth: 120,
  },
  reportMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  reportMenuText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
  },
}); 