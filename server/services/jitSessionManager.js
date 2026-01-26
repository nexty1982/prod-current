/**
 * JIT Session Manager
 * Manages Just-In-Time terminal sessions for secure server access
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

class JITSessionManager {
  constructor() {
    this.sessions = new Map();
    this.config = {
      enabled: true,
      maxConcurrentSessions: 5,
      defaultTimeoutMinutes: 30,
      requirePassword: false,
      allowInProduction: false
    };
    
    // Load configuration from file if it exists
    this.loadConfig();
    
    // Clean up expired sessions periodically
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000); // Check every minute
  }

  /**
   * Get JIT Terminal configuration
   */
  async getConfig() {
    return { ...this.config };
  }

  /**
   * Update JIT Terminal configuration
   */
  async updateConfig(newConfig, user) {
    // Validate configuration
    const validation = this.validateConfig(newConfig);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    // Update configuration
    this.config = { ...this.config, ...newConfig };
    
    // Save configuration to file
    await this.saveConfig();
    
    // Log configuration change
    console.log(`[JIT Session Manager] Configuration updated by ${user.name} (${user.id})`);
    
    return this.config;
  }

  /**
   * Create a new JIT session
   */
  async createSession(sessionData) {
    const sessionId = this.generateSessionId();
    const expiresAt = new Date(Date.now() + (sessionData.timeoutMinutes * 60 * 1000));
    
    const session = {
      id: sessionId,
      userId: sessionData.userId,
      userName: sessionData.userName,
      ipAddress: sessionData.ipAddress,
      userAgent: sessionData.userAgent,
      createdAt: new Date(),
      expiresAt: expiresAt,
      lastActivity: new Date(),
      isActive: true
    };
    
    this.sessions.set(sessionId, session);
    
    console.log(`[JIT Session Manager] Session created: ${sessionId} for user ${sessionData.userName}`);
    
    return session;
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    const timeRemaining = Math.max(0, Math.floor((expiresAt - now) / (1000 * 60))); // minutes remaining
    
    return {
      id: session.id,
      userId: session.userId,
      userName: session.userName,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      lastActivity: session.lastActivity.toISOString(),
      timeRemaining: timeRemaining,
      isActive: session.isActive && now < expiresAt
    };
  }

  /**
   * Get all sessions for a user
   */
  async getSessions(userId, includeAll = false) {
    const userSessions = [];
    
    for (const [sessionId, session] of this.sessions) {
      if (includeAll || session.userId === userId) {
        const now = new Date();
        const expiresAt = new Date(session.expiresAt);
        const timeRemaining = Math.max(0, Math.floor((expiresAt - now) / (1000 * 60))); // minutes remaining
        
        userSessions.push({
          id: session.id,
          userId: session.userId,
          userName: session.userName,
          ipAddress: session.ipAddress,
          createdAt: session.createdAt.toISOString(),
          expiresAt: session.expiresAt.toISOString(),
          lastActivity: session.lastActivity.toISOString(),
          timeRemaining: timeRemaining,
          isActive: session.isActive && now < expiresAt
        });
      }
    }
    
    return userSessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Get active sessions for a user
   */
  async getActiveSessions(userId) {
    const sessions = await this.getSessions(userId);
    return sessions.filter(session => session.isActive);
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      this.sessions.set(sessionId, session);
    }
  }

  /**
   * Terminate a session
   */
  async terminateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      session.terminatedAt = new Date();
      this.sessions.set(sessionId, session);
      
      console.log(`[JIT Session Manager] Session terminated: ${sessionId}`);
    }
    
    return true;
  }

  /**
   * Get system status
   */
  async getSystemStatus() {
    const totalSessions = this.sessions.size;
    const activeSessions = Array.from(this.sessions.values()).filter(s => s.isActive && new Date() < s.expiresAt).length;
    const expiredSessions = Array.from(this.sessions.values()).filter(s => new Date() > s.expiresAt).length;
    
    return {
      enabled: this.config.enabled,
      totalSessions,
      activeSessions,
      expiredSessions,
      maxConcurrentSessions: this.config.maxConcurrentSessions,
      defaultTimeoutMinutes: this.config.defaultTimeoutMinutes,
      requirePassword: this.config.requirePassword,
      allowInProduction: this.config.allowInProduction,
      lastCleanup: new Date()
    };
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [sessionId, session] of this.sessions) {
      if (now > session.expiresAt && session.isActive) {
        session.isActive = false;
        session.terminatedAt = now;
        this.sessions.set(sessionId, session);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`[JIT Session Manager] Cleaned up ${cleanedCount} expired sessions`);
    }
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Validate configuration
   */
  validateConfig(config) {
    const errors = [];
    
    if (typeof config.enabled !== 'boolean') {
      errors.push('enabled must be a boolean');
    }
    
    if (typeof config.maxConcurrentSessions !== 'number' || config.maxConcurrentSessions < 1) {
      errors.push('maxConcurrentSessions must be a positive number');
    }
    
    if (typeof config.defaultTimeoutMinutes !== 'number' || config.defaultTimeoutMinutes < 1) {
      errors.push('defaultTimeoutMinutes must be a positive number');
    }
    
    if (typeof config.requirePassword !== 'boolean') {
      errors.push('requirePassword must be a boolean');
    }
    
    if (typeof config.allowInProduction !== 'boolean') {
      errors.push('allowInProduction must be a boolean');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Load configuration from file
   */
  async loadConfig() {
    try {
      const configPath = path.join(__dirname, '../data/jit-config.json');
      const configData = await fs.readFile(configPath, 'utf8');
      const savedConfig = JSON.parse(configData);
      
      // Merge with default config
      this.config = { ...this.config, ...savedConfig };
      
      console.log('[JIT Session Manager] Configuration loaded from file');
    } catch (error) {
      // File doesn't exist or is invalid, use default config
      console.log('[JIT Session Manager] Using default configuration');
    }
  }

  /**
   * Save configuration to file
   */
  async saveConfig() {
    try {
      const configPath = path.join(__dirname, '../data/jit-config.json');
      const configDir = path.dirname(configPath);
      
      // Ensure directory exists
      await fs.mkdir(configDir, { recursive: true });
      
      // Save configuration
      await fs.writeFile(configPath, JSON.stringify(this.config, null, 2));
      
      console.log('[JIT Session Manager] Configuration saved to file');
    } catch (error) {
      console.error('[JIT Session Manager] Failed to save configuration:', error);
    }
  }
}

module.exports = JITSessionManager; 