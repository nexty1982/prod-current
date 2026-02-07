/**
 * OM-Librarian Background Agent
 * 
 * Purpose: Monitors documentation directories and automatically archives,
 * normalizes, and indexes markdown files into the OM-Library system.
 * 
 * Features:
 * - Directory monitoring using chokidar
 * - File normalization (YYYY-MM-DD_title-slug.md)
 * - Automatic categorization (Technical, Ops, Recovery)
 * - Relationship mapping based on file prefixes and source folders
 * - Content indexing for full-text search
 * - Safe file operations with error handling
 */

const chokidar = require('chokidar');
const fs = require('fs-extra');
const path = require('path');
const slugify = require('slugify');

// Configuration
const CONFIG = {
  // Directories to monitor (from tree-docs.txt)
  watchDirs: [
    path.join(__dirname, '../../../docs/01-27-2026'),
    path.join(__dirname, '../../../docs/1-20-26'),
    path.join(__dirname, '../../../docs/1-22-26'),
    path.join(__dirname, '../../../docs/ARCHIVE'),
    path.join(__dirname, '../../../docs/dev'),
    path.join(__dirname, '../../../docs/ocr'),
    path.join(__dirname, '../../../docs/records'),
    path.join(__dirname, '../../../docs/ops'),
  ],
  
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
  },
  
  // Watcher options
  watchOptions: {
    persistent: true,
    ignoreInitial: false, // Process existing files on startup
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    },
    ignored: [
      '**/.git/**',
      '**/node_modules/**',
      '**/*.backup',
      '**/*~',
    ],
  },
};

class OMLibrarian {
  constructor() {
    this.watcher = null;
    this.index = this.loadIndex();
    this.processedFiles = this.loadProcessedFiles();
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
    console.log('🔵 OM-Librarian: Initializing...');
    
    // Ensure directories exist
    await fs.ensureDir(CONFIG.libraryDir);
    await fs.ensureDir(path.join(CONFIG.libraryDir, 'technical'));
    await fs.ensureDir(path.join(CONFIG.libraryDir, 'ops'));
    await fs.ensureDir(path.join(CONFIG.libraryDir, 'recovery'));
    await fs.ensureDir(path.dirname(CONFIG.indexFile));
    
    // Start watching
    this.startWatching();
    
    // Status logging
    setInterval(() => this.logStatus(), 60000); // Every minute
    
    console.log('✅ OM-Librarian: Ready and watching');
  }

  /**
   * Start watching directories
   */
  startWatching() {
    console.log('👀 OM-Librarian: Starting directory watchers...');
    
    this.watcher = chokidar.watch(
      CONFIG.watchDirs,
      CONFIG.watchOptions
    );

    this.watcher
      .on('add', (filePath) => this.handleFileAdd(filePath))
      .on('change', (filePath) => this.handleFileChange(filePath))
      .on('error', (error) => this.handleError('Watcher error', error))
      .on('ready', () => {
        console.log(`✅ OM-Librarian: Watching ${CONFIG.watchDirs.length} directories`);
      });
  }

  /**
   * Handle new file detection
   */
  async handleFileAdd(filePath) {
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
      console.log(`📄 OM-Librarian: New file detected: ${path.basename(filePath)}`);
      await this.processFile(filePath);
      this.stats.filesProcessed++;
    } catch (error) {
      this.stats.errors++;
      this.handleError(`Failed to process ${filePath}`, error);
    }
  }

  /**
   * Handle file changes
   */
  async handleFileChange(filePath) {
    if (path.extname(filePath).toLowerCase() !== '.md') {
      return;
    }

    try {
      console.log(`🔄 OM-Librarian: File changed: ${path.basename(filePath)}`);
      // Re-process changed files
      await this.processFile(filePath);
    } catch (error) {
      this.handleError(`Failed to re-process ${filePath}`, error);
    }
  }

  /**
   * Process a markdown file
   */
  async processFile(filePath) {
    try {
      // Read file
      const content = await fs.readFile(filePath, 'utf8');
      
      // Extract metadata
      const metadata = this.extractMetadata(content, filePath);
      
      // Normalize filename
      const normalizedName = this.normalizeFilename(metadata.title, filePath);
      
      // Determine category
      const category = this.determineCategory(filePath);
      
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
    
    // Extract keywords (common technical terms)
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
      'ocr', 'records', 'admin', 'auth', 'security', 'performance'
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
      // Skip headers, empty lines
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
        // Convert to YYYY-MM-DD
        year = year.length === 2 ? `20${year}` : year;
        datePrefix = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else {
        // Use today's date
        const now = new Date();
        datePrefix = now.toISOString().split('T')[0];
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
   * Determine category from file path
   */
  determineCategory(filePath) {
    const pathLower = filePath.toLowerCase();
    
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
    // Extract base name without date
    const match = filename.match(/^\d{4}-\d{2}-\d{2}_(.+)\.md$/);
    if (!match) return [];
    
    const baseName = match[1];
    const related = [];
    
    // Find files with similar base names
    for (const [id, entry] of Object.entries(this.index)) {
      if (entry.category !== category || entry.filename === filename) {
        continue;
      }
      
      const entryBase = entry.filename.replace(/^\d{4}-\d{2}-\d{2}_/, '').replace(/\.md$/, '');
      
      // Check for common prefixes or shared keywords
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
    // Split into words
    const words1 = name1.split('-');
    const words2 = name2.split('-');
    
    // Check for at least 2 common words
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
      uptime: Math.floor((Date.now() - this.stats.uptime) / 1000),
      categories: this.getCategoryStats(),
    };
  }

  /**
   * Get category statistics
   */
  getCategoryStats() {
    const stats = { technical: 0, ops: 0, recovery: 0 };
    
    for (const entry of Object.values(this.index)) {
      stats[entry.category]++;
    }
    
    return stats;
  }

  /**
   * Log status
   */
  logStatus() {
    const stats = this.getStats();
    console.log('📊 OM-Librarian Status:');
    console.log(`   Files Indexed: ${stats.totalIndexed}`);
    console.log(`   Files Processed: ${stats.filesProcessed}`);
    console.log(`   Files Skipped: ${stats.filesSkipped}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log(`   Uptime: ${Math.floor(stats.uptime / 60)}m`);
    console.log(`   Categories: Technical=${stats.categories.technical}, Ops=${stats.categories.ops}, Recovery=${stats.categories.recovery}`);
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
    
    console.log('✅ OM-Librarian: Shutdown complete');
    process.exit(0);
  }
}

// Main execution
if (require.main === module) {
  const librarian = new OMLibrarian();
  
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

module.exports = OMLibrarian;
