import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LikesState {
  likedPosts: string[]; // Use array instead of Set for Redux serialization
  postLikeCounts: Record<string, number>;
  isLoading: boolean;
}

const initialState: LikesState = {
  likedPosts: [],
  postLikeCounts: {},
  isLoading: false,
};

const likesSlice = createSlice({
  name: 'likes',
  initialState,
  reducers: {
    setLikedPosts: (state, action: PayloadAction<string[]>) => {
      state.likedPosts = action.payload;
      AsyncStorage.setItem('liked_posts', JSON.stringify(action.payload)).catch(console.error);
    },
    addLikedPost: (state, action: PayloadAction<string>) => {
      if (!state.likedPosts.includes(action.payload)) {
        state.likedPosts.push(action.payload);
        AsyncStorage.setItem('liked_posts', JSON.stringify(state.likedPosts)).catch(console.error);
      }
    },
    removeLikedPost: (state, action: PayloadAction<string>) => {
      state.likedPosts = state.likedPosts.filter(id => id !== action.payload);
      AsyncStorage.setItem('liked_posts', JSON.stringify(state.likedPosts)).catch(console.error);
    },
    toggleLikedPost: (state, action: PayloadAction<string>) => {
      const index = state.likedPosts.indexOf(action.payload);
      if (index >= 0) {
        state.likedPosts.splice(index, 1);
      } else {
        state.likedPosts.push(action.payload);
      }
      AsyncStorage.setItem('liked_posts', JSON.stringify(state.likedPosts)).catch(console.error);
    },
    setPostLikeCount: (state, action: PayloadAction<{ postId: string; count: number }>) => {
      state.postLikeCounts[action.payload.postId] = action.payload.count;
      AsyncStorage.setItem('post_like_counts', JSON.stringify(state.postLikeCounts)).catch(console.error);
    },
    setPostLikeCounts: (state, action: PayloadAction<Record<string, number>>) => {
      state.postLikeCounts = { ...state.postLikeCounts, ...action.payload };
      AsyncStorage.setItem('post_like_counts', JSON.stringify(state.postLikeCounts)).catch(console.error);
    },
    updateLikeCount: (state, action: PayloadAction<{ postId: string; delta: number }>) => {
      const current = state.postLikeCounts[action.payload.postId] || 0;
      const newCount = Math.max(0, current + action.payload.delta);
      state.postLikeCounts[action.payload.postId] = newCount;
      AsyncStorage.setItem('post_like_counts', JSON.stringify(state.postLikeCounts)).catch(console.error);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    clearLikes: (state) => {
      state.likedPosts = [];
      state.postLikeCounts = {};
      AsyncStorage.multiRemove(['liked_posts', 'post_like_counts']).catch(console.error);
    },
    initializeLikes: (state, action: PayloadAction<{ likedPosts: string[]; likeCounts: Record<string, number> }>) => {
      state.likedPosts = action.payload.likedPosts;
      state.postLikeCounts = action.payload.likeCounts;
    },
  },
});

export const {
  setLikedPosts,
  addLikedPost,
  removeLikedPost,
  toggleLikedPost,
  setPostLikeCount,
  setPostLikeCounts,
  updateLikeCount,
  setLoading,
  clearLikes,
  initializeLikes,
} = likesSlice.actions;

export default likesSlice.reducer;

