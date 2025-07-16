/**
 * Authentication Service for Orthodox Metrics
 * Updated to use the new orthodoxMetricsAPI with session-based authentication
 */

import { orthodoxMetricsAPI } from '../api/orthodox-metrics.api';
import {
  User,
  AuthResponse,
  LoginCredentials,
} from '../types/orthodox-metrics.types';

// Legacy auth types for backward compatibility
import {
  RegisterData,
  ForgotPasswordData,
  ResetPasswordData,
} from '../types/auth/auth';

export class AuthService {
  /**
   * Login user with email and password
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await orthodoxMetricsAPI.auth.login(credentials);

      // Backend returns { success: true, user: {...}, message: "..." }
      if (response.success && response.user) {
        // Store user data (no tokens needed for session-based auth)
        localStorage.setItem('auth_user', JSON.stringify(response.user));

        return response;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      const message = error.message || 'Login failed';
      throw new Error(message);
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      await orthodoxMetricsAPI.auth.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API error:', error);
    } finally {
      // Clear local storage (only user data for session-based auth)
      localStorage.removeItem('auth_user');
    }
  }

  /**
   * Request password reset
   */
  static async forgotPassword(data: ForgotPasswordData): Promise<void> {
    try {
      await orthodoxMetricsAPI.auth.forgotPassword(data.email);
    } catch (error: any) {
      throw new Error(error.message || 'Password reset request failed');
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(data: ResetPasswordData): Promise<void> {
    try {
      await orthodoxMetricsAPI.auth.resetPassword(data.token, data.password);
    } catch (error: any) {
      throw new Error(error.message || 'Password reset failed');
    }
  }

  /**
   * Check current authentication status
   */
  static async checkAuth(): Promise<{ user: User | null; authenticated: boolean }> {
    try {
      const response = await orthodoxMetricsAPI.auth.checkAuth();

      if (response.authenticated && response.user) {
        // Update stored user data
        localStorage.setItem('auth_user', JSON.stringify(response.user));
        return {
          user: response.user,
          authenticated: true
        };
      } else {
        localStorage.removeItem('auth_user');
        return {
          user: null,
          authenticated: false
        };
      }
    } catch (error: any) {
      localStorage.removeItem('auth_user');
      return {
        user: null,
        authenticated: false
      };
    }
  }

  /**
   * Get current user profile (using checkAuth for session-based auth)
   */
  static async getCurrentUser(): Promise<User> {
    try {
      const response = await orthodoxMetricsAPI.auth.checkAuth();

      if (response.authenticated && response.user) {
        // Update stored user data
        localStorage.setItem('auth_user', JSON.stringify(response.user));
        return response.user;
      } else {
        throw new Error('User not authenticated');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get user profile');
    }
  }

  /**
   * Update user profile - TODO: Implement backend endpoint
   */
  static async updateProfile(_userData: Partial<User>): Promise<User> {
    try {
      // TODO: Implement /auth/profile endpoint in backend
      throw new Error('Profile update not yet implemented');
    } catch (error: any) {
      throw new Error(error.message || 'Profile update failed');
    }
  }

  /**
   * Change password - TODO: Implement backend endpoint
   */
  static async changePassword(_currentPassword: string, _newPassword: string): Promise<void> {
    try {
      // TODO: Implement /auth/change-password endpoint in backend
      throw new Error('Password change not yet implemented');
    } catch (error: any) {
      throw new Error(error.message || 'Password change failed');
    }
  }

  /**
   * Verify email address - TODO: Implement backend endpoint
   */
  static async verifyEmail(_token: string): Promise<void> {
    try {
      // TODO: Implement /auth/verify-email endpoint in backend
      throw new Error('Email verification not yet implemented');
    } catch (error: any) {
      throw new Error(error.message || 'Email verification failed');
    }
  }

  /**
   * Resend email verification - TODO: Implement backend endpoint
   */
  static async resendVerification(): Promise<void> {
    try {
      // TODO: Implement /auth/resend-verification endpoint in backend
      throw new Error('Resend verification not yet implemented');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to resend verification email');
    }
  }

  /**
   * Get stored user from localStorage
   */
  static getStoredUser(): User | null {
    try {
      const userStr = localStorage.getItem('auth_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing stored user:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated (for session-based auth)
   */
  static isAuthenticated(): boolean {
    const user = this.getStoredUser();
    return !!user;
  }
}

export default AuthService;
