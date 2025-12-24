import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Keyboard,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { postsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.75;

interface Comment {
  id?: string;
  comment_id?: string;
  content?: string;
  comment_text?: string;
  createdAt?: string;
  created_at?: string;
  comment_date?: string;
  user?: {
    id: string;
    username?: string;
    name?: string;
    profile_picture?: string;
    avatar?: string;
  };
  User?: {
    id: string;
    username?: string;
    name?: string;
    profile_picture?: string;
    avatar?: string;
  };
}

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  postTitle?: string;
  postAuthor?: string;
}

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
  return `${Math.floor(diffInSeconds / 2592000)}mo`;
};

export default function CommentsModal({ 
  visible, 
  onClose, 
  postId, 
  postTitle, 
  postAuthor 
}: CommentsModalProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  useEffect(() => {
    if (visible && postId) {
      // Animate in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
      
      setCurrentPage(1);
      setHasMore(true);
      setError(null);
      fetchComments(1, true);
    } else {
      // Animate out
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
      
      // Reset state
      setComments([]);
      setCurrentPage(1);
      setHasMore(true);
      setError(null);
      setCommentText('');
    }
  }, [visible, postId]);

  const handleClose = () => {
    Keyboard.dismiss();
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const fetchComments = async (page = 1, isInitial = false) => {
    if (!postId) return;
    
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      
      const response = await postsApi.getComments(postId, page, 20);
      
      if (response.status === 'success' && response.data?.comments) {
        const newComments = Array.isArray(response.data.comments) ? response.data.comments : [];
        const pagination = response.data.pagination || {};
        const hasMoreData = pagination.hasNextPage !== false && newComments.length === 20;
        setHasMore(hasMoreData);
        
        if (page === 1 || isInitial) {
          setComments(newComments);
        } else {
          setComments(prev => [...prev, ...newComments]);
        }
      } else {
        if (page === 1) setComments([]);
        setHasMore(false);
      }
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      setError('Failed to load comments');
      if (page === 1) setComments([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreComments = () => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchComments(nextPage, false);
    }
  };

  const submitComment = async () => {
    const trimmedText = commentText.trim();
    
    if (!trimmedText) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }
    
    if (!user) {
      Alert.alert('Login Required', 'Please login to comment');
      return;
    }

    if (!postId) {
      Alert.alert('Error', 'Post ID is missing');
      return;
    }

    try {
      setSubmitting(true);
      const commentContent = trimmedText.replace(/\n{3,}/g, '\n\n').trim();
      
      const response = await postsApi.addComment(postId, commentContent);
      
      if (response.status === 'success') {
        let newComment = null;
        if (response.data?.comment) {
          newComment = Array.isArray(response.data.comment) 
            ? response.data.comment[0] 
            : response.data.comment;
        } else if (response.data) {
          newComment = Array.isArray(response.data) 
            ? response.data[0] 
            : response.data;
        }
        
        if (newComment) {
          if (!newComment.user && !newComment.User) {
            newComment.user = {
              id: user.id,
              username: user.username,
              profile_picture: user.profile_picture,
            };
          }
          if (!newComment.createdAt && !newComment.created_at) {
            newComment.createdAt = new Date().toISOString();
          }
          
          setComments(prev => [newComment, ...prev]);
          setCommentText('');
          Keyboard.dismiss();
          
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }, 100);
        } else {
          await fetchComments(1, true);
          setCommentText('');
        }
      } else {
        Alert.alert('Error', response.message || 'Failed to submit comment');
      }
    } catch (error: any) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to submit comment');
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = ({ item, index }: { item: Comment; index: number }) => {
    const commentUser = item.user || item.User || {};
    const commentContent = item.content || item.comment_text || '';
    const commentDate = item.createdAt || item.created_at || item.comment_date || '';
    const profilePicture = (commentUser as any).profile_picture || (commentUser as any).avatar || 'https://via.placeholder.com/40';
    const username = (commentUser as any).username || (commentUser as any).name || 'unknown';
    
    return (
      <Animated.View 
        style={[
          styles.commentItem,
          { opacity: 1 }
        ]}
      >
        <Image
          source={{ uri: profilePicture }}
          style={styles.commentAvatar}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUsername}>@{username}</Text>
            {commentDate && (
              <Text style={styles.commentTime}>{formatTimeAgo(commentDate)}</Text>
            )}
          </View>
          <Text style={styles.commentText}>{commentContent}</Text>
          
          {/* Like button for comments (UI only for now) */}
          <View style={styles.commentActions}>
            <TouchableOpacity style={styles.commentActionButton}>
              <Feather name="heart" size={14} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.commentActionButton}>
              <Feather name="message-circle" size={14} color="#666" />
              <Text style={styles.commentActionText}>Reply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1}
        onPress={handleClose}
      >
        <Animated.View 
          style={[
            styles.backdropInner,
            { opacity: slideAnim.interpolate({
              inputRange: [0, SCREEN_HEIGHT],
              outputRange: [1, 0],
            })}
          ]} 
        />
      </TouchableOpacity>
      
      {/* Main Modal Content */}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
              maxHeight: MODAL_HEIGHT,
            },
          ]}
        >
          {/* Handle Bar */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Comments</Text>
              <View style={styles.commentCountBadge}>
                <Text style={styles.commentCountText}>{comments.length}</Text>
              </View>
            </View>
            <TouchableOpacity 
              onPress={handleClose} 
              style={styles.closeButton}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <View style={styles.closeButtonInner}>
                <Feather name="x" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Divider with gradient effect */}
          <View style={styles.divider} />

          {/* Comments List */}
          <FlatList
            ref={flatListRef}
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item, index) => 
              item.comment_id?.toString() || 
              item.id?.toString() || 
              `comment-${index}`
            }
            style={styles.commentsList}
            contentContainerStyle={styles.commentsContent}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMoreComments}
            onEndReachedThreshold={0.5}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              loading ? (
                <View style={styles.centerContainer}>
                  <View style={styles.loadingSpinner}>
                    <ActivityIndicator size="large" color="#60a5fa" />
                  </View>
                  <Text style={styles.loadingText}>Loading comments...</Text>
                </View>
              ) : error ? (
                <View style={styles.centerContainer}>
                  <View style={styles.errorIcon}>
                    <Feather name="wifi-off" size={32} color="#ef4444" />
                  </View>
                  <Text style={styles.errorTitle}>Couldn't load comments</Text>
                  <Text style={styles.errorSubtext}>{error}</Text>
                  <TouchableOpacity 
                    style={styles.retryButton}
                    onPress={() => fetchComments(1, true)}
                  >
                    <Feather name="refresh-cw" size={16} color="#fff" />
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.centerContainer}>
                  <View style={styles.emptyIcon}>
                    <Feather name="message-square" size={40} color="#3b82f6" />
                  </View>
                  <Text style={styles.emptyTitle}>No comments yet</Text>
                  <Text style={styles.emptySubtext}>Be the first to share your thoughts!</Text>
                </View>
              )
            }
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.loadMoreContainer}>
                  <ActivityIndicator size="small" color="#60a5fa" />
                </View>
              ) : null
            }
          />

          {/* Comment Input Area */}
          <View style={[
            styles.inputWrapper,
            { paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 16) }
          ]}>
            {user ? (
              <View style={styles.inputContainer}>
                <Image
                  source={{ uri: user.profile_picture || 'https://via.placeholder.com/36' }}
                  style={styles.inputAvatar}
                />
                <View style={styles.inputFieldContainer}>
                  <TextInput
                    ref={inputRef}
                    style={styles.commentInput}
                    placeholder="Add a comment..."
                    placeholderTextColor="#71717a"
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                    maxLength={500}
                    blurOnSubmit={false}
                    returnKeyType="default"
                    editable={!submitting}
                  />
                  {commentText.length > 0 && (
                    <Text style={styles.charCount}>{commentText.length}/500</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!commentText.trim() || submitting) && styles.sendButtonDisabled
                  ]}
                  onPress={submitComment}
                  disabled={!commentText.trim() || submitting}
                  activeOpacity={0.7}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Feather name="send" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.loginPrompt}>
                <Feather name="log-in" size={18} color="#60a5fa" />
                <Text style={styles.loginText}>Sign in to comment</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropInner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#48484a',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  commentCountBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  commentCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2c2c2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#2c2c2e',
    marginHorizontal: 20,
  },
  commentsList: {
    flex: 1,
  },
  commentsContent: {
    padding: 20,
    paddingBottom: 8,
    flexGrow: 1,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#2c2c2e',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUsername: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  commentTime: {
    color: '#636366',
    fontSize: 12,
  },
  commentText: {
    color: '#e5e5ea',
    fontSize: 15,
    lineHeight: 22,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 16,
  },
  commentActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    color: '#636366',
    fontSize: 12,
    fontWeight: '500',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  loadingSpinner: {
    marginBottom: 16,
  },
  loadingText: {
    color: '#8e8e93',
    fontSize: 15,
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  errorSubtext: {
    color: '#8e8e93',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubtext: {
    color: '#8e8e93',
    fontSize: 14,
    textAlign: 'center',
  },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  inputWrapper: {
    borderTopWidth: 1,
    borderTopColor: '#2c2c2e',
    backgroundColor: '#1c1c1e',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  inputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2c2c2e',
  },
  inputFieldContainer: {
    flex: 1,
    position: 'relative',
  },
  commentInput: {
    backgroundColor: '#2c2c2e',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    paddingRight: 50,
    color: '#fff',
    fontSize: 15,
    maxHeight: 100,
    minHeight: 40,
  },
  charCount: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    color: '#636366',
    fontSize: 11,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#2c2c2e',
  },
  loginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  loginText: {
    color: '#60a5fa',
    fontSize: 15,
    fontWeight: '500',
  },
});
