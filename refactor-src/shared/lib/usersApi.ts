// Users API Service for Admin User Management
// Handles admin operations for user management, role assignments, etc.

import { ApiResponse } from '@/types/orthodox-metrics.types';

export interface AdminUser {
  id: number;
  email: string;
  username?: string;
  is_active: boolean;
  is_locked: boolean;
  email_verified: boolean;
  last_login?: string;
  created_at: string;
  display_name?: string;
  profile_image_url?: string;
  roles: string[];
  churches: string[];
}

export interface UserDetails extends AdminUser {
  bio?: string;
  location?: string;
  website?: string;
  birthday?: string;
  cover_image_url?: string;
  privacy_settings?: Record<string, any>;
  social_links?: Record<string, any>;
}

export interface UserRole {
  role_id: number;
  role_name: string;
  church_id?: number;
  church_name?: string;
  assigned_by?: number;
  assigned_at: string;
}

export interface UserSession {
  id: string;
  ip_address: string;
  user_agent: string;
  device_label: string;
  created_at: string;
  last_activity: string;
  expires_at?: string;
}

export interface ListUsersParams {
  q?: string;           // Search query
  active?: boolean;     // Filter by active status
  roleId?: number;      // Filter by role ID
  churchId?: number;    // Filter by church ID
  page?: number;        // Page number
  limit?: number;       // Items per page
}

export interface ListUsersResponse extends ApiResponse {
  data?: {
    items: AdminUser[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UserDetailsResponse extends ApiResponse {
  data?: {
    user: UserDetails;
    roles: UserRole[];
  };
}

export interface CreateUserRequest {
  email: string;
  username?: string;
  tempPassword?: string;
  display_name?: string;
  send_invite?: boolean;
}

export interface UpdateUserRequest {
  is_active?: boolean;
  is_locked?: boolean;
  email_verified?: boolean;
  username?: string;
  email?: string;
}

export interface AssignRoleRequest {
  churchId?: number;
  roleId: number;
}

export interface UserRolesResponse extends ApiResponse {
  data?: UserRole[];
}

export interface UserSessionsResponse extends ApiResponse {
  data?: UserSession[];
}

class UsersApiService {
  private baseUrl = '/api/users';

  /**
   * List users with filtering and pagination
   */
  async listUsers(params: ListUsersParams = {}): Promise<ListUsersResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.q) searchParams.append('q', params.q);
    if (params.active !== undefined) searchParams.append('active', params.active.toString());
    if (params.roleId) searchParams.append('roleId', params.roleId.toString());
    if (params.churchId) searchParams.append('churchId', params.churchId.toString());
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());

    const response = await fetch(`${this.baseUrl}?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch users');
    }

    return result;
  }

  /**
   * Get specific user details
   */
  async getUser(id: number): Promise<UserDetailsResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch user');
    }

    return result;
  }

  /**
   * Create new user (admin invite/create)
   */
  async createUser(data: CreateUserRequest): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to create user');
    }

    return result;
  }

  /**
   * Update user
   */
  async updateUser(id: number, data: UpdateUserRequest): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to update user');
    }

    return result;
  }

  /**
   * Lock user account
   */
  async lockUser(id: number): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/${id}/lock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to lock user');
    }

    return result;
  }

  /**
   * Unlock user account
   */
  async unlockUser(id: number): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/${id}/unlock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to unlock user');
    }

    return result;
  }

  /**
   * Get user sessions (admin)
   */
  async getUserSessions(id: number): Promise<UserSessionsResponse> {
    const response = await fetch(`${this.baseUrl}/${id}/sessions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch user sessions');
    }

    return result;
  }

  /**
   * Get user roles
   */
  async getUserRoles(id: number, churchId?: number): Promise<UserRolesResponse> {
    const searchParams = new URLSearchParams();
    if (churchId) searchParams.append('churchId', churchId.toString());

    const response = await fetch(`${this.baseUrl}/${id}/roles?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch user roles');
    }

    return result;
  }

  /**
   * Assign role to user
   */
  async assignRole(id: number, data: AssignRoleRequest): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/${id}/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to assign role');
    }

    return result;
  }

  /**
   * Remove role from user
   */
  async removeRole(id: number, data: AssignRoleRequest): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/${id}/roles`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to remove role');
    }

    return result;
  }
}

export const usersApi = new UsersApiService();
