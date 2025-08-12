import * as fs from 'fs/promises';
import * as path from 'path';
import { parseFile, processFiles } from './fileToKnowledge';

interface IndexingConfig {
  basePath: string;
  extensions: string[];
  excludePatterns: string[];
  maxFileSize: number;
  watchMode: boolean;
  batchSize: number;
}

interface IndexingResult {
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  chunks: any[];
  duration: number;
  errors: string[];
}

interface FileInfo {
  path: string;
  size: number;
  lastModified: Date;
  extension: string;
}

/**
 * Knowledge Indexer - Scans directories and indexes files for OMAI
 */
export class KnowledgeIndexer {
  private config: IndexingConfig;
  private watchers: Map<string, fs.FSWatcher> = new Map();

  constructor(config: Partial<IndexingConfig> = {}) {
    this.config = {
      basePath: config.basePath || process.cwd(),
      extensions: config.extensions || ['.js', '.ts', '.tsx', '.jsx', '.md', '.json', '.sql'],
      excludePatterns: config.excludePatterns || ['node_modules', '.git', 'dist', 'build', 'coverage'],
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
      watchMode: config.watchMode || false,
      batchSize: config.batchSize || 100
    };
  }

  /**
   * Implement recursive directory scan
   */
  async scanDirectory(dirPath: string): Promise<FileInfo[]> {
    const files: FileInfo[] = [];
    
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        
        // Skip excluded patterns
        if (this.shouldExclude(fullPath)) {
          continue;
        }
        
        if (item.isDirectory()) {
          // Recursively scan subdirectories
          const subFiles = await this.scanDirectory(fullPath);
          files.push(...subFiles);
        } else if (item.isFile()) {
          // Check if file should be indexed
          if (this.shouldIndexFile(fullPath)) {
            try {
              const stats = await fs.stat(fullPath);
              if (stats.size <= this.config.maxFileSize) {
                files.push({
                  path: fullPath,
                  size: stats.size,
                  lastModified: stats.mtime,
                  extension: path.extname(fullPath)
                });
              }
            } catch (error) {
              console.warn(`Could not stat file ${fullPath}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Could not scan directory ${dirPath}:`, error);
    }
    
    return files;
  }

  /**
   * Implement file type tagging logic
   */
  private shouldIndexFile(filePath: string): boolean {
    const extension = path.extname(filePath).toLowerCase();
    return this.config.extensions.includes(extension);
  }

  /**
   * Check if path should be excluded
   */
  private shouldExclude(filePath: string): boolean {
    const relativePath = path.relative(this.config.basePath, filePath);
    return this.config.excludePatterns.some(pattern => 
      relativePath.includes(pattern) || path.basename(filePath).startsWith('.')
    );
  }

  /**
   * Index all files in the configured directory
   */
  async indexAll(): Promise<IndexingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      console.log(`Starting indexing of ${this.config.basePath}`);
      
      // Scan for all files
      const files = await this.scanDirectory(this.config.basePath);
      console.log(`Found ${files.length} files to index`);
      
      // Process files in batches
      const chunks: any[] = [];
      let processedFiles = 0;
      let failedFiles = 0;
      
      for (let i = 0; i < files.length; i += this.config.batchSize) {
        const batch = files.slice(i, i + this.config.batchSize);
        const batchPaths = batch.map(f => f.path);
        
        try {
          const batchChunks = await processFiles(batchPaths);
          chunks.push(...batchChunks);
          processedFiles += batchChunks.length;
          
          console.log(`Processed batch ${Math.floor(i / this.config.batchSize) + 1}/${Math.ceil(files.length / this.config.batchSize)}`);
        } catch (error) {
          failedFiles += batch.length;
          errors.push(`Batch processing failed: ${error.message}`);
        }
      }
      
      // Write to /logs/omai/ingestion.log
      await this.logIngestion({
        totalFiles: files.length,
        processedFiles,
        failedFiles,
        chunks: chunks.length,
        duration: Date.now() - startTime
      });
      
      // Write failed files to /logs/omai/failed_ingest.json
      if (failedFiles > 0) {
        await this.logFailedIngest(errors);
      }
      
      return {
        totalFiles: files.length,
        processedFiles,
        failedFiles,
        chunks,
        duration: Date.now() - startTime,
        errors
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      errors.push(`Indexing failed: ${error.message}`);
      
      await this.logIngestion({
        totalFiles: 0,
        processedFiles: 0,
        failedFiles: 1,
        chunks: 0,
        duration,
        error: error.message
      });
      
      return {
        totalFiles: 0,
        processedFiles: 0,
        failedFiles: 1,
        chunks: [],
        duration,
        errors
      };
    }
  }

  /**
   * Implement file system watch mode
   */
  async startWatchMode(): Promise<void> {
    if (!this.config.watchMode) {
      return;
    }
    
    try {
      console.log('Starting file system watch mode');
      
      // Watch the base directory
      const watcher = fs.watch(this.config.basePath, { recursive: true });
      
      watcher.on('change', async (eventType, filename) => {
        if (filename) {
          const fullPath = path.join(this.config.basePath, filename);
          
          if (this.shouldIndexFile(fullPath) && !this.shouldExclude(fullPath)) {
            console.log(`File changed: ${filename} (${eventType})`);
            
            try {
              // Process the changed file
              const chunks = await processFiles([fullPath]);
              
              // Update the index
              await this.updateIndex(chunks);
              
              console.log(`Updated index for: ${filename}`);
            } catch (error) {
              console.error(`Failed to update index for ${filename}:`, error);
            }
          }
        }
      });
      
      watcher.on('error', (error) => {
        console.error('File watcher error:', error);
      });
      
      this.watchers.set(this.config.basePath, watcher);
      
    } catch (error) {
      console.error('Failed to start watch mode:', error);
    }
  }

  /**
   * Stop watch mode
   */
  async stopWatchMode(): Promise<void> {
    for (const [path, watcher] of this.watchers) {
      watcher.close();
      console.log(`Stopped watching: ${path}`);
    }
    this.watchers.clear();
  }

  /**
   * Update index with new chunks
   */
  private async updateIndex(chunks: any[]): Promise<void> {
    try {
      // TODO: Implement actual index update logic
      // This would typically involve:
      // 1. Adding new chunks to the vector store
      // 2. Updating the knowledge graph
      // 3. Refreshing search indices
      
      console.log(`Updated index with ${chunks.length} new chunks`);
    } catch (error) {
      console.error('Failed to update index:', error);
    }
  }

  /**
   * Write to /logs/omai/ingestion.log
   */
  private async logIngestion(data: any): Promise<void> {
    try {
      const logDir = path.join(process.cwd(), 'logs', 'omai');
      await fs.mkdir(logDir, { recursive: true });
      
      const logFile = path.join(logDir, 'ingestion.log');
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${JSON.stringify(data)}\n`;
      
      await fs.appendFile(logFile, logEntry);
    } catch (error) {
      console.error('Failed to write ingestion log:', error);
    }
  }

  /**
   * Write to /logs/omai/failed_ingest.json
   */
  private async logFailedIngest(errors: string[]): Promise<void> {
    try {
      const logDir = path.join(process.cwd(), 'logs', 'omai');
      await fs.mkdir(logDir, { recursive: true });
      
      const logFile = path.join(logDir, 'failed_ingest.json');
      const data = {
        timestamp: new Date().toISOString(),
        errors
      };
      
      await fs.writeFile(logFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to write failed ingest log:', error);
    }
  }

  /**
   * Get indexing statistics
   */
  async getStats(): Promise<{
    totalFiles: number;
    indexedFiles: number;
    lastIndexed: Date;
    watchMode: boolean;
  }> {
    try {
      const files = await this.scanDirectory(this.config.basePath);
      
      return {
        totalFiles: files.length,
        indexedFiles: files.length, // TODO: Get actual indexed count
        lastIndexed: new Date(), // TODO: Get actual last indexed time
        watchMode: this.config.watchMode
      };
    } catch (error) {
      console.error('Failed to get indexing stats:', error);
      return {
        totalFiles: 0,
        indexedFiles: 0,
        lastIndexed: new Date(),
        watchMode: this.config.watchMode
      };
    }
  }
}

/**
 * Create and configure a knowledge indexer
 */
export function createKnowledgeIndexer(config?: Partial<IndexingConfig>): KnowledgeIndexer {
  return new KnowledgeIndexer(config);
} 