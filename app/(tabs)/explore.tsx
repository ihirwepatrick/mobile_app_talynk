import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  useColorScheme,
  Dimensions,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { postsApi, userApi } from '@/lib/api';
import { Post, User } from '@/types';
import { followsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Feather } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { useRealtime } from '@/lib/realtime-context';

const { width: screenWidth } = Dimensions.get('window');

const COLORS = {
  dark: {
    background: '#000000',
    card: '#1a1a1a',
    border: '#2a2a2a',
    text: '#ffffff',
    textSecondary: '#8e8e93',
    textTertiary: '#666666',
    primary: '#0095f6',
    inputBg: '#1a1a1a',
    inputBorder: '#2a2a2a',
    inputText: '#ffffff',
    buttonBg: '#0095f6',
    buttonText: '#ffffff',
    spinner: '#0095f6',
    likeColor: '#ed4956',
  },
  light: {
    background: '#ffffff',
    card: '#ffffff',
    border: '#dbdbdb',
    text: '#262626',
    textSecondary: '#8e8e93',
    textTertiary: '#666666',
    primary: '#0095f6',
    inputBg: '#ffffff',
    inputBorder: '#dbdbdb',
    inputText: '#262626',
    buttonBg: '#0095f6',
    buttonText: '#ffffff',
    spinner: '#0095f6',
    likeColor: '#ed4956',
  },
};

