// Site Editor Manager Service
// Manages component file operations, backup, syntax validation, and audit logging

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class SiteEditorManager {
  constructor() {
    this.config = this.loadDefaultConfig();
    this.auditLogs = [];
    this.backupDir = process.env.SITE_EDITOR_BACKUP_DIR || '/var/log/orthodoxmetrics/backups';
    this.componentsDir = process.env.COMPONENTS_DIR || path.join(process.cwd(), 'front-end/src/components');
    this.ensureDirectories();
  }

  loadDefaultConfig() {
    return {
      enabled: process.env.SITE_EDITOR_ENABLED !== 'false',
      allowInProduction: process.env.SITE_EDITOR_ALLOW_PRODUCTION === 'true',
      lockdownMode: process.env.SITE_EDITOR_LOCKDOWN === 'true',
      autoBackup: process.env.SITE_EDITOR_AUTO_BACKUP !== 'false',
      maxBackups: parseInt(process.env.SITE_EDITOR_MAX_BACKUPS) || 50,
      backupDir: process.env.SITE_EDITOR_BACKUP_DIR || '/var/log/orthodoxmetrics/backups',
      allowedExtensions: ['.tsx', '.ts', '.jsx', '.js'],
      maxFileSize: 1024 * 1024, // 1MB
      gitOpsEnabled: process.env.GITOPS_ENABLED === 'true'
    };
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      await fs.mkdir(path.join(this.backupDir, 'components'), { recursive: true });
    } catch (error) {
      console.error('[Site Editor] Failed to create directories:', error);
    }
  }

  /**
   * Get mapping of component names to file paths
   */
  async getComponentsMap() {
    try {
      const map = {};
      
      // Scan components directory
      await this.scanDirectory(this.componentsDir, '', map);
      
      return map;
    } catch (error) {
      console.error('[Site Editor] Failed to generate components map:', error);
      return {};
    }
  }

  async scanDirectory(dir, relativePath, map) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativeFilePath = path.join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, relativeFilePath, map);
        } else if (this.isValidComponentFile(entry.name)) {
          const componentName = path.basename(entry.name, path.extname(entry.name));
          map[entry.name] = path.posix.join('/src/components', relativeFilePath);
        }
      }
    } catch (error) {
      console.error('[Site Editor] Failed to scan directory:', dir, error);
    }
  }

  isValidComponentFile(filename) {
    const ext = path.extname(filename);
    return this.config.allowedExtensions.includes(ext) && 
           /^[A-Z][a-zA-Z0-9]*\.(tsx|ts|jsx|js)$/.test(filename);
  }

  /**
   * Validate file path for security
   */
  validatePath(filePath) {
    try {
      // Normalize path
      const normalizedPath = path.normalize(filePath);
      
      // Check for directory traversal
      if (normalizedPath.includes('..') || normalizedPath.startsWith('/')) {
        return { valid: false, error: 'Invalid path: directory traversal not allowed' };
      }
      
      // Check file extension
      const ext = path.extname(normalizedPath);
      if (!this.config.allowedExtensions.includes(ext)) {
        return { valid: false, error: `Invalid file extension: ${ext}` };
      }
      
      // Check if path is within components directory
      if (!normalizedPath.startsWith('src/components/') && !normalizedPath.startsWith('/src/components/')) {
        return { valid: false, error: 'Path must be within src/components directory' };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Path validation failed' };
    }
  }

  /**
   * Get component source code
   */
  async getComponentSource(componentPath) {
    const validation = this.validatePath(componentPath);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Convert to absolute path
    const absolutePath = this.getAbsolutePath(componentPath);
    
    try {
      const source = await fs.readFile(absolutePath, 'utf8');
      
      // Check file size
      if (source.length > this.config.maxFileSize) {
        throw new Error(`File too large: ${source.length} bytes (max: ${this.config.maxFileSize})`);
      }
      
      return source;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw error; // Let the caller handle file not found
      }
      throw new Error(`Failed to read component source: ${error.message}`);
    }
  }

  /**
   * Save component with automatic backup
   */
  async saveComponent({ path: componentPath, contents, user, gitOpsEnabled = false }) {
    const validation = this.validatePath(componentPath);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    if (!this.config.enabled) {
      throw new Error('Site Editor is disabled');
    }

    if (this.config.lockdownMode) {
      throw new Error('Site Editor is in lockdown mode');
    }

    // Check file size
    if (contents.length > this.config.maxFileSize) {
      throw new Error(`File too large: ${contents.length} bytes (max: ${this.config.maxFileSize})`);
    }

    const absolutePath = this.getAbsolutePath(componentPath);
    let backupToken = null;

    try {
      // Create backup if file exists
      if (this.config.autoBackup) {
        try {
          const existingContent = await fs.readFile(absolutePath, 'utf8');
          backupToken = await this.createBackup(componentPath, existingContent, user);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            console.warn('[Site Editor] Failed to create backup:', error);
          }
        }
      }

      // Ensure directory exists
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });

      // Write the new content
      await fs.writeFile(absolutePath, contents, 'utf8');

      // Log the save action
      await this.logAction(user, 'COMPONENT_SAVED', {
        path: componentPath,
        size: contents.length,
        backupToken,
        gitOpsEnabled
      });

      console.log(`[Site Editor] Component saved: ${componentPath} by ${user.name}`);

      return {
        success: true,
        message: 'Component saved successfully',
        backupToken,
        path: componentPath,
        size: contents.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      await this.logAction(user, 'COMPONENT_SAVE_FAILED', {
        path: componentPath,
        error: error.message
      }, false, error.message);

      throw error;
    }
  }

  /**
   * Create backup of existing file
   */
  async createBackup(componentPath, contents, user) {
    try {
      const backupToken = this.generateBackupToken();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const componentName = path.basename(componentPath, path.extname(componentPath));
      
      const backupFilename = `${componentName}-${timestamp}-${backupToken}.backup`;
      const backupPath = path.join(this.backupDir, 'components', backupFilename);

      // Create backup metadata
      const metadata = {
        token: backupToken,
        originalPath: componentPath,
        timestamp: new Date().toISOString(),
        user: {
          id: user.id,
          name: user.name
        },
        size: contents.length,
        checksum: crypto.createHash('sha256').update(contents).digest('hex')
      };

      // Write backup file
      await fs.writeFile(backupPath, contents, 'utf8');
      
      // Write metadata
      const metadataPath = backupPath + '.meta';
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

      // Cleanup old backups
      await this.cleanupOldBackups(componentPath);

      console.log(`[Site Editor] Backup created: ${backupToken} for ${componentPath}`);
      
      return backupToken;
    } catch (error) {
      console.error('[Site Editor] Failed to create backup:', error);
      throw new Error(`Backup creation failed: ${error.message}`);
    }
  }

  /**
   * Rollback component to a previous version
   */
  async rollbackComponent({ backupToken, user }) {
    try {
      // Find backup file
      const backupInfo = await this.findBackupByToken(backupToken);
      if (!backupInfo) {
        throw new Error('Backup not found');
      }

      // Read backup content
      const backupContent = await fs.readFile(backupInfo.filePath, 'utf8');
      
      // Validate backup integrity
      const checksum = crypto.createHash('sha256').update(backupContent).digest('hex');
      if (checksum !== backupInfo.metadata.checksum) {
        throw new Error('Backup file corrupted');
      }

      // Create a backup of current state before rollback
      const currentPath = this.getAbsolutePath(backupInfo.metadata.originalPath);
      let currentBackupToken = null;
      
      try {
        const currentContent = await fs.readFile(currentPath, 'utf8');
        currentBackupToken = await this.createBackup(
          backupInfo.metadata.originalPath, 
          currentContent, 
          user
        );
      } catch (error) {
        console.warn('[Site Editor] Failed to backup current state before rollback:', error);
      }

      // Restore the backup
      await fs.writeFile(currentPath, backupContent, 'utf8');

      // Log rollback action
      await this.logAction(user, 'COMPONENT_ROLLBACK', {
        backupToken,
        path: backupInfo.metadata.originalPath,
        currentBackupToken,
        rollbackTimestamp: backupInfo.metadata.timestamp
      });

      console.log(`[Site Editor] Component rolled back: ${backupInfo.metadata.originalPath} to ${backupInfo.metadata.timestamp}`);

      return {
        success: true,
        message: 'Component rolled back successfully',
        path: backupInfo.metadata.originalPath,
        rollbackTo: backupInfo.metadata.timestamp,
        currentBackupToken
      };

    } catch (error) {
      await this.logAction(user, 'COMPONENT_ROLLBACK_FAILED', {
        backupToken,
        error: error.message
      }, false, error.message);

      throw error;
    }
  }

  /**
   * Get backups for a component
   */
  async getBackups(componentName) {
    try {
      const backupsDir = path.join(this.backupDir, 'components');
      const files = await fs.readdir(backupsDir);
      
      const backups = [];
      
      for (const file of files) {
        if (file.startsWith(componentName) && file.endsWith('.backup.meta')) {
          try {
            const metadataPath = path.join(backupsDir, file);
            const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
            
            const backupPath = metadataPath.replace('.meta', '');
            const stats = await fs.stat(backupPath);
            
            backups.push({
              token: metadata.token,
              timestamp: metadata.timestamp,
              path: metadata.originalPath,
              size: stats.size,
              user: metadata.user,
              checksum: metadata.checksum
            });
          } catch (error) {
            console.warn('[Site Editor] Failed to read backup metadata:', file, error);
          }
        }
      }
      
      return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('[Site Editor] Failed to get backups:', error);
      return [];
    }
  }

  /**
   * Get backup content
   */
  async getBackupContent(backupToken) {
    const backupInfo = await this.findBackupByToken(backupToken);
    if (!backupInfo) {
      throw new Error('Backup not found');
    }

    return await fs.readFile(backupInfo.filePath, 'utf8');
  }

  /**
   * Validate TypeScript/JavaScript syntax
   */
  async validateSyntax(contents, filePath = 'temp.tsx') {
    try {
      // Create temporary file for validation
      const tempFile = path.join(this.backupDir, `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.tsx`);
      
      await fs.writeFile(tempFile, contents, 'utf8');
      
      try {
        // Use TypeScript compiler to check syntax
        const command = `npx tsc --noEmit --jsx react-jsx --target esnext --module esnext --allowSyntheticDefaultImports --esModuleInterop "${tempFile}"`;
        execSync(command, { stdio: 'pipe' });
        
        return {
          valid: true,
          errors: []
        };
      } catch (error) {
        // Parse TypeScript errors
        const output = error.stdout ? error.stdout.toString() : error.stderr.toString();
        const errors = this.parseTypeScriptErrors(output);
        
        return {
          valid: false,
          errors
        };
      } finally {
        // Cleanup temp file
        try {
          await fs.unlink(tempFile);
        } catch (error) {
          console.warn('[Site Editor] Failed to cleanup temp file:', tempFile);
        }
      }
    } catch (error) {
      console.error('[Site Editor] Syntax validation failed:', error);
      return {
        valid: false,
        errors: [{ message: 'Validation failed: ' + error.message, line: 1, column: 1 }]
      };
    }
  }

  parseTypeScriptErrors(output) {
    const errors = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^(.+)\((\d+),(\d+)\): error TS\d+: (.+)$/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          message: match[4]
        });
      }
    }
    
    return errors;
  }

  /**
   * Log Site Editor actions
   */
  async logAction(user, action, details = {}, success = true, errorMessage = null) {
    const logEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.name,
      action,
      details: {
        ...details,
        userAgent: 'Site Editor',
        sessionId: this.getSessionId()
      },
      success,
      errorMessage
    };

    this.auditLogs.push(logEntry);

    // Keep only recent logs in memory
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-1000);
    }

    // Write to audit log file
    try {
      const auditLogFile = path.join(this.backupDir, 'site-editor.log');
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(auditLogFile, logLine);
    } catch (error) {
      console.error('[Site Editor] Failed to write audit log:', error);
    }
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filters = {}) {
    let logs = [...this.auditLogs];

    if (filters.userId) {
      logs = logs.filter(log => log.userId === filters.userId);
    }

    if (filters.action) {
      logs = logs.filter(log => log.action === filters.action);
    }

    if (filters.component) {
      logs = logs.filter(log => 
        log.details.path && log.details.path.includes(filters.component)
      );
    }

    if (filters.startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= filters.startDate);
    }

    if (filters.endDate) {
      logs = logs.filter(log => new Date(log.timestamp) <= filters.endDate);
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get configuration
   */
  async getConfig() {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig, user) {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // Update backup directory if changed
    if (newConfig.backupDir && newConfig.backupDir !== oldConfig.backupDir) {
      this.backupDir = newConfig.backupDir;
      await this.ensureDirectories();
    }

    // Log configuration change
    await this.logAction(user, 'CONFIG_UPDATED', {
      oldConfig,
      newConfig,
      changedFields: Object.keys(newConfig)
    });

    console.log(`[Site Editor] Configuration updated by ${user.name}`);
  }

  // Helper methods

  getAbsolutePath(componentPath) {
    // Remove leading slash if present
    const cleanPath = componentPath.startsWith('/') ? componentPath.substring(1) : componentPath;
    
    // Remove src/components prefix if present
    const relativePath = cleanPath.startsWith('src/components/') ? 
      cleanPath.substring('src/components/'.length) : cleanPath;
    
    return path.join(this.componentsDir, relativePath);
  }

  generateBackupToken() {
    return crypto.randomBytes(16).toString('hex');
  }

  async findBackupByToken(token) {
    try {
      const backupsDir = path.join(this.backupDir, 'components');
      const files = await fs.readdir(backupsDir);
      
      for (const file of files) {
        if (file.includes(token) && file.endsWith('.backup.meta')) {
          const metadataPath = path.join(backupsDir, file);
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
          
          if (metadata.token === token) {
            return {
              filePath: metadataPath.replace('.meta', ''),
              metadataPath,
              metadata
            };
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('[Site Editor] Failed to find backup:', error);
      return null;
    }
  }

  async cleanupOldBackups(componentPath) {
    try {
      const componentName = path.basename(componentPath, path.extname(componentPath));
      const backups = await this.getBackups(componentName);
      
      if (backups.length > this.config.maxBackups) {
        const toDelete = backups.slice(this.config.maxBackups);
        
        for (const backup of toDelete) {
          await this.deleteBackup(backup.token);
        }
        
        console.log(`[Site Editor] Cleaned up ${toDelete.length} old backups for ${componentName}`);
      }
    } catch (error) {
      console.error('[Site Editor] Failed to cleanup old backups:', error);
    }
  }

  async deleteBackup(token) {
    const backupInfo = await this.findBackupByToken(token);
    if (backupInfo) {
      try {
        await fs.unlink(backupInfo.filePath);
        await fs.unlink(backupInfo.metadataPath);
      } catch (error) {
        console.error('[Site Editor] Failed to delete backup:', token, error);
      }
    }
  }

  getSessionId() {
    return 'site-editor-' + Date.now();
  }
}

module.exports = SiteEditorManager; 