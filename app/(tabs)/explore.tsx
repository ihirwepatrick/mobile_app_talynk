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
  Dimensions,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { postsApi, userApi, followsApi } from '@/lib/api';
import { Post, User } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { useCache } from '@/lib/cache-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');

type Category = {
  name: string;
  sub?: string[];
};

const CATEGORIES: Category[] = [
  { name: 'All' },
  { name: 'Entertainment', sub: ['Movies', 'Series', 'Celebrities'] },
  { name: 'Sports', sub: ['Football', 'Basketball', 'Tennis'] },
  { name: 'Technology', sub: ['AI', 'Gadgets', 'Programming'] },
  { name: 'Music', sub: ['Hip Hop', 'Afrobeats', 'Pop'] },
  { name: 'Comedy', sub: ['Skits', 'Standup'] },
  { name: 'Education', sub: ['Science', 'History', 'How-to'] },
  { name: 'Fashion', sub: ['Street', 'Runway', 'Design'] },
  { name: 'Food', sub: ['Recipes', 'Street Food', 'Reviews'] },
  { name: 'Travel', sub: ['Vlogs', 'Guides'] },
  { name: 'Art', sub: ['Digital', 'Traditional'] },
  { name: 'Dance', sub: ['Choreo', 'Freestyle'] },
];

