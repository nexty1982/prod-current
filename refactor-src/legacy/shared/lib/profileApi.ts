// Profile API Service for User Profile Management
// Handles user profile data, preferences, avatar uploads, etc.

import { ApiResponse } from '@/types/orthodox-metrics.types';

export interface UserProfile {
  user_id: number;
  display_name?: string;
  bio?: string;
  location?: string;
  website?: string;
  birthday?: string;
  profile_image_url?: string;
  cover_image_url?: string;
  privacy_settings?: {
    showEmail?: boolean;
    showBirthday?: boolean;
    showLocation?: boolean;
  };
  social_links?: {
    x?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface UserRole {
  role_id: number;
  role: string;
  church_id?: number;
  church_name?: string;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  sms_enabled: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  timezone: string;
  ignore_browser_tracking: boolean;
  preferences?: Record<string, any>;
}

export interface ProfileMeResponse extends ApiResponse {
  data?: {
    user: {
      id: number;
      email: string;
      username?: string;
      is_active: boolean;
      email_verified: boolean;
      created_at: string;
      last_login?: string;
    };
    profile: UserProfile;
    roles: UserRole[];
    permissions: string[];
    preferences: NotificationPreferences;
  };
}

export interface UpdateProfileRequest {
  display_name?: string;
  bio?: string;
  location?: string;
  website?: string;
  birthday?: string;
  privacy_settings?: {
    showEmail?: boolean;
    showBirthday?: boolean;
    showLocation?: boolean;
  };
  social_links?: {
    x?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
}

export interface UploadResponse extends ApiResponse {
  url?: string;
}

export interface PreferencesResponse extends ApiResponse {
  data?: NotificationPreferences;
}

class ProfileApiService {
  private baseUrl = '/api/profile';

  /**
   * Get current user's complete profile
   */
  async getMe(): Promise<ProfileMeResponse> {
    const response = await fetch(`${this.baseUrl}/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch profile');
    }

    return result;
  }

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateProfileRequest): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to update profile');
    }

    return result;
  }

  /**
   * Upload profile avatar
   */
  async uploadAvatar(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${this.baseUrl}/avatar`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to upload avatar');
    }

    return result;
  }

  /**
   * Upload profile banner/cover image
   */
  async uploadBanner(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('banner', file);

    const response = await fetch(`${this.baseUrl}/banner`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to upload banner');
    }

    return result;
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<PreferencesResponse> {
    const response = await fetch(`${this.baseUrl}/preferences`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch preferences');
    }

    return result;
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(data: Partial<NotificationPreferences>): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to update preferences');
    }

    return result;
  }
}

export const profileApi = new ProfileApiService();
