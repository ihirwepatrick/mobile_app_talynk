/**
 * Example component showing how to integrate Post Reporting and Appeal functionality
 * 
 * This is a reference implementation. Integrate these components into your actual post components.
 */

import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PostReportModal } from './PostReportModal';
import { PostAppealModal } from './PostAppealModal';
import { Post } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { isPostSuspended, isPostVisibleToOwner } from '@/lib/utils/post-status';

interface PostActionsExampleProps {
  post: Post;
  currentUserId: string;
}

export const PostActionsExample: React.FC<PostActionsExampleProps> = ({ post, currentUserId }) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const { user } = useAuth();
  const isOwner = isPostVisibleToOwner(post, currentUserId);
  const isSuspended = isPostSuspended(post);

  const handleReport = () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to report posts.');
      return;
    }
    setShowReportModal(true);
  };

  const handleAppeal = () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to appeal posts.');
      return;
    }
    setShowAppealModal(true);
  };

  const handleReported = (isFrozen: boolean) => {
    setShowReportModal(false);
    if (isFrozen) {
      // Post was suspended - refresh the post list or show message
      console.log('Post was suspended due to reports');
    }
  };

  const handleAppealed = () => {
    setShowAppealModal(false);
    // Refresh the post list or show success message
    console.log('Appeal submitted successfully');
  };

  return (
    <View style={styles.container}>
      {/* Report Button - Show for all users (except owner) */}
      {!isOwner && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleReport}
          activeOpacity={0.7}
        >
          <MaterialIcons name="flag" size={20} color="#ef4444" />
          <Text style={styles.actionText}>Report</Text>
        </TouchableOpacity>
      )}

      {/* Appeal Button - Show only for suspended posts owned by current user */}
      {isOwner && isSuspended && (
        <TouchableOpacity
          style={[styles.actionButton, styles.appealButton]}
          onPress={handleAppeal}
          activeOpacity={0.7}
        >
          <MaterialIcons name="gavel" size={20} color="#60a5fa" />
          <Text style={[styles.actionText, styles.appealText]}>Appeal</Text>
        </TouchableOpacity>
      )}

      {/* Report Modal */}
      <PostReportModal
        visible={showReportModal}
        postId={post.id}
        onClose={() => setShowReportModal(false)}
        onReported={handleReported}
      />

      {/* Appeal Modal */}
      <PostAppealModal
        visible={showAppealModal}
        postId={post.id}
        onClose={() => setShowAppealModal(false)}
        onAppealed={handleAppealed}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    gap: 6,
  },
  appealButton: {
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderColor: 'rgba(96, 165, 250, 0.2)',
  },
  actionText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  appealText: {
    color: '#60a5fa',
  },
});

