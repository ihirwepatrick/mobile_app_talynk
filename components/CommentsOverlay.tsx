import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  ActivityIndicator,
  Image,
} from 'react-native';

const COLORS = {
  dark: {
    background: '#18181b',
    card: '#232326',
    border: '#27272a',
    text: '#f3f4f6',
    textSecondary: '#a1a1aa',
    primary: '#60a5fa',
    inputBg: '#232326',
    inputBorder: '#27272a',
    inputText: '#f3f4f6',
    buttonBg: '#60a5fa',
    buttonText: '#fff',
    spinner: '#60a5fa',
  },
};

interface Comment {
  id: string;
  text: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    username?: string;
  };
  created_at: string;
}

interface CommentsOverlayProps {
  postId: string;
  isVisible: boolean;
  onClose: () => void;
  comments: Comment[];
  onAddComment: (text: string) => Promise<void>;
  loading?: boolean;
}

export default function CommentsOverlay({
  postId,
  isVisible,
  onClose,
  comments,
  onAddComment,
  loading = false,
}: CommentsOverlayProps) {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const colorScheme = useColorScheme() || 'dark';
  const C = COLORS.dark;

  const handleSubmitComment = async () => {
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentItem}>
      <Image
        source={{
          uri: item.user.avatar || 'https://via.placeholder.com/32',
        }}
        style={styles.commentAvatar}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={[styles.commentUsername, { color: C.text }]}>
            {item.user.name}
          </Text>
          <Text style={[styles.commentDate, { color: C.textSecondary }]}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <Text style={[styles.commentText, { color: C.text }]}>
          {item.text}
        </Text>
      </View>
    </View>
  );

  if (!isVisible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.8)' }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
          <Text style={[styles.headerTitle, { color: C.text }]}>Comments</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeButton, { color: C.primary }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Comments List */}
        <View style={styles.commentsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={C.spinner} />
            </View>
          ) : (
            <FlatList
              data={comments}
              renderItem={renderComment}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: C.textSecondary }]}>
                    No comments yet
                  </Text>
                  <Text style={[styles.emptySubtext, { color: C.textSecondary }]}>
                    Be the first to comment!
                  </Text>
                </View>
              }
            />
          )}
        </View>

        {/* Comment Input */}
        <View style={[styles.inputContainer, { backgroundColor: C.card, borderTopColor: C.border }]}>
          <TextInput
            style={[styles.commentInput, { backgroundColor: C.inputBg, color: C.inputText, borderColor: C.inputBorder }]}
            placeholder="Add a comment..."
            placeholderTextColor={C.textSecondary}
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: newComment.trim() ? C.buttonBg : C.border },
            ]}
            onPress={handleSubmitComment}
            disabled={!newComment.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={C.buttonText} />
            ) : (
              <Text style={[styles.sendButtonText, { color: C.buttonText }]}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  container: {
    flex: 1,
    marginTop: 100,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  commentsContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
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
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  commentDate: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 