const EXPLORE_TABS = [
  { key: 'trending', label: 'Trending' },
  { key: 'discover', label: 'Discover' },
];

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('trending');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { followedUsers, updateFollowedUsers } = useCache();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadContent();
  }, [activeTab, selectedCategory, selectedSubCategory]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const [postsResponse, suggestionsResponse] = await Promise.all([
        postsApi.getAll(1, 30),
        userApi.getSuggestions()
      ]);

      if (postsResponse.status === 'success') {
        let filteredPosts = postsResponse.data;
        
        // Filter by category
        if (selectedCategory !== 'All') {
          filteredPosts = filteredPosts.filter(post => {
            const postCategory = typeof post.category === 'string' ? post.category : post.category?.name;
            return postCategory === selectedCategory;
          });
        }
        // Filter by subcategory if any
        if (selectedSubCategory) {
          filteredPosts = filteredPosts.filter(post => {
            const tagList: string[] = Array.isArray((post as any).tags) ? (post as any).tags : [];
            return tagList.map(t => String(t)).includes(selectedSubCategory as string);
          });
        }
        
        setPosts(filteredPosts);
      }

      if (suggestionsResponse.status === 'success') {
        setSuggestions(suggestionsResponse.data?.suggestions || []);
      }
    } catch (error) {
      console.error('Error loading explore content:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadContent();
  };

  const handleFollow = async (userId: string) => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    updateFollowedUsers(userId, true);
    try {
      await followsApi.follow(userId);
    } catch (error) {
      updateFollowedUsers(userId, false);
    }
  };

  const handleSearch = () => {
    router.push('/search');
  };

  const renderPost = ({ item }: { item: Post }) => {
    const mediaUrl = item.video_url || item.image || '';
    const isVideo = !!item.video_url;

    return (
      <TouchableOpacity 
        style={styles.postCard}
        onPress={() => router.push({
          pathname: '/post/[id]',
          params: { id: item.id }
        })}
      >
        {isVideo ? (
          <Video
            source={{ uri: mediaUrl }}
            style={styles.postMedia}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            isMuted={true}
            useNativeControls={false}
            posterStyle={{ resizeMode: 'cover' }}
          />
        ) : (
          <Image source={{ uri: mediaUrl }} style={styles.postMedia} />
        )}
        
        <View style={styles.postOverlay}>
          <View style={styles.postStats}>
            <Feather name="heart" size={14} color="#fff" />
            <Text style={styles.postStatText}>{item.likes || 0}</Text>
          </View>
          
          {isVideo && (
            <View style={styles.playIcon}>
              <Feather name="play" size={16} color="#fff" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSuggestion = ({ item }: { item: User }) => (
    <View style={styles.suggestionCard}>
      <TouchableOpacity 
        onPress={() => router.push({
          pathname: '/user/[id]',
          params: { id: item.id }
        })}
      >
        <Image
          source={{ uri: item.profile_picture || 'https://via.placeholder.com/80' }}
          style={styles.suggestionAvatar}
        />
        <Text style={styles.suggestionName}>{item.name || item.username}</Text>
        <Text style={styles.suggestionUsername}>@{item.username}</Text>
      </TouchableOpacity>
      
      {user && user.id !== item.id && (
        <TouchableOpacity 
          style={[
            styles.suggestionFollowButton,
            followedUsers.has(item.id) && styles.suggestionFollowingButton
          ]}
          onPress={() => handleFollow(item.id)}
        >
          <Text style={[
            styles.suggestionFollowText,
            followedUsers.has(item.id) && styles.suggestionFollowingText
          ]}>
            {followedUsers.has(item.id) ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Explore</Text>
        <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
          <Feather name="search" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {EXPLORE_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Categories */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.name;
          const isExpanded = expandedCategory === cat.name;
          return (
            <View key={cat.name} style={styles.categoryItemWrap}>
              <TouchableOpacity
                style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                onPress={() => {
                  setSelectedCategory(cat.name);
                  setSelectedSubCategory(null);
                }}
                onLongPress={() => {
                  if (cat.sub && cat.sub.length > 0) {
                    setExpandedCategory(isExpanded ? null : cat.name);
                  }
                }}
                activeOpacity={0.9}
              >
                <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}>
                  {cat.name}
                </Text>
                {cat.sub && cat.sub.length > 0 && (
                  <Feather name={isExpanded ? 'minus' : 'plus'} size={14} color={isSelected ? '#000' : '#666'} />
                )}
              </TouchableOpacity>
              {isExpanded && cat.sub && (
                <View style={styles.subCategoryRow}>
                  {cat.sub.map((sub) => {
                    const subActive = selectedSubCategory === sub;
                    return (
                      <TouchableOpacity
                        key={sub}
                        style={[styles.subTag, subActive && styles.subTagActive]}
                        onPress={() => setSelectedSubCategory(subActive ? null : sub)}
                      >
                        <Text style={[styles.subTagText, subActive && styles.subTagTextActive]}>{sub}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <ScrollView 
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#60a5fa" />
        }
      >
        {/* Suggestions */}
        {suggestions.length > 0 && (
          <View style={styles.suggestionsSection}>
            <Text style={styles.sectionTitle}>Suggested for you</Text>
            <FlatList
              data={suggestions.slice(0, 10)}
              renderItem={renderSuggestion}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsList}
            />
          </View>
        )}

        {/* Posts Grid */}
        <View style={styles.postsSection}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#60a5fa" />
            </View>
          ) : (
            <FlatList
              data={posts}
              renderItem={renderPost}
              keyExtractor={(item) => item.id}
              numColumns={3}
              scrollEnabled={false}
              contentContainerStyle={styles.postsGrid}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Feather name="video" size={48} color="#666" />
                  <Text style={styles.emptyText}>No posts found</Text>
                  <Text style={styles.emptySubtext}>Try a different category</Text>
                </View>
              }
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  searchButton: {
    padding: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    minWidth: 100,
  },
  tabActive: {
    backgroundColor: '#60a5fa',
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoriesContent: {
    paddingHorizontal: 16,
  },
  categoryItemWrap: {
    marginRight: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryPillActive: {
    backgroundColor: '#60a5fa',
  },
  categoryPillText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  categoryPillTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  subCategoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  subTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  subTagActive: {
    backgroundColor: '#60a5fa',
    borderColor: '#60a5fa',
  },
  subTagText: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '500',
  },
  subTagTextActive: {
    color: '#000',
  },
  suggestionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  suggestionsList: {
    paddingHorizontal: 16,
  },
  suggestionCard: {
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 120,
  },
  suggestionAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  suggestionName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  suggestionUsername: {
    color: '#666',
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 8,
  },
  suggestionFollowButton: {
    backgroundColor: '#60a5fa',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  suggestionFollowingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666',
  },
  suggestionFollowText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '600',
  },
  suggestionFollowingText: {
    color: '#666',
  },
  postsSection: {
    flex: 1,
  },
  postsGrid: {
    padding: 2,
  },
  postCard: {
    width: (screenWidth - 6) / 3,
    height: (screenWidth - 6) / 3 * 1.5,
    margin: 1,
    position: 'relative',
  },
  postMedia: {
    width: '100%',
    height: '100%',
  },
  postOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postStatText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  playIcon: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    width: screenWidth,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});