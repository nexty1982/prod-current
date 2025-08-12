import * as fs from 'fs/promises';
import * as path from 'path';
import { addToEmbeddings } from './embeddings/context-loader';
import { logger } from './utils/logger';
import { OMAIConfig } from './config';

interface IngestOptions {
  include: string[];
  extensions: string[];
  exclude?: string[];
  maxFileSize?: number;
  batchSize?: number;
}

interface IngestResult {
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  totalSize: number;
  duration: number;
  errors: string[];
}

/**
 * Main ingestion function to index files into the embedding database
 */
export async function indexDocs(options: IngestOptions): Promise<IngestResult> {
  const startTime = Date.now();
  const result: IngestResult = {
    totalFiles: 0,
    processedFiles: 0,
    failedFiles: 0,
    totalSize: 0,
    duration: 0,
    errors: []
  };

  try {
    logger.info('Starting document ingestion', { options });
    
    // Collect all files to process
    const files = await collectFiles(options);
    result.totalFiles = files.length;
    
    logger.info(`Found ${files.length} files to process`);
    
    // Process files in batches
    const batchSize = options.batchSize || OMAIConfig.batchSize;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      await processBatch(batch, result);
      
      logger.info(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(files.length / batchSize)}`);
    }
    
    result.duration = Date.now() - startTime;
    logger.info('Document ingestion completed', result);
    
    return result;
    
  } catch (error) {
    logger.error('Document ingestion failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    result.duration = Date.now() - startTime;
    return result;
  }
}

/**
 * Collect all files matching the criteria
 */
async function collectFiles(options: IngestOptions): Promise<string[]> {
  const files: string[] = [];
  
  for (const includePath of options.include) {
    try {
      const resolvedPath = path.resolve(includePath);
      const stats = await fs.stat(resolvedPath);
      
      if (stats.isFile()) {
        if (shouldIncludeFile(resolvedPath, options)) {
          files.push(resolvedPath);
        }
      } else if (stats.isDirectory()) {
        const dirFiles = await collectFilesFromDirectory(resolvedPath, options);
        files.push(...dirFiles);
      }
    } catch (error) {
      logger.warn(`Failed to process path: ${includePath}`, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
  
  return files;
}

/**
 * Recursively collect files from a directory
 */
async function collectFilesFromDirectory(dirPath: string, options: IngestOptions): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      // Skip excluded paths
      if (options.exclude && options.exclude.some(exclude => fullPath.includes(exclude))) {
        continue;
      }
      
      if (entry.isFile()) {
        if (shouldIncludeFile(fullPath, options)) {
          files.push(fullPath);
        }
      } else if (entry.isDirectory()) {
        // Skip node_modules and other common exclude directories
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
          const subFiles = await collectFilesFromDirectory(fullPath, options);
          files.push(...subFiles);
        }
      }
    }
  } catch (error) {
    logger.warn(`Failed to read directory: ${dirPath}`, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
  
  return files;
}

/**
 * Check if a file should be included based on options
 */
function shouldIncludeFile(filePath: string, options: IngestOptions): boolean {
  const ext = path.extname(filePath).toLowerCase();
  
  // Check extension
  if (!options.extensions.includes(ext)) {
    return false;
  }
  
  // Check file size
  const maxSize = options.maxFileSize || 1024 * 1024; // 1MB default
  try {
    const stats = fs.statSync(filePath);
    if (stats.size > maxSize) {
      return false;
    }
  } catch {
    return false;
  }
  
  return true;
}

/**
 * Process a batch of files
 */
async function processBatch(files: string[], result: IngestResult): Promise<void> {
  const promises = files.map(async (filePath) => {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const metadata = {
        source: filePath,
        fileType: path.extname(filePath),
        tags: extractTags(filePath, content)
      };
      
      await addToEmbeddings(content, metadata);
      
      result.processedFiles++;
      result.totalSize += content.length;
      
    } catch (error) {
      logger.error(`Failed to process file: ${filePath}`, { error: error instanceof Error ? error.message : 'Unknown error' });
      result.failedFiles++;
      result.errors.push(`Failed to process ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
  
  await Promise.all(promises);
}

/**
 * Extract tags from file path and content
 */
function extractTags(filePath: string, content: string): string[] {
  const tags: string[] = [];
  
  // Extract tags from path
  const pathParts = filePath.split(path.sep);
  tags.push(...pathParts.filter(part => part.length > 0));
  
  // Extract tags from content
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('react') || lowerContent.includes('jsx')) {
    tags.push('react', 'frontend');
  }
  
  if (lowerContent.includes('typescript') || lowerContent.includes('interface')) {
    tags.push('typescript');
  }
  
  if (lowerContent.includes('sql') || lowerContent.includes('database')) {
    tags.push('sql', 'database');
  }
  
  if (lowerContent.includes('api') || lowerContent.includes('endpoint')) {
    tags.push('api', 'backend');
  }
  
  if (lowerContent.includes('component') || lowerContent.includes('function')) {
    tags.push('component');
  }
  
  if (lowerContent.includes('test') || lowerContent.includes('spec')) {
    tags.push('test');
  }
  
  if (lowerContent.includes('config') || lowerContent.includes('setting')) {
    tags.push('config');
  }
  
  return [...new Set(tags)]; // Remove duplicates
}

/**
 * CLI function for running ingestion from command line
 */
export async function runIngestionCLI(): Promise<void> {
  const options: IngestOptions = {
    include: [
      './docs/OM-BigBook',
      './src',
      './server',
      './front-end/src'
    ],
    extensions: ['.md', '.tsx', '.ts', '.sql', '.json', '.js', '.jsx'],
    exclude: ['node_modules', 'dist', '.git', '.next'],
    maxFileSize: 1024 * 1024, // 1MB
    batchSize: 10
  };
  
  console.log('🚀 Starting OM-AI Document Ingestion...');
  console.log('📁 Scanning directories:', options.include);
  console.log('📄 File extensions:', options.extensions);
  
  const result = await indexDocs(options);
  
  console.log('\n✅ Ingestion Complete!');
  console.log(`📊 Results:`);
  console.log(`   Total files found: ${result.totalFiles}`);
  console.log(`   Successfully processed: ${result.processedFiles}`);
  console.log(`   Failed: ${result.failedFiles}`);
  console.log(`   Total size: ${(result.totalSize / 1024).toFixed(2)} KB`);
  console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);
  
  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(error => console.log(`   - ${error}`));
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  runIngestionCLI().catch(console.error);
} 