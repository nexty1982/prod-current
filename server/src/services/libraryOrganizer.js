/**
 * Library Organizer Service
 * 
 * Safely organizes loose files in prod root by moving them to structured archive areas.
 * Features:
 * - Dry-run mode (plan moves without executing)
 * - Safe file type allowlist
 * - Collision avoidance with -N suffix
 * - Manifest logging for all moves
 * - Never deletes files, only moves
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  // Allowlisted roots (hardcoded for security)
  allowedRoots: [
    '/var/www/orthodoxmetrics/prod',
    '/var/www/orthodoxmetrics/prod/docs',
  ],
  
  // Cleanup modes with different file type focus
  cleanupModes: {
    // Documentation cleanup (for OM-Library page)
    documentation: {
      extensions: ['.md', '.txt', '.docx', '.xlsx', '.pdf'],
      description: 'Documentation and reference files'
    },
    // Artifacts cleanup (for future page)
    artifacts: {
      extensions: ['.zip', '.sql', '.log', '.csv', '.json', '.yaml', '.yml'],
      description: 'Large artifacts and data files'
    },
    // Scripts cleanup (for future page)
    scripts: {
      extensions: ['.sh', '.py', '.js'],
      description: 'Script files'
    },
    // All safe files (admin mode)
    all: {
      extensions: [
        '.md', '.txt', '.log', '.sh', '.sql', '.json', '.zip',
        '.pdf', '.csv', '.yaml', '.yml', '.docx', '.xlsx', '.py', '.js'
      ],
      description: 'All safe file types'
    }
  },
  
  // Files to NEVER move (exact matches)
  protectedFiles: [
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'vite.config.ts',
    'vite.config.js',
    '.gitignore',
    '.env',
    '.env.local',
    'README.md',
    'CHANGELOG.md',
    'LICENSE',
  ],
  
  // Directories to NEVER scan
  excludedDirs: [
    'node_modules',
    '.git',
    'dist',
    'build',
    'uploads',
    'backups',
    'temp-backups',
    'src',
    '.analysis',
    '.windsurf',
  ],
  
  // Destination structure
  destinations: {
    daily: 'docs/daily',
    inbox: 'docs/_inbox',
    artifacts: 'docs/_artifacts',
  },
};

class LibraryOrganizer {
  constructor(rootPath = '/var/www/orthodoxmetrics/prod', mode = 'documentation') {
    this.rootPath = rootPath;
    this.mode = mode;
    this.validateRoot();
    this.validateMode();
  }

  /**
   * Validate root path is allowed
   */
  validateRoot() {
    const isAllowed = CONFIG.allowedRoots.some(allowed => 
      this.rootPath.startsWith(allowed)
    );
    
    if (!isAllowed) {
      throw new Error(`Root path not allowed: ${this.rootPath}`);
    }
  }

  /**
   * Validate cleanup mode
   */
  validateMode() {
    if (!CONFIG.cleanupModes[this.mode]) {
      throw new Error(`Invalid cleanup mode: ${this.mode}. Valid modes: ${Object.keys(CONFIG.cleanupModes).join(', ')}`);
    }
  }

  /**
   * Get safe extensions for current mode
   */
  getSafeExtensions() {
    return CONFIG.cleanupModes[this.mode].extensions;
  }

  /**
   * Plan cleanup (dry-run mode)
   * Returns list of planned moves without executing
   */
  async planCleanup() {
    console.log(`📋 Library Organizer: Planning cleanup (${this.mode} mode)...`);
    
    const plan = {
      timestamp: new Date().toISOString(),
      rootPath: this.rootPath,
      mode: this.mode,
      modeDescription: CONFIG.cleanupModes[this.mode].description,
      safeExtensions: this.getSafeExtensions(),
      plannedMoves: [],
      skipped: [],
      errors: [],
    };

    try {
      // Scan root directory (depth=1 only)
      const files = await this.scanRootDirectory();
      
      for (const file of files) {
        try {
          const moveInfo = await this.planFileMove(file);
          
          if (moveInfo.shouldMove) {
            plan.plannedMoves.push(moveInfo);
          } else {
            plan.skipped.push({
              file: file.name,
              reason: moveInfo.reason,
            });
          }
        } catch (error) {
          plan.errors.push({
            file: file.name,
            error: error.message,
          });
        }
      }
      
      console.log(`✅ Plan complete: ${plan.plannedMoves.length} files to move, ${plan.skipped.length} skipped`);
      return plan;
      
    } catch (error) {
      console.error('❌ Planning failed:', error);
      throw error;
    }
  }

  /**
   * Apply cleanup (execute moves)
   */
  async applyCleanup() {
    console.log(`🚀 Library Organizer: Applying cleanup (${this.mode} mode)...`);
    
    const result = {
      timestamp: new Date().toISOString(),
      rootPath: this.rootPath,
      mode: this.mode,
      moved: [],
      failed: [],
      manifest: null,
    };

    try {
      // Get plan first
      const plan = await this.planCleanup();
      
      if (plan.plannedMoves.length === 0) {
        console.log('✅ No files to move');
        return result;
      }

      // Execute moves
      for (const moveInfo of plan.plannedMoves) {
        try {
          await this.executeMove(moveInfo);
          result.moved.push(moveInfo);
          console.log(`✅ Moved: ${moveInfo.from} → ${moveInfo.to}`);
        } catch (error) {
          result.failed.push({
            ...moveInfo,
            error: error.message,
          });
          console.error(`❌ Failed to move ${moveInfo.from}:`, error.message);
        }
      }

      // Write manifest
      const manifestPath = await this.writeManifest(result);
      result.manifest = manifestPath;
      
      console.log(`✅ Cleanup complete: ${result.moved.length} moved, ${result.failed.length} failed`);
      console.log(`📄 Manifest: ${manifestPath}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Scan root directory (depth=1 only)
   */
  async scanRootDirectory() {
    const files = [];
    const entries = await fs.readdir(this.rootPath, { withFileTypes: true });
    
    for (const entry of entries) {
      // Skip directories
      if (entry.isDirectory()) {
        continue;
      }
      
      // Skip excluded
      if (CONFIG.excludedDirs.includes(entry.name)) {
        continue;
      }
      
      const filePath = path.join(this.rootPath, entry.name);
      const stats = await fs.stat(filePath);
      
      files.push({
        name: entry.name,
        path: filePath,
        size: stats.size,
        mtime: stats.mtime,
        ext: path.extname(entry.name).toLowerCase(),
      });
    }
    
    return files;
  }

  /**
   * Plan move for a single file
   */
  async planFileMove(file) {
    const moveInfo = {
      from: file.path,
      to: null,
      fromRelative: path.relative(this.rootPath, file.path),
      toRelative: null,
      size: file.size,
      mtime: file.mtime.toISOString(),
      sha256: null,
      shouldMove: false,
      reason: null,
      category: null,
    };

    // Check if protected
    if (CONFIG.protectedFiles.includes(file.name)) {
      moveInfo.reason = 'protected file';
      return moveInfo;
    }

    // Check if safe extension
    const safeExtensions = this.getSafeExtensions();
    if (!safeExtensions.includes(file.ext)) {
      moveInfo.reason = `unsafe extension for ${this.mode} mode: ${file.ext}`;
      return moveInfo;
    }

    // Calculate SHA256
    moveInfo.sha256 = await this.calculateSHA256(file.path);

    // Determine destination category
    const category = this.categorizeFile(file.name);
    moveInfo.category = category;

    // Build destination path
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const destDir = path.join(this.rootPath, CONFIG.destinations[category], dateStr);
    let destPath = path.join(destDir, file.name);

    // Handle collisions
    if (await fs.pathExists(destPath)) {
      destPath = await this.findAvailablePath(destDir, file.name);
    }

    moveInfo.to = destPath;
    moveInfo.toRelative = path.relative(this.rootPath, destPath);
    moveInfo.shouldMove = true;
    moveInfo.reason = `categorized as ${category}`;

    return moveInfo;
  }

  /**
   * Categorize file based on name patterns
   */
  categorizeFile(filename) {
    const lower = filename.toLowerCase();
    
    // Daily task patterns
    if (
      lower.includes('task_') ||
      lower.includes('daily') ||
      lower.includes('_summary') ||
      lower.includes('_status') ||
      lower.match(/^\d{4}-\d{2}-\d{2}.*\.md$/)
    ) {
      return 'daily';
    }
    
    // Large artifacts
    if (
      lower.endsWith('.zip') ||
      lower.endsWith('.sql') ||
      lower.endsWith('.log') ||
      lower.includes('backup') ||
      lower.includes('dump')
    ) {
      return 'artifacts';
    }
    
    // Default to inbox
    return 'inbox';
  }

  /**
   * Find available path with -N suffix if collision
   */
  async findAvailablePath(dir, filename) {
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    
    let counter = 1;
    let newPath = path.join(dir, filename);
    
    while (await fs.pathExists(newPath)) {
      newPath = path.join(dir, `${base}-${counter}${ext}`);
      counter++;
    }
    
    return newPath;
  }

  /**
   * Calculate SHA256 hash of file
   */
  async calculateSHA256(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Execute a single file move
   */
  async executeMove(moveInfo) {
    // Ensure destination directory exists
    await fs.ensureDir(path.dirname(moveInfo.to));
    
    // Move file
    await fs.move(moveInfo.from, moveInfo.to, { overwrite: false });
  }

  /**
   * Write manifest file
   */
  async writeManifest(result) {
    const dateStr = new Date().toISOString().split('T')[0];
    const manifestDir = path.join(this.rootPath, CONFIG.destinations.inbox);
    await fs.ensureDir(manifestDir);
    
    const manifestPath = path.join(manifestDir, `_moves-${dateStr}.json`);
    
    // If manifest exists, append to it
    let existingMoves = [];
    if (await fs.pathExists(manifestPath)) {
      const existing = await fs.readJson(manifestPath);
      existingMoves = existing.moves || [];
    }
    
    const manifest = {
      date: dateStr,
      timestamp: result.timestamp,
      rootPath: result.rootPath,
      moves: [...existingMoves, ...result.moved],
      totalMoved: existingMoves.length + result.moved.length,
      failed: result.failed,
    };
    
    await fs.writeJson(manifestPath, manifest, { spaces: 2 });
    
    return manifestPath;
  }

  /**
   * Get cleanup statistics
   */
  async getStats() {
    const stats = {
      rootFiles: 0,
      safeFiles: 0,
      protectedFiles: 0,
      unsafeFiles: 0,
      mode: this.mode,
      modeDescription: CONFIG.cleanupModes[this.mode].description,
      safeExtensions: this.getSafeExtensions(),
    };

    try {
      const files = await this.scanRootDirectory();
      stats.rootFiles = files.length;
      
      const safeExtensions = this.getSafeExtensions();
      
      for (const file of files) {
        if (CONFIG.protectedFiles.includes(file.name)) {
          stats.protectedFiles++;
        } else if (safeExtensions.includes(file.ext)) {
          stats.safeFiles++;
        } else {
          stats.unsafeFiles++;
        }
      }
    } catch (error) {
      console.error('Error getting stats:', error);
    }

    return stats;
  }
}

module.exports = LibraryOrganizer;
