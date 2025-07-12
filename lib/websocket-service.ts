import { EventEmitter } from 'events';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export interface PostUpdate {
  postId: string;
  likes: number;
  comments: number;
  isLiked: boolean;
}

export interface CommentUpdate {
  postId: string;
  comment: {
    id: string;
    text: string;
    user: {
      id: string;
      name: string;
      username: string;
      avatar?: string;
    };
    createdAt: string;
  };
}

export interface NotificationUpdate {
  notification: {
    id: string;
    type: string;
    text: string;
    isRead: boolean;
    createdAt: string;
  };
}

class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private heartbeatInterval: any = null;
  private userId: string | null = null;

  constructor() {
    super();
  }

  connect(userId: string, token: string) {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isConnecting = true;
    this.userId = userId;

    try {
      // In a real app, you'd connect to your WebSocket server
      // For now, we'll simulate WebSocket behavior with polling
      this.simulateWebSocketConnection();
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.handleReconnect();
    }
  }

  private simulateWebSocketConnection() {
    // Simulate WebSocket connection
    this.ws = {
      readyState: WebSocket.OPEN,
      close: () => {},
      send: (data: string) => {
        // Simulate sending data
        console.log('WebSocket send:', data);
      }
    } as any;

    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.emit('connected');
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Simulate real-time updates
    this.startSimulatedUpdates();
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', data: { timestamp: Date.now() } });
      }
    }, 30000); // 30 seconds
  }

  private startSimulatedUpdates() {
    // Simulate real-time post updates
    setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Simulate like updates
        this.emit('postUpdate', {
          postId: 'simulated-post-' + Math.floor(Math.random() * 1000),
          likes: Math.floor(Math.random() * 100),
          comments: Math.floor(Math.random() * 50),
          isLiked: Math.random() > 0.5
        } as PostUpdate);

        // Simulate new comments
        if (Math.random() > 0.7) {
          this.emit('newComment', {
            postId: 'simulated-post-' + Math.floor(Math.random() * 1000),
            comment: {
              id: 'comment-' + Date.now(),
              text: 'Great post! 👍',
              user: {
                id: 'user-' + Math.floor(Math.random() * 100),
                name: 'User ' + Math.floor(Math.random() * 100),
                username: 'user' + Math.floor(Math.random() * 100),
                avatar: 'https://via.placeholder.com/32'
              },
              createdAt: new Date().toISOString()
            }
          } as CommentUpdate);
        }

        // Simulate notifications
        if (Math.random() > 0.8) {
          this.emit('newNotification', {
            notification: {
              id: 'notif-' + Date.now(),
              type: ['like', 'comment', 'follow'][Math.floor(Math.random() * 3)],
              text: 'Someone liked your post!',
              isRead: false,
              createdAt: new Date().toISOString()
            }
          } as NotificationUpdate);
        }
      }
    }, 5000); // Every 5 seconds
  }

  disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnecting = false;
    this.userId = null;
    this.emit('disconnected');
  }

  send(message: { type: string; data: any }) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const fullMessage: WebSocketMessage = {
        type: message.type,
        data: message.data,
        timestamp: Date.now()
      };
      this.ws.send(JSON.stringify(fullMessage));
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('reconnectFailed');
      return;
    }

    this.reconnectAttempts++;
    this.reconnectDelay *= 2; // Exponential backoff

    setTimeout(() => {
      if (this.userId) {
        this.connect(this.userId, 'token'); // In real app, pass actual token
      }
    }, this.reconnectDelay);
  }

  // Subscribe to specific post updates
  subscribeToPost(postId: string) {
    this.send({
      type: 'subscribe',
      data: { postId, userId: this.userId }
    });
  }

  // Unsubscribe from post updates
  unsubscribeFromPost(postId: string) {
    this.send({
      type: 'unsubscribe',
      data: { postId, userId: this.userId }
    });
  }

  // Send like/unlike action
  sendLikeAction(postId: string, isLiked: boolean) {
    this.send({
      type: 'like',
      data: { postId, userId: this.userId, isLiked }
    });
  }

  // Send comment action
  sendCommentAction(postId: string, commentText: string) {
    this.send({
      type: 'comment',
      data: { postId, userId: this.userId, text: commentText }
    });
  }

  // Send follow/unfollow action
  sendFollowAction(targetUserId: string, isFollowing: boolean) {
    this.send({
      type: 'follow',
      data: { targetUserId, userId: this.userId, isFollowing }
    });
  }
}

export const websocketService = new WebSocketService();
export default websocketService; 