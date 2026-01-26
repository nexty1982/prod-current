// Auth API Service for User Profiles System
// Handles authentication operations: register, login, logout, password reset, MFA

import { ApiResponse, User } from '@/types/orthodox-metrics.types';

export interface RegisterRequest {
  email: string;
  username?: string;
  password: string;
  display_name?: string;
}

export interface LoginRequest {
  emailOrUsername: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface AuthResponse extends ApiResponse {
  user?: User;
}

export interface MFASetupResponse extends ApiResponse {
  qr?: string;
  secret?: string;
}

class AuthApiService {
  private baseUrl = '/api/auth';

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Registration failed');
    }

    return result;
  }

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Login failed');
    }

    return result;
  }

  /**
   * Logout user
   */
  async logout(): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Logout failed');
    }

    return result;
  }

  /**
   * Request password reset
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/forgot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Password reset request failed');
    }

    return result;
  }

  /**
   * Reset password with token
   */
  async resetPassword(data: ResetPasswordRequest): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Password reset failed');
    }

    return result;
  }

  /**
   * Change password while logged in
   */
  async changePassword(data: ChangePasswordRequest): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Password change failed');
    }

    return result;
  }

  /**
   * Verify email address
   */
  async verifyEmail(data: VerifyEmailRequest): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Email verification failed');
    }

    return result;
  }

  /**
   * Setup MFA (Multi-Factor Authentication)
   */
  async setupMFA(): Promise<MFASetupResponse> {
    const response = await fetch(`${this.baseUrl}/mfa/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'MFA setup failed');
    }

    return result;
  }

  /**
   * Verify MFA setup
   */
  async verifyMFA(code: string): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/mfa/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ code }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'MFA verification failed');
    }

    return result;
  }

  /**
   * Disable MFA
   */
  async disableMFA(): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/mfa`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'MFA disable failed');
    }

    return result;
  }
}

export const authApi = new AuthApiService();
