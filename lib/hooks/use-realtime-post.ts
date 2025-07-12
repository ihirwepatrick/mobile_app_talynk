import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (isConnected && postId) {
      subscribeToPost(postId);

      const handlePostUpdate = (update: PostUpdate) => {
        if (update.postId === postId) {
          setLikes(update.likes);
          setComments(update.comments);
          setIsLiked(update.isLiked);
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

  useEffect(() => {
    setIsLiked(initialIsLiked);
  }, [initialIsLiked]);

  return {
    likes,
    comments,
    isLiked,
    newComments,
    isConnected,
  };
}; 