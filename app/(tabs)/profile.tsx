import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  FlatList,
  Modal,
  Share,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { userApi, followsApi, postsApi } from '@/lib/api';
import { User, Post } from '@/types';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useRealtime } from '@/lib/realtime-context';
import { EditProfileModal } from '@/components/EditProfileModal';

const COLORS = {
  light: {
    background: '#f5f5f5',
    card: '#fff',
    border: '#e5e7eb',
    text: '#222',
    textSecondary: '#666',
    primary: '#007AFF',
    button: '#007AFF',
    buttonText: '#fff',
    logoutButton: '#ef4444',
    logoutButtonText: '#fff',
  },
  dark: {
    background: '#18181b',
    card: '#232326',
    border: '#27272a',
    text: '#f3f4f6',
    textSecondary: '#a1a1aa',
    primary: '#60a5fa',
    button: '#60a5fa',
    buttonText: '#18181b',
    logoutButton: '#b91c1c',
    logoutButtonText: '#fff',
  },
};

// --- Tabs ---
const TABS = [
  { key: 'approved', label: 'Approved' },
  { key: 'pending', label: 'Pending' },
  { key: 'rejected', label: 'Rejected' },
];

export default function ProfileScreen() {
  const { user: currentUser, logout } = useAuth();
  const route = useRoute();
  const navigation = useNavigation();
  const userId = (route.params && (route.params as any).userId) || currentUser?.id;
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('approved');
  const [posts, setPosts] = useState<Post[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [loadingTab, setLoadingTab] = useState(false);
  const [tabError, setTabError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [postActionsVisible, setPostActionsVisible] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { sendFollowAction } = useRealtime();
  const colorScheme = useColorScheme() || 'light';
  const C = COLORS[colorScheme];

  // --- Menu state ---
  const [menuVisible, setMenuVisible] = useState(false);

  // Add local getFollowers/getFollowing wrappers
  const getFollowers = async (userId: string) => {
    try {
      const response = await userApi.getUserById(userId);
      const d = response.data as any;
      if (d && Array.isArray(d.followers)) {
        return d.followers;
      } else if (d && typeof d === 'object' && d.data && Array.isArray(d.data.followers)) {
        return d.data.followers;
      }
      return [];
    } catch {
      return [];
    }
  };
  const getFollowing = async (userId: string) => {
    try {
      const response = await userApi.getUserById(userId);
      const d = response.data as any;
      if (d && Array.isArray(d.following)) {
        return d.following;
      } else if (d && typeof d === 'object' && d.data && Array.isArray(d.data.following)) {
        return d.data.following;
      }
      return [];
    } catch {
      return [];
    }
  };

  // Fetch profile info
  useEffect(() => {
    const fetchProfile = async () => {
      setLoadingProfile(true);
      setProfileError(null);
      try {
        const response = await userApi.getUserById(userId);
        if (response.status === 'success' && response.data) {
          setProfile(response.data);
        } else {
          setProfileError(response.message || 'Failed to fetch user profile');
        }
      } catch (err: any) {
        setProfileError(err.message || 'Failed to fetch user profile');
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [userId]);

  // Fetch follow state
  useEffect(() => {
    const checkFollow = async () => {
      if (!currentUser || currentUser.id === userId) return;
      try {
        const response = await followsApi.checkFollowing(userId);
        setIsFollowing(!!response.data?.isFollowing);
      } catch {
        setIsFollowing(false);
      }
    };
    checkFollow();
  }, [userId, currentUser]);

  // Fetch tab data
  useEffect(() => {
    setLoadingTab(true);
    setTabError(null);
    userApi.getOwnPosts().then((response: any) => {
      if (response.status === 'success' && response.data && Array.isArray(response.data.posts)) {
        let filteredPosts = response.data.posts;
        if (activeTab === 'pending') {
          filteredPosts = filteredPosts.filter((p: any) => (p.status || 'approved') === 'pending');
        } else if (activeTab === 'rejected') {
          filteredPosts = filteredPosts.filter((p: any) => (p.status || 'approved') === 'rejected');
        } else {
          filteredPosts = filteredPosts.filter((p: any) => (p.status || 'approved') === 'approved');
        }
        setPosts(filteredPosts);
      } else {
        setTabError(response.message || 'Failed to fetch posts');
      }
      setLoadingTab(false);
      setRefreshing(false);
    }).catch((err: any) => {
      setTabError(err.message || 'Failed to fetch posts');
      setLoadingTab(false);
      setRefreshing(false);
    });
  }, [activeTab]);

  // Refresh function
  const onRefresh = () => {
    setRefreshing(true);
    // Re-fetch profile and posts
    const fetchProfile = async () => {
      try {
        const response = await userApi.getUserById(userId);
        if (response.status === 'success' && response.data) {
          setProfile(response.data);
        }
      } catch (err: any) {
        console.error('Error refreshing profile:', err);
      }
    };
    fetchProfile();
  };

  // Fetch comments when overlay opens for approved post
  useEffect(() => {
    if (postModalVisible && selectedPost && selectedPost.status === 'approved') {
      setCommentsLoading(true);
      postsApi.getComments(selectedPost.id)
        .then((res: any) => {
          setComments(res.data?.comments || []);
        })
        .catch(() => setComments([]))
        .finally(() => setCommentsLoading(false));
    } else {
      setComments([]);
    }
  }, [postModalVisible, selectedPost]);
  // Add comment handler
  const handleAddComment = async () => {
    if (!selectedPost || !newComment.trim()) return;
    setCommentsLoading(true);
    try {
      const res = await postsApi.addComment(selectedPost.id, newComment);
      if (res.status === 'success' && res.data?.comment?.length) {
        setComments([res.data.comment[0], ...comments]);
        setNewComment('');
      }
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      const response = await followsApi.follow(userId);
      if (response.status === 'success') {
        setIsFollowing(true);
        sendFollowAction(userId, true);
      }
    } finally {
      setFollowLoading(false);
    }
  };
  const handleUnfollow = async () => {
    setFollowLoading(true);
    try {
      const response = await followsApi.unfollow(userId);
      if (response.status === 'success') {
        setIsFollowing(false);
        sendFollowAction(userId, false);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  // --- Post click handler ---
  const handlePostPress = (post: Post) => {
    setSelectedPost(post);
    setPostModalVisible(true);
  };
  const handlePostLongPress = (post: Post) => {
    setSelectedPost(post);
    setPostActionsVisible(true);
  };
  const handleClosePostModal = () => {
    setPostModalVisible(false);
    setSelectedPost(null);
  };
  const handleCloseActionsMenu = () => {
    setPostActionsVisible(false);
    setSelectedPost(null);
  };

  const handleEditProfile = () => {
    setEditProfileModalVisible(true);
  };

  const handleProfileUpdated = (updatedUser: any) => {
    setProfile(updatedUser);
    setEditProfileModalVisible(false);
  };
  const handleDeletePost = async () => {
    if (!selectedPost) return;
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
        { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setDeletingPost(true);
        try {
          await postsApi.deletePost(selectedPost.id);
          setPosts(posts.filter(p => p.id !== selectedPost.id));
          setPostModalVisible(false);
          setPostActionsVisible(false);
        } catch (e) {
          Alert.alert('Error', 'Failed to delete post.');
        } finally {
          setDeletingPost(false);
        }
      }}
    ]);
  };
  const handleSharePost = async () => {
    if (!selectedPost) return;
    const mediaArr = (selectedPost as any).media;
    try {
      await Share.share({
        message: selectedPost.caption || '',
        url: (Array.isArray(mediaArr) && mediaArr[0]?.url) || selectedPost.image || selectedPost.video_url || '',
        title: 'Check out this post!'
      });
    } catch {}
  };
  const handleDownloadPost = async () => {
    if (!selectedPost) return;
    const mediaArr = (selectedPost as any).media;
    const url = (Array.isArray(mediaArr) && mediaArr[0]?.url) || selectedPost.image || selectedPost.video_url || '';
    if (!url) return Alert.alert('No media to download');
    try {
      // For demo: just alert. In real app, use FileSystem.downloadAsync and MediaLibrary.
      Alert.alert('Download', 'Download started (implement actual download logic here).');
    } catch (e) {
      Alert.alert('Error', 'Failed to download media.');
    }
  };

  // Helper to get media URL/type
  function getPostMedia(post: Post) {
    if (Array.isArray((post as any).media) && (post as any).media[0]) {
      return { url: (post as any).media[0].url, type: (post as any).media[0].type };
    }
    if (post.image) return { url: post.image, type: 'image' };
    if (post.imageUrl) return { url: post.imageUrl, type: 'image' };
    if (post.video_url) return { url: post.video_url, type: 'video' };
    if (post.videoUrl) return { url: post.videoUrl, type: 'video' };
    return { url: '', type: '' };
  }
  // Helper to get category as string
  function getCategoryString(category: string | object) {
    if (!category) return '';
    if (typeof category === 'string') return category;
    if (typeof category === 'object' && (category as any).name) return (category as any).name;
    return '';
  }

  if (loadingProfile) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={C.primary} /></View>;
  }
  if (profileError || !profile) {
    return <View style={styles.loadingContainer}><Text style={{ color: 'red', textAlign: 'center' }}>{profileError || 'Failed to load profile'}</Text></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}> 
      {/* Profile Header Modernized */}
      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <View style={{ alignItems: 'center', paddingTop: 24, paddingBottom: 16 }}>
          <View style={styles.avatarShadowWrapper}>
            <Image
              source={profile?.profile_picture ? { uri: profile.profile_picture } : require('../../assets/images/icon.png')}
              style={styles.avatarLarge}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.profileNameLarge}>{profile?.name || profile?.username || 'User'}</Text>
          <Text style={styles.profileUsernameLarge}>@{profile?.username}</Text>
          {profile?.bio ? <Text style={styles.profileBioLarge}>{profile.bio}</Text> : null}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.postsCount ?? 0}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.followersCount ?? 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.followingCount ?? 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuButton}>
          <MaterialIcons name="more-vert" size={28} color={C.text} />
        </TouchableOpacity>
        {/* Dropdown menu */}
        {menuVisible && (
          <TouchableOpacity 
            style={styles.menuOverlay} 
            activeOpacity={1} 
            onPress={() => setMenuVisible(false)}
          >
            <View style={[styles.menuDropdown, { backgroundColor: colorScheme === 'dark' ? '#232326' : '#fff', shadowColor: colorScheme === 'dark' ? '#000' : '#000', }] }>
              {currentUser && currentUser.id === userId && (
                <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); handleEditProfile(); }}>
                  <Text style={[styles.menuItemText, { color: colorScheme === 'dark' ? '#fff' : '#222' }]}>Edit Profile</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); router.push('/settings'); }}>
                <Text style={[styles.menuItemText, { color: colorScheme === 'dark' ? '#fff' : '#222' }]}>Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); logout(); }}>
                <Text style={[styles.menuItemText, { color: C.logoutButton } ]}>Logout</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      </View>
      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab.key as 'approved' | 'pending' | 'rejected')}
          >
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
        </TouchableOpacity>
        ))}
      </View>
      {/* Tab Content */}
      <View style={styles.postsSection}>
        {loadingTab ? (
          <View style={styles.loadingContainer}><ActivityIndicator size="small" color={C.primary} /></View>
        ) : tabError ? (
          <View style={styles.loadingContainer}><Text style={{ color: 'red', textAlign: 'center' }}>{tabError}</Text></View>
        ) : (
          <FlatList
            data={posts}
            renderItem={({ item }) => {
              const { url: mediaUrl, type: mediaType } = getPostMedia(item);
              return (
                <TouchableOpacity 
                  onPress={() => handlePostPress(item)}
                  onLongPress={() => handlePostLongPress(item)}
                  style={styles.postCard}
                >
                  {/* User Info Header */}
                  <View style={styles.postHeader}>
                    <View style={styles.postUserInfo}>
                      <Image
                        source={{ uri: profile?.profile_picture || 'https://via.placeholder.com/24' }}
                        style={styles.postUserAvatar}
                      />
                      <Text style={styles.postUsername}>@{profile?.username}</Text>
                    </View>
                    {currentUser && currentUser.id !== userId && (
                      <TouchableOpacity 
                        onPress={isFollowing ? handleUnfollow : handleFollow}
                        disabled={followLoading}
                        style={[
                          styles.followButton,
                          { backgroundColor: isFollowing ? 'transparent' : C.primary }
                        ]}
                      >
                        <Text style={[
                          styles.followButtonText,
                          { color: isFollowing ? C.textSecondary : C.buttonText }
                        ]}>
                          {followLoading ? '...' : (isFollowing ? 'Following' : 'Follow')}
                        </Text>
                      </TouchableOpacity>
                    )}
          </View>
                  
                  {/* Media */}
                  {mediaUrl ? (
                    mediaType === 'video' ? (
                      <View>
                        <Video
                          source={{ uri: mediaUrl }}
                    style={styles.postImage}
                          resizeMode={ResizeMode.COVER}
                          useNativeControls={false}
                          shouldPlay={false}
                          isLooping={false}
                        />
                        <View style={styles.playIconOverlay}>
                          <MaterialIcons name="play-circle-outline" size={48} color="#fff" />
                        </View>
                      </View>
                    ) : (
                      <Image source={{ uri: mediaUrl }} style={styles.postImage} resizeMode="cover" />
                    )
                  ) : null}
                  
                  {/* Caption and Category */}
                  <View style={styles.postFooter}>
                    <Text style={styles.postCaption} numberOfLines={2}>
                      {item.caption || ''}
                    </Text>
                    <View style={styles.postFooterActions}>
                      <View style={styles.postAction}>
                        <Feather 
                          name="heart" 
                          size={16} 
                          color={(item.likes || 0) > 0 ? "#ff2d55" : "#666"} 
                          fill={(item.likes || 0) > 0 ? "#ff2d55" : "none"}
                        />
                        <Text style={styles.postActionText}>{item.likes || 0}</Text>
                      </View>
                      <View style={styles.postAction}>
                        <Feather name="message-circle" size={16} color="#666" />
                        <Text style={styles.postActionText}>{item.comments_count || 0}</Text>
                      </View>
                    </View>
                    {item.category && (
                      <View style={[styles.categoryTag, { backgroundColor: C.primary }]}>
                        <Text style={[styles.categoryText, { color: C.buttonText }]}>
                          {getCategoryString(item.category || '')}
                  </Text>
                      </View>
                )}
                  </View>
                </TouchableOpacity>
              );
            }}
            keyExtractor={item => item.id}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={C.primary}
                colors={[C.primary]}
              />
            }
          />
        )}
      </View>
      {/* Edit Profile Modal */}
      <EditProfileModal
        isVisible={editProfileModalVisible}
        onClose={() => setEditProfileModalVisible(false)}
        user={profile}
        onProfileUpdated={handleProfileUpdated}
      />
      {/* Post Modal Overlay */}
      <Modal visible={postModalVisible} animationType="slide" transparent onRequestClose={handleClosePostModal}>
        <View style={styles.overlayBackdrop}>
          <View style={styles.overlayContent}>
            <TouchableOpacity style={styles.overlayClose} onPress={handleClosePostModal}>
              <MaterialIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            {selectedPost && (() => {
              const { url: mediaUrl, type: mediaType } = getPostMedia(selectedPost);
              const isApproved = selectedPost.status === 'approved';
              return (
                <>
                  {/* Media */}
                  {mediaUrl ? (
                    mediaType === 'video' ? (
                      <Video
                        source={{ uri: mediaUrl }}
                        style={styles.overlayMedia}
                        resizeMode={ResizeMode.CONTAIN}
                        useNativeControls={true}
                        shouldPlay={false}
                      />
                    ) : (
                      <Image source={{ uri: mediaUrl }} style={styles.overlayMedia} resizeMode="contain" />
                    )
                  ) : null}
                  {/* Details */}
                  <Text style={styles.overlayCaption}>{selectedPost.caption || ''}</Text>
                  <Text style={styles.overlayMeta}>{getCategoryString(selectedPost.category || '')} • {selectedPost.createdAt ? new Date(selectedPost.createdAt).toLocaleString() : ''}</Text>
                  {/* Comments if approved */}
                  {isApproved && (
                    <View style={styles.overlayCommentsSection}>
                      <Text style={styles.overlayCommentsTitle}>Comments</Text>
                      {commentsLoading ? (
                        <Text style={styles.overlayCommentsPlaceholder}>Loading...</Text>
                      ) : comments.length === 0 ? (
                        <Text style={styles.overlayCommentsPlaceholder}>No comments yet.</Text>
                      ) : (
                        <View style={{ maxHeight: 120 }}>
                          {comments.map((c, i) => (
                            <View key={c.id || i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                              <Image source={{ uri: c.User?.avatar || 'https://via.placeholder.com/32' }} style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }} />
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>{c.User?.name || c.User?.username || 'unknown'}</Text>
                                <Text style={{ color: '#aaa', fontSize: 12 }}>{c.comment_text || c.content || ''}</Text>
                              </View>
              </View>
            ))}
                        </View>
                      )}
                      {/* Add comment input */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                        <TextInput
                          style={{ flex: 1, backgroundColor: '#18181b', color: '#fff', borderRadius: 8, padding: 8, fontSize: 13, borderWidth: 1, borderColor: '#333' }}
                          placeholder="Add a comment..."
                          placeholderTextColor="#888"
                          value={newComment}
                          onChangeText={setNewComment}
                          editable={!commentsLoading}
                        />
                        <TouchableOpacity onPress={handleAddComment} disabled={commentsLoading || !newComment.trim()} style={{ marginLeft: 8 }}>
                          <MaterialIcons name="send" size={22} color={commentsLoading || !newComment.trim() ? '#888' : '#60a5fa'} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  {/* Action Bar */}
                  <View style={styles.overlayActions}>
                    {isApproved ? (
                      <>
                        <TouchableOpacity style={styles.overlayActionBtn} onPress={handleDownloadPost}>
                          <MaterialIcons name="file-download" size={24} color="#fff" />
                          <Text style={styles.overlayActionText}>Download</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.overlayActionBtn} onPress={handleSharePost}>
                          <MaterialIcons name="share" size={24} color="#fff" />
                          <Text style={styles.overlayActionText}>Share</Text>
                        </TouchableOpacity>
                      </>
                    ) : null}
                    <TouchableOpacity style={styles.overlayActionBtn} onPress={handleDeletePost} disabled={deletingPost}>
                      <MaterialIcons name="delete" size={24} color={deletingPost ? '#aaa' : '#fff'} />
                      <Text style={styles.overlayActionText}>{deletingPost ? 'Deleting...' : 'Delete'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
      {/* Post Actions Menu (for long press) */}
      <Modal visible={postActionsVisible} animationType="fade" transparent onRequestClose={handleCloseActionsMenu}>
        <TouchableOpacity style={styles.menuOverlayBackdrop} onPress={handleCloseActionsMenu} activeOpacity={1}>
          <View style={styles.menuDropdownActions}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { handleDownloadPost(); handleCloseActionsMenu(); }}>
              <Text style={styles.menuItemText}>Download</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { handleSharePost(); handleCloseActionsMenu(); }}>
              <Text style={styles.menuItemText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { handleDeletePost(); handleCloseActionsMenu(); }}>
              <Text style={[styles.menuItemText, { color: C.logoutButton }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  settingsButton: {
    borderRadius: 8,
    padding: 8,
  },
  settingsButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#eee',
    marginRight: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#eee',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  profileUsername: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  profileBio: {
    fontSize: 14,
    textAlign: 'left',
    lineHeight: 20,
    marginBottom: 10,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  profileStat: {
    fontSize: 14,
    color: '#666',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  postsSection: {
    padding: 15,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  postCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  postUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  postUserAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  postUsername: {
    fontSize: 11,
    fontWeight: '600',
    color: '#262626',
  },
  followButton: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbdbdb',
  },
  followButtonText: {
    fontSize: 10,
    fontWeight: '600',
  },
  postImage: {
    width: '100%',
    height: 140,
  },
  postCaption: {
    fontSize: 11,
    padding: 6,
    lineHeight: 14,
  },
  postFooter: {
    padding: 6,
    paddingTop: 4,
  },
  categoryTag: {
    alignSelf: 'flex-end',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 3,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '600',
  },
  postFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  postActionText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  createPostButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 20,
  },
  createPostButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  playIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  playIcon: {
    fontSize: 32,
    color: '#fff',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  tabButtonActive: {
    backgroundColor: '#60a5fa',
    borderRadius: 20,
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  tabLabelActive: {
    color: '#fff',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  followerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  followerName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  followingBadge: {
    backgroundColor: '#60a5fa',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 2,
    fontSize: 12,
    overflow: 'hidden',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  menuDropdown: {
    position: 'absolute',
    top: 50,
    right: 10,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 100,
    minWidth: 140,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  menuItemText: {
    fontSize: 16,
    color: '#222',
  },
  avatarShadowWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
    borderRadius: 60,
    marginBottom: 8,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: '#eee',
  },
  profileNameLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
    color: '#fff',
    textAlign: 'center',
  },
  profileUsernameLarge: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 4,
    textAlign: 'center',
  },
  profileBioLarge: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 10,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 13,
    color: '#aaa',
  },
  menuButton: {
    position: 'absolute',
    top: 18,
    right: 18,
    padding: 8,
    zIndex: 10,
  },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContent: {
    width: '92%',
    backgroundColor: '#232326',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    position: 'relative',
  },
  overlayClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    padding: 6,
  },
  overlayMedia: {
    width: 260,
    height: 260,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#111',
  },
  overlayCaption: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  overlayMeta: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 12,
    textAlign: 'center',
  },
  overlayCommentsSection: {
    width: '100%',
    marginTop: 10,
    marginBottom: 10,
  },
  overlayCommentsTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  overlayCommentsPlaceholder: {
    fontSize: 13,
    color: '#aaa',
    fontStyle: 'italic',
  },
  overlayActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 18,
  },
  overlayActionBtn: {
    alignItems: 'center',
    marginHorizontal: 10,
  },
  overlayActionText: {
    color: '#fff',
    fontSize: 13,
    marginTop: 2,
  },
  menuOverlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  menuDropdownActions: {
    backgroundColor: '#232326',
    borderRadius: 14,
    margin: 18,
    paddingVertical: 8,
    paddingHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 100,
    minWidth: 180,
  },
}); 