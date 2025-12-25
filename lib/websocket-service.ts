import { SimpleEventEmitter } from './simple-event-emitter';
import { API_BASE_URL } from './config';

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
    content?: string;
    user: {
      id: string;
      name: string;
      username: string;
      avatar?: string;
      profile_picture?: string;
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

export interface LikeUpdate {
  postId: string;
  userId: string;
  isLiked: boolean;
  likeCount: number;
}

class WebSocketService extends SimpleEventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3; // Reduced from 10
  private reconnectDelay = 2000;
  private isConnecting = false;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private userId: string | null = null;
  private token: string | null = null;
  private messageQueue: Array<{ type: string; data: any }> = [];
  private subscribedPosts = new Set<string>();
  private connectionEnabled = true; // Flag to disable reconnection

  constructor() {
    super();
  }

  connect(userId: string, token: string) {
    // Don't connect if disabled or already connecting
    if (!this.connectionEnabled || this.isConnecting) {
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isConnecting = true;
    this.userId = userId;
    this.token = token;

    try {
      // Try to connect to WebSocket server
      // Use /api/ws or /socket.io based on your backend
      const wsProtocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
      const wsHost = API_BASE_URL.replace(/^https?:\/\//, '');
      const fullUrl = `${wsProtocol}://${wsHost}/ws?userId=${userId}&token=${token}`;
      
      console.log('[WS] Attempting connection...');
      
      this.ws = new WebSocket(fullUrl);

      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          console.log('[WS] Connection timeout, disabling WebSocket');
          this.disableConnection();
        }
      }, 5000);

      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('[WS] Connected successfully');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 2000;
        this.emit('connected');
        
        this.startHeartbeat();
        this.processMessageQueue();
        this.resubscribeToPosts();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          // Silently ignore parse errors
        }
      };

      this.ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.log('[WS] Connection error - backend may not support WebSocket');
        this.isConnecting = false;
        // Don't spam error events
      };

      this.ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        this.isConnecting = false;
        this.stopHeartbeat();
        this.emit('disconnected');
        
        // Only attempt to reconnect if connection was previously successful
        // and we haven't exceeded max attempts
        if (this.connectionEnabled && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleReconnect();
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.log('[WS] Max reconnection attempts reached, disabling WebSocket');
          this.disableConnection();
        }
      };

    } catch (error) {
      console.log('[WS] Failed to create WebSocket connection');
      this.isConnecting = false;
      this.disableConnection();
    }
  }

  private disableConnection() {
    this.connectionEnabled = false;
    this.isConnecting = false;
    this.stopHeartbeat();
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // Ignore close errors
      }
      this.ws = null;
    }
    this.emit('disabled');
  }

  private handleMessage(message: WebSocketMessage) {
    const { type, data } = message;

    switch (type) {
      case 'pong':
        break;

      case 'like':
      case 'likeUpdate':
        this.emit('likeUpdate', data as LikeUpdate);
        this.emit('postUpdate', {
          postId: data.postId,
          likes: data.likeCount,
          isLiked: data.isLiked,
        } as PostUpdate);
        break;

      case 'comment':
      case 'newComment':
        this.emit('newComment', data as CommentUpdate);
        break;

      case 'postUpdate':
        this.emit('postUpdate', data as PostUpdate);
        break;

      case 'notification':
      case 'newNotification':
        this.emit('newNotification', data as NotificationUpdate);
        break;

      case 'follow':
      case 'followUpdate':
        this.emit('followUpdate', data);
        break;

      default:
        break;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', data: { timestamp: Date.now() } });
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  private resubscribeToPosts() {
    this.subscribedPosts.forEach(postId => {
      this.send({
        type: 'subscribe',
        data: { postId, userId: this.userId }
      });
    });
  }

  disconnect() {
    this.stopHeartbeat();
    this.connectionEnabled = false;

    if (this.ws) {
      try {
        this.ws.close(1000, 'User disconnected');
      } catch (e) {
        // Ignore
      }
      this.ws = null;
    }

    this.isConnecting = false;
    this.userId = null;
    this.token = null;
    this.messageQueue = [];
    this.subscribedPosts.clear();
    this.emit('disconnected');
  }

  send(message: { type: string; data: any }) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const fullMessage: WebSocketMessage = {
        type: message.type,
        data: message.data,
        timestamp: Date.now()
      };
      try {
        this.ws.send(JSON.stringify(fullMessage));
      } catch (e) {
        // Queue on failure
        this.messageQueue.push(message);
      }
    } else {
      // Queue message for when connection is established
      this.messageQueue.push(message);
    }
  }

  private handleReconnect() {
    if (!this.connectionEnabled) return;
    
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 10000);

    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (this.connectionEnabled && this.userId && this.token) {
        this.connect(this.userId, this.token);
      }
    }, delay);
  }

  isConnectedNow(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Enable connection (call this to re-enable after being disabled)
  enableConnection() {
    this.connectionEnabled = true;
    this.reconnectAttempts = 0;
  }

  subscribeToPost(postId: string) {
    this.subscribedPosts.add(postId);
    if (this.isConnectedNow()) {
      this.send({
        type: 'subscribe',
        data: { postId, userId: this.userId }
      });
    }
  }

  unsubscribeFromPost(postId: string) {
    this.subscribedPosts.delete(postId);
    if (this.isConnectedNow()) {
      this.send({
        type: 'unsubscribe',
        data: { postId, userId: this.userId }
      });
    }
  }

  sendLikeAction(postId: string, isLiked: boolean) {
    this.send({
      type: 'like',
      data: { postId, userId: this.userId, isLiked }
    });
  }

  sendCommentAction(postId: string, commentText: string) {
    this.send({
      type: 'comment',
      data: { postId, userId: this.userId, text: commentText }
    });
  }

  sendFollowAction(targetUserId: string, isFollowing: boolean) {
    this.send({
      type: 'follow',
      data: { targetUserId, userId: this.userId, isFollowing }
    });
  }
}

export const websocketService = new WebSocketService();
export default websocketService;
