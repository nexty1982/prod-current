/**
 * User API Service Layer
 * Handles authentication, session management, and user-related endpoints
 */

import type {
  User,
  AuthResponse,
  LoginCredentials,
  ApiResponse,
} from '../types/orthodox-metrics.types';
import { apiClient } from './utils/axiosInstance';

class UserAPI {
  // ===== AUTHENTICATION APIs =====
  auth = {
    login: (credentials: LoginCredentials): Promise<AuthResponse> =>
      apiClient.post('/auth/login', credentials),

    logout: (): Promise<ApiResponse> =>
      apiClient.post('/auth/logout'),

    checkAuth: (): Promise<{ user: User | null; authenticated: boolean }> =>
      apiClient.get('/auth/check'),

    forgotPassword: (email: string): Promise<ApiResponse> =>
      apiClient.post('/auth/forgot-password', { email }),

    resetPassword: (token: string, password: string): Promise<ApiResponse> =>
      apiClient.post('/auth/reset-password', { token, password }),
  };

  // ===== SESSION MANAGEMENT APIs =====
  sessions = {
    getCurrentSession: (): Promise<any> =>
      apiClient.get('/sessions/current'),

    getAllSessions: (): Promise<any[]> =>
      apiClient.get('/sessions'),

    revokeSession: (sessionId: string): Promise<ApiResponse> =>
      apiClient.delete(`/sessions/${sessionId}`),

    revokeAllSessions: (): Promise<ApiResponse> =>
      apiClient.delete('/sessions'),
  };

  // ===== USER PROFILE APIs =====
  profile = {
    getCurrentUser: (): Promise<User> =>
      apiClient.get('/user/church'),

    updateProfile: (userData: Partial<User>): Promise<User> =>
      apiClient.put('/user/profile', userData),

    changePassword: (currentPassword: string, newPassword: string): Promise<ApiResponse> =>
      apiClient.put('/user/change-password', { currentPassword, newPassword }),

    uploadAvatar: (file: File): Promise<ApiResponse> =>
      apiClient.uploadFile('/user/profile/avatar', file),

    getLanguages: (): Promise<any[]> =>
      apiClient.get('/languages'),
  };

  // ===== MENU PERMISSIONS APIs =====
  menuPermissions = {
    getUserPermissions: (): Promise<any> =>
      apiClient.get('/admin/menu-permissions/user-permissions'),
  };
}

// Create and export the User API instance
export const userAPI = new UserAPI();

export default userAPI; 