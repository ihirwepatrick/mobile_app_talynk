// Type definitions for the mobile app

export interface ApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  data: T;
}

export interface LoginResponseData {
  accessToken: string;
  refreshToken: string;
  user: any;
}

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  [key: string]: any;
}

export interface Post {
  id: string;
  title?: string;
  description?: string;
  caption?: string;
  image?: string;
  imageUrl?: string;
  video_url?: string;
  videoUrl?: string;
  mediaType?: 'image' | 'video';
  fullUrl?: string;
  createdAt: string;
  updatedAt: string;
  user_id?: string;
  user_name?: string;
  authorName?: string;
  user_avatar?: string;
  authorProfilePicture?: string;
  likes?: number;
  likesCount?: number;
  comments_count?: number;
  commentsCount?: number;
  comment_count?: number;
  comments?: Comment[];
  status?: 'approved' | 'pending' | 'rejected';
  user?: {
    id: string;
    name: string;
    avatar: string;
    username?: string;
    profile_picture?: string;
  };
  category?: {
    id: number;
    name: string;
  };
  category_id?: number;
  categoryName?: string;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  avatar?: string;
  profile_picture?: string;
  bio?: string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
}

export interface Notification {
  notification_id: number;
  user_id: string;
  notification_text: string;
  notification_date: string;
  is_read: boolean;
}

export interface NotificationResponse {
  notifications: Notification[];
}

export interface RecentSearch {
  search_term: string;
  search_date: string;
}

export interface RecentSearchesResponse {
  searches: RecentSearch[];
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
} 