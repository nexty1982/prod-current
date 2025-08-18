import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../../config/db';
import { User, RefreshToken } from './types';

export class AuthRepository {
  async findUserByEmail(email: string): Promise<User | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [email]
    );
    return rows[0] as User || null;
  }

  async findUserById(id: number): Promise<User | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ? AND is_active = 1',
      [id]
    );
    return rows[0] as User || null;
  }

  async updateLastLogin(userId: number): Promise<void> {
    await pool.execute(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [userId]
    );
  }

  async saveRefreshToken(
    userId: number,
    tokenHash: string,
    expiresAt: Date,
    ipAddress?: string,
    userAgent?: string
  ): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO refresh_tokens 
       (user_id, token_hash, expires_at, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, tokenHash, expiresAt, ipAddress, userAgent]
    );
    return result.insertId;
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM refresh_tokens 
       WHERE token_hash = ? 
       AND expires_at > NOW() 
       AND revoked_at IS NULL`,
      [tokenHash]
    );
    return rows[0] as RefreshToken || null;
  }

  async revokeRefreshToken(tokenId: number): Promise<void> {
    await pool.execute(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?',
      [tokenId]
    );
  }

  async revokeAllUserTokens(userId: number): Promise<void> {
    await pool.execute(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
      [userId]
    );
  }

  async cleanupExpiredTokens(): Promise<void> {
    await pool.execute(
      'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked_at IS NOT NULL'
    );
  }
}
