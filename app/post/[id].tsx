import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  TextInput,
  Share,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { postsApi, followsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useCache } from '@/lib/cache-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReportModal from '@/components/ReportModal';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { likedPosts, followedUsers, updateLikedPosts, updateFollowedUsers } = useCache();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [id]);

  const fetchPost = async () => {
    try {
      const response = await postsApi.getById(id as string);
      if (response.status === 'success' && response.data) {
        setPost(response.data);
      }
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await postsApi.getComments(id as string);
      if (response.status === 'success' && response.data?.comments) {
        setComments(response.data.comments);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    const isCurrentlyLiked = likedPosts.has(post.id);
    updateLikedPosts(post.id, !isCurrentlyLiked);

    try {
      const response = isCurrentlyLiked 
        ? await postsApi.unlike(post.id)
        : await postsApi.like(post.id);
      
      if (response.status === 'success') {
        setPost((prev: any) => ({
          ...prev,
          likes: response.data?.likeCount || (isCurrentlyLiked ? (prev.likes || 1) - 1 : (prev.likes || 0) + 1)
        }));
      }
    } catch (error) {
      updateLikedPosts(post.id, isCurrentlyLiked);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    const isCurrentlyFollowing = followedUsers.has(post.user?.id || '');
    setFollowLoading(true);
    
    try {
      const response = isCurrentlyFollowing
        ? await followsApi.unfollow(post.user.id)
        : await followsApi.follow(post.user.id);
      
      if (response.status === 'success') {
        updateFollowedUsers(post.user.id, !isCurrentlyFollowing);
      }
    } catch (error) {
      console.error('Follow error:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!commentText.trim()) return;
    
    setCommentLoading(true);
    try {
      const response = await postsApi.addComment(id as string, commentText);
      if (response.status === 'success' && response.data?.comment?.length) {
        setComments([response.data.comment[0], ...comments]);
        setCommentText('');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: post?.caption || '',
        url: post?.video_url || post?.image || '',
        title: 'Check out this post on Talynk!'
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Post not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const mediaUrl = post.video_url || post.image || '';
  const isVideo = !!post.video_url;
  const isLiked = likedPosts.has(post.id);
  const isFollowing = followedUsers.has(post.user?.id || '');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerUserInfo}>
          <Image
            source={{ uri: post.user?.profile_picture || 'https://via.placeholder.com/32' }}
            style={styles.headerAvatar}
          />
          <Text style={styles.headerUsername}>@{post.user?.username || 'unknown'}</Text>
          
          {user && user.id !== post.user?.id && (
            <TouchableOpacity 
              style={[
                styles.followButton,
                { backgroundColor: isFollowing ? 'rgba(255,255,255,0.2)' : '#60a5fa' }
              ]}
              onPress={handleFollow}
              disabled={followLoading}
            >
              <Text style={[
                styles.followButtonText,
                { color: isFollowing ? '#fff' : '#000' }
              ]}>
                {followLoading ? '...' : (isFollowing ? 'Following' : 'Follow')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.headerMenu}>
          <Feather name="more-vertical" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Media */}
      <View style={styles.mediaContainer}>
        {isVideo ? (
          <Video
            source={{ uri: mediaUrl }}
            style={styles.media}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls
            shouldPlay
            isLooping
          />
        ) : (
          <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="contain" />
        )}
      </View>

      {/* Actions Bar */}
      <View style={styles.actionsBar}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Feather 
            name="heart" 
            size={24} 
            color={isLiked ? "#ff2d55" : "#fff"} 
            fill={isLiked ? "#ff2d55" : "none"}
          />
          <Text style={styles.actionText}>{post.likes || 0}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Feather name="message-circle" size={24} color="#fff" />
          <Text style={styles.actionText}>{comments.length}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Feather name="share" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Caption */}
      <View style={styles.captionContainer}>
        <Text style={styles.caption}>{post.caption || post.description || ''}</Text>
        {post.category && (
          <TouchableOpacity 
            style={styles.categoryBadge}
            onPress={() => router.push({
              pathname: '/category/[name]',
              params: { name: typeof post.category === 'string' ? post.category : post.category.name }
            })}
          >
            <Text style={styles.categoryText}>
              #{typeof post.category === 'string' ? post.category : post.category.name}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Comments */}
      <View style={styles.commentsSection}>
        <Text style={styles.commentsTitle}>Comments</Text>
        
        <FlatList
          data={comments}
          renderItem={({ item }) => (
            <View style={styles.commentItem}>
              <Image
                source={{ uri: item.User?.avatar || 'https://via.placeholder.com/32' }}
                style={styles.commentAvatar}
              />
              <View style={styles.commentContent}>
                <Text style={styles.commentUsername}>
                  {item.User?.name || item.User?.username || 'unknown'}
                </Text>
                <Text style={styles.commentText}>{item.comment_text || ''}</Text>
                <Text style={styles.commentDate}>
                  {item.comment_date ? new Date(item.comment_date).toLocaleDateString() : ''}
                </Text>
              </View>
            </View>
          )}
          keyExtractor={(item, index) => item.comment_id?.toString() || `comment-${index}`}
          ListEmptyComponent={
            <Text style={styles.noComments}>No comments yet. Be the first to comment!</Text>
          }
        />
      </View>

      {/* Comment Input */}
      <View style={[styles.commentInputContainer, { paddingBottom: insets.bottom + 12 }]}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          placeholderTextColor="#666"
          value={commentText}
          onChangeText={setCommentText}
          multiline
        />
        <TouchableOpacity 
          onPress={handleAddComment}
          disabled={!commentText.trim() || commentLoading}
          style={[
            styles.sendButton,
            (!commentText.trim() || commentLoading) && styles.sendButtonDisabled
          ]}
        >
          {commentLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

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
                handleShare();
              }}
            >
              <Feather name="share-2" size={20} color="#fff" />
              <Text style={styles.menuItemText}>Share</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setReportModalVisible(true);
              }}
            >
              <Feather name="flag" size={20} color="#fff" />
              <Text style={styles.menuItemText}>Report</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Modal */}
      <ReportModal
        isVisible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        postId={post.id}
        onReported={() => {
          setReportModalVisible(false);
          Alert.alert('Reported', 'Thank you for reporting this content.');
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#60a5fa',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  backButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  headerBack: {
    padding: 8,
    marginRight: 8,
  },
  headerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  headerUsername: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerMenu: {
    padding: 8,
  },
  mediaContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 6,
  },
  captionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
  },
  caption: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#60a5fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  commentsSection: {
    flex: 1,
    backgroundColor: '#000',
  },
  commentsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  commentItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentUsername: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  commentText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  commentDate: {
    color: '#666',
    fontSize: 12,
  },
  noComments: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 40,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#60a5fa',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#333',
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
  menuItemText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
});