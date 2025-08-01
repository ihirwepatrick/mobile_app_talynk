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
  useColorScheme,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Share,
  Animated,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { router, useNavigation } from 'expo-router';
import { postsApi } from '@/lib/api';
import { Post } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CommentsOverlay from '@/components/CommentsOverlay';
import { useRealtime } from '@/lib/realtime-context';
import { useRealtimePost } from '@/lib/hooks/use-realtime-post';
import RealtimeIndicator from '@/components/RealtimeIndicator';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const COLORS = {
  light: {
    background: '#000000',
    text: '#ffffff',
    textSecondary: '#cccccc',
    primary: '#ff2d55',
    overlay: 'rgba(0, 0, 0, 0.3)',
  },
  dark: {
    background: '#000000',
    text: '#ffffff',
    textSecondary: '#cccccc',
    primary: '#ff2d55',
    overlay: 'rgba(0, 0, 0, 0.3)',
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

// Global mute context
const MuteContext = createContext({ isMuted: true, setIsMuted: (v: boolean) => {} });
const useMute = () => useContext(MuteContext);

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
  isLiked: boolean;
  isActive: boolean;
}

const PostItem: React.FC<PostItemProps & { isActive: boolean }> = ({ 
  item, 
  index, 
  onLike, 
  onComment, 
  onShare, 
  isLiked, 
  isActive
}) => {
  const { user } = useAuth();
  const { sendLikeAction } = useRealtime();
  const { likes, comments, isLiked: realtimeIsLiked, isConnected, updateLikesLocally } = useRealtimePost({
    postId: item.id,
    initialLikes: item.likes || 0,
    initialComments: item.comments_count || 0,
    initialIsLiked: isLiked,
  });
  const videoRef = useRef<Video>(null);
  const [isLiking, setIsLiking] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { isMuted, setIsMuted } = useMute();
  const [localMuted, setLocalMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Like animation
  const likeScale = useRef(new Animated.Value(1)).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;

  // Handle video play/pause based on active state
  useEffect(() => {
    if (videoRef.current && videoLoaded) {
      if (isActive) {
        // Simple play when active
        videoRef.current.playAsync().catch((error) => {
          console.log('Video play failed:', error);
        });
      } else {
        // Simple pause when not active
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

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup video when component unmounts
      if (videoRef.current) {
        videoRef.current.pauseAsync().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    setLocalMuted(isMuted);
  }, [isMuted]);

  const handleVideoTap = () => {
    setIsMuted(!isMuted); // Toggle mute globally
  };

  const handleMuteIconPress = () => {
    setIsMuted(!isMuted);
  };

  const handleVideoLoad = () => {
    setVideoLoaded(true);
    console.log('Video loaded for post:', item.id);
  };

  const handleVideoError = (error: any) => {
    console.log('Video error for post:', item.id, error);
    setVideoError(true);
    // Don't let video errors affect the overall component state
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
    
    // Optimistic update - immediately update the UI
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

    // Show like animation if liking
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
    
    // Send real-time like action
    if (isConnected) {
      sendLikeAction(item.id, newIsLiked);
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
      // Optionally handle error
    }
  };

  const mediaUrl = getMediaUrl(item);
  const isVideo = !!item.video_url && (item.video_url.endsWith('.mp4') || item.video_url.endsWith('.webm'));

  return (
    <View style={styles.postContainer}>
      {/* User Info Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity 
          style={styles.postUserInfo}
          onPress={() => {
            if (item.user?.id) {
              router.push({
                pathname: '/user/[id]',
                params: { id: item.user.id }
              });
            }
          }}
        >
          <Image 
            source={{ uri: item.user?.profile_picture || 'https://via.placeholder.com/32' }} 
            style={styles.postUserAvatar} 
          />
          <View style={styles.postUserText}>
            <Text style={styles.postUsername}>@{item.user?.username || 'unknown'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.postTime}>{timeAgo(item.createdAt || '')}</Text>
              <RealtimeIndicator />
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.postHeaderActions}>
          {user && user.id !== item.user?.id && (
            <TouchableOpacity style={styles.followButtonSmall}>
              <Text style={styles.followButtonTextSmall}>Follow</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.postMenuButton}>
            <Feather name="more-horizontal" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mediaContainer}>
        {isVideo ? (
          videoError ? (
            // Fallback to image if video fails
            <Image
              source={{ uri: mediaUrl }}
              style={styles.image}
              resizeMode="contain"
              onError={() => setImageError(true)}
            />
          ) : (
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleVideoTap}>
              <Video
                ref={videoRef}
                source={{ uri: mediaUrl }}
                style={styles.video}
                resizeMode={ResizeMode.CONTAIN}
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
              <TouchableOpacity style={[styles.muteIconTopRight, { top: insets.top + 60 }]} onPress={handleMuteIconPress}>
                <Feather name={localMuted ? 'volume-x' : 'volume-2'} size={28} color="#fff" />
              </TouchableOpacity>
            </TouchableOpacity>
          )
        ) : (
          <Image
            source={{ uri: imageError ? 'https://via.placeholder.com/300x500' : mediaUrl }}
            style={styles.image}
            resizeMode="contain"
            onError={() => setImageError(true)}
          />
        )}
        {/* Right Side Actions */}
        <View style={[styles.rightActions, { bottom: 320 + insets.bottom }]}>
          {/* Like Button */}
          <TouchableOpacity style={styles.actionButton} onPress={handleLike} disabled={isLiking}>
            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
              <Feather 
                name="heart" 
                size={32} 
                color={realtimeIsLiked ? "#ff2d55" : "#fff"} 
                style={{ marginBottom: 5 }}
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
          {/* Share Button */}
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Feather name="share-2" size={32} color="#fff" style={{ marginBottom: 5 }} />
          </TouchableOpacity>
          {/* Download Button */}
          <TouchableOpacity style={styles.actionButton}>
            <Feather name="download" size={32} color="#fff" style={{ marginBottom: 5 }} />
          </TouchableOpacity>
          {/* Comment Button */}
          <TouchableOpacity style={styles.actionButton} onPress={() => onComment(item.id)}>
            <View style={styles.actionIconContainer}>
              <Feather name="message-circle" size={32} color="#fff" style={{ marginBottom: 5 }} />
              {comments > 0 && (
                <View style={styles.commentCountBadge}>
                  <Text style={styles.commentCountText}>{formatNumber(comments)}</Text>
                </View>
              )}
            </View>
            <Text style={styles.actionCount}>{formatNumber(comments)}</Text>
          </TouchableOpacity>
        </View>
        {/* Bottom Info Overlay */}
        <View style={[styles.bottomOverlay, { paddingBottom: 200 + insets.bottom }]}>
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
              <Text style={styles.caption} numberOfLines={3}>{item.description || item.title || ''}</Text>
              {item.category && (
                <View style={styles.categoryTag}>
                  <Text style={styles.categoryText}>
                    {typeof item.category === 'string' ? item.category : item.category.name}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [lastPlayingVideo, setLastPlayingVideo] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const { user } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

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

  // Simple solution to pause videos when leaving the screen
  useEffect(() => {
    const blurUnsubscribe = navigation.addListener('blur', () => {
      // Save current video and pause all videos when leaving the feeds screen
      setLastPlayingVideo(currentlyPlaying);
      setCurrentlyPlaying(null);
    });

    const focusUnsubscribe = navigation.addListener('focus', () => {
      // Resume the last playing video when returning to the feeds screen
      if (lastPlayingVideo) {
        setCurrentlyPlaying(lastPlayingVideo);
        setLastPlayingVideo(null);
      }
    });

    return () => {
      blurUnsubscribe();
      focusUnsubscribe();
    };
  }, [navigation, currentlyPlaying, lastPlayingVideo]);

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
      // Call the appropriate API based on current state
      const response = isCurrentlyLiked 
        ? await postsApi.unlike(postId)
        : await postsApi.like(postId);
      
      if (response.status === 'success') {
        // Update posts with new like count if provided by server
        if (response.data?.likeCount !== undefined) {
          setPosts(prev => prev.map(post => 
            post.id === postId 
              ? { ...post, likes: response.data.likeCount }
              : post
          ));
        }
      } else {
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
        
        console.error('Like action failed:', response.message);
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
      
      console.error('Like action failed:', error);
    }
  };

  const handleComment = async (postId: string) => {
    setActiveCommentsPostId(postId);
    setCommentsVisible(true);
    setCommentsLoading(true);
    try {
      const response = await postsApi.getComments(postId);
      if (response.status === 'success' && response.data?.comments) {
        setComments(response.data.comments);
      } else {
        setComments([]);
      }
    } catch {
      setComments([]);
    }
    setCommentsLoading(false);
  };
  const handleAddComment = async (text: string) => {
    if (!activeCommentsPostId) return;
    try {
      const response = await postsApi.addComment(activeCommentsPostId, text);
      if (response.status === 'success' && response.data?.comment?.length) {
        setComments([response.data.comment[0], ...comments]);
      }
    } catch {}
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const currentPostId = viewableItems[0].item.id;
      console.log('Currently playing post:', currentPostId);
      setCurrentlyPlaying(currentPostId);
    } else {
      setCurrentlyPlaying(null);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50, // Lower threshold for faster response
    minimumViewTime: 100, // Minimum time item must be visible
  }).current;

  if (loading && posts.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}> 
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
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
              onShare={() => {}}
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
        {/* Dark nav bar background */}
        {/* <View style={styles.navBarBackground} /> */}
        {/* Comments Overlay */}
        <CommentsOverlay
          postId={activeCommentsPostId || ''}
          isVisible={commentsVisible}
          onClose={() => setCommentsVisible(false)}
          comments={comments}
          onAddComment={handleAddComment}
          loading={commentsLoading}
        />
      </MuteContext.Provider>
    </SafeAreaView>
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
    right: 10,
    bottom: 120,
    alignItems: 'center',
    zIndex: 10,
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 40,
    width: 80,
    height: 80,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 10,
  },
  actionIcon: {
    fontSize: 22,
    marginBottom: 4,
    color: '#fff',
  },
  likedIcon: {
    color: '#ff2d55',
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
    paddingBottom: 56,
    zIndex: 20,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    height: 250,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  bottomInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 40,
    zIndex: 21,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    marginRight: 10,
  },
  userInfoText: {
    flex: 1,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  caption: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
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
  navBarBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
    backgroundColor: '#111',
    zIndex: 100,
  },
  muteIconTopRight: {
    position: 'absolute',
    right: 16,
    zIndex: 30,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 6,
  },
  floatingProfileContainer: {
    position: 'absolute',
    left: 16,
    bottom: 100, // adjust as needed
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 24,
    padding: 8,
  },
  profileTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  followButton: {
    backgroundColor: '#60a5fa',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  followingButton: {
    backgroundColor: '#232326',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#60a5fa',
  },
  followText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  followingText: {
    color: '#60a5fa',
    fontWeight: 'bold',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 25,
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
});

