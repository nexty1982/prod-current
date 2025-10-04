/**
 * Social API Service Layer
 * Handles social media features: chat, friends, blog posts, and notifications
 */

import type { ApiResponse } from '../types/orthodox-metrics.types';
import { apiClient } from '@shared/lib/axiosInstance';

// Type definitions for social features
interface Conversation {
  id: number;
  type: 'direct' | 'group';
  name?: string;
  avatar_url?: string;
  last_activity: string;
  last_message_content?: string;
  last_message_time?: string;
  last_message_sender_id?: number;
  last_message_sender_name?: string;
  last_read_at?: string;
  unread_count: number;
  other_participant?: {
    id: number;
    first_name: string;
    last_name: string;
    display_name?: string;
    profile_image_url?: string;
    is_online: boolean;
    last_seen: string;
  };
}

interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  message_type: 'text' | 'image' | 'file';
  attachment_url?: string;
  is_edited: boolean;
  is_deleted: boolean;
  reactions?: Record<string, number>;
  created_at: string;
  updated_at: string;
}

interface Friend {
  friend_id: number;
  first_name: string;
  last_name: string;
  display_name?: string;
  profile_image_url?: string;
  is_online: boolean;
  last_seen: string;
  friends_since: string;
  bio?: string;
  location?: string;
}

interface FriendRequest {
  id: number;
  sender_id: number;
  receiver_id: number;
  first_name: string;
  last_name: string;
  display_name?: string;
  profile_image_url?: string;
  bio?: string;
  location?: string;
  sent_at: string;
  status: 'pending' | 'accepted' | 'declined';
}

interface SearchUser {
  id: number;
  first_name: string;
  last_name: string;
  display_name?: string;
  profile_image_url?: string;
  bio?: string;
  location?: string;
  friendship_status?: 'none' | 'pending' | 'accepted';
  friendship_direction?: 'sent' | 'received';
}

interface BlogPost {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  visibility: 'public' | 'private' | 'friends_only';
  status: 'draft' | 'published';
  tags: string[];
  featured_image_url?: string;
  is_pinned: boolean;
  view_count: number;
  like_count: number;
  comment_count: number;
  user_id: number;
  user_reaction?: string;
  created_at: string;
  updated_at: string;
  author: {
    id: number;
    first_name: string;
    last_name: string;
    display_name?: string;
    profile_image_url?: string;
    bio?: string;
  };
  comments?: Comment[];
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data?: Record<string, any>;
}

interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  friend_requests: boolean;
  blog_comments: boolean;
  blog_likes: boolean;
  chat_messages: boolean;
  mentions: boolean;
}

class SocialAPI {
  // ===== CHAT APIs =====
  chat = {
    // Get all conversations for the current user
    getConversations: (): Promise<{ conversations: Conversation[] }> =>
      apiClient.get('/social/chat/conversations'),

    // Get messages for a specific conversation
    getMessages: (conversationId: number): Promise<{ messages: Message[] }> =>
      apiClient.get(`/social/chat/conversations/${conversationId}/messages`),

    // Get conversation details by ID
    getConversation: (conversationId: number): Promise<{ conversation: Conversation }> =>
      apiClient.get(`/social/chat/conversations/${conversationId}`),

    // Mark conversation as read
    markAsRead: (conversationId: number): Promise<ApiResponse> =>
      apiClient.put(`/social/chat/conversations/${conversationId}/read`),

    // Send a message to a conversation
    sendMessage: (conversationId: number, data: { content: string; message_type: string }): Promise<{ message: Message }> =>
      apiClient.post(`/social/chat/conversations/${conversationId}/messages`, data),

    // Edit a message
    editMessage: (messageId: number, data: { content: string }): Promise<ApiResponse> =>
      apiClient.put(`/social/chat/messages/${messageId}`, data),

    // Delete a message
    deleteMessage: (messageId: number): Promise<ApiResponse> =>
      apiClient.delete(`/social/chat/messages/${messageId}`),

    // React to a message
    reactToMessage: (messageId: number, data: { reaction_type: string }): Promise<ApiResponse> =>
      apiClient.post(`/social/chat/messages/${messageId}/react`, data),

    // Start a conversation with a friend
    startConversation: (friendId: number): Promise<{ conversation_id: number }> =>
      apiClient.post(`/social/chat/start/${friendId}`),
  };

