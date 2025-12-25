import { useEffect, useState, useCallback } from 'react';
import { useRealtime } from '../realtime-context';
import { PostUpdate, CommentUpdate, LikeUpdate } from '../websocket-service';

interface UseRealtimePostOptions {
  postId: string;
  initialLikes?: number;
  initialComments?: number;
  initialIsLiked?: boolean;
}

export const useRealtimePost = ({
  postId,
  initialLikes = 0,
  initialComments = 0,
  initialIsLiked = false,
}: UseRealtimePostOptions) => {
  const { 
    subscribeToPost, 
    unsubscribeFromPost, 
    isConnected,
    onPostUpdate,
    onNewComment,
    onLikeUpdate,
  } = useRealtime();
  
  const [likes, setLikes] = useState(initialLikes);
  const [comments, setComments] = useState(initialComments);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [newComments, setNewComments] = useState<CommentUpdate['comment'][]>([]);
  const [hasLocalUpdate, setHasLocalUpdate] = useState(false);

  // Function to update likes locally for optimistic updates
  const updateLikesLocally = useCallback((newLikeCount: number, newIsLiked: boolean) => {
    setLikes(newLikeCount);
    setIsLiked(newIsLiked);
    setHasLocalUpdate(true);
  }, []);

  // Subscribe to post updates
  useEffect(() => {
    if (isConnected && postId) {
      subscribeToPost(postId);
      return () => {
        unsubscribeFromPost(postId);
      };
    }
  }, [postId, isConnected, subscribeToPost, unsubscribeFromPost]);

  // Handle post updates
  useEffect(() => {
    const unsubscribe = onPostUpdate((update: PostUpdate) => {
      if (update.postId === postId) {
        if (update.likes !== undefined) {
          setLikes(update.likes);
        }
        if (update.comments !== undefined) {
          setComments(update.comments);
        }
        if (update.isLiked !== undefined) {
          setIsLiked(update.isLiked);
        }
        // Reset local update flag when we get server update
        setHasLocalUpdate(false);
      }
    });
    return unsubscribe;
  }, [postId, onPostUpdate]);

  // Handle new comments
  useEffect(() => {
    const unsubscribe = onNewComment((update: CommentUpdate) => {
      if (update.postId === postId) {
        setNewComments(prev => [update.comment, ...prev]);
        setComments(prev => prev + 1);
      }
    });
    return unsubscribe;
  }, [postId, onNewComment]);

  // Handle like updates
  useEffect(() => {
    const unsubscribe = onLikeUpdate((update: LikeUpdate) => {
      if (update.postId === postId) {
        setLikes(update.likeCount);
        setIsLiked(update.isLiked);
        setHasLocalUpdate(false);
      }
    });
    return unsubscribe;
  }, [postId, onLikeUpdate]);

  // Update initial values when they change
  useEffect(() => {
    setLikes(initialLikes);
  }, [initialLikes]);

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  // Only update from initialIsLiked if we haven't made local updates
  useEffect(() => {
    if (!hasLocalUpdate) {
      setIsLiked(initialIsLiked);
    }
  }, [initialIsLiked, hasLocalUpdate]);
  
  // Reset hasLocalUpdate after a delay if server confirms our update
  useEffect(() => {
    if (hasLocalUpdate) {
      const timer = setTimeout(() => {
        if (initialIsLiked === isLiked) {
          setHasLocalUpdate(false);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [initialIsLiked, isLiked, hasLocalUpdate]);

  // Clear new comments
  const clearNewComments = useCallback(() => {
    setNewComments([]);
  }, []);

  return {
    likes,
    comments,
    isLiked,
    newComments,
    isConnected,
    updateLikesLocally,
    clearNewComments,
  };
};
