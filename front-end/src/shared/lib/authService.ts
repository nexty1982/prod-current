/**
 * Authentication Service for OrthodMetrics
 * Updated to use direct API calls with session-based authentication
 */

import { apiJson } from './apiClient';
import {
  User,
  AuthResponse,
  LoginCredentials,
} from '@/types/orthodox-metrics.types';

// Legacy auth types for backward compatibility
import {
  RegisterData,
  ForgotPasswordData,
  ResetPasswordData,
} from '@/types/auth/auth';

const OM_LOGGED_OUT_KEY = 'om_logged_out';
const OM_LOGOUT_IN_PROGRESS_KEY = 'om_logout_in_progress';

export class AuthService {
  static isSignedOut(): boolean {
    return sessionStorage.getItem(OM_LOGGED_OUT_KEY) === '1';
  }

  /** Clear browser auth state only — no Keycloak redirect (safe for refreshAuth / 401). */
  static clearLocalAuth(): void {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('orthodoxmetrics_profile_data');
  }

  /** Clear logout flags and stale tokens before a new sign-in attempt. */
  static prepareForLogin(): void {
    sessionStorage.removeItem(OM_LOGGED_OUT_KEY);
    sessionStorage.removeItem(OM_LOGOUT_IN_PROGRESS_KEY);
    document.cookie = 'om_logged_out=; path=/; max-age=0; SameSite=Lax';
    this.clearLocalAuth();
  }

  /** Best-effort user from OM JWT (used when /auth/check is slow right after OIDC). */
  static userFromAccessToken(token: string): User | null {
    try {
      const part = token.split('.')[1];
      if (!part) return null;
      const payload = JSON.parse(
        atob(part.replace(/-/g, '+').replace(/_/g, '/')),
      ) as { userId?: number; email?: string; role?: string; churchId?: number; church_id?: number };
      if (!payload.userId || !payload.email) return null;
      return {
        id: payload.userId,
        email: payload.email,
        role: payload.role as User['role'],
        church_id: payload.churchId ?? payload.church_id,
      };
    } catch {
      return null;
    }
  }

  static persistAuthSession(accessToken: string, refreshToken?: string | null, user?: User | null): void {
    sessionStorage.removeItem(OM_LOGGED_OUT_KEY);
    sessionStorage.removeItem(OM_LOGOUT_IN_PROGRESS_KEY);
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
      fetch('/api/auth/bind-refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Refresh-Token': refreshToken,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }).catch(() => { /* non-blocking */ });
    }
    const resolved = user || this.userFromAccessToken(accessToken);
    if (resolved) {
      localStorage.setItem('auth_user', JSON.stringify(resolved));
    }
  }

  /** Redirect browser to Keycloak OIDC start (password + MFA/TOTP when enabled). */
  static startOidcLogin(next?: string): void {
    this.prepareForLogin();
    const params = new URLSearchParams(window.location.search);
    const raw = next || params.get('next') || '/portal';
    const dest = raw.startsWith('/') ? raw : '/portal';
    window.location.replace(
      `/api/auth/oidc/orthodoxmetrics/start?next=${encodeURIComponent(dest)}`,
    );
  }

  /**
   * Begin sign-in — redirects to Keycloak (credentials are collected there, including MFA).
   */
  static async login(_credentials?: LoginCredentials): Promise<AuthResponse> {
    this.startOidcLogin();
    return { success: true, pendingRedirect: true } as AuthResponse;
  }

  /**
   * Logout user
   */
  static async logout(realm: string = 'orthodoxmetrics'): Promise<void> {
    if (sessionStorage.getItem(OM_LOGOUT_IN_PROGRESS_KEY) === '1') {
      return;
    }
    sessionStorage.setItem(OM_LOGOUT_IN_PROGRESS_KEY, '1');
    sessionStorage.setItem(OM_LOGGED_OUT_KEY, '1');
    document.cookie = 'om_logged_out=1; path=/; max-age=600; SameSite=Lax';
    this.clearLocalAuth();
    try {
      await apiJson("/auth/logout", { method: "POST" });
    } catch (error) {
      console.error('Logout API error:', error);
    }
    const post = encodeURIComponent(`${window.location.origin}/login`);
    window.location.replace(
      `/api/auth/oidc/${realm}/logout?post_logout_redirect_uri=${post}`,
    );
  }

  /**
   * Request password reset
   */
  static async forgotPassword(data: ForgotPasswordData): Promise<void> {
    try {
      await apiJson("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: data.email })
      });
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
      await apiJson("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: data.token, password: data.password })
      });
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
   * Get current user from stored data
   */
  static async getCurrentUser(): Promise<User> {
    try {
      const response = await apiJson("/auth/check", { method: "GET" });

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

  /**
   * Verify authentication with backend server
   * @returns Promise<{authenticated: boolean, user?: User}>
   */
  static async checkAuth(): Promise<{ authenticated: boolean; user?: User }> {
    if (this.isSignedOut()) {
      return { authenticated: false };
    }
    if (!localStorage.getItem('access_token')) {
      return { authenticated: false };
    }
    try {
      console.log('🔍 AuthService: Checking authentication with backend');

      const response = await apiJson("/auth/check", {
        method: "GET"
      });

      const signedIn = Boolean(
        response.authenticated === true
        || (response.user && (response.ok || response.success)),
      );

      if (signedIn) {
        console.log('✅ AuthService: Authentication verified');
        const user = response.user || this.getStoredUser();
        if (user) {
          localStorage.setItem('auth_user', JSON.stringify(user));
        }
        return { authenticated: true, user: user || undefined };
      }

      console.log('❌ AuthService: Authentication check failed');
      return { authenticated: false };
    } catch (error: any) {
      console.error('💥 AuthService: Error checking authentication:', error);

      // On network error, don't clear stored data - might be temporary
      if (error.isNetworkError || !error.status) {
        return {
          authenticated: false
        };
      }

      // On 401/403, clear stored data
      if (error.status === 401 || error.status === 403) {
        localStorage.removeItem('auth_user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }

      return {
        authenticated: false
      };
    }
  }

  /** Verify session after OIDC; retries — avoids a false failure right after token handoff. */
  static async checkAuthWithRetry(maxAttempts = 2): Promise<{ authenticated: boolean; user?: User }> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const result = await this.checkAuth();
      if (result.authenticated && result.user) return result;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }
    return { authenticated: false };
  }
}

export default AuthService;
