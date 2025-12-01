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
  PanResponder,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { postsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const INITIAL_HEIGHT = 280; // Initial collapsed height
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.9; // Expanded height

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
  const [isExpanded, setIsExpanded] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  // Use translateY for animation instead of height (height can't be animated with native driver)
  const slideAnim = useRef(new Animated.Value(EXPANDED_HEIGHT - INITIAL_HEIGHT)).current; // Start translated up (collapsed)
  const panY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('CommentsModal useEffect - visible:', visible, 'postId:', postId);
    if (visible && postId) {
      console.log('Fetching comments for postId:', postId);
      setCurrentPage(1);
      setHasMore(true);
      setError(null);
      fetchComments(1, true);
      // Reset to collapsed state when opened
      setIsExpanded(false);
      slideAnim.setValue(EXPANDED_HEIGHT - INITIAL_HEIGHT); // Start translated up (collapsed)
    } else {
      // Reset when closed
      setIsExpanded(false);
      slideAnim.setValue(EXPANDED_HEIGHT - INITIAL_HEIGHT);
      setComments([]);
      setCurrentPage(1);
      setHasMore(true);
      setError(null);
    }
  }, [visible, postId]);

  // Pan responder for drag to expand/collapse - only on drag handle
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to vertical drags (not taps)
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy < 0) {
          // Dragging up - expand
          panY.setValue(gestureState.dy);
        } else if (gestureState.dy > 0 && isExpanded) {
          // Dragging down - collapse
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy < -50 && !isExpanded) {
          // Expand
          expandOverlay();
        } else if (gestureState.dy > 50 && isExpanded) {
          // Collapse
          collapseOverlay();
        } else {
          // Snap back
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const expandOverlay = () => {
    setIsExpanded(true);
    Animated.spring(slideAnim, {
      toValue: 0, // Translate to 0 (fully visible)
      useNativeDriver: true, // Can use native driver with translateY
      tension: 50,
      friction: 8,
    }).start();
    panY.setValue(0);
  };

  const collapseOverlay = () => {
    setIsExpanded(false);
    Animated.spring(slideAnim, {
      toValue: EXPANDED_HEIGHT - INITIAL_HEIGHT, // Translate up to show only INITIAL_HEIGHT
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
    panY.setValue(0);
  };

  const fetchComments = async (page = 1, isInitial = false) => {
    if (!postId) {
      console.warn('fetchComments called without postId');
      return;
    }
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      
      console.log('Calling postsApi.getComments with postId:', postId, 'page:', page);
      const response = await postsApi.getComments(postId, page, 20); // Load 20 comments per page
      console.log('Comments API response:', response);
      
      if (response.status === 'success' && response.data?.comments) {
        const newComments = Array.isArray(response.data.comments) ? response.data.comments : [];
        
        // Check if there are more comments
        const pagination = response.data.pagination || {};
        const hasMoreData = pagination.hasNextPage !== false && newComments.length === 20;
        setHasMore(hasMoreData);
        
        if (page === 1 || isInitial) {
          setComments(newComments);
        } else {
          setComments(prev => [...prev, ...newComments]);
        }
        console.log('Comments loaded:', newComments.length, 'Total:', page === 1 ? newComments.length : comments.length + newComments.length);
      } else {
        console.log('No comments in response or error status');
        if (page === 1) {
          setComments([]);
        }
        setHasMore(false);
      }
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      const isNetworkError = error?.message?.includes('Network') || error?.code === 'NETWORK_ERROR' || !error?.response;
      setError(isNetworkError 
        ? 'No internet connection. Please check your network and try again.'
        : 'Failed to load comments. Please try again.');
      
      if (page === 1) {
        setComments([]);
      }
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
    // Get the current value directly to avoid stale state issues
    const currentText = commentText;
    const trimmedText = currentText.trim();
    
    console.log('submitComment called', { 
      hasText: !!trimmedText, 
      textLength: trimmedText.length,
      originalLength: currentText.length,
      hasUser: !!user, 
      hasPostId: !!postId,
      commentTextPreview: trimmedText.substring(0, 50)
    });
    
    if (!trimmedText || trimmedText.length === 0) {
      console.log('submitComment: No text to submit');
      Alert.alert('Error', 'Please enter a comment');
      return;
    }
    
    if (!user) {
      console.log('submitComment: No user, showing login alert');
      Alert.alert('Login Required', 'Please login to comment');
      return;
    }

    if (!postId) {
      console.log('submitComment: No postId, showing error');
      Alert.alert('Error', 'Post ID is missing');
      return;
    }

    try {
      setSubmitting(true);
      // Clean and validate comment text - remove extra whitespace but keep single newlines
      const commentContent = trimmedText.replace(/\n{3,}/g, '\n\n').trim();
      
      console.log('Submitting comment:', { 
        postId, 
        content: commentContent, 
        contentLength: commentContent.length,
        originalLength: currentText.length,
        userId: user.id 
      });
      
      // Final validation before API call
      if (!commentContent || commentContent.length === 0) {
        console.error('Comment content is empty after processing');
        Alert.alert('Error', 'Please enter a valid comment');
        setSubmitting(false);
        return;
      }
      
      const response = await postsApi.addComment(postId, commentContent);
      console.log('Add comment API response:', JSON.stringify(response, null, 2));
      
      if (response.status === 'success') {
        // Handle different response structures
        let newComment = null;
        if (response.data?.comment) {
          newComment = Array.isArray(response.data.comment) 
            ? response.data.comment[0] 
            : response.data.comment;
        } else if (response.data) {
          // Sometimes the comment is directly in data
          newComment = Array.isArray(response.data) 
            ? response.data[0] 
            : response.data;
        }
        
        if (newComment) {
          // Add user info if missing
          if (!newComment.user && !newComment.User) {
            newComment.user = {
              id: user.id,
              username: user.username,
              profile_picture: user.profile_picture,
            };
          }
          // Add timestamp if missing
          if (!newComment.createdAt && !newComment.created_at) {
            newComment.createdAt = new Date().toISOString();
          }
          
          console.log('Adding new comment to list:', newComment);
          setComments(prev => [newComment, ...prev]);
          setCommentText('');
          
          // Scroll to top to show new comment
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }, 100);
          
          // Auto-expand if collapsed
          if (!isExpanded) {
            expandOverlay();
          }
        } else {
          console.warn('Comment added but response structure unexpected, refreshing comments');
          // Refresh comments to get the updated list
          await fetchComments();
          setCommentText('');
        }
      } else {
        const errorMessage = response.message || 'Failed to submit comment';
        console.error('Comment submission failed:', errorMessage);
        Alert.alert('Error', errorMessage);
      }
    } catch (error: any) {
      console.error('Error submitting comment:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit comment';
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = ({ item }: { item: Comment }) => {
    const commentUser = item.user || item.User || {};
    // API returns 'content' field according to API doc
    const commentContent = item.content || item.comment_text || '';
    const commentDate = item.createdAt || item.created_at || item.comment_date || '';
    
    // Type-safe access to user properties
    const profilePicture = (commentUser as any).profile_picture || (commentUser as any).avatar || 'https://via.placeholder.com/40';
    const username = (commentUser as any).username || (commentUser as any).name || 'unknown';
    
    return (
      <View style={styles.commentItem}>
        <Image
          source={{ uri: profilePicture }}
          style={styles.commentAvatar}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUsername}>
              @{username}
            </Text>
            {commentDate && (
              <Text style={styles.commentTime}>{formatTimeAgo(commentDate)}</Text>
            )}
          </View>
          <Text style={styles.commentText}>{commentContent}</Text>
        </View>
      </View>
    );
  };

  // Get initial comments to show (first 2-3)
  const initialComments = comments.slice(0, 2);
  const hasMoreComments = comments.length > 2;

  if (!visible || !postId) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1}
        onPress={onClose}
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <Animated.View
          style={[
            styles.overlayContainer,
            {
              transform: [
                { translateY: Animated.add(slideAnim, panY) }
              ],
            },
          ]}
        >
          {/* Drag Handle - pan responder only on drag handle area */}
          <View 
            style={styles.dragHandleContainer}
            {...panResponder.panHandlers}
          >
            <View style={styles.dragHandle} />
            <TouchableOpacity 
              style={styles.expandButton}
              onPress={isExpanded ? collapseOverlay : expandOverlay}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather 
                name={isExpanded ? 'chevron-down' : 'chevron-up'} 
                size={20} 
                color="#fff" 
              />
            </TouchableOpacity>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
            </Text>
            <TouchableOpacity 
              onPress={() => {
                console.log('Close button pressed');
                onClose();
              }} 
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Feather name="x" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          {isExpanded ? (
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
                { paddingBottom: insets.bottom + 100 }
              ]}
              showsVerticalScrollIndicator={false}
              onEndReached={loadMoreComments}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={
                loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#60a5fa" />
                    <Text style={styles.loadingText}>Loading comments...</Text>
                  </View>
                ) : error ? (
                  <View style={styles.emptyContainer}>
                    <Feather name="alert-circle" size={48} color="#666" />
                    <Text style={styles.emptyText}>Error loading comments</Text>
                    <Text style={styles.emptySubtext}>{error}</Text>
                    <TouchableOpacity 
                      style={styles.retryButton}
                      onPress={() => fetchComments(1, true)}
                    >
                      <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Feather name="message-circle" size={48} color="#666" />
                    <Text style={styles.emptyText}>No comments yet</Text>
                    <Text style={styles.emptySubtext}>Be the first to comment!</Text>
                  </View>
                )
              }
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.loadMoreContainer}>
                    <ActivityIndicator size="small" color="#60a5fa" />
                    <Text style={styles.loadMoreText}>Loading more comments...</Text>
                  </View>
                ) : null
              }
            />
          ) : (
            <View style={styles.collapsedComments}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#60a5fa" />
                </View>
              ) : initialComments.length > 0 ? (
                <>
                  {initialComments.map((item, index) => (
                    <View key={item.comment_id?.toString() || item.id?.toString() || `comment-${index}`}>
                      {renderComment({ item })}
                    </View>
                  ))}
                  {hasMoreComments && (
                    <TouchableOpacity 
                      style={styles.viewAllButton}
                      onPress={expandOverlay}
                    >
                      <Text style={styles.viewAllText}>
                        View all {comments.length} comments
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <View style={styles.emptyContainerSmall}>
                  <Text style={styles.emptyTextSmall}>No comments yet</Text>
                </View>
              )}
            </View>
          )}

          {/* Comment Input */}
          {user && (
            <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
              <Image
                source={{ uri: user.profile_picture || 'https://via.placeholder.com/32' }}
                style={styles.inputAvatar}
              />
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="#666"
                value={commentText}
                onChangeText={(text) => {
                  console.log('TextInput onChangeText:', text.length, 'chars');
                  setCommentText(text);
                }}
                multiline
                maxLength={500}
                blurOnSubmit={false}
                returnKeyType="default"
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { 
                    opacity: commentText.trim() && !submitting ? 1 : 0.5,
                  }
                ]}
                onPress={() => {
                  const trimmedText = commentText.trim();
                  console.log('Send button pressed', { 
                    commentText: trimmedText, 
                    length: trimmedText.length,
                    submitting,
                    hasText: !!trimmedText && trimmedText.length > 0
                  });
                  if (trimmedText && trimmedText.length > 0 && !submitting) {
                    submitComment();
                  } else {
                    console.warn('Send button: Cannot submit - text is empty or already submitting', {
                      trimmedText,
                      length: trimmedText?.length,
                      submitting
                    });
                  }
                }}
                disabled={!commentText.trim() || submitting}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Feather name="send" size={18} color="#000" />
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Login Prompt */}
          {!user && (
            <View style={[styles.loginPrompt, { paddingBottom: insets.bottom + 8 }]}>
              <Text style={styles.loginText}>Sign in to comment</Text>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayContainer: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    height: EXPANDED_HEIGHT, // Fixed height - we use translateY to show/hide parts
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#666',
    borderRadius: 2,
    marginTop: 4,
  },
  expandButton: {
    position: 'absolute',
    right: 16,
    top: 4,
    padding: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    backgroundColor: '#18181b',
    zIndex: 100,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  commentsList: {
    flex: 1,
    minHeight: 200,
  },
  commentsContent: {
    padding: 16,
    flexGrow: 1,
  },
  collapsedComments: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 150,
    flexGrow: 0,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingVertical: 4,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: '#27272a',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  commentUsername: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,
  },
  commentTime: {
    color: '#666',
    fontSize: 11,
  },
  commentText: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
  },
  viewAllButton: {
    paddingVertical: 8,
    marginTop: 4,
  },
  viewAllText: {
    color: '#60a5fa',
    fontSize: 13,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#999',
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContainerSmall: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyTextSmall: {
    color: '#666',
    fontSize: 13,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 4,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#60a5fa',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    backgroundColor: '#18181b',
    minHeight: 60,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: '#27272a',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#232326',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 14,
    maxHeight: 80,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#60a5fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    zIndex: 100,
  },
  loginPrompt: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    alignItems: 'center',
    backgroundColor: '#18181b',
  },
  loginText: {
    color: '#666',
    fontSize: 14,
  },
});
