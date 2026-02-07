/**
 * OM-Librarian V3 - Database-Driven with Glob Support
 * 
 * Enhancements over V1/V2:
 * - Reads scan sources from orthodoxmetrics_db.library_sources
 * - Supports per-source include/exclude glob patterns
 * - Scheduled daily indexing (02:30 or every 6 hours)
 * - SHA256 tracking for file identity
 * - Category-based on source metadata + content analysis
 */

const chokidar = require('chokidar');
const fs = require('fs-extra');
const path = require('path');
const slugify = require('slugify');
const { minimatch } = require('minimatch');
const crypto = require('crypto');
const cron = require('node-cron');
const { getAppPool } = require('../config/db-compat');

// Configuration
const CONFIG = {
  // Library destination
  libraryDir: path.join(__dirname, '../../../front-end/public/docs/library'),
  
  // Index file location
  indexFile: path.join(__dirname, '../../../.analysis/library-index.json'),
  
  // Processed files log (to avoid re-processing)
  processedLog: path.join(__dirname, '../../../.analysis/library-processed.json'),
  
  // Categories based on source path patterns
  categories: {
    technical: ['dev', 'DEVELOPMENT', 'REFERENCE', 'FEATURES'],
    ops: ['ops', 'OPERATIONS', '1-22-26', '01-27-2026', '1-20-26'],
    recovery: ['records', 'ocr', 'ARCHIVE'],
    daily_tasks: ['prod root', 'daily'], // NEW: for prod root daily tasks
  },
  
  // Scheduler config
  scheduler: {
    enabled: true,
    // Run at 02:30 every day
    dailyCron: '30 2 * * *',
    // Or every 6 hours: '0 */6 * * *'
  },
  
  // Watcher options (for continuous mode)
  watchOptions: {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    },
  },
};

class OMLibrarianV3 {
  constructor() {
    this.watcher = null;
    this.index = this.loadIndex();
    this.processedFiles = this.loadProcessedFiles();
    this.sources = [];
    this.pool = null;
    this.stats = {
      filesProcessed: 0,
      filesSkipped: 0,
      errors: 0,
      lastRun: null,
      uptime: Date.now(),
    };
  }

  /**
   * Initialize the librarian agent
   */
  async initialize() {
    console.log('🔵 OM-Librarian V3: Initializing...');
    
    // Connect to database
    try {
      this.pool = getAppPool();
      console.log('✅ Database connection established');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error.message);
      throw error;
    }
    
    // Load scan sources from database
    await this.loadScanSources();
    
    // Ensure directories exist
    await fs.ensureDir(CONFIG.libraryDir);
    await fs.ensureDir(path.join(CONFIG.libraryDir, 'technical'));
    await fs.ensureDir(path.join(CONFIG.libraryDir, 'ops'));
    await fs.ensureDir(path.join(CONFIG.libraryDir, 'recovery'));
    await fs.ensureDir(path.join(CONFIG.libraryDir, 'daily_tasks'));
    await fs.ensureDir(path.dirname(CONFIG.indexFile));
    
    // Start watching (continuous mode)
    this.startWatching();
    
    // Setup scheduled indexing
    if (CONFIG.scheduler.enabled) {
      this.setupScheduledIndexing();
    }
    
    // Status logging
    setInterval(() => this.logStatus(), 60000); // Every minute
    
