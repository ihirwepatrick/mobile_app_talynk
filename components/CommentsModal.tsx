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
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { postsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Keyboard listeners with height tracking
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  useEffect(() => {
    if (visible && postId) {
      // Animate in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      
      setCurrentPage(1);
      setHasMore(true);
      setError(null);
      fetchComments(1, true);
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Reset state
      setComments([]);
      setCurrentPage(1);
      setHasMore(true);
      setError(null);
      setCommentText('');
      setKeyboardHeight(0);
    }
  }, [visible, postId]);

  const handleClose = () => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
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

  const handleUserPress = (userId: string) => {
    handleClose();
    setTimeout(() => {
      router.push({
        pathname: '/user/[id]',
        params: { id: userId }
      });
    }, 300);
  };

  const handleLoginPress = () => {
    handleClose();
    setTimeout(() => {
      router.push('/auth/login');
    }, 300);
  };

  const renderComment = ({ item, index }: { item: Comment; index: number }) => {
    const commentUser = item.user || item.User || {};
    const commentContent = item.content || item.comment_text || '';
    const commentDate = item.createdAt || item.created_at || item.comment_date || '';
    const profilePicture = (commentUser as any).profile_picture || (commentUser as any).avatar || 'https://via.placeholder.com/40';
    const username = (commentUser as any).username || (commentUser as any).name || 'unknown';
    const userId = (commentUser as any).id;
    
    return (
      <View style={styles.commentItem}>
        <TouchableOpacity 
          onPress={() => userId && handleUserPress(userId)}
          activeOpacity={0.7}
        >
          <Image
            source={{ uri: profilePicture }}
            style={styles.commentAvatar}
          />
        </TouchableOpacity>
        <View style={styles.commentContent}>
          <View style={styles.commentBubble}>
            <View style={styles.commentHeader}>
              <TouchableOpacity onPress={() => userId && handleUserPress(userId)}>
                <Text style={styles.commentUsername}>@{username}</Text>
              </TouchableOpacity>
              {commentDate && (
                <Text style={styles.commentTime}>• {formatTimeAgo(commentDate)}</Text>
              )}
            </View>
            <Text style={styles.commentText}>{commentContent}</Text>
          </View>
          
          {/* Comment actions */}
          <View style={styles.commentActions}>
            <TouchableOpacity style={styles.commentActionButton} activeOpacity={0.6}>
              <Feather name="heart" size={14} color="#8e8e93" />
              <Text style={styles.commentActionText}>Like</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.commentActionButton} activeOpacity={0.6}>
              <Feather name="corner-up-left" size={14} color="#8e8e93" />
              <Text style={styles.commentActionText}>Reply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (!visible) {
    return null;
  }

  // Calculate modal position based on keyboard
  const modalTransform = {
    transform: [
      { translateY: slideAnim },
    ],
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>
      
      {/* Main Modal Content */}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <Animated.View
          style={[
            styles.modalContainer,
            modalTransform,
            {
              maxHeight: MODAL_HEIGHT,
              marginBottom: Platform.OS === 'android' ? keyboardHeight : 0,
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
              {comments.length > 0 && (
                <View style={styles.commentCountBadge}>
                  <Text style={styles.commentCountText}>{comments.length}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity 
              onPress={handleClose} 
              style={styles.closeButton}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <View style={styles.closeButtonInner}>
                <Feather name="x" size={18} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Divider */}
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
            contentContainerStyle={[
              styles.commentsContent,
              comments.length === 0 && styles.commentsContentEmpty
            ]}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMoreComments}
            onEndReachedThreshold={0.5}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            ListEmptyComponent={
              loading ? (
                <View style={styles.centerContainer}>
                  <View style={styles.loadingSpinner}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                  </View>
                  <Text style={styles.loadingText}>Loading comments...</Text>
                </View>
              ) : error ? (
                <View style={styles.centerContainer}>
                  <View style={styles.errorIcon}>
                    <Feather name="wifi-off" size={28} color="#ef4444" />
                  </View>
                  <Text style={styles.errorTitle}>Couldn't load comments</Text>
                  <Text style={styles.errorSubtext}>{error}</Text>
                  <TouchableOpacity 
                    style={styles.retryButton}
                    onPress={() => fetchComments(1, true)}
                    activeOpacity={0.8}
                  >
                    <Feather name="refresh-cw" size={14} color="#fff" />
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.centerContainer}>
                  <View style={styles.emptyIcon}>
                    <Feather name="message-circle" size={36} color="#3b82f6" />
                  </View>
                  <Text style={styles.emptyTitle}>No comments yet</Text>
                  <Text style={styles.emptySubtext}>Be the first to share your thoughts!</Text>
                </View>
              )
            }
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.loadMoreContainer}>
                  <ActivityIndicator size="small" color="#3b82f6" />
                </View>
              ) : null
            }
          />

          {/* Comment Input Area - Fixed at bottom */}
          <View style={[
            styles.inputWrapper,
            { 
              paddingBottom: Platform.OS === 'ios' 
                ? (keyboardHeight > 0 ? 8 : Math.max(insets.bottom, 16))
                : 16
            }
          ]}>
            {user ? (
              <View style={styles.inputContainer}>
                <Image
                  source={{ uri: user.profile_picture || 'https://via.placeholder.com/36' }}
                  style={styles.inputAvatar}
                />
                <View style={styles.inputFieldWrapper}>
                  <TextInput
                    ref={inputRef}
                    style={[
                      styles.commentInput,
                      inputFocused && styles.commentInputFocused
                    ]}
                    placeholder="Write a comment..."
                    placeholderTextColor="#636366"
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                    maxLength={500}
                    blurOnSubmit={false}
                    returnKeyType="default"
                    editable={!submitting}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                  />
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
                    <Feather 
                      name="send" 
                      size={18} 
                      color={commentText.trim() ? '#fff' : '#636366'} 
                    />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.loginPrompt}
                onPress={handleLoginPress}
                activeOpacity={0.7}
              >
                <View style={styles.loginPromptIcon}>
                  <Feather name="log-in" size={16} color="#3b82f6" />
                </View>
                <Text style={styles.loginText}>Sign in to comment</Text>
                <Feather name="chevron-right" size={18} color="#3b82f6" />
              </TouchableOpacity>
            )}
            
            {/* Character count when typing */}
            {commentText.length > 0 && (
              <View style={styles.charCountContainer}>
                <Text style={[
                  styles.charCount,
                  commentText.length > 450 && styles.charCountWarning
                ]}>
                  {commentText.length}/500
                </Text>
              </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1a1a1c',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 24,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#48484a',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  commentCountBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
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
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2c2c2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#2c2c2e',
  },
  commentsList: {
    flex: 1,
  },
  commentsContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  commentsContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: '#2c2c2e',
  },
  commentContent: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: '#2c2c2e',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  commentUsername: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  commentTime: {
    color: '#636366',
    fontSize: 12,
    marginLeft: 6,
  },
  commentText: {
    color: '#e5e5ea',
    fontSize: 14,
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 8,
    gap: 20,
  },
  commentActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  commentActionText: {
    color: '#8e8e93',
    fontSize: 12,
    fontWeight: '500',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 40,
  },
  loadingSpinner: {
    marginBottom: 12,
  },
  loadingText: {
    color: '#8e8e93',
    fontSize: 14,
  },
  errorIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  errorSubtext: {
    color: '#8e8e93',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtext: {
    color: '#8e8e93',
    fontSize: 14,
    textAlign: 'center',
  },
  loadMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  inputWrapper: {
    borderTopWidth: 1,
    borderTopColor: '#2c2c2e',
    backgroundColor: '#1a1a1c',
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  inputAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2c2c2e',
    marginBottom: 3,
  },
  inputFieldWrapper: {
    flex: 1,
  },
  commentInput: {
    backgroundColor: '#2c2c2e',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    color: '#fff',
    fontSize: 15,
    maxHeight: 100,
    minHeight: 38,
  },
  commentInputFocused: {
    borderColor: '#3b82f6',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#2c2c2e',
  },
  charCountContainer: {
    alignItems: 'flex-end',
    paddingRight: 52,
    marginTop: 4,
  },
  charCount: {
    color: '#636366',
    fontSize: 11,
  },
  charCountWarning: {
    color: '#f59e0b',
  },
  loginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  loginPromptIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#3b82f6',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
});
