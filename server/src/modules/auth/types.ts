export interface User {
  id: number;
  email: string;
  username?: string;
  password_hash?: string;
  first_name?: string;
  last_name?: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'user' | 'viewer';
  church_id?: number;
  phone?: string;
  preferred_language: string;
  is_active: boolean;
  is_locked: boolean;
  email_verified: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface RefreshToken {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
  revoked_at?: Date;
  ip_address?: string;
  user_agent?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  access_token?: string;
  refresh_token?: string;
  user?: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
    role: string;
    church_id?: number;
  };
}

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
  churchId?: number;
}

export interface RefreshRequest {
  refresh_token?: string;
}

export interface RefreshResponse {
  success: boolean;
  message: string;
  access_token?: string;
  refresh_token?: string;
}
