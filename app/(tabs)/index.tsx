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
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { router } from 'expo-router';
import { postsApi } from '@/lib/api';
import { Post } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const [videoRef, setVideoRef] = useState<Video | null>(null);
  const [isLiking, setIsLiking] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { isMuted, setIsMuted } = useMute();
  const [localMuted, setLocalMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (videoRef) {
      if (isActive) {
        videoRef.playAsync && videoRef.playAsync();
      } else {
        videoRef.pauseAsync && videoRef.pauseAsync();
      }
    }
  }, [isActive, videoRef]);

  useEffect(() => {
    setLocalMuted(isMuted);
  }, [isMuted]);

  const handleVideoTap = () => {
    setIsMuted(!isMuted); // Toggle mute globally
  };

  const handleMuteIconPress = () => {
    setIsMuted(!isMuted);
  };

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
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
      <View style={styles.mediaContainer}>
        {isVideo ? (
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleVideoTap}>
            <Video
              ref={setVideoRef}
              source={{ uri: mediaUrl }}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={isActive}
              isLooping
              isMuted={localMuted}
              onError={() => setVideoError(true)}
              useNativeControls={false}
            />
            {/* Mute/Unmute Icon Top Right */}
            <TouchableOpacity style={[styles.muteIconTopRight, { top: insets.top + 16 }]} onPress={handleMuteIconPress}>
              <Feather name={localMuted ? 'volume-x' : 'volume-2'} size={28} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        ) : (
          <Image
            source={{ uri: imageError ? 'https://via.placeholder.com/300x500' : mediaUrl }}
            style={styles.image}
            resizeMode="contain"
            onError={() => setImageError(true)}
          />
        )}
        {/* Right Side Actions */}
        <View style={[styles.rightActions, { bottom: 120 + insets.bottom }]}>
          {/* Like Button */}
          <TouchableOpacity style={styles.actionButton} onPress={handleLike} disabled={isLiking}>
            <Text style={[styles.actionIcon, isLiked && styles.likedIcon]}>{isLiked ? '❤️' : '🤍'}</Text>
            <Text style={styles.actionCount}>{formatNumber(item.likes || 0)}</Text>
          </TouchableOpacity>
          {/* Share Button */}
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Feather name="share-2" size={30} color="#fff" style={{ marginBottom: 5 }} />
            <Text style={styles.actionCount}>Share</Text>
          </TouchableOpacity>
          {/* Save Button */}
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>🔖</Text>
            <Text style={styles.actionCount}>Save</Text>
          </TouchableOpacity>
          {/* 3-dots Button */}
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>⋯</Text>
            <Text style={styles.actionCount}>More</Text>
          </TouchableOpacity>
        </View>
        {/* Bottom Info Overlay */}
        <View style={[styles.bottomOverlay, { paddingBottom: 56 + insets.bottom }]}>
          <View style={styles.gradient} />
          <View style={styles.bottomInfoRow}>
            <Image source={{ uri: item.user?.profile_picture || 'https://via.placeholder.com/40' }} style={styles.avatar} />
            <View style={styles.userInfoText}>
              <Text style={styles.username}>@{item.user?.username || 'unknown'}</Text>
              <Text style={styles.caption} numberOfLines={2}>{item.description || item.title || ''}</Text>
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
  const [isMuted, setIsMuted] = useState(true);
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
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
    // Optionally: call API to like/unlike
    try {
      const isCurrentlyLiked = likedPosts.has(postId);
      const response = isCurrentlyLiked 
        ? await postsApi.unlike(postId)
        : await postsApi.like(postId);
      // Optionally: update post like count
    } catch (error) {
      // Optionally: revert like state on error
    }
  };

  const handleComment = (postId: string) => {
    // TODO: Navigate to comments screen
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const currentPostId = viewableItems[0].item.id;
      setCurrentlyPlaying(currentPostId);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
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
        <View style={styles.navBarBackground} />
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
    marginBottom: 20,
  },
  actionIcon: {
    fontSize: 30,
    marginBottom: 5,
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
    height: 200,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  bottomInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
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
});
