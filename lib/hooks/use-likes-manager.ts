import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { setLikedPosts, setPostLikeCounts } from '@/lib/store/slices/likesSlice';
import { likesApi } from '@/lib/api';

/**
 * Efficient Like Manager Hook - TikTok-style batch checking
 * 
 * Features:
 * - Batch like-status fetching every 400ms
 * - Optimistic UI updates
 * - Minimal API traffic
 * - Smooth scrolling like detection
 */
export const useLikesManager = () => {
  const dispatch = useAppDispatch();
  const likedPosts = useAppSelector(state => state.likes.likedPosts);
  const postLikeCounts = useAppSelector(state => state.likes.postLikeCounts);
  
  // Queue of post IDs that need like status checking
  const pendingPostIds = useRef<string[]>([]);
  const checkedPostIds = useRef<Set<string>>(new Set());

  /**
   * Add post to batch fetch queue when it becomes visible
   */
  const onPostVisible = useCallback((postId: string) => {
    // Skip if already checked or already liked
    if (checkedPostIds.current.has(postId) || likedPosts.includes(postId)) {
      return;
    }

    // Skip if already in queue
    if (pendingPostIds.current.includes(postId)) {
      return;
    }

    // Add to queue
    pendingPostIds.current.push(postId);
  }, [likedPosts]);

  /**
   * Batch fetch like status every 400ms
   */
  useEffect(() => {
    const interval = setInterval(async () => {
      if (pendingPostIds.current.length === 0) return;

      // Get batch and clear queue
      const batch = [...pendingPostIds.current];
      pendingPostIds.current = [];

      try {
        // Fetch batch status from server
        const response = await likesApi.batchCheckStatus(batch);

        if (response.status === 'success' && response.data) {
          const liked: string[] = [];
          const counts: Record<string, number> = {};

          // Process response
          Object.entries(response.data).forEach(([postId, info]: [string, any]) => {
            if (info && typeof info === 'object' && 'isLiked' in info && 'likeCount' in info) {
              if (info.isLiked) {
                liked.push(postId);
              }
              counts[postId] = info.likeCount || 0;
              checkedPostIds.current.add(postId);
            }
          });

          // Update Redux store
          if (liked.length > 0) {
            const currentLiked = [...likedPosts];
            liked.forEach(id => {
              if (!currentLiked.includes(id)) {
                currentLiked.push(id);
              }
            });
            dispatch(setLikedPosts(currentLiked));
          }

          if (Object.keys(counts).length > 0) {
            dispatch(setPostLikeCounts(counts));
          }
        }
      } catch (error) {
        console.error('Batch like status fetch error:', error);
        // Re-add to queue for retry (optional)
        // pendingPostIds.current.push(...batch);
      }
    }, 400); // Check every 400ms

    return () => clearInterval(interval);
  }, [dispatch, likedPosts]);

  /**
   * Optimistic toggle like
   */
  const toggleLike = useCallback(async (postId: string) => {
    const isLiked = likedPosts.includes(postId);
    const currentCount = postLikeCounts[postId] || 0;

    // Optimistic update - update immediately
    const newLikedPosts = isLiked
      ? likedPosts.filter(id => id !== postId)
      : [...likedPosts, postId];
    
    const newCount = isLiked 
      ? Math.max(0, currentCount - 1)
      : currentCount + 1;

    dispatch(setLikedPosts(newLikedPosts));
    dispatch(setPostLikeCounts({ ...postLikeCounts, [postId]: newCount }));

    // Background API call
    try {
      const response = await likesApi.toggle(postId);
      
      if (response.status === 'success' && response.data) {
        // Update with server response
        const serverIsLiked = response.data.isLiked;
        const serverLikeCount = response.data.likeCount;

        // Update Redux with server response
        const finalLikedPosts = serverIsLiked
          ? [...new Set([...likedPosts, postId])]
          : likedPosts.filter(id => id !== postId);
        
        dispatch(setLikedPosts(finalLikedPosts));
        dispatch(setPostLikeCounts({ ...postLikeCounts, [postId]: serverLikeCount }));
      } else {
        // Revert on error
        dispatch(setLikedPosts(likedPosts));
        dispatch(setPostLikeCounts({ ...postLikeCounts, [postId]: currentCount }));
      }
    } catch (error) {
      console.error('Toggle like error:', error);
      // Revert on error
      dispatch(setLikedPosts(likedPosts));
      dispatch(setPostLikeCounts({ ...postLikeCounts, [postId]: currentCount }));
    }
  }, [likedPosts, postLikeCounts, dispatch]);

  /**
   * Check if post is liked
   */
  const isLiked = useCallback((postId: string): boolean => {
    return likedPosts.includes(postId);
  }, [likedPosts]);

  /**
   * Get like count for post
   */
  const getLikeCount = useCallback((postId: string): number => {
    return postLikeCounts[postId] || 0;
  }, [postLikeCounts]);

  /**
   * Clear checked cache (useful for refresh)
   */
  const clearCheckedCache = useCallback(() => {
    checkedPostIds.current.clear();
  }, []);

  return {
    onPostVisible,
    toggleLike,
    isLiked,
    getLikeCount,
    clearCheckedCache,
    likedPosts,
    postLikeCounts,
  };
};

