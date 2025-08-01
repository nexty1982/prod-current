/**
 * Authentication Service for OrthodMetrics
 * Updated to use the new userAPI with session-based authentication
 */

import { userAPI } from '../api/user.api';
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
      const response = await userAPI.auth.login(credentials);

      // Backend returns { success: true, user: {...}, message: "..." }
      if (response.success && response.user) {
        // Store user data (no tokens needed for session-based auth)
        localStorage.setItem('auth_user', JSON.stringify(response.user));

        return response;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      // Convert technical errors to user-friendly messages
      let friendlyMessage = "Something went wrong. Please try again.";

      // Network/connection errors (server down, no internet, etc.)
      if (error.isNetworkError || error.code === 'NETWORK_ERROR' || !error.status) {
        friendlyMessage = "We're having trouble connecting to the server. Please try again later.";
      }
      // Unauthorized - bad credentials
      else if (error.status === 401) {
        friendlyMessage = "Incorrect email or password.";
      }
      // Server errors (502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout)
      else if (error.status && [502, 503, 504].includes(error.status)) {
        friendlyMessage = "The system is temporarily unavailable. Please try again shortly.";
      }
      // Rate limiting
      else if (error.status === 429) {
        friendlyMessage = "Too many login attempts. Please wait a moment and try again.";
      }
      // Maintenance mode
      else if (error.status === 503) {
        friendlyMessage = "The system is undergoing maintenance. Please try again later.";
      }
      // If we have a custom error message from the backend that's user-friendly, use it
      else if (error.message && !error.message.includes('status code') && !error.message.includes('Network Error')) {
        friendlyMessage = error.message;
      }

      // Log technical details for debugging while showing friendly message to user
      console.error('Login error details:', {
        status: error.status,
        code: error.code,
        isNetworkError: error.isNetworkError,
        originalMessage: error.message,
        friendlyMessage
      });

      throw new Error(friendlyMessage);
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      await userAPI.auth.logout();
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
      await userAPI.auth.forgotPassword(data.email);
    } catch (error: any) {
      // Convert technical errors to user-friendly messages
      let friendlyMessage = "Unable to send password reset email. Please try again.";

      if (error.isNetworkError || !error.status) {
        friendlyMessage = "We're having trouble connecting to the server. Please try again later.";
      } else if (error.status === 404) {
        friendlyMessage = "No account found with that email address.";
      } else if (error.status === 429) {
        friendlyMessage = "Too many password reset requests. Please wait before trying again.";
      } else if (error.status && [502, 503, 504].includes(error.status)) {
        friendlyMessage = "The system is temporarily unavailable. Please try again shortly.";
      } else if (error.message && !error.message.includes('status code')) {
        friendlyMessage = error.message;
      }

      throw new Error(friendlyMessage);
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(data: ResetPasswordData): Promise<void> {
    try {
      await userAPI.auth.resetPassword(data.token, data.password);
    } catch (error: any) {
      // Convert technical errors to user-friendly messages
      let friendlyMessage = "Unable to reset password. Please try again.";

      if (error.isNetworkError || !error.status) {
        friendlyMessage = "We're having trouble connecting to the server. Please try again later.";
      } else if (error.status === 400) {
        friendlyMessage = "Invalid or expired reset token. Please request a new password reset.";
      } else if (error.status === 422) {
        friendlyMessage = "Password does not meet security requirements.";
      } else if (error.status && [502, 503, 504].includes(error.status)) {
        friendlyMessage = "The system is temporarily unavailable. Please try again shortly.";
      } else if (error.message && !error.message.includes('status code')) {
        friendlyMessage = error.message;
      }

      throw new Error(friendlyMessage);
    }
  }

  /**
   * Check current authentication status
   */
  static async checkAuth(): Promise<{ user: User | null; authenticated: boolean }> {
    try {
      const response = await userAPI.auth.checkAuth();

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
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_user');
      return {
        user: null,
        authenticated: false
      };
    }
  }

  /**
   * Get current user from stored data
   */
  static async getCurrentUser(): Promise<User> {
    try {
      const response = await userAPI.auth.checkAuth();
      
      if (response.authenticated && response.user) {
        return response.user;
      } else {
        throw new Error('User not authenticated');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get current user');
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userData: Partial<User>): Promise<User> {
    try {
      // This would need to be implemented in the userAPI if not already present
      throw new Error('Profile update not implemented in userAPI yet');
    } catch (error: any) {
      throw new Error(error.message || 'Profile update failed');
    }
  }

  /**
   * Change user password
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      // This would need to be implemented in the userAPI if not already present
      throw new Error('Password change not implemented in userAPI yet');
    } catch (error: any) {
      throw new Error(error.message || 'Password change failed');
    }
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string): Promise<void> {
    try {
      // This would need to be implemented in the userAPI if not already present
      throw new Error('Email verification not implemented in userAPI yet');
    } catch (error: any) {
      throw new Error(error.message || 'Email verification failed');
    }
  }

  /**
   * Resend verification email
   */
  static async resendVerification(): Promise<void> {
    try {
      // This would need to be implemented in the userAPI if not already present
      throw new Error('Resend verification not implemented in userAPI yet');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to resend verification');
    }
  }

  /**
   * Get stored user data from localStorage
   */
  static getStoredUser(): User | null {
    try {
      const stored = localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated based on stored data
   */
  static isAuthenticated(): boolean {
    return this.getStoredUser() !== null;
  }
}

export default AuthService;
