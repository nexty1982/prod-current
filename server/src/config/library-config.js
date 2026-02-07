/**
 * OM-Library Configuration
 * Centralized configuration for library paths, validation, and settings
 */

const path = require('path');

// Base paths
const PROD_ROOT = process.env.PROD_ROOT || '/var/www/orthodoxmetrics/prod';
const PROJECT_ROOT = path.join(__dirname, '../../../');

// Library paths
const LIBRARY_CONFIG = {
  // Where library copies are stored
  libraryDir: path.join(PROJECT_ROOT, 'front-end/public/docs/library'),
  
  // Index file location
  indexFile: path.join(PROJECT_ROOT, '.analysis/library-index.json'),
  
  // Processed files log
  processedLog: path.join(PROJECT_ROOT, '.analysis/library-processed.json'),
  
  // Backup directory for index
  backupDir: path.join(PROJECT_ROOT, '.analysis/library-backups'),
  
  // Maximum file size to index (10MB)
  maxFileSize: 10 * 1024 * 1024,
  
  // Supported file extensions
  supportedExtensions: ['.md', '.txt', '.pdf', '.docx'],
  
  // Category mappings (path patterns → category)
  categories: {
    technical: ['dev', 'DEVELOPMENT', 'REFERENCE', 'FEATURES', 'technical'],
    ops: ['ops', 'OPERATIONS', 'operational', 'deployment', 'maintenance'],
    recovery: ['records', 'ocr', 'ARCHIVE', 'recovery', 'backup'],
  },
  
  // Pagination defaults
  pagination: {
    defaultPageSize: 25,
    maxPageSize: 100,
  },
  
  // Sorting configuration
  sorting: {
    allowedFields: ['title', 'category', 'source', 'size', 'modified', 'created'],
    defaultField: 'modified',
    defaultDirection: 'desc',
  },
  
  // Related file detection thresholds
  relationships: {
    // Minimum similarity score (0-1) for filename similarity
    filenameSimilarityThreshold: 0.6,
    
    // Minimum common words for relationship
    minCommonWords: 2,
    
    // Minimum word length to count
    minWordLength: 3,
  },
  
  // Time-based grouping buckets (in milliseconds)
  timeGroups: {
    today: 0,
    yesterday: 24 * 60 * 60 * 1000,
    thisWeek: 7 * 24 * 60 * 60 * 1000,
    lastWeek: 14 * 24 * 60 * 60 * 1000,
    thisMonth: 30 * 24 * 60 * 60 * 1000,
    older: Infinity,
  },
};

/**
 * Path validation - only allow paths under these roots
 * This prevents directory traversal attacks
 */
const PATH_ALLOWLIST = [
  path.join(PROD_ROOT, 'docs'),
  path.join(PROJECT_ROOT, 'docs'),
  '/var/www/orthodoxmetrics/prod/docs',
  '/var/www/orthodoxmetrics/prod/front-end/public/docs',
];

/**
 * Validate that a path is safe to scan
 * @param {string} scanPath - Path to validate
 * @returns {boolean} - True if path is safe
 */
function isPathAllowed(scanPath) {
  const normalized = path.normalize(scanPath);
  
  // Check against allowlist
  return PATH_ALLOWLIST.some(allowed => {
    const normalizedAllowed = path.normalize(allowed);
    return normalized.startsWith(normalizedAllowed);
  });
}

/**
 * Validate path and throw error if invalid
 * @param {string} scanPath - Path to validate
 * @throws {Error} - If path is not allowed
 */
function validatePath(scanPath) {
  if (!scanPath) {
    throw new Error('Path is required');
  }
  
  // Check for path traversal attempts
  if (scanPath.includes('..')) {
    throw new Error('Path traversal not allowed');
  }
  
  // Must be absolute path
  if (!path.isAbsolute(scanPath)) {
    throw new Error('Path must be absolute');
  }
  
  // Check against allowlist
  if (!isPathAllowed(scanPath)) {
    throw new Error(`Path not in allowlist. Must be under: ${PATH_ALLOWLIST.join(', ')}`);
  }
  
  return true;
}

/**
 * Get MIME type for file extension
 * @param {string} filename - Filename
 * @returns {string} - MIME type
 */
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  
  const mimeTypes = {
    '.md': 'text/markdown',
    '.txt': 'text/plain',
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Check if file type is previewable in browser
 * @param {string} filename - Filename
 * @returns {boolean} - True if can preview
 */
function isPreviewable(filename) {
  const ext = path.extname(filename).toLowerCase();
  const previewable = ['.md', '.txt', '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.svg'];
  return previewable.includes(ext);
}

module.exports = {
  LIBRARY_CONFIG,
  PATH_ALLOWLIST,
  isPathAllowed,
  validatePath,
  getMimeType,
  isPreviewable,
};
