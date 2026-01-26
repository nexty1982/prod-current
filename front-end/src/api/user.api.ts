/**
 * User API Service for OrthodMetrics
 * Handles user-related API calls including authentication, profile management, and user operations
 */

import { apiJson } from '@/shared/lib/apiClient';

// User types
export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  confirmPassword: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatar?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserFilters {
  search?: string;
  role?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// User API class
export class UserAPI {
  private baseUrl = '/api/users';

  /**
   * Authenticate user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return apiJson<AuthResponse>(`${this.baseUrl}/login`, {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    return apiJson<AuthResponse>(`${this.baseUrl}/register`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/logout`, {
      method: 'POST'
    });
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    return apiJson<User>(`${this.baseUrl}/me`);
  }

  /**
   * Update current user profile
   */
  async updateProfile(data: UpdateProfileData): Promise<User> {
    return apiJson<User>(`${this.baseUrl}/me`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * Change user password
   */
  async changePassword(data: ChangePasswordData): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/change-password`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Request password reset
   */
  async forgotPassword(data: ForgotPasswordData): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/forgot-password`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Reset password with token
   */
  async resetPassword(data: ResetPasswordData): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/reset-password`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Get user by ID
   */
  async getUserById(id: number): Promise<User> {
    return apiJson<User>(`${this.baseUrl}/${id}`);
  }

  /**
   * Get list of users with filters
   */
  async getUsers(filters: UserFilters = {}): Promise<UserListResponse> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.role) params.append('role', filters.role);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;
    
    return apiJson<UserListResponse>(url);
  }

  /**
   * Update user by ID (admin only)
   */
  async updateUser(id: number, data: Partial<User>): Promise<User> {
    return apiJson<User>(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * Delete user by ID (admin only)
   */
  async deleteUser(id: number): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Activate/deactivate user (admin only)
   */
  async toggleUserStatus(id: number, isActive: boolean): Promise<User> {
    return apiJson<User>(`${this.baseUrl}/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive })
    });
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(id: number): Promise<string[]> {
    return apiJson<string[]>(`${this.baseUrl}/${id}/permissions`);
  }

  /**
   * Update user permissions (admin only)
   */
  async updateUserPermissions(id: number, permissions: string[]): Promise<User> {
    return apiJson<User>(`${this.baseUrl}/${id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions })
    });
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<AuthResponse> {
    return apiJson<AuthResponse>(`${this.baseUrl}/refresh`, {
      method: 'POST'
    });
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/verify-email`, {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  }

  /**
   * Resend email verification
   */
  async resendVerificationEmail(): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/resend-verification`, {
      method: 'POST'
    });
  }
}

// Export singleton instance
export const userAPI = new UserAPI();
