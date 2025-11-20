import { useEffect, useState, useCallback } from 'react';
import { useRealtime } from '../realtime-context';
import websocketService, { PostUpdate, CommentUpdate } from '../websocket-service';

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
  const { subscribeToPost, unsubscribeFromPost, isConnected } = useRealtime();
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

  useEffect(() => {
    if (isConnected && postId) {
      subscribeToPost(postId);

      const handlePostUpdate = (update: PostUpdate) => {
        if (update.postId === postId) {
          setLikes(update.likes);
          setComments(update.comments);
          setIsLiked(update.isLiked);
          // Reset local update flag when we get server update
          setHasLocalUpdate(false);
        }
      };

      const handleNewComment = (update: CommentUpdate) => {
        if (update.postId === postId) {
          setNewComments(prev => [update.comment, ...prev]);
          setComments(prev => prev + 1);
        }
      };

      websocketService.on('postUpdate', handlePostUpdate);
      websocketService.on('newComment', handleNewComment);

      return () => {
        websocketService.off('postUpdate', handlePostUpdate);
        websocketService.off('newComment', handleNewComment);
        unsubscribeFromPost(postId);
      };
    }
  }, [postId, isConnected, subscribeToPost, unsubscribeFromPost]);

  // Update initial values when they change
  useEffect(() => {
    setLikes(initialLikes);
  }, [initialLikes]);

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  // Only update from initialIsLiked if we haven't made local updates
  // This prevents resetting optimistic updates
  useEffect(() => {
    if (!hasLocalUpdate) {
      setIsLiked(initialIsLiked);
    }
  }, [initialIsLiked, hasLocalUpdate]);
  
  // Reset hasLocalUpdate when initialIsLiked changes from external source (after server response)
  // This allows syncing when the parent cache updates after API response
  useEffect(() => {
    if (hasLocalUpdate) {
      // If the external state matches our local state after a delay, reset the flag
      // This means the server has confirmed our optimistic update
      const timer = setTimeout(() => {
        if (initialIsLiked === isLiked) {
          setHasLocalUpdate(false);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [initialIsLiked, isLiked, hasLocalUpdate]);

  return {
    likes,
    comments,
    isLiked,
    newComments,
    isConnected,
    updateLikesLocally,
  };
}; 