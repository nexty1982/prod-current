/**
 * OM-Librarian V2 Background Agent
 * 
 * Enhanced version with:
 * - Daily task ingestion from prod root
 * - Scheduled daily indexing (02:30 local time)
 * - Manual reindex trigger support
 * - Safe file organization integration
 * - Multiple scan sources with include/exclude patterns
 */

const chokidar = require('chokidar');
const fs = require('fs-extra');
const path = require('path');
const slugify = require('slugify');
const cron = require('node-cron');
const minimatch = require('minimatch');

// Configuration
const CONFIG = {
  // Scan sources with include/exclude patterns
  sources: [
    {
      name: 'prod-root-daily',
      root: path.join(__dirname, '../../..'),
      category: 'daily_tasks',
      includePatterns: [
        '*.md',
        'task_*.md',
        '*_SUMMARY.md',
        '*_FIX*.md',
        '*_STATUS.md',
        'CHANGE_LOG*.md',
      ],
      excludePatterns: [
        'node_modules/**',
        '.git/**',
        'server/node_modules/**',
        'front-end/node_modules/**',
        'server/dist/**',
        'front-end/dist/**',
        'uploads/**',
        'backups/**',
        'temp-backups/**',
        '*.zip',
        '*.pdf',
        'docs/**', // Avoid recursion with library destination
      ],
      depth: 1, // Only scan root level
    },
    {
      name: 'docs-archive',
      root: path.join(__dirname, '../../../docs'),
      category: null, // Auto-categorize
      includePatterns: ['**/*.md'],
      excludePatterns: [
        '_inbox/**',
        '_artifacts/**',
        'library/**',
      ],
      depth: 10, // Scan subdirectories
    },
  ],
  
  // Library destination
  libraryDir: path.join(__dirname, '../../../front-end/public/docs/library'),
  
  // Index file location
  indexFile: path.join(__dirname, '../../../.analysis/library-index.json'),
  
  // Processed files log
  processedLog: path.join(__dirname, '../../../.analysis/library-processed.json'),
  
  // Categories based on source and path patterns
  categories: {
    daily_tasks: ['prod-root-daily', 'task_', 'daily', '_SUMMARY', '_STATUS'],
    technical: ['dev', 'DEVELOPMENT', 'REFERENCE', 'FEATURES'],
    ops: ['ops', 'OPERATIONS', '1-22-26', '01-27-2026', '1-20-26'],
    recovery: ['records', 'ocr', 'ARCHIVE'],
  },
  
  // Scheduled indexing (daily at 02:30)
  scheduledIndexing: {
    enabled: true,
    cron: '30 2 * * *', // 02:30 daily
  },
  
  // Watcher options
  watchOptions: {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    },
  },
};

class OMLibrarianV2 {
  constructor() {
    this.watchers = [];
    this.index = this.loadIndex();
    this.processedFiles = this.loadProcessedFiles();
    this.scheduledJob = null;
    this.isIndexing = false;
    this.stats = {
      filesProcessed: 0,
      filesSkipped: 0,
      errors: 0,
      lastRun: null,
      lastScheduledRun: null,
      uptime: Date.now(),
    };
  }

  /**
   * Initialize the librarian agent
   */
  async initialize() {
    console.log('🔵 OM-Librarian V2: Initializing...');
    
    // Ensure directories exist
    await fs.ensureDir(CONFIG.libraryDir);
    await fs.ensureDir(path.join(CONFIG.libraryDir, 'daily_tasks'));
    await fs.ensureDir(path.join(CONFIG.libraryDir, 'technical'));
    await fs.ensureDir(path.join(CONFIG.libraryDir, 'ops'));
    await fs.ensureDir(path.join(CONFIG.libraryDir, 'recovery'));
    await fs.ensureDir(path.dirname(CONFIG.indexFile));
    
    // Start watching all sources
    this.startWatching();
    
    // Schedule daily indexing
    if (CONFIG.scheduledIndexing.enabled) {
      this.scheduleIndexing();
    }
    
    // Status logging
    setInterval(() => this.logStatus(), 60000); // Every minute
    
    console.log('✅ OM-Librarian V2: Ready and watching');
  }

  /**
   * Start watching all configured sources
   */
  startWatching() {
    console.log('👀 OM-Librarian V2: Starting directory watchers...');
    
    for (const source of CONFIG.sources) {
      try {
        const watcher = this.createSourceWatcher(source);
        this.watchers.push({ source: source.name, watcher });
        console.log(`✅ Watching source: ${source.name} (${source.root})`);
      } catch (error) {
        console.error(`❌ Failed to watch source ${source.name}:`, error.message);
      }
    }
  }

