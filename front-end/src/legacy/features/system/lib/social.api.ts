/**
 * Social API Service for OrthodMetrics
 * Handles social features including blog posts, comments, likes, and social interactions
 */

import { apiJson } from '@/shared/lib/apiClient';

// Social types
export interface BlogPost {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  slug: string;
  authorId: number;
  authorName: string;
  authorAvatar?: string;
  featuredImage?: string;
  tags: string[];
  category: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
}

export interface BlogPostFilters {
  search?: string;
  category?: string;
  tags?: string[];
  authorId?: number;
  status?: string;
  publishedAfter?: string;
  publishedBefore?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface BlogPostResponse {
  posts: BlogPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Comment {
  id: number;
  postId: number;
  authorId: number;
  authorName: string;
  authorAvatar?: string;
  content: string;
  parentId?: number;
  replies: Comment[];
  likeCount: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommentFilters {
  postId?: number;
  parentId?: number;
  authorId?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CommentResponse {
  comments: Comment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Like {
  id: number;
  userId: number;
  resourceType: 'post' | 'comment';
  resourceId: number;
  createdAt: string;
}

export interface Bookmark {
  id: number;
  userId: number;
  postId: number;
  createdAt: string;
}

export interface SocialUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isFollowing: boolean;
  isFollower: boolean;
}

export interface SocialUserFilters {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SocialUserResponse {
  users: SocialUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FollowRelationship {
  id: number;
  followerId: number;
  followingId: number;
  createdAt: string;
}

export interface Notification {
  id: number;
  userId: number;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'post';
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Social API class
export class SocialAPI {
  private baseUrl = '/api/social';

  // Blog Posts
  /**
   * Get blog posts with filters
   */
  async getBlogPosts(filters: BlogPostFilters = {}): Promise<BlogPostResponse> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.category) params.append('category', filters.category);
    if (filters.tags?.length) params.append('tags', filters.tags.join(','));
    if (filters.authorId) params.append('authorId', filters.authorId.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.publishedAfter) params.append('publishedAfter', filters.publishedAfter);
    if (filters.publishedBefore) params.append('publishedBefore', filters.publishedBefore);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/posts?${queryString}` : `${this.baseUrl}/posts`;
    
    return apiJson<BlogPostResponse>(url);
  }

  /**
   * Get blog post by ID or slug
   */
  async getBlogPost(idOrSlug: string | number): Promise<BlogPost> {
    return apiJson<BlogPost>(`${this.baseUrl}/posts/${idOrSlug}`);
  }

  /**
   * Create new blog post
   */
  async createBlogPost(post: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt' | 'viewCount' | 'likeCount' | 'commentCount' | 'isLiked' | 'isBookmarked'>): Promise<BlogPost> {
    return apiJson<BlogPost>(`${this.baseUrl}/posts`, {
      method: 'POST',
      body: JSON.stringify(post)
    });
  }

  /**
   * Update blog post
   */
  async updateBlogPost(id: number, post: Partial<BlogPost>): Promise<BlogPost> {
    return apiJson<BlogPost>(`${this.baseUrl}/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(post)
    });
  }

  /**
   * Delete blog post
   */
  async deleteBlogPost(id: number): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/posts/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Like/unlike blog post
   */
  async toggleLikePost(postId: number): Promise<{ isLiked: boolean; likeCount: number }> {
    return apiJson<{ isLiked: boolean; likeCount: number }>(`${this.baseUrl}/posts/${postId}/like`, {
      method: 'POST'
    });
  }

  /**
   * Bookmark/unbookmark blog post
   */
  async toggleBookmarkPost(postId: number): Promise<{ isBookmarked: boolean }> {
    return apiJson<{ isBookmarked: boolean }>(`${this.baseUrl}/posts/${postId}/bookmark`, {
      method: 'POST'
    });
  }

  // Comments
  /**
   * Get comments for a post
   */
  async getComments(filters: CommentFilters = {}): Promise<CommentResponse> {
    const params = new URLSearchParams();
    
    if (filters.postId) params.append('postId', filters.postId.toString());
    if (filters.parentId) params.append('parentId', filters.parentId.toString());
    if (filters.authorId) params.append('authorId', filters.authorId.toString());
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/comments?${queryString}` : `${this.baseUrl}/comments`;
    
    return apiJson<CommentResponse>(url);
  }

  /**
   * Create new comment
   */
  async createComment(comment: Omit<Comment, 'id' | 'replies' | 'likeCount' | 'isLiked' | 'createdAt' | 'updatedAt'>): Promise<Comment> {
    return apiJson<Comment>(`${this.baseUrl}/comments`, {
      method: 'POST',
      body: JSON.stringify(comment)
    });
  }

  /**
   * Update comment
   */
  async updateComment(id: number, content: string): Promise<Comment> {
    return apiJson<Comment>(`${this.baseUrl}/comments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content })
    });
  }

  /**
   * Delete comment
   */
  async deleteComment(id: number): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/comments/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Like/unlike comment
   */
  async toggleLikeComment(commentId: number): Promise<{ isLiked: boolean; likeCount: number }> {
    return apiJson<{ isLiked: boolean; likeCount: number }>(`${this.baseUrl}/comments/${commentId}/like`, {
      method: 'POST'
    });
  }

  // Users
  /**
   * Get social users
   */
  async getSocialUsers(filters: SocialUserFilters = {}): Promise<SocialUserResponse> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/users?${queryString}` : `${this.baseUrl}/users`;
    
    return apiJson<SocialUserResponse>(url);
  }

  /**
   * Get social user by ID
   */
  async getSocialUser(id: number): Promise<SocialUser> {
    return apiJson<SocialUser>(`${this.baseUrl}/users/${id}`);
  }

  /**
   * Follow/unfollow user
   */
  async toggleFollow(userId: number): Promise<{ isFollowing: boolean; followerCount: number }> {
    return apiJson<{ isFollowing: boolean; followerCount: number }>(`${this.baseUrl}/users/${userId}/follow`, {
      method: 'POST'
    });
  }

  /**
   * Get user's followers
   */
  async getFollowers(userId: number, page: number = 1, limit: number = 20): Promise<SocialUserResponse> {
    return apiJson<SocialUserResponse>(`${this.baseUrl}/users/${userId}/followers?page=${page}&limit=${limit}`);
  }

  /**
   * Get user's following
   */
  async getFollowing(userId: number, page: number = 1, limit: number = 20): Promise<SocialUserResponse> {
    return apiJson<SocialUserResponse>(`${this.baseUrl}/users/${userId}/following?page=${page}&limit=${limit}`);
  }

  // Notifications
  /**
   * Get user notifications
   */
  async getNotifications(page: number = 1, limit: number = 20): Promise<NotificationResponse> {
    return apiJson<NotificationResponse>(`${this.baseUrl}/notifications?page=${page}&limit=${limit}`);
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(id: number): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/notifications/${id}/read`, {
      method: 'POST'
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/notifications/read-all`, {
      method: 'POST'
    });
  }

  /**
   * Delete notification
   */
  async deleteNotification(id: number): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/notifications/${id}`, {
      method: 'DELETE'
    });
  }

  // Categories and Tags
  /**
   * Get blog categories
   */
  async getCategories(): Promise<Array<{ id: number; name: string; slug: string; postCount: number }>> {
    return apiJson(`${this.baseUrl}/categories`);
  }

  /**
   * Get popular tags
   */
  async getPopularTags(limit: number = 20): Promise<Array<{ name: string; count: number }>> {
    return apiJson(`${this.baseUrl}/tags/popular?limit=${limit}`);
  }

  /**
   * Search tags
   */
  async searchTags(query: string): Promise<Array<{ name: string; count: number }>> {
    return apiJson(`${this.baseUrl}/tags/search?q=${encodeURIComponent(query)}`);
  }
}

// Export singleton instance
export const socialAPI = new SocialAPI();
