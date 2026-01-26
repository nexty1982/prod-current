const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

/**
 * Public Images Filesystem Service
 * 
 * Provides safe path resolution and file operations for front-end/public/images/**
 * with protection against path traversal attacks.
 * 
 * Total lines: ~200
 */

let _imagesRoot = null;

/**
 * Get the repository root directory
 * Uses git rev-parse if available, otherwise falls back to process.cwd() + known structure
 * 
 * @returns {string} Absolute path to repository root
 */
function getRepoRoot() {
  try {
    // Try git rev-parse first (most reliable)
    const gitRoot = execSync('git rev-parse --show-toplevel', { 
      encoding: 'utf8',
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    
    if (fs.existsSync(gitRoot)) {
      return gitRoot;
    }
  } catch (error) {
    // Git not available or not in a git repo, fall back to path resolution
  }
  
  // Fallback: resolve from current file location
  // server/src/services/publicImagesFs.js -> server/src/services -> server/src -> server -> repo root
  const serviceDir = __dirname; // server/src/services
  const srcDir = path.resolve(serviceDir, '..'); // server/src
  const serverDir = path.resolve(srcDir, '..'); // server
  const repoRoot = path.resolve(serverDir, '..'); // repo root
  
  // Verify structure exists
  if (fs.existsSync(path.join(repoRoot, 'front-end', 'public', 'images'))) {
    return repoRoot;
  }
  
  // Production fallback
  if (process.env.NODE_ENV === 'production') {
    const prodRoot = '/var/www/orthodoxmetrics/prod';
    if (fs.existsSync(path.join(prodRoot, 'front-end', 'public', 'images'))) {
      return prodRoot;
    }
  }
  
  // Last resort: use process.cwd()
  const cwdRoot = process.cwd();
  if (fs.existsSync(path.join(cwdRoot, 'front-end', 'public', 'images'))) {
    return cwdRoot;
  }
  
  throw new Error(`Could not determine repository root. Tried: ${repoRoot}, ${cwdRoot}`);
}

/**
 * Get the absolute path to the public images root directory
 * Caches the result for performance
 * 
 * IMPORTANT: This function does NOT create directories. It only resolves the path.
 * Directory creation should only happen in POST /mkdir and /upload endpoints.
 * 
 * @returns {string} Absolute path to front-end/public/images
 * @throws {Error} If the path cannot be determined or does not exist
 */
function getImagesRoot() {
  if (_imagesRoot) {
    return _imagesRoot;
  }
  
  // Check for environment override first (highest priority)
  if (process.env.PUBLIC_IMAGES_ROOT) {
    const envRoot = process.env.PUBLIC_IMAGES_ROOT;
    if (fs.existsSync(envRoot)) {
      _imagesRoot = envRoot;
      console.log(`✅ Using PUBLIC_IMAGES_ROOT: ${_imagesRoot}`);
      return _imagesRoot;
    } else {
      throw new Error(`PUBLIC_IMAGES_ROOT environment variable set to non-existent path: ${envRoot}`);
    }
  }
  
  // In production, use the production path as default
  if (process.env.NODE_ENV === 'production') {
    const prodPath = '/var/www/orthodoxmetrics/prod/front-end/public/images';
    if (fs.existsSync(prodPath)) {
      _imagesRoot = prodPath;
      console.log(`✅ Using production images root: ${_imagesRoot}`);
      return _imagesRoot;
    } else {
      console.warn(`⚠️ Production path does not exist: ${prodPath}, falling back to dynamic resolution`);
    }
  }
  
  // Resolve relative to server file location (not process.cwd())
  // server/src/services/publicImagesFs.js -> server/src -> server -> repo root
  const serviceDir = __dirname; // server/src/services
  const srcDir = path.resolve(serviceDir, '..'); // server/src
  const serverDir = path.resolve(srcDir, '..'); // server
  const repoRoot = path.resolve(serverDir, '..'); // repo root
  _imagesRoot = path.join(repoRoot, 'front-end', 'public', 'images');
  
  // Verify the path exists - DO NOT create it
  if (!fs.existsSync(_imagesRoot)) {
    throw new Error(
      `Public images root directory does not exist: ${_imagesRoot}\n` +
      `Computed from: serviceDir=${serviceDir}, repoRoot=${repoRoot}\n` +
      `NODE_ENV=${process.env.NODE_ENV}\n` +
      `Set PUBLIC_IMAGES_ROOT environment variable to override, or create the directory manually.`
    );
  }
  
  console.log(`✅ Using dynamically resolved images root: ${_imagesRoot}`);
  return _imagesRoot;
}

/**
 * Resolve a relative path to an absolute path under the images root
 * Prevents path traversal attacks by ensuring the resolved path stays within images root
 * 
 * @param {string} relativePath - Relative path like "gallery/foo.png" or "banners/home.png"
 * @returns {string} Absolute path under images root
 * @throws {Error} If path traversal is detected or path is invalid
 */
function resolveSafePath(relativePath) {
  if (!relativePath || typeof relativePath !== 'string') {
    throw new Error('Path must be a non-empty string');
  }
  
  // Normalize: remove leading/trailing slashes, replace backslashes
  const normalized = relativePath.replace(/^[/\\]]+|[/\\]]+$/g, '').replace(/\\/g, '/');
  
  // Reject paths with ".." segments (path traversal)
  if (normalized.includes('..')) {
    throw new Error('Path traversal detected: ".." segments are not allowed');
  }
  
  // Reject absolute paths
  if (path.isAbsolute(normalized)) {
    throw new Error('Absolute paths are not allowed. Use relative paths from images root.');
  }
  
  const imagesRoot = getImagesRoot();
  const resolved = path.resolve(imagesRoot, normalized);
  
  // Ensure resolved path is still within images root (prevent path traversal)
  if (!resolved.startsWith(imagesRoot + path.sep) && resolved !== imagesRoot) {
    throw new Error(`Path traversal detected: resolved path "${resolved}" is outside images root "${imagesRoot}"`);
  }
  
  return resolved;
}