  /**
   * Create watcher for a specific source
   */
  createSourceWatcher(source) {
    const watcher = chokidar.watch(source.root, {
      ...CONFIG.watchOptions,
      depth: source.depth,
      ignored: (filePath) => this.shouldIgnore(filePath, source),
    });

    watcher
      .on('add', (filePath) => this.handleFileAdd(filePath, source))
      .on('change', (filePath) => this.handleFileChange(filePath, source))
      .on('error', (error) => this.handleError(`Watcher error (${source.name})`, error));

    return watcher;
  }

  /**
   * Check if file should be ignored based on source patterns
   */
  shouldIgnore(filePath, source) {
    const relativePath = path.relative(source.root, filePath);
    
    // Check exclude patterns
    for (const pattern of source.excludePatterns) {
      if (minimatch(relativePath, pattern, { dot: true })) {
        return true;
      }
    }
    
    // Check include patterns (if file, not directory)
    try {
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        const filename = path.basename(filePath);
        let matches = false;
        
        for (const pattern of source.includePatterns) {
          if (minimatch(filename, pattern) || minimatch(relativePath, pattern)) {
            matches = true;
            break;
          }
        }
        
        if (!matches) {
          return true; // Ignore if doesn't match any include pattern
        }
      }
    } catch (error) {
      // File might not exist yet, don't ignore
    }
    
