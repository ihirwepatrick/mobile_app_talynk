import { store } from './index';
import { initializeLikes } from './slices/likesSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize Redux store from AsyncStorage
export const initializeStore = async () => {
  try {
    const [likedData, likeCountsData] = await Promise.all([
      AsyncStorage.getItem('liked_posts'),
      AsyncStorage.getItem('post_like_counts'),
    ]);

    const likedPosts: string[] = [];
    const likeCounts: Record<string, number> = {};

    if (likedData) {
      try {
        const parsed = JSON.parse(likedData);
        if (Array.isArray(parsed)) {
          likedPosts.push(...parsed);
        }
      } catch (e) {
        console.error('Error parsing liked posts:', e);
      }
    }

    if (likeCountsData) {
      try {
        const parsed = JSON.parse(likeCountsData);
        if (parsed && typeof parsed === 'object') {
          Object.assign(likeCounts, parsed);
        }
      } catch (e) {
        console.error('Error parsing like counts:', e);
      }
    }

    if (likedPosts.length > 0 || Object.keys(likeCounts).length > 0) {
      store.dispatch(initializeLikes({ likedPosts, likeCounts }));
    }
  } catch (error) {
    console.error('Error initializing store:', error);
  }
};