  // ===== FRIENDS APIs =====
  friends = {
    // Get all friends for the current user
    getAll: (): Promise<{ friends: Friend[] }> =>
      apiClient.get('/social/friends'),

    // Get friend requests
    getRequests: (): Promise<{ requests: FriendRequest[] }> =>
      apiClient.get('/social/friends/requests'),

    // Search for users
    search: (query: string): Promise<{ users: SearchUser[] }> =>
      apiClient.get(`/social/friends/search?q=${encodeURIComponent(query)}`),

    // Send a friend request
    sendRequest: (userId: number): Promise<ApiResponse> =>
      apiClient.post(`/social/friends/request/${userId}`),

    // Respond to a friend request
    respondToRequest: (requestId: number, data: { action: 'accept' | 'decline' }): Promise<ApiResponse> =>
      apiClient.put(`/social/friends/requests/${requestId}`, data),

    // Remove a friend
    remove: (friendId: number): Promise<ApiResponse> =>
      apiClient.delete(`/social/friends/${friendId}`),
  };

  // ===== BLOG APIs =====
  blog = {
    // Get blog posts with optional filters
    getPosts: (params?: Record<string, string>): Promise<{ posts: BlogPost[]; total: number }> =>
      apiClient.get(`/social/blog/posts${apiClient.buildQueryString(params)}`),

    // Get a specific blog post
    getPost: (postId: number): Promise<{ post: BlogPost }> =>
      apiClient.get(`/social/blog/posts/${postId}`),

    // Create a new blog post
    createPost: (data: Partial<BlogPost>): Promise<{ post: BlogPost }> =>
      apiClient.post('/social/blog/posts', data),

    // Update a blog post
    updatePost: (postId: number, data: Partial<BlogPost>): Promise<{ post: BlogPost }> =>
      apiClient.put(`/social/blog/posts/${postId}`, data),

    // Delete a blog post
    deletePost: (postId: number): Promise<ApiResponse> =>
      apiClient.delete(`/social/blog/posts/${postId}`),

    // Like a blog post
    likePost: (postId: number): Promise<ApiResponse> =>
      apiClient.post(`/social/blog/posts/${postId}/like`),

    // React to a blog post
    reactToPost: (postId: number, data: { reaction_type: string }): Promise<ApiResponse> =>
      apiClient.post(`/social/blog/posts/${postId}/react`, data),

    // Remove reaction from a blog post
    removeReaction: (postId: number): Promise<ApiResponse> =>
      apiClient.delete(`/social/blog/posts/${postId}/react`),

    // Add a comment to a blog post
    addComment: (postId: number, data: { content: string }): Promise<ApiResponse> =>
      apiClient.post(`/social/blog/posts/${postId}/comments`, data),
  };

  // ===== NOTIFICATIONS APIs =====
  notifications = {
    // Get notifications with optional filters
    getAll: (params?: Record<string, string>): Promise<{ notifications: Notification[] }> =>
      apiClient.get(`/social/notifications${apiClient.buildQueryString(params)}`),

    // Get notification settings
    getSettings: (): Promise<{ settings: NotificationSettings }> =>
      apiClient.get('/social/notifications/settings'),

    // Update notification settings
    updateSettings: (settings: Partial<NotificationSettings>): Promise<ApiResponse> =>
      apiClient.put('/social/notifications/settings', settings),

    // Mark a notification as read
    markAsRead: (notificationId: number): Promise<ApiResponse> =>
      apiClient.put(`/social/notifications/${notificationId}/read`),

    // Mark all notifications as read
    markAllAsRead: (): Promise<ApiResponse> =>
      apiClient.put('/social/notifications/mark-all-read'),

    // Delete a notification
    delete: (notificationId: number): Promise<ApiResponse> =>
      apiClient.delete(`/social/notifications/${notificationId}`),
  };
}

// Create and export the Social API instance
export const socialAPI = new SocialAPI();

export default socialAPI; 