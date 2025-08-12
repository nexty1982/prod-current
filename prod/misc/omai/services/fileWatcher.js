/**
 * OMAI File Watcher Service
 * Monitors learning source directories for changes and triggers automatic learning refresh
 * Created: 2025-07-27
 */

const chokidar = require('chokidar');
const path = require('path');
const { getLearningSources, shouldExclude } = require('./learningSources');

class OMAIFileWatcher {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.watchers = new Map();
    this.isWatching = false;
    this.debounceTimer = null;
    this.changeQueue = new Set();
    
    // Configuration
    this.config = {
      debounceDelay: 5000, // 5 seconds
      batchSize: 50,
      maxChangesBeforeReset: 100
    };
  }

  /**
   * Start watching all learning source directories
   */
  async startWatching() {
    if (this.isWatching) {
      console.log('[OMAI FileWatcher] Already watching files');
      return;
    }

    try {
      console.log('[OMAI FileWatcher] Starting file watching...');
      
      const sources = getLearningSources();
      
      for (const source of sources) {
        await this.watchSource(source);
      }
      
      this.isWatching = true;
      console.log(`[OMAI FileWatcher] Started watching ${sources.length} source directories`);
      
    } catch (error) {
      console.error('[OMAI FileWatcher] Failed to start watching:', error);
      throw error;
    }
  }

  /**
   * Stop watching all directories
   */
  async stopWatching() {
    if (!this.isWatching) {
      console.log('[OMAI FileWatcher] Not currently watching');
      return;
    }

    try {
      console.log('[OMAI FileWatcher] Stopping file watching...');
      
      // Stop all watchers
      for (const [sourcePath, watcher] of this.watchers) {
        await watcher.close();
        console.log(`[OMAI FileWatcher] Stopped watching: ${sourcePath}`);
      }
      
      this.watchers.clear();
      this.isWatching = false;
      
      // Clear any pending changes
      this.clearDebounceTimer();
      this.changeQueue.clear();
      
      console.log('[OMAI FileWatcher] File watching stopped');
      
    } catch (error) {
      console.error('[OMAI FileWatcher] Error stopping file watching:', error);
    }
  }

  /**
   * Watch a specific source directory
   */
  async watchSource(source) {
    try {
      const watchPath = source.fullPath;
      
      // Skip if path doesn't exist
      const fs = require('fs').promises;
      try {
        await fs.access(watchPath);
      } catch {
        console.warn(`[OMAI FileWatcher] Source path not accessible: ${watchPath}`);
        return;
      }

      // Configure chokidar options
      const watchOptions = {
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/build/**',
          '**/*.log',
          '**/temp/**',
          '**/uploads/**'
        ],
        ignoreInitial: true,
        persistent: true,
        usePolling: false,
        awaitWriteFinish: {
          stabilityThreshold: 2000,
          pollInterval: 100
        }
      };

      // Create watcher
      const watcher = chokidar.watch(watchPath, watchOptions);

      // Set up event handlers
      watcher
        .on('add', (filePath) => this.handleFileChange('add', filePath, source))
        .on('change', (filePath) => this.handleFileChange('change', filePath, source))
        .on('unlink', (filePath) => this.handleFileChange('unlink', filePath, source))
        .on('error', (error) => {
          console.error(`[OMAI FileWatcher] Error watching ${watchPath}:`, error);
        })
        .on('ready', () => {
          console.log(`[OMAI FileWatcher] Ready to watch: ${watchPath}`);
        });

      this.watchers.set(watchPath, watcher);
      
    } catch (error) {
      console.error(`[OMAI FileWatcher] Failed to watch source ${source.path}:`, error);
    }
  }

  /**
   * Handle file change events
   */
  handleFileChange(event, filePath, source) {
    try {
      // Check if file should be excluded
      if (shouldExclude(filePath)) {
        return;
      }

      // Check if file extension is supported
      const ext = path.extname(filePath).toLowerCase();
      if (!source.extensions.includes(ext)) {
        return;
      }

      console.log(`[OMAI FileWatcher] File ${event}: ${filePath}`);
      
      // Add to change queue
      this.changeQueue.add({
        event,
        filePath,
        source: source.path,
        timestamp: new Date().toISOString()
      });

      // Trigger debounced learning refresh
      this.debounceLearningRefresh();
      
    } catch (error) {
      console.error(`[OMAI FileWatcher] Error handling file change:`, error);
    }
  }

  /**
   * Debounce learning refresh to avoid excessive triggering
   */
  debounceLearningRefresh() {
    // Clear existing timer
    this.clearDebounceTimer();
    
    // Set new timer
    this.debounceTimer = setTimeout(async () => {
      await this.triggerLearningRefresh();
    }, this.config.debounceDelay);
  }

  /**
   * Trigger learning refresh
   */
  async triggerLearningRefresh() {
    try {
      const changeCount = this.changeQueue.size;
      
      if (changeCount === 0) {
        return;
      }

      console.log(`[OMAI FileWatcher] Triggering learning refresh for ${changeCount} changes`);
      
      // Get unique sources that changed
      const changedSources = [...new Set([...this.changeQueue].map(change => change.source))];
      
      // Log change summary
      const changeSummary = {
        totalChanges: changeCount,
        affectedSources: changedSources,
        timestamp: new Date().toISOString()
      };
      
      console.log('[OMAI FileWatcher] Change summary:', changeSummary);

      // Trigger learning refresh
      if (this.orchestrator && typeof this.orchestrator.learnFromSources === 'function') {
        const learningStats = await this.orchestrator.learnFromSources();
        
        console.log('[OMAI FileWatcher] Learning refresh completed:', {
          processed: learningStats.processedFiles,
          errors: learningStats.errors.length,
          duration: learningStats.processingTime
        });
      } else {
        console.warn('[OMAI FileWatcher] Orchestrator not available for learning refresh');
      }

      // Clear change queue
      this.changeQueue.clear();
      
    } catch (error) {
      console.error('[OMAI FileWatcher] Failed to trigger learning refresh:', error);
    }
  }

  /**
   * Clear debounce timer
   */
  clearDebounceTimer() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Get watching status
   */
  getStatus() {
    return {
      isWatching: this.isWatching,
      watchedSources: Array.from(this.watchers.keys()),
      pendingChanges: this.changeQueue.size,
      config: this.config
    };
  }

  /**
   * Get recent changes
   */
  getRecentChanges(limit = 10) {
    return [...this.changeQueue].slice(-limit);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('[OMAI FileWatcher] Configuration updated:', this.config);
  }
}

module.exports = { OMAIFileWatcher }; 