    console.log('✅ OM-Librarian V3: Ready and watching');
  }

  /**
   * Load scan sources from database
   */
  async loadScanSources() {
    console.log('📂 Loading scan sources from database...');
    
    try {
      const [rows] = await this.pool.query(`
        SELECT id, name, path, is_active, scan_mode, include_globs, exclude_globs, description
        FROM orthodoxmetrics_db.library_sources
        WHERE is_active = TRUE
        ORDER BY name ASC
      `);
      
      this.sources = rows.map(row => ({
        id: row.id,
        name: row.name,
        path: row.path,
        scanMode: row.scan_mode || 'recursive',
        includeGlobs: row.include_globs ? JSON.parse(row.include_globs) : null,
        excludeGlobs: row.exclude_globs ? JSON.parse(row.exclude_globs) : [],
        description: row.description,
      }));
      
      console.log(`✅ Loaded ${this.sources.length} active scan sources`);
      this.sources.forEach(src => {
        console.log(`   - ${src.name}: ${src.path} (${src.scanMode})`);
      });
      
    } catch (error) {
      console.error('❌ Failed to load scan sources:', error);
      throw error;
    }
  }

  /**
   * Start watching directories
   */
  startWatching() {
    console.log('👀 OM-Librarian: Starting directory watchers...');
    
    // Build watch paths from sources
    const watchPaths = this.sources
      .filter(src => fs.existsSync(src.path))
      .map(src => src.path);
    
    if (watchPaths.length === 0) {
      console.warn('⚠️ No valid paths to watch');
      return;
    }
    
    // Build combined ignore patterns
    const allExcludes = new Set();
    this.sources.forEach(src => {
      src.excludeGlobs.forEach(glob => allExcludes.add(glob));
    });
    
    const watchOptions = {
      ...CONFIG.watchOptions,
      ignored: Array.from(allExcludes),
    };
    
    this.watcher = chokidar.watch(watchPaths, watchOptions);

    this.watcher
      .on('add', (filePath) => this.handleFileAdd(filePath))
      .on('change', (filePath) => this.handleFileChange(filePath))
      .on('error', (error) => this.handleError('Watcher error', error))
      .on('ready', () => {
        console.log(`✅ OM-Librarian: Watching ${watchPaths.length} directories`);
      });
  }

  /**
   * Setup scheduled indexing
   */
  setupScheduledIndexing() {
    console.log(`⏰ Setting up scheduled indexing: ${CONFIG.scheduler.dailyCron}`);
    
    cron.schedule(CONFIG.scheduler.dailyCron, async () => {
      console.log('🔄 Scheduled reindex starting...');
      await this.fullReindex();
    });
    
    console.log('✅ Scheduled indexing configured');
  }

  /**
   * Perform full reindex of all sources
   */
  async fullReindex() {
    console.log('🔄 Starting full reindex...');
    const startTime = Date.now();
    
    try {
      // Reload sources from DB
      await this.loadScanSources();
      
      // Clear processed log to force re-processing
      this.processedFiles = {};
      await fs.writeJson(CONFIG.processedLog, {}, { spaces: 2 });
      
      // Process all sources
      for (const source of this.sources) {
        await this.indexSource(source);
      }
      
      // Update last_scan timestamp in database
      await this.updateLastScanTimestamps();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Full reindex complete in ${duration}s`);
      
    } catch (error) {
      console.error('❌ Full reindex failed:', error);
      this.handleError('Full reindex', error);
    }
  }

  /**
   * Index a single source
   */
  async indexSource(source) {
    console.log(`📂 Indexing source: ${source.name}`);
    
    try {
      if (!fs.existsSync(source.path)) {
        console.warn(`⚠️ Path not found: ${source.path}`);
        return;
      }
      
      const files = await this.scanSource(source);
      console.log(`   Found ${files.length} files`);
      
      for (const file of files) {
        try {
          if (!this.isFileProcessed(file)) {
            await this.processFile(file, source);
            this.stats.filesProcessed++;
          } else {
            this.stats.filesSkipped++;
          }
        } catch (error) {
          this.stats.errors++;
          this.handleError(`Failed to process ${file}`, error);
        }
      }
      
    } catch (error) {
      console.error(`❌ Failed to index source ${source.name}:`, error);
    }
  }

  /**
   * Scan a source directory for files
   */
  async scanSource(source) {
    const files = [];
    
    if (source.scanMode === 'shallow') {
      // Scan only top-level
      const entries = await fs.readdir(source.path, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        
        const filePath = path.join(source.path, entry.name);
        
        if (this.shouldIncludeFile(filePath, source)) {
          files.push(filePath);
        }
      }
      
    } else {
      // Recursive scan
      await this.scanRecursive(source.path, source, files);
    }
    
    return files;
  }

  /**
   * Recursively scan directory
   */
  async scanRecursive(dir, source, files) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(source.path, fullPath);
      
      // Check exclude patterns
      if (this.isExcluded(relativePath, source.excludeGlobs)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        await this.scanRecursive(fullPath, source, files);
      } else if (entry.isFile()) {
        if (this.shouldIncludeFile(fullPath, source)) {
          files.push(fullPath);
        }
      }
    }
  }

  /**
   * Check if file should be included based on glob patterns
   */
  shouldIncludeFile(filePath, source) {
    const relativePath = path.relative(source.path, filePath);
    const filename = path.basename(filePath);
    
    // Check exclude patterns first
    if (this.isExcluded(relativePath, source.excludeGlobs)) {
      return false;
    }
    
    // If no include patterns, include all (except excluded)
    if (!source.includeGlobs || source.includeGlobs.length === 0) {
      return path.extname(filePath).toLowerCase() === '.md';
    }
    
    // Check include patterns
    return source.includeGlobs.some(pattern => 
      minimatch(filename, pattern) || minimatch(relativePath, pattern)
    );
  }

  /**
   * Check if path matches exclude patterns
   */
  isExcluded(relativePath, excludeGlobs) {
    return excludeGlobs.some(pattern => minimatch(relativePath, pattern));
  }

  /**
   * Handle new file detection
   */
  async handleFileAdd(filePath) {
    // Only process markdown files
    if (path.extname(filePath).toLowerCase() !== '.md') {
      return;
    }

    // Find which source this file belongs to
    const source = this.findSourceForFile(filePath);
    if (!source) {
      return; // File not in any monitored source
    }

    // Skip if already processed
    if (this.isFileProcessed(filePath)) {
      this.stats.filesSkipped++;
      return;
    }

    try {
      console.log(`📄 OM-Librarian: New file detected: ${path.basename(filePath)}`);
      await this.processFile(filePath, source);
      this.stats.filesProcessed++;
    } catch (error) {
      this.stats.errors++;
      this.handleError(`Failed to process ${filePath}`, error);
    }
  }

  /**
   * Find which source a file belongs to
   */
  findSourceForFile(filePath) {
    for (const source of this.sources) {
      if (filePath.startsWith(source.path)) {
        // Check if file should be included
        if (this.shouldIncludeFile(filePath, source)) {
          return source;
        }
      }
    }
    return null;
  }

  /**
   * Handle file changes
   */
  async handleFileChange(filePath) {
    if (path.extname(filePath).toLowerCase() !== '.md') {
      return;
    }

    const source = this.findSourceForFile(filePath);
    if (!source) return;

    try {
      console.log(`🔄 OM-Librarian: File changed: ${path.basename(filePath)}`);
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
      
      // Calculate SHA256
      const sha256 = crypto.createHash('sha256').update(content).digest('hex');
      
      // Extract metadata
      const metadata = this.extractMetadata(content, filePath);
      
      // Normalize filename
      const normalizedName = this.normalizeFilename(metadata.title, filePath);
      
      // Determine category (enhanced logic)
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
        sourceId: source.id,
        size: (await fs.stat(destPath)).size,
        sha256,
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
      
      console.log(`✅ OM-Librarian: Processed ${normalizedName} → ${category}`);
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
    
    // Extract first paragraph for preview
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
      'daily', 'task', 'summary', 'status', 'fix', 'cleanup'
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
    
    // If no date, try to get from source folder name
    if (!datePrefix) {
      const folderName = path.basename(path.dirname(originalPath));
      const folderDateMatch = folderName.match(/(\d{1,2})-(\d{1,2})-(\d{2,4})/);
      
      if (folderDateMatch) {
        let [, month, day, year] = folderDateMatch;
        year = year.length === 2 ? `20${year}` : year;
        datePrefix = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else {
        datePrefix = new Date().toISOString().split('T')[0];
      }
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
    const pathLower = filePath.toLowerCase();
    const sourceLower = source.name.toLowerCase();
    
    // Check if this is the prod root daily tasks source
    if (sourceLower.includes('prod root') || sourceLower.includes('daily')) {
      return 'daily_tasks';
    }
    
    // Otherwise use pattern matching
    for (const [category, patterns] of Object.entries(CONFIG.categories)) {
      for (const pattern of patterns) {
        if (pathLower.includes(pattern.toLowerCase())) {
          return category;
        }
      }
    }
    
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
    const stat = fs.statSync(filePath);
    const mtime = stat.mtime.toISOString();
    
    return this.processedFiles[filePath] === mtime;
  }

  /**
   * Mark file as processed
   */
  markFileProcessed(filePath) {
    const stat = fs.statSync(filePath);
    this.processedFiles[filePath] = stat.mtime.toISOString();
    fs.writeJsonSync(CONFIG.processedLog, this.processedFiles, { spaces: 2 });
  }

  /**
   * Update last_scan timestamps in database
   */
  async updateLastScanTimestamps() {
    try {
      for (const source of this.sources) {
        const fileCount = Object.values(this.index).filter(
          entry => entry.sourceId === source.id
        ).length;
        
        await this.pool.query(`
          UPDATE orthodoxmetrics_db.library_sources
          SET last_scan = NOW(), file_count = ?
          WHERE id = ?
        `, [fileCount, source.id]);
      }
    } catch (error) {
      console.error('Failed to update last_scan timestamps:', error);
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
      console.warn('⚠️ OM-Librarian: Could not load index, starting fresh');
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
      console.warn('⚠️ OM-Librarian: Could not load processed log, starting fresh');
    }
    return {};
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalIndexed: Object.keys(this.index).length,
      totalProcessed: Object.keys(this.processedFiles).length,
      totalSources: this.sources.length,
      uptime: Math.floor((Date.now() - this.stats.uptime) / 1000),
      categories: this.getCategoryStats(),
    };
  }

  /**
   * Get category statistics
   */
  getCategoryStats() {
    const stats = { technical: 0, ops: 0, recovery: 0, daily_tasks: 0 };
    
    for (const entry of Object.values(this.index)) {
      if (stats.hasOwnProperty(entry.category)) {
        stats[entry.category]++;
      }
    }
    
    return stats;
  }

  /**
   * Log status
   */
  logStatus() {
    const stats = this.getStats();
    console.log('📊 OM-Librarian V3 Status:');
    console.log(`   Files Indexed: ${stats.totalIndexed}`);
    console.log(`   Files Processed: ${stats.filesProcessed}`);
    console.log(`   Files Skipped: ${stats.filesSkipped}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log(`   Sources: ${stats.totalSources}`);
    console.log(`   Uptime: ${Math.floor(stats.uptime / 60)}m`);
    console.log(`   Categories: Technical=${stats.categories.technical}, Ops=${stats.categories.ops}, Recovery=${stats.categories.recovery}, Daily=${stats.categories.daily_tasks}`);
  }

  /**
   * Handle errors
   */
  handleError(context, error) {
    console.error(`❌ OM-Librarian Error [${context}]:`, error.message);
    console.error(error.stack);
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🔴 OM-Librarian: Shutting down...');
    
    if (this.watcher) {
      await this.watcher.close();
    }
    
    await this.saveIndex();
    this.logStatus();
    
    if (this.pool) {
      await this.pool.end();
    }
    
    console.log('✅ OM-Librarian: Shutdown complete');
    process.exit(0);
  }
}

// Main execution
if (require.main === module) {
  const librarian = new OMLibrarianV3();
  
  // Initialize
  librarian.initialize().catch((error) => {
    console.error('💥 OM-Librarian: Fatal error:', error);
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

module.exports = OMLibrarianV3;
