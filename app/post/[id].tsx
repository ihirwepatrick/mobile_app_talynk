import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, FlatList, TextInput, useColorScheme, Share, Modal } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { postsApi, followsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const colorScheme = useColorScheme() || 'light';
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const C = colorScheme === 'dark' ? {
    background: '#18181b', card: '#232326', text: '#f3f4f6', border: '#27272a', menu: '#232326', menuText: '#fff',
  } : {
    background: '#f5f5f5', card: '#fff', text: '#222', border: '#e5e7eb', menu: '#fff', menuText: '#222',
  };

  // Fetch post
  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await postsApi.getById(id as string);
        if (response.status === 'success' && response.data) {
          setPost(response.data);
        } else {
          setError(response.message || 'Failed to fetch post');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch post');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await postsApi.getComments(id as string);
        if (response.status === 'success' && response.data?.comments) {
          setComments(response.data.comments);
        } else {
          setComments([]);
        }
      } catch (err) {
        setComments([]);
        setError('Failed to load comments');
      }
    };
    fetchComments();
  }, [id]);

  // Fetch follow state
  useEffect(() => {
    if (!user || !post?.user?.id || user.id === post.user.id) return;
    const checkFollow = async () => {
      try {
        const response = await followsApi.checkFollowing(post.user.id);
        setIsFollowing(!!response.data?.isFollowing);
      } catch {
        setIsFollowing(false);
      }
    };
    checkFollow();
  }, [user, post]);

  // Add comment
  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      const response = await postsApi.addComment(id as string, commentText);
      if (response.status === 'success' && response.data?.comment?.length) {
        setComments([response.data.comment[0], ...comments]);
        setCommentText('');
      }
    } catch {}
    setCommentLoading(false);
  };

  // Follow/Unfollow
  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      await followsApi.follow(post.user.id);
      setIsFollowing(true);
    } finally {
      setFollowLoading(false);
    }
  };
  const handleUnfollow = async () => {
    setFollowLoading(true);
    try {
      await followsApi.unfollow(post.user.id);
      setIsFollowing(false);
    } finally {
      setFollowLoading(false);
    }
  };

  // Report user
  const handleReport = async () => {
    setReporting(true);
    setTimeout(() => {
      alert('Reported. Thank you for reporting this user.');
      setReporting(false);
    }, 1000);
  };

  // Share post
  const handleShare = async () => {
    try {
      await Share.share({
        message: post?.content || post?.caption || '',
        url: post?.media?.[0]?.url || post?.image || post?.video_url || '',
        title: 'Check out this post on Talynk!'
      });
    } catch {}
  };

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={C.text} /></View>;
  }
  if (error || !post) {
    return <View style={styles.loading}><Text style={{ color: 'red' }}>{error || 'Post not found'}</Text></View>;
  }

  // Media
  let mediaUrl = '';
  let isVideo = false;
  let videoType = '';
  if (Array.isArray(post.media) && post.media[0]) {
    mediaUrl = post.media[0].url;
    videoType = post.media[0].type || '';
    isVideo = videoType.startsWith('video') || /\.mp4$|\.webm$|\.mov$/i.test(mediaUrl);
  } else if (post.image) {
    mediaUrl = post.image;
  } else if (post.imageUrl) {
    mediaUrl = post.imageUrl;
  } else if (post.video_url) {
    mediaUrl = post.video_url;
    isVideo = true;
  } else if (post.videoUrl) {
    mediaUrl = post.videoUrl;
    isVideo = true;
  }

  const isOwnPost = user && (user.id === post.user_id || user.id === post.user?.id);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}> 
      {/* Modern Header */}
      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Feather name="arrow-left" size={26} color={C.text} />
        </TouchableOpacity>
        <View style={styles.headerUserInfo}>
          <Image
            source={{ uri: post.user?.avatar || post.user?.profile_picture || 'https://via.placeholder.com/32' }}
            style={styles.headerAvatar}
          />
          <Text style={styles.headerUsername}>@{post.user?.username || post.user?.name || 'unknown'}</Text>
          {!isOwnPost && (
            isFollowing ? (
              <TouchableOpacity style={styles.followingButton} onPress={handleUnfollow} disabled={followLoading}>
                <Text style={styles.followingButtonText}>{followLoading ? '...' : 'Following'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.followButton} onPress={handleFollow} disabled={followLoading}>
                <Text style={styles.followButtonText}>{followLoading ? '...' : 'Follow'}</Text>
              </TouchableOpacity>
            )
          )}
        </View>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.headerMenu}>
          <Feather name="more-vertical" size={26} color={C.text} />
        </TouchableOpacity>
        {/* 3-dots menu modal */}
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <TouchableOpacity style={styles.menuOverlay} onPress={() => setMenuVisible(false)} activeOpacity={1}>
            <View style={[styles.menuDropdown, { backgroundColor: C.menu }] }>
              <TouchableOpacity style={styles.menuItem} onPress={handleShare}>
                <Feather name="share-2" size={20} color={C.menuText} />
                <Text style={[styles.menuItemText, { color: C.menuText }]}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={handleReport} disabled={reporting}>
                <Feather name="flag" size={20} color={C.menuText} />
                <Text style={[styles.menuItemText, { color: C.menuText }]}>{reporting ? 'Reporting...' : 'Report User'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => setMenuVisible(false)}>
                <Text style={[styles.menuItemText, { color: C.menuText }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
      {/* Media */}
      <View style={styles.mediaContainer}>
        {mediaUrl ? (
          isVideo ? (
            <Video
              source={{ uri: mediaUrl }}
              style={styles.media}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls
              shouldPlay={true}
              isLooping={true}
              shouldCorrectPitch={true}
              volume={1.0}
            />
          ) : (
            <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="contain" />
          )
        ) : null}
      </View>
      {/* Content */}
      <View style={styles.contentSection}>
        <Text style={[styles.contentText, { color: C.text }]}>{post.content || post.caption || ''}</Text>
      </View>
      {/* Comments */}
      <Text style={[styles.commentsTitle, { color: C.text }]}>Comments</Text>
      <FlatList
        data={comments}
        keyExtractor={(item, index) =>
          (item.comment_id ? item.comment_id.toString() :
            item.id ? item.id.toString() :
            `comment-${index}`)
        }
        renderItem={({ item, index }) => (
          <View style={styles.commentItem}>
            <Image
              source={{ uri: item.User?.avatar || 'https://via.placeholder.com/32' }}
              style={styles.commentAvatar}
            />
            <View style={styles.commentContent}>
              <View style={styles.commentHeader}>
                <Text style={[styles.commentUsername, { color: C.text }]}>{item.User?.name || item.User?.username || 'unknown'}</Text>
                <Text style={[styles.commentDate, { color: '#888' }]}>{item.comment_date ? new Date(item.comment_date).toLocaleDateString() : ''}</Text>
              </View>
              <Text style={[styles.commentText, { color: C.text }]}>{item.comment_text || item.content || ''}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={{ color: C.text, opacity: 0.6 }}>No comments yet.</Text>}
      />
      <View style={styles.addCommentRow}>
        <TextInput
          style={[styles.commentInput, { color: C.text, borderColor: C.border }]}
          placeholder="Add a comment..."
          placeholderTextColor={colorScheme === 'dark' ? '#888' : '#aaa'}
          value={commentText}
          onChangeText={setCommentText}
          editable={!commentLoading}
        />
        <TouchableOpacity onPress={handleAddComment} disabled={commentLoading || !commentText.trim()} style={styles.sendButton}>
          <MaterialIcons name="send" size={24} color={commentLoading || !commentText.trim() ? '#aaa' : C.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, zIndex: 10 },
  headerBack: { padding: 4, marginRight: 8 },
  headerUserInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  headerUsername: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginRight: 8 },
  followButton: { backgroundColor: '#0095f6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8 },
  followButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  followingButton: { backgroundColor: 'transparent', borderRadius: 12, borderWidth: 1, borderColor: '#888', paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8 },
  followingButtonText: { color: '#888', fontWeight: '600', fontSize: 13 },
  headerMenu: { padding: 4, marginLeft: 8 },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  menuDropdown: { borderRadius: 12, margin: 16, paddingVertical: 8, paddingHorizontal: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 8, zIndex: 100, minWidth: 180 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18 },
  menuItemText: { fontSize: 16, marginLeft: 10 },
  mediaContainer: { width: '100%', aspectRatio: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  media: { width: '100%', height: 300, backgroundColor: '#000' },
  contentSection: { padding: 16 },
  contentText: { fontSize: 16, marginBottom: 8 },
  commentsTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 16, marginTop: 8 },
  commentItem: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 10 },
  commentContent: { flex: 1 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  commentUsername: { fontWeight: 'bold' },
  commentDate: { fontSize: 12 },
  commentText: { fontSize: 14 },
  addCommentRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  commentInput: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 8, marginRight: 8 },
  sendButton: { padding: 8 },
}); 