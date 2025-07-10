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
} from 'react-native';
import { router } from 'expo-router';
import { postsApi } from '@/lib/api';
import { Post } from '@/types';

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

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const colorScheme = useColorScheme() || 'dark';
  const C = COLORS.dark;

  useEffect(() => {
    fetchTrendingPosts();
  }, []);

  const fetchTrendingPosts = async () => {
    setLoadingTrending(true);
    try {
      const response = await postsApi.getAll(1, 6);
      if (response.status === 'success') {
        setTrendingPosts(response.data);
      }
    } catch (error) {
      // handle error
    } finally {
      setLoadingTrending(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      const response = await postsApi.search(searchQuery);
      if (response.status === 'success') {
        setSearchResults(response.data);
      }
    } catch (error) {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <TouchableOpacity
      style={[styles.postCard, { backgroundColor: C.card, borderColor: C.border }]}
      onPress={() => router.push({ pathname: '/(tabs)/post/[id]', params: { id: item.id } })}
    >
      <View style={styles.postHeader}>
        <Image
          source={{
            uri: item.user?.avatar || item.user_avatar || item.user?.profile_picture || 'https://via.placeholder.com/40',
          }}
          style={styles.avatar}
        />
        <View style={styles.postInfo}>
          <Text style={[styles.username, { color: C.text }]}>
            {item.user?.name || item.user_name || item.authorName || 'Unknown User'}
          </Text>
          <Text style={[styles.timestamp, { color: C.textSecondary }]}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
      {item.caption && (
        <Text style={[styles.caption, { color: C.text }]} numberOfLines={2}>
          {item.caption}
        </Text>
      )}
      {(item.image || item.imageUrl || item.video_url || item.videoUrl) && (
        <Image
          source={{
            uri: item.image || item.imageUrl || item.video_url || item.videoUrl || '',
          }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.postActions}>
        <Text style={[styles.actionText, { color: C.textSecondary }]}>❤️ {item.likes || item.likesCount || 0}</Text>
        <Text style={[styles.actionText, { color: C.textSecondary }]}>💬 {item.comments_count || item.commentsCount || item.comment_count || 0}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}> 
      <View style={[styles.searchContainer, { backgroundColor: C.card, borderBottomColor: C.border }]}> 
        <TextInput
          style={[styles.searchInput, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.inputText }]}
          placeholder="Search posts..."
          placeholderTextColor={C.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={[styles.searchButton, { backgroundColor: C.buttonBg }]} onPress={handleSearch}>
          <Text style={[styles.searchButtonText, { color: C.buttonText }]}>Search</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.sectionTitle, { color: C.text, marginTop: 10, marginLeft: 16 }]}>Trending</Text>
      {loadingTrending ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={C.spinner} />
        </View>
      ) : (
        <FlatList
          data={trendingPosts}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          style={{ marginVertical: 10, minHeight: 220 }}
        />
      )}
      <Text style={[styles.sectionTitle, { color: C.text, marginTop: 10, marginLeft: 16 }]}>Search Results</Text>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.spinner} />
        </View>
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            searchQuery ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: C.text }]}>No posts found</Text>
                <Text style={[styles.emptySubtext, { color: C.textSecondary }]}>Try searching for something else</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: C.text }]}>Search for posts</Text>
                <Text style={[styles.emptySubtext, { color: C.textSecondary }]}>Enter keywords to find interesting content</Text>
              </View>
            )
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
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
    fontSize: 16,
  },
  searchButton: {
    borderRadius: 8,
    padding: 10,
    justifyContent: 'center',
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postCard: {
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    width: 220,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  postInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 2,
  },
  caption: {
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 20,
  },
  postImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 10,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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