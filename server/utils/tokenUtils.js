/**
 * Token Utilities for Interactive Reports
 * Generates and hashes secure tokens for recipient links
 */

const crypto = require('crypto');

const TOKEN_LENGTH = 32;

/**
 * Generate a random secure token
 */
function generateToken() {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * Hash a token for storage
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a token matches a hash
 */
function verifyToken(token, hash) {
  return hashToken(token) === hash;
}

module.exports = {
  generateToken,
  hashToken,
  verifyToken,
};