    return false;
  }

  /**
   * Handle new file detection
   */
  async handleFileAdd(filePath, source) {
    // Only process markdown files
    if (path.extname(filePath).toLowerCase() !== '.md') {
      return;
    }

    // Skip if already processed
    if (this.isFileProcessed(filePath)) {
      this.stats.filesSkipped++;
      return;
    }

    try {
      console.log(`📄 OM-Librarian V2: New file detected: ${path.basename(filePath)} [${source.name}]`);
      await this.processFile(filePath, source);
      this.stats.filesProcessed++;
    } catch (error) {
      this.stats.errors++;
      this.handleError(`Failed to process ${filePath}`, error);
    }
  }

  /**
   * Handle file changes
   */
  async handleFileChange(filePath, source) {
    if (path.extname(filePath).toLowerCase() !== '.md') {
      return;
    }

    try {
      console.log(`🔄 OM-Librarian V2: File changed: ${path.basename(filePath)} [${source.name}]`);
      await this.processFile(filePath, source);
    } catch (error) {
      this.handleError(`Failed to re-process ${filePath}`, error);
    }
  }

  /**
   * Process a markdown file
   */
  async processFile(filePath, source) {
    try {
      // Read file
      const content = await fs.readFile(filePath, 'utf8');
      
      // Extract metadata
      const metadata = this.extractMetadata(content, filePath);
      
      // Normalize filename
      const normalizedName = this.normalizeFilename(metadata.title, filePath);
      
      // Determine category
      const category = this.determineCategory(filePath, source);
      
      // Destination path
      const destPath = path.join(CONFIG.libraryDir, category, normalizedName);
      
      // Copy file to library
      await fs.copy(filePath, destPath, { overwrite: true });
      
      // Update index
      const indexEntry = {
        id: this.generateId(normalizedName),
        originalPath: filePath,
        libraryPath: destPath,
        filename: normalizedName,
        title: metadata.title,
        category,
        source: source.name,
        size: (await fs.stat(destPath)).size,
        created: new Date().toISOString(),
        modified: (await fs.stat(filePath)).mtime.toISOString(),
        sourceFolder: path.basename(path.dirname(filePath)),
        relatedFiles: this.findRelatedFiles(normalizedName, category),
        keywords: metadata.keywords,
        firstParagraph: metadata.preview,
      };
      
      this.index[indexEntry.id] = indexEntry;
      this.markFileProcessed(filePath);
      
      // Save index
      await this.saveIndex();
      
      console.log(`✅ OM-Librarian V2: Processed ${normalizedName} → ${category} [${source.name}]`);
    } catch (error) {
      throw new Error(`Process file failed: ${error.message}`);
    }
  }

  /**
   * Extract metadata from markdown content
   */
  extractMetadata(content, filePath) {
    const lines = content.split('\n');
    
    // Extract title (first # header)
    let title = path.basename(filePath, '.md');
    for (const line of lines) {
      const match = line.match(/^#\s+(.+)$/);
      if (match) {
        title = match[1].trim();
        break;
      }
    }
    
    // Extract keywords
    const keywords = this.extractKeywords(content);
    
    // Extract preview
    const preview = this.extractPreview(content);
    
    return { title, keywords, preview };
  }

  /**
   * Extract keywords from content
   */
  extractKeywords(content) {
    const commonTech = [
      'api', 'backend', 'frontend', 'database', 'fix', 'implementation',
      'guide', 'setup', 'config', 'error', 'deployment', 'integration',
      'ocr', 'records', 'admin', 'auth', 'security', 'performance',
      'task', 'daily', 'summary', 'status', 'backup', 'restore'
    ];
    
    const contentLower = content.toLowerCase();
    const found = new Set();
    
    for (const keyword of commonTech) {
      if (contentLower.includes(keyword)) {
        found.add(keyword);
      }
    }
    
    return Array.from(found);
  }

  /**
   * Extract preview (first non-header paragraph)
   */
  extractPreview(content) {
    const lines = content.split('\n');
    let preview = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      preview = trimmed;
      break;
    }
    
    return preview.substring(0, 200) + (preview.length > 200 ? '...' : '');
  }

  /**
   * Normalize filename to YYYY-MM-DD_title-slug.md
   */
  normalizeFilename(title, originalPath) {
    const originalName = path.basename(originalPath, '.md');
    
    // Check if filename already has date prefix
    const dateMatch = originalName.match(/^(\d{4}-\d{2}-\d{2})/);
    let datePrefix = dateMatch ? dateMatch[1] : null;
    
    // If no date, use today's date
    if (!datePrefix) {
      const now = new Date();
      datePrefix = now.toISOString().split('T')[0];
    }
    
    // Create slug from title
    const slug = slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
    
    return `${datePrefix}_${slug}.md`;
  }

  /**
   * Determine category from file path and source
   */
  determineCategory(filePath, source) {
    // If source has explicit category, use it
    if (source.category) {
      return source.category;
    }
    
    const pathLower = filePath.toLowerCase();
    
    // Check against category patterns
    for (const [category, patterns] of Object.entries(CONFIG.categories)) {
      for (const pattern of patterns) {
        if (pathLower.includes(pattern.toLowerCase())) {
          return category;
        }
      }
    }
    
    // Default to 'technical'
    return 'technical';
  }

  /**
   * Find related files based on naming patterns
   */
  findRelatedFiles(filename, category) {
    const match = filename.match(/^\d{4}-\d{2}-\d{2}_(.+)\.md$/);
    if (!match) return [];
    
    const baseName = match[1];
    const related = [];
    
    for (const [id, entry] of Object.entries(this.index)) {
      if (entry.category !== category || entry.filename === filename) {
        continue;
      }
      
      const entryBase = entry.filename.replace(/^\d{4}-\d{2}-\d{2}_/, '').replace(/\.md$/, '');
      
      if (this.haveSimilarNames(baseName, entryBase)) {
        related.push(id);
      }
    }
    
    return related;
  }

  /**
   * Check if two filenames are similar
   */
  haveSimilarNames(name1, name2) {
    const words1 = name1.split('-');
    const words2 = name2.split('-');
    
    let commonWords = 0;
    for (const word of words1) {
      if (words2.includes(word) && word.length > 3) {
        commonWords++;
      }
    }
    
    return commonWords >= 2;
  }

  /**
   * Generate unique ID
   */
  generateId(filename) {
    return filename.replace(/\.md$/, '').replace(/\W+/g, '-');
  }

  /**
   * Check if file already processed
   */
  isFileProcessed(filePath) {
    try {
      const stat = fs.statSync(filePath);
      const mtime = stat.mtime.toISOString();
      return this.processedFiles[filePath] === mtime;
    } catch (error) {
      return false;
    }
  }

  /**
   * Mark file as processed
   */
  markFileProcessed(filePath) {
    try {
      const stat = fs.statSync(filePath);
      this.processedFiles[filePath] = stat.mtime.toISOString();
      fs.writeJsonSync(CONFIG.processedLog, this.processedFiles, { spaces: 2 });
    } catch (error) {
      console.error('Error marking file as processed:', error);
    }
  }

  /**
   * Load index from disk
   */
  loadIndex() {
    try {
      if (fs.existsSync(CONFIG.indexFile)) {
        return fs.readJsonSync(CONFIG.indexFile);
      }
    } catch (error) {
      console.warn('⚠️ OM-Librarian V2: Could not load index, starting fresh');
    }
    return {};
  }

  /**
   * Save index to disk
   */
  async saveIndex() {
    try {
      await fs.writeJson(CONFIG.indexFile, this.index, { spaces: 2 });
      this.stats.lastRun = new Date().toISOString();
    } catch (error) {
      throw new Error(`Failed to save index: ${error.message}`);
    }
  }

  /**
   * Load processed files log
   */
  loadProcessedFiles() {
    try {
      if (fs.existsSync(CONFIG.processedLog)) {
        return fs.readJsonSync(CONFIG.processedLog);
      }
    } catch (error) {
      console.warn('⚠️ OM-Librarian V2: Could not load processed log, starting fresh');
    }
    return {};
  }

  /**
   * Schedule daily indexing
   */
  scheduleIndexing() {
    console.log(`📅 OM-Librarian V2: Scheduling daily indexing at ${CONFIG.scheduledIndexing.cron}`);
    
    this.scheduledJob = cron.schedule(CONFIG.scheduledIndexing.cron, async () => {
      console.log('⏰ OM-Librarian V2: Scheduled indexing triggered');
      await this.triggerFullReindex();
      this.stats.lastScheduledRun = new Date().toISOString();
    });
  }

  /**
   * Trigger full reindex (manual or scheduled)
   */
  async triggerFullReindex() {
    if (this.isIndexing) {
      console.log('⚠️ OM-Librarian V2: Reindex already in progress, skipping');
      return { success: false, message: 'Reindex already in progress' };
    }

    try {
      this.isIndexing = true;
      console.log('🔄 OM-Librarian V2: Starting full reindex...');
      
      // Clear processed files to force re-processing
      this.processedFiles = {};
      await fs.writeJson(CONFIG.processedLog, {}, { spaces: 2 });
      
      // Restart watchers to trigger initial scan
      await this.restartWatchers();
      
      console.log('✅ OM-Librarian V2: Full reindex complete');
      return { success: true, message: 'Full reindex triggered successfully' };
      
    } catch (error) {
      console.error('❌ OM-Librarian V2: Reindex failed:', error);
      return { success: false, message: error.message };
    } finally {
      this.isIndexing = false;
    }
  }

  /**
   * Restart watchers
   */
  async restartWatchers() {
    // Close existing watchers
    for (const { watcher } of this.watchers) {
      await watcher.close();
    }
    this.watchers = [];
    
    // Start new watchers
    this.startWatching();
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalIndexed: Object.keys(this.index).length,
      totalProcessed: Object.keys(this.processedFiles).length,
      uptime: Math.floor((Date.now() - this.stats.uptime) / 1000),
      categories: this.getCategoryStats(),
      sources: this.getSourceStats(),
      isIndexing: this.isIndexing,
    };
  }

  /**
   * Get category statistics
   */
  getCategoryStats() {
    const stats = { daily_tasks: 0, technical: 0, ops: 0, recovery: 0 };
    
    for (const entry of Object.values(this.index)) {
      if (stats[entry.category] !== undefined) {
        stats[entry.category]++;
      }
    }
    
    return stats;
  }

  /**
   * Get source statistics
   */
  getSourceStats() {
    const stats = {};
    
    for (const entry of Object.values(this.index)) {
      if (!stats[entry.source]) {
        stats[entry.source] = 0;
      }
      stats[entry.source]++;
    }
    
    return stats;
  }

  /**
   * Log status
   */
  logStatus() {
    const stats = this.getStats();
    console.log('📊 OM-Librarian V2 Status:');
    console.log(`   Files Indexed: ${stats.totalIndexed}`);
    console.log(`   Files Processed: ${stats.filesProcessed}`);
    console.log(`   Files Skipped: ${stats.filesSkipped}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log(`   Uptime: ${Math.floor(stats.uptime / 60)}m`);
    console.log(`   Categories:`, stats.categories);
    console.log(`   Sources:`, stats.sources);
    if (stats.lastScheduledRun) {
      console.log(`   Last Scheduled Run: ${stats.lastScheduledRun}`);
    }
  }

  /**
   * Handle errors
   */
  handleError(context, error) {
    console.error(`❌ OM-Librarian V2 Error [${context}]:`, error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🔴 OM-Librarian V2: Shutting down...');
    
    // Stop scheduled job
    if (this.scheduledJob) {
      this.scheduledJob.stop();
    }
    
    // Close all watchers
    for (const { watcher } of this.watchers) {
      await watcher.close();
    }
    
    await this.saveIndex();
    this.logStatus();
    
    console.log('✅ OM-Librarian V2: Shutdown complete');
    process.exit(0);
  }
}

// Main execution
if (require.main === module) {
  const librarian = new OMLibrarianV2();
  
  // Initialize
  librarian.initialize().catch((error) => {
    console.error('💥 OM-Librarian V2: Fatal error:', error);
    process.exit(1);
  });
  
  // Handle shutdown signals
  process.on('SIGINT', () => librarian.shutdown());
  process.on('SIGTERM', () => librarian.shutdown());
  
  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    librarian.handleError('Uncaught Exception', error);
  });
  
  process.on('unhandledRejection', (reason) => {
    librarian.handleError('Unhandled Rejection', new Error(reason));
  });
}

module.exports = OMLibrarianV2;
