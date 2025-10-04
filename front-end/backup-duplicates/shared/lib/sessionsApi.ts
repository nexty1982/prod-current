// Sessions API Service for Device Management
// Handles user session management and device tracking

import { ApiResponse } from '@/types/orthodox-metrics.types';

export interface UserSession {
  id: string;
  ip_address: string;
  user_agent: string;
  device_label: string;
  browser?: string;
  os?: string;
  created_at: string;
  last_activity: string;
  expires_at?: string;
  is_current: boolean;
}

export interface SessionStats {
  total_sessions: number;
  active_today: number;
  active_week: number;
  first_session?: string;
  last_activity?: string;
  locations: Array<{
    ip_address: string;
    session_count: number;
  }>;
  device_types: Record<string, number>;
}

export interface SessionsResponse extends ApiResponse {
  data?: UserSession[];
}

export interface SessionStatsResponse extends ApiResponse {
  data?: SessionStats;
}

export interface RevokeSessionResponse extends ApiResponse {
  is_current_session?: boolean;
}

export interface RevokeAllSessionsResponse extends ApiResponse {
  sessions_revoked?: number;
}

export interface UpdateSessionRequest {
  device_label: string;
}

class SessionsApiService {
  private baseUrl = '/api/sessions';

  /**
   * Get current user's active sessions
   */
  async listMySessions(): Promise<SessionsResponse> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch sessions');
    }

    return result;
  }

  /**
   * Revoke specific session
   */
  async revokeSession(sessionId: string): Promise<RevokeSessionResponse> {
    const response = await fetch(`${this.baseUrl}/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to revoke session');
    }

    return result;
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllSessions(): Promise<RevokeAllSessionsResponse> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to revoke all sessions');
    }

    return result;
  }

  /**
   * Update session device label
   */
  async updateSession(sessionId: string, data: UpdateSessionRequest): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/${sessionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to update session');
    }

    return result;
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<SessionStatsResponse> {
    const response = await fetch(`${this.baseUrl}/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch session stats');
    }

    return result;
  }
}

export const sessionsApi = new SessionsApiService();
