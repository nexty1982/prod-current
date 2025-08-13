import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthRepository } from './repo';
import { LoginRequest, LoginResponse, RefreshResponse, TokenPayload } from './types';

export class AuthService {
  private repo: AuthRepository;
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenTTL: number;
  private refreshTokenTTL: number;

  constructor() {
    this.repo = new AuthRepository();
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'change_me_access_secret';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'change_me_refresh_secret';
    this.accessTokenTTL = parseInt(process.env.ACCESS_TOKEN_TTL || '900'); // 15 minutes
    this.refreshTokenTTL = parseInt(process.env.REFRESH_TOKEN_TTL || '2592000'); // 30 days
  }

  async login(credentials: LoginRequest, ipAddress?: string, userAgent?: string): Promise<LoginResponse> {
    try {
      // Find user
      const user = await this.repo.findUserByEmail(credentials.email);
      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Check if user is locked
      if (user.is_locked) {
        return {
          success: false,
          message: 'Account is locked. Please contact support.'
        };
      }

      // Verify password
      if (!user.password_hash) {
        return {
          success: false,
          message: 'Password not set. Please reset your password.'
        };
      }

      const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Generate tokens
      const tokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        churchId: user.church_id
      };

      const accessToken = jwt.sign(tokenPayload, this.accessTokenSecret, {
        expiresIn: this.accessTokenTTL
      });

      const refreshToken = this.generateRefreshToken();
      const refreshTokenHash = this.hashToken(refreshToken);
      const expiresAt = new Date(Date.now() + this.refreshTokenTTL * 1000);

      // Save refresh token
      await this.repo.saveRefreshToken(
        user.id,
        refreshTokenHash,
        expiresAt,
        ipAddress,
        userAgent
      );

      // Update last login
      await this.repo.updateLastLogin(user.id);

      return {
        success: true,
        message: 'Login successful',
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          church_id: user.church_id
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'An error occurred during login'
      };
    }
  }

  async refresh(refreshToken: string, ipAddress?: string, userAgent?: string): Promise<RefreshResponse> {
    try {
      const tokenHash = this.hashToken(refreshToken);
      const storedToken = await this.repo.findRefreshToken(tokenHash);

      if (!storedToken) {
        return {
          success: false,
          message: 'Invalid or expired refresh token'
        };
      }

      // Get user
      const user = await this.repo.findUserById(storedToken.user_id);
      if (!user || !user.is_active) {
        return {
          success: false,
          message: 'User not found or inactive'
        };
      }

      // Revoke old token
      await this.repo.revokeRefreshToken(storedToken.id);

      // Generate new tokens
      const tokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        churchId: user.church_id
      };

      const newAccessToken = jwt.sign(tokenPayload, this.accessTokenSecret, {
        expiresIn: this.accessTokenTTL
      });

      const newRefreshToken = this.generateRefreshToken();
      const newRefreshTokenHash = this.hashToken(newRefreshToken);
      const expiresAt = new Date(Date.now() + this.refreshTokenTTL * 1000);

      // Save new refresh token
      await this.repo.saveRefreshToken(
        user.id,
        newRefreshTokenHash,
        expiresAt,
        ipAddress,
        userAgent
      );

      return {
        success: true,
        message: 'Token refreshed successfully',
        access_token: newAccessToken,
        refresh_token: newRefreshToken
      };
    } catch (error) {
      console.error('Refresh error:', error);
      return {
        success: false,
        message: 'An error occurred during token refresh'
      };
    }
  }

  async logout(userId: number): Promise<void> {
    await this.repo.revokeAllUserTokens(userId);
  }

  verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.accessTokenSecret) as TokenPayload;
    } catch (error) {
      return null;
    }
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
