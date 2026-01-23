/**
 * Token Utilities for Interactive Reports
 * Generates and hashes secure tokens for recipient links
 */

import crypto from 'crypto';

const TOKEN_LENGTH = 32;

/**
 * Generate a random secure token
 */
export function generateToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * Hash a token for storage
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a token matches a hash
 */
export function verifyToken(token: string, hash: string): boolean {
  return hashToken(token) === hash;
}
