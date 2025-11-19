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
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(INITIAL_HEIGHT)).current;
  const panY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && postId) {
      fetchComments();
      // Reset to collapsed state when opened
      setIsExpanded(false);
      slideAnim.setValue(INITIAL_HEIGHT);
    } else {
      // Reset when closed
      setIsExpanded(false);
      slideAnim.setValue(INITIAL_HEIGHT);
    }
  }, [visible, postId]);

  // Pan responder for drag to expand/collapse
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
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
      toValue: EXPANDED_HEIGHT,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
    panY.setValue(0);
  };

  const collapseOverlay = () => {
    setIsExpanded(false);
    Animated.spring(slideAnim, {
      toValue: INITIAL_HEIGHT,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
    panY.setValue(0);
  };

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await postsApi.getComments(postId);
      if (response.status === 'success' && response.data?.comments) {
        setComments(response.data.comments);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    if (!commentText.trim() || !user) {
      if (!user) {
        Alert.alert('Login Required', 'Please login to comment');
      }
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await postsApi.addComment(postId, commentText.trim());
      
      if (response.status === 'success' && response.data?.comment) {
        // Add the new comment to the list
        const newComment = Array.isArray(response.data.comment) 
          ? response.data.comment[0] 
          : response.data.comment;
        
        setComments(prev => [newComment, ...prev]);
        setCommentText('');
        
        // Scroll to top to show new comment
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 100);
      } else {
        Alert.alert('Error', response.message || 'Failed to submit comment');
      }
    } catch (error: any) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit comment');
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = ({ item }: { item: Comment }) => {
    const commentUser = item.user || item.User || {};
    // API returns 'content' field according to API doc
    const commentContent = item.content || item.comment_text || '';
    const commentDate = item.createdAt || item.created_at || item.comment_date || '';
    
    return (
      <View style={styles.commentItem}>
        <Image
          source={{ 
            uri: commentUser.profile_picture || commentUser.avatar || 'https://via.placeholder.com/40' 
          }}
          style={styles.commentAvatar}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUsername}>
              @{commentUser.username || commentUser.name || 'unknown'}
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1}
        onPress={onClose}
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <Animated.View
          style={[
            styles.overlayContainer,
            {
              height: slideAnim,
              transform: [{ translateY: panY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
            <TouchableOpacity 
              style={styles.expandButton}
              onPress={isExpanded ? collapseOverlay : expandOverlay}
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
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
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
              ListEmptyComponent={
                loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#60a5fa" />
                    <Text style={styles.loadingText}>Loading comments...</Text>
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Feather name="message-circle" size={48} color="#666" />
                    <Text style={styles.emptyText}>No comments yet</Text>
                    <Text style={styles.emptySubtext}>Be the first to comment!</Text>
                  </View>
                )
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
                onChangeText={setCommentText}
                multiline
                maxLength={500}
                onSubmitEditing={submitComment}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { opacity: commentText.trim() ? 1 : 0.5 }
                ]}
                onPress={submitComment}
                disabled={!commentText.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#60a5fa" />
                ) : (
                  <Feather name="send" size={20} color="#60a5fa" />
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  keyboardView: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  overlayContainer: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    maxHeight: EXPANDED_HEIGHT,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#666',
    borderRadius: 2,
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  commentsList: {
    flex: 1,
  },
  commentsContent: {
    padding: 16,
  },
  collapsedComments: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 120,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    backgroundColor: '#18181b',
  },
  inputAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#232326',
    justifyContent: 'center',
    alignItems: 'center',
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