// Categories for filtering
const CATEGORIES = [
  'All',
  'Entertainment',
  'Sports',
  'Technology',
  'Fashion',
  'Food',
  'Travel',
  'Music',
  'Comedy',
  'Education',
];

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'trending' | 'foryou' | 'following'>('trending');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [following, setFollowing] = useState<{ [userId: string]: boolean }>({});
  const [followingSuggestions, setFollowingSuggestions] = useState<User[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { sendFollowAction } = useRealtime();
  const colorScheme = useColorScheme() || 'dark';
  const C = COLORS[colorScheme];

  useEffect(() => {
    fetchTrendingPosts();
    fetchFollowingSuggestions();
  }, []);

  const fetchTrendingPosts = async () => {
    setLoadingTrending(true);
    try {
      const response = await postsApi.getAll(1, 20);
      if (response.status === 'success') {
        setTrendingPosts(response.data);
        // Preload follow status for each user
        const followStatus: { [userId: string]: boolean } = {};
        await Promise.all(response.data.map(async (post) => {
          if (post.user?.id && user?.id !== post.user.id) {
            try {
            const res = await followsApi.checkFollowing(post.user.id);
            followStatus[post.user.id] = !!res.data?.isFollowing;
            } catch {
              followStatus[post.user.id] = false;
            }
          }
        }));
        setFollowing(followStatus);
      }
    } catch (error) {
      console.error('Error fetching trending posts:', error);
    } finally {
      setLoadingTrending(false);
      setRefreshing(false);
    }
  };

  const fetchFollowingSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      // For now, we'll use trending posts to get user suggestions
      const response = await postsApi.getAll(1, 20);
      if (response.status === 'success' && response.data) {
        const uniqueUsers = response.data
          .map(post => post.user)
          .filter((user, index, arr) => user && arr.findIndex(u => u?.id === user.id) === index)
          .slice(0, 10);
        setFollowingSuggestions(uniqueUsers as User[]);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrendingPosts();
    fetchFollowingSuggestions();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    setRecentSearches((prev) => [searchQuery, ...prev.filter((s) => s !== searchQuery)].slice(0, 5));
    try {
      const response = await postsApi.search(searchQuery);
      if (response.status === 'success') {
        setSearchResults(response.data);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: string) => {
    if (!user) return;
    setFollowing((prev) => ({ ...prev, [userId]: true }));
    try {
    await followsApi.follow(userId);
      sendFollowAction(userId, true);
    } catch (error) {
      setFollowing((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleUnfollow = async (userId: string) => {
    if (!user) return;
    setFollowing((prev) => ({ ...prev, [userId]: false }));
    try {
    await followsApi.unfollow(userId);
      sendFollowAction(userId, false);
    } catch (error) {
      setFollowing((prev) => ({ ...prev, [userId]: true }));
    }
  };

  const navigateToUserProfile = (userId: string) => {
    router.push({
      pathname: '/user/[id]',
      params: { id: userId }
    });
  };

  const navigateToPost = (postId: string) => {
    router.push(`/post/${postId}` as any);
  };

  const getFilteredPosts = () => {
    const posts = activeTab === 'trending' ? trendingPosts : searchResults;
    if (selectedCategory === 'All') return posts;
    return posts.filter(post => {
      const postCategory = typeof post.category === 'string' ? post.category : post.category?.name;
      return postCategory === selectedCategory;
    });
  };

  const isVideoPost = (post: Post) => {
    const mediaUrl = post.video_url || post.videoUrl || '';
    return mediaUrl.includes('.mp4') || mediaUrl.includes('.webm') || mediaUrl.includes('.mov');
  };

  const renderPost = ({ item }: { item: Post }) => {
    const isFollowing = following[item.user?.id || ''] || false;
    const showFollow = user && item.user?.id && user.id !== item.user.id;
    const mediaUrl = item.image || item.imageUrl || item.video_url || item.videoUrl || '';
    const isVideo = isVideoPost(item);

    return (
      <TouchableOpacity 
        style={[styles.postCard, { backgroundColor: C.card, borderColor: C.border }]}
        onPress={() => navigateToPost(item.id)}
      > 
        {/* Media Preview */}
        <View style={styles.mediaContainer}>
          {isVideo ? (
            <View style={styles.videoThumbnail}>
              <Video
                source={{ uri: mediaUrl }}
                style={styles.postImage}
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
                isMuted={true}
                useNativeControls={false}
              />
              <View style={styles.playIconOverlay}>
                <Feather name="play" size={20} color="#fff" />
              </View>
            </View>
          ) : (
          <Image
              source={{ uri: mediaUrl }}
            style={styles.postImage}
            resizeMode="cover"
          />
        )}
                     {item.category && (
             <View style={[styles.categoryTag, { backgroundColor: C.primary }]}>
               <Text style={[styles.categoryText, { color: C.buttonText }]}>
                 {typeof item.category === 'string' ? item.category : item.category.name}
               </Text>
             </View>
           )}
        </View>

        {/* User Info */}
        <TouchableOpacity 
          style={styles.postInfoRow}
          onPress={() => navigateToUserProfile(item.user?.id || '')}
        >
          <Image
            source={{ uri: item.user?.avatar || item.user?.profile_picture || 'https://via.placeholder.com/32' }}
            style={styles.avatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.username, { color: C.text }]} numberOfLines={1}>
              {item.user?.name || item.user?.username || 'Unknown User'}
            </Text>
            <Text style={[styles.timestamp, { color: C.textSecondary }]} numberOfLines={1}>
              {new Date(item.createdAt || '').toLocaleDateString()}
            </Text>
          </View>
          {showFollow && (
            <TouchableOpacity 
              style={[
                styles.followButtonSmall,
                { backgroundColor: isFollowing ? 'transparent' : C.primary }
              ]} 
              onPress={() => isFollowing ? handleUnfollow(item.user!.id) : handleFollow(item.user!.id)}
            >
              <Text style={[
                styles.followButtonTextSmall,
                { color: isFollowing ? C.textSecondary : C.buttonText }
              ]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
              </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Post Content */}
        <Text style={[styles.title, { color: C.text }]} numberOfLines={2}>
          {item.title || item.caption || item.description || ''}
        </Text>

        {/* Post Stats */}
        <View style={styles.postActionsRow}>
          <Text style={[styles.actionText, { color: C.textSecondary }]}>
            ❤️ {item.likes || item.likesCount || 0}
          </Text>
          <Text style={[styles.actionText, { color: C.textSecondary }]}>
            💬 {item.comments_count || item.commentsCount || 0}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFollowingSuggestion = ({ item }: { item: User }) => {
    const isFollowing = following[item.id] || false;
    const showFollow = user && item.id && user.id !== item.id;

    return (
      <View style={[styles.suggestionCard, { backgroundColor: C.card, borderColor: C.border }]}>
        <TouchableOpacity 
          style={styles.suggestionUserInfo}
          onPress={() => navigateToUserProfile(item.id)}
        >
          <Image
            source={{ uri: item.avatar || item.profile_picture || 'https://via.placeholder.com/48' }}
            style={styles.suggestionAvatar}
          />
          <View style={styles.suggestionText}>
            <Text style={[styles.suggestionName, { color: C.text }]} numberOfLines={1}>
              {item.name || item.username}
            </Text>
            <Text style={[styles.suggestionUsername, { color: C.textSecondary }]} numberOfLines={1}>
              @{item.username}
            </Text>
          </View>
        </TouchableOpacity>
        {showFollow && (
          <TouchableOpacity 
            style={[
              styles.followButtonSmall,
              { backgroundColor: isFollowing ? 'transparent' : C.primary }
            ]} 
            onPress={() => isFollowing ? handleUnfollow(item.id) : handleFollow(item.id)}
          >
            <Text style={[
              styles.followButtonTextSmall,
              { color: isFollowing ? C.textSecondary : C.buttonText }
            ]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}> 
      {/* Content Switcher Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'trending' && styles.tabActive]} 
          onPress={() => setActiveTab('trending')}
        >
          <Text style={[styles.tabText, activeTab === 'trending' && styles.tabTextActive]}>Trending</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'foryou' && styles.tabActive]} 
          onPress={() => setActiveTab('foryou')}
        >
          <Text style={[styles.tabText, activeTab === 'foryou' && styles.tabTextActive]}>For You</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'following' && styles.tabActive]} 
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.tabTextActive]}>Following</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: C.card, borderBottomColor: C.border }]}> 
        <View style={[styles.searchInputContainer, { backgroundColor: C.inputBg, borderColor: C.inputBorder }]}>
          <Feather name="search" size={20} color={C.textSecondary} style={styles.searchIcon} />
        <TextInput
            style={[styles.searchInput, { color: C.inputText }]}
          placeholder="Search posts, people, or topics..."
          placeholderTextColor={C.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        </View>
        <TouchableOpacity 
          style={[styles.searchButton, { backgroundColor: C.buttonBg }]} 
          onPress={handleSearch}
        >
          <Text style={[styles.searchButtonText, { color: C.buttonText }]}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryPill,
              selectedCategory === category && { backgroundColor: C.primary }
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.categoryPillText,
              { color: selectedCategory === category ? C.buttonText : C.text }
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* Divider */}
      <View style={styles.divider} />

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <View style={styles.recentSearchesBox}>
          <Text style={[styles.recentSearchesTitle, { color: C.textSecondary }]}>Recent Searches</Text>
          <View style={styles.recentSearchesRow}>
            {recentSearches.map((s) => (
              <View key={s} style={[styles.recentSearchPill, { backgroundColor: C.card }]}>
                <Text style={{ color: C.text }}>{s}</Text>
                <TouchableOpacity onPress={() => setRecentSearches(recentSearches.filter((x) => x !== s))}>
                  <Text style={{ color: C.textSecondary, marginLeft: 4 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity onPress={() => setRecentSearches([])}>
              <Text style={{ color: C.textSecondary, marginLeft: 8 }}>Clear All</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Following Suggestions */}
      {activeTab === 'following' && (
        <View style={styles.suggestionsContainer}>
          <Text style={[styles.sectionTitle, { color: C.text, fontSize: 15, marginBottom: 6 }]}>Suggested for You</Text>
          {loadingSuggestions ? (
            <ActivityIndicator size="small" color={C.spinner} />
          ) : (
            <FlatList
              data={followingSuggestions}
              renderItem={renderFollowingSuggestion}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsList}
            />
          )}
        </View>
      )}

      {/* Grid of Posts */}
      {loadingTrending ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.spinner} />
        </View>
      ) : (
        <FlatList
          data={getFilteredPosts()}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={{ padding: 10, paddingTop: 0 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
          ListEmptyComponent={
            <View style={[styles.emptyContainer, { flex: 0.5, marginTop: 0 }]}>
              <Text style={[styles.emptyText, { color: C.text }]}>No posts found</Text>
              <Text style={[styles.emptySubtext, { color: C.textSecondary }]}>
                {selectedCategory !== 'All' ? `Try a different category` : 'Try searching for something else'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: '#0095f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8e8e93',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
  searchButton: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryContainer: {
    paddingVertical: 10,
    marginBottom: 10,
    marginTop: 10,
  },
  categoryContent: {
    paddingHorizontal: 15,
  },
  categoryPill: {
    height: 32,
    paddingHorizontal: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#2a2a2a',
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 32,
  },
  recentSearchesBox: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  recentSearchesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  recentSearchesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  recentSearchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#232326',
    marginVertical: 10,
    marginHorizontal: 0,
    marginBottom: 10,
  },
  suggestionsContainer: {
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 10,
    paddingRight: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  suggestionsList: {
    paddingRight: 10,
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    marginRight: 8,
    minWidth: 140,
    maxWidth: 180,
    borderWidth: 1,
    borderColor: '#232326',
    backgroundColor: '#18181b',
  },
  suggestionUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 1,
  },
  suggestionUsername: {
    fontSize: 11,
    color: '#8e8e93',
  },
  postCard: {
    width: (screenWidth - 30) / 2,
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  mediaContainer: {
    position: 'relative',
    width: '100%',
    height: 150,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  videoThumbnail: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  playIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  categoryTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 32,
  },
  postInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  username: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 10,
  },
  followButtonSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0095f6',
  },
  followButtonTextSmall: {
    fontSize: 10,
    fontWeight: '600',
  },
  title: {
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  postActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  actionText: {
    fontSize: 10,
    marginRight: 12,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
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
  },
}); 