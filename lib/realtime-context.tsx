import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './auth-context';
import websocketService, { PostUpdate, CommentUpdate, NotificationUpdate } from './websocket-service';

interface RealtimeContextType {
  isConnected: boolean;
  subscribeToPost: (postId: string) => void;
  unsubscribeFromPost: (postId: string) => void;
  sendLikeAction: (postId: string, isLiked: boolean) => void;
  sendCommentAction: (postId: string, commentText: string) => void;
  sendFollowAction: (targetUserId: string, isFollowing: boolean) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const subscribedPosts = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (user?.id) {
      // Connect to WebSocket when user is authenticated
      websocketService.connect(user.id, 'token'); // In real app, pass actual token
      
      const handleConnected = () => {
        setIsConnected(true);
        console.log('WebSocket connected');
      };

      const handleDisconnected = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
      };

      const handleReconnectFailed = () => {
        setIsConnected(false);
        console.log('WebSocket reconnect failed');
      };

      websocketService.on('connected', handleConnected);
      websocketService.on('disconnected', handleDisconnected);
      websocketService.on('reconnectFailed', handleReconnectFailed);

      return () => {
        websocketService.off('connected', handleConnected);
        websocketService.off('disconnected', handleDisconnected);
        websocketService.off('reconnectFailed', handleReconnectFailed);
        websocketService.disconnect();
      };
    }
  }, [user?.id]);

  const subscribeToPost = (postId: string) => {
    if (!subscribedPosts.current.has(postId)) {
      subscribedPosts.current.add(postId);
      websocketService.subscribeToPost(postId);
    }
  };

  const unsubscribeFromPost = (postId: string) => {
    if (subscribedPosts.current.has(postId)) {
      subscribedPosts.current.delete(postId);
      websocketService.unsubscribeFromPost(postId);
    }
  };

  const sendLikeAction = (postId: string, isLiked: boolean) => {
    websocketService.sendLikeAction(postId, isLiked);
  };

  const sendCommentAction = (postId: string, commentText: string) => {
    websocketService.sendCommentAction(postId, commentText);
  };

  const sendFollowAction = (targetUserId: string, isFollowing: boolean) => {
    websocketService.sendFollowAction(targetUserId, isFollowing);
  };

  const value: RealtimeContextType = {
    isConnected,
    subscribeToPost,
    unsubscribeFromPost,
    sendLikeAction,
    sendCommentAction,
    sendFollowAction,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};

export default RealtimeProvider; 