/**
 * Convert an absolute path back to a relative path from images root
 * 
 * @param {string} absolutePath - Absolute path under images root
 * @returns {string} Relative path from images root (e.g., "gallery/foo.png")
 */
function getRelativePath(absolutePath) {
  const imagesRoot = getImagesRoot();
  const relative = path.relative(imagesRoot, absolutePath);
  return relative.replace(/\\/g, '/'); // Normalize to forward slashes
}

/**
 * Convert a relative path to a client-facing URL path
 * 
 * @param {string} relativePath - Relative path from images root
 * @returns {string} URL path like "/images/gallery/foo.png"
 */
function getUrlPath(relativePath) {
  const normalized = relativePath.replace(/^\/+/, '').replace(/\\/g, '/');
  return `/images/${normalized}`;
}

/**
 * Check if a path exists and is a directory
 * 
 * @param {string} relativePath - Relative path from images root
 * @returns {boolean}
 */
function isDirectory(relativePath) {
  try {
    const absPath = resolveSafePath(relativePath);
    const stats = fs.statSync(absPath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
}

/**
 * Check if a path exists and is a file
 * 
 * @param {string} relativePath - Relative path from images root
 * @returns {boolean}
 */
function isFile(relativePath) {
  try {
    const absPath = resolveSafePath(relativePath);
    const stats = fs.statSync(absPath);
    return stats.isFile();
  } catch (error) {
    return false;
  }
}

/**
 * Get file stats safely
 * 
 * @param {string} relativePath - Relative path from images root
 * @returns {object|null} Stats object or null if file doesn't exist
 */
function getStats(relativePath) {
  try {
    const absPath = resolveSafePath(relativePath);
    return fs.statSync(absPath);
  } catch (error) {
    return null;
  }
}

/**
 * Sanitize a filename for safe storage
 * Removes or replaces problematic characters
 * 
 * @param {string} filename - Original filename
 * @param {string} mode - "keep" | "slug" | "hash"
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(filename, mode = 'keep') {
  if (mode === 'keep') {
    // Minimal sanitization: remove path separators and null bytes
    return filename.replace(/[/\\\0]/g, '').trim();
  } else if (mode === 'slug') {
    // Convert to URL-friendly slug
    return filename
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  } else if (mode === 'hash') {
    // Use hash-based naming (caller should provide hash)
    const ext = path.extname(filename);
    return `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
  }
  
  return filename;
}

module.exports = {
  getImagesRoot,
  resolveSafePath,
  getRelativePath,
  getUrlPath,
  isDirectory,
  isFile,
  getStats,
  sanitizeFilename,
};
