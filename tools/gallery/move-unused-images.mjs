#!/usr/bin/env node
/**
 * Move Unused Images Script
 * 
 * Moves all images not used in the codebase to front-end/public/images/unused/
 * Then deletes empty directories.
 * 
 * Usage:
 *   node tools/gallery/move-unused-images.mjs --dry-run     # Preview changes
 *   node tools/gallery/move-unused-images.mjs --apply       # Apply moves
 *   node tools/gallery/move-unused-images.mjs --limit 10    # Test with limit
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get repo root using git or fallback to calculated path
function getRepoRoot() {
  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf8',
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    
    if (fs.existsSync(gitRoot)) {
      return gitRoot;
    }
  } catch (error) {
    // Git not available, use fallback
  }
  
  // Fallback: calculate from script location
  const scriptDir = __dirname;
  const toolsDir = path.resolve(scriptDir, '..');
  const repoRoot = path.resolve(toolsDir, '..');
  
  return repoRoot;
}

const REPO_ROOT = getRepoRoot();
const IMAGES_ROOT = path.join(REPO_ROOT, 'front-end', 'public', 'images');
const UNUSED_DIR = path.join(IMAGES_ROOT, 'unused');

// Image extensions to scan
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'];

// Directories to exclude from scanning
const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  'coverage',
  '.next',
  'dist',
  'build',
  '.cache',
  '.turbo',
  'unused' // Don't scan the unused directory itself
]);

// File extensions to scan for references
const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx',
  '.css', '.scss', '.sass',
  '.html', '.htm',
  '.json',
  '.md',
  '.txt'
]);

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--apply') ? false : true;
const hasApply = args.includes('--apply');
const limit = args.includes('--limit') 
  ? parseInt(args[args.indexOf('--limit') + 1], 10) 
  : null;

console.log('📦 Move Unused Images Script');
console.log(`📁 Repo root: ${REPO_ROOT}`);
console.log(`🖼️  Images root: ${IMAGES_ROOT}`);
console.log(`📂 Unused directory: ${UNUSED_DIR}`);
console.log(`📋 Mode: ${isDryRun ? 'DRY RUN' : 'APPLY'}`);
if (limit) console.log(`🔢 Limit: ${limit} images`);
console.log('');

// Verify images root exists
if (!fs.existsSync(IMAGES_ROOT)) {
  console.error(`❌ Images root does not exist: ${IMAGES_ROOT}`);
  process.exit(1);
}

/**
 * Find all image files recursively
 */
function findImages(dir, basePath = '') {
  const images = [];
  
  if (!fs.existsSync(dir)) {
    return images;
  }
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.name.startsWith('.') || EXCLUDE_DIRS.has(entry.name)) {
        continue;
      }
      
      const fullPath = path.join(dir, entry.name);
      const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
      
      if (entry.isDirectory()) {
        images.push(...findImages(fullPath, relativePath));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (IMAGE_EXTENSIONS.includes(ext)) {
          images.push({
            name: entry.name,
            relPath: relativePath,
            fullPath: fullPath,
            ext: ext,
            size: fs.statSync(fullPath).size
          });
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️  Error reading directory ${dir}: ${error.message}`);
  }
  
  return images;
}

/**
 * Find all source files to scan for references
 */
function findSourceFiles(dir, basePath = '') {
  const files = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.name.startsWith('.') || EXCLUDE_DIRS.has(entry.name)) {
        continue;
      }
      
      const fullPath = path.join(dir, entry.name);
      const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
      
      if (entry.isDirectory()) {
        files.push(...findSourceFiles(fullPath, relativePath));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SOURCE_EXTENSIONS.has(ext)) {
          files.push({
            relPath: relativePath,
            fullPath: fullPath,
            ext: ext
          });
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️  Error reading directory ${dir}: ${error.message}`);
  }
  
  return files;
}

/**
 * Generate all possible reference patterns for an image
 */
function generateReferencePatterns(image) {
  const patterns = [];
  const { relPath, name } = image;
  
  // Absolute web paths
  patterns.push(`/images/${relPath}`);
  patterns.push(`images/${relPath}`);
  patterns.push(`/public/images/${relPath}`);
  patterns.push(`public/images/${relPath}`);
  
  // Relative paths (various forms)
  patterns.push(relPath);
  patterns.push(`./${relPath}`);
  patterns.push(`../images/${relPath}`);
  
  // Filename only
  patterns.push(name);
  patterns.push(`"${name}"`);
  patterns.push(`'${name}'`);
  patterns.push(`\`${name}\``);
  
  // Without extension (for dynamic imports)
  const nameWithoutExt = path.basename(relPath, path.extname(relPath));
  patterns.push(nameWithoutExt);
  
  // Path components
  const parts = relPath.split(/[/\\]/);
  if (parts.length > 1) {
    patterns.push(parts[parts.length - 1]); // filename
    patterns.push(parts.slice(-2).join('/')); // last two parts
  }
  
  // Case variations for Windows compatibility
  patterns.push(relPath.toLowerCase());
  patterns.push(name.toLowerCase());
  
  return [...new Set(patterns)]; // Remove duplicates
}

/**
 * Scan a file for image references
 */
function scanFileForReferences(filePath, patterns, image) {
  const matches = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // Check each pattern
      for (const pattern of patterns) {
        // Case-sensitive match
        if (line.includes(pattern)) {
          // Extract context (30 chars before and after)
          const index = line.indexOf(pattern);
          const start = Math.max(0, index - 30);
          const end = Math.min(line.length, index + pattern.length + 30);
          const snippet = line.substring(start, end).trim();
          
          matches.push({
            file: filePath,
            line: lineNum,
            pattern: pattern,
            snippet: snippet
          });
          break; // Found a match, no need to check other patterns for this line
        }
        
        // Case-insensitive match (for Windows compatibility)
        if (pattern !== pattern.toLowerCase() && line.toLowerCase().includes(pattern.toLowerCase())) {
          const lowerLine = line.toLowerCase();
          const index = lowerLine.indexOf(pattern.toLowerCase());
          const start = Math.max(0, index - 30);
          const end = Math.min(line.length, index + pattern.length + 30);
          const snippet = line.substring(start, end).trim();
          
          matches.push({
            file: filePath,
            line: lineNum,
            pattern: pattern.toLowerCase(),
            snippet: snippet,
            caseInsensitive: true
          });
          break; // Found a match
        }
      }
    }
  } catch (error) {
    // Skip files that can't be read (binary, permissions, etc.)
  }
  
  return matches;
}

/**
 * Normalize filename for safe storage
 */
function normalizeFilename(filename) {
  // Lowercase
  let normalized = filename.toLowerCase();
  
  // Replace spaces with hyphens
  normalized = normalized.replace(/\s+/g, '-');
  
  // Remove weird characters except ._- and alphanumeric
  normalized = normalized.replace(/[^a-z0-9._-]/gi, '');
  
  // Remove multiple consecutive hyphens/underscores
  normalized = normalized.replace(/[-_]+/g, (match) => match[0]);
  
  return normalized;
}

/**
 * Generate unique filename if collision exists
 */
function ensureUniqueFilename(targetDir, filename) {
  const baseName = path.basename(filename, path.extname(filename));
  const ext = path.extname(filename);
  let finalName = filename; // Keep original filename initially
  
  // Check if file exists
  const targetPath = path.join(targetDir, finalName);
  if (!fs.existsSync(targetPath)) {
    return finalName;
  }
  
  // Generate hash suffix if collision
  const hash = crypto.createHash('sha256')
    .update(filename + Date.now())
    .digest('hex')
    .substring(0, 8);
  
  finalName = `${baseName}__${hash}${ext}`;
  return finalName;
}

/**
 * Find all empty directories recursively
 */
function findEmptyDirectories(dir, basePath = '') {
  const emptyDirs = [];
  
  if (!fs.existsSync(dir)) {
    return emptyDirs;
  }
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    const files = entries.filter(e => e.isFile());
    const dirs = entries.filter(e => e.isDirectory());
    
    // Process subdirectories first (depth-first)
    for (const entry of dirs) {
      // Skip the unused directory itself
      if (entry.name === 'unused' && basePath === '') {
        continue;
      }
      
      const fullPath = path.join(dir, entry.name);
      const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
      
      // Recursively find empty directories in subdirectories
      const subEmptyDirs = findEmptyDirectories(fullPath, relativePath);
      emptyDirs.push(...subEmptyDirs);
    }
    
    // Check if this directory itself is empty
    if (files.length === 0 && entry.name !== 'unused') {
      // Double-check: verify it's truly empty (no hidden files, etc.)
      const allEntries = fs.readdirSync(dir);
      if (allEntries.length === 0 || allEntries.every(e => e.startsWith('.') || e === 'unused')) {
        emptyDirs.push({
          path: dir,
          relPath: basePath || path.basename(dir)
        });
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }
  
  return emptyDirs;
}

/**
 * Sort directories by depth (deepest first) so we can delete nested empty dirs
 */
function sortByDepth(dirs) {
  return dirs.sort((a, b) => {
    const depthA = a.relPath.split('/').length;
    const depthB = b.relPath.split('/').length;
    return depthB - depthA; // Deepest first
  });
}

/**
 * Main execution
 */
async function main() {
  console.log('📊 Step 1: Discovering images...');
  const allImages = findImages(IMAGES_ROOT);
  console.log(`   Found ${allImages.length} images`);
  
  if (limit) {
    allImages.splice(limit);
    console.log(`   Limited to ${allImages.length} images for testing`);
  }
  
  console.log('');
  console.log('📊 Step 2: Discovering source files...');
  const sourceDirs = [
    path.join(REPO_ROOT, 'front-end', 'src'),
    path.join(REPO_ROOT, 'server', 'src'),
    path.join(REPO_ROOT, 'server', 'dist'),
    path.join(REPO_ROOT, 'docs'),
    path.join(REPO_ROOT, 'server', 'routes'),
    path.join(REPO_ROOT, 'server', 'services')
  ];
  
  const allSourceFiles = [];
  for (const dir of sourceDirs) {
    if (fs.existsSync(dir)) {
      const files = findSourceFiles(dir);
      allSourceFiles.push(...files);
    }
  }
  
  console.log(`   Found ${allSourceFiles.length} source files to scan`);
  
  if (allSourceFiles.length === 0) {
    console.error('❌ No source files found to scan! Check paths.');
    process.exit(1);
  }
  
  console.log('');
  console.log('📊 Step 3: Scanning for references...');
  const usedImages = new Map();
  
  let processed = 0;
  for (const image of allImages) {
    processed++;
    if (processed % 50 === 0) {
      console.log(`   Scanned ${processed}/${allImages.length} images...`);
    }
    
    const patterns = generateReferencePatterns(image);
    const matches = [];
    
    for (const sourceFile of allSourceFiles) {
      const fileMatches = scanFileForReferences(sourceFile.fullPath, patterns, image);
      if (fileMatches.length > 0) {
        matches.push(...fileMatches);
      }
    }
    
    if (matches.length > 0) {
      usedImages.set(image.relPath, {
        relPath: image.relPath,
        matches: matches.slice(0, 5) // Limit to first 5 matches
      });
    }
  }
  
  console.log(`   ✅ Scanning complete`);
  console.log('');
  
  // Separate used and unused
  const used = Array.from(usedImages.values());
  const unused = allImages
    .filter(img => !usedImages.has(img.relPath))
    .map(img => ({
      relPath: img.relPath,
      fullPath: img.fullPath,
      name: img.name
    }));
  
  console.log('📊 Results:');
  console.log(`   Total images: ${allImages.length}`);
  console.log(`   Used: ${used.length}`);
  console.log(`   Unused: ${unused.length}`);
  console.log('');
  
  // Generate move plan
  console.log('📊 Step 4: Generating move plan...');
  const movePlan = [];
  const collisions = [];
  
  // Ensure unused directory exists
  if (!isDryRun) {
    if (!fs.existsSync(UNUSED_DIR)) {
      fs.mkdirSync(UNUSED_DIR, { recursive: true });
      console.log(`   Created unused directory: ${UNUSED_DIR}`);
    }
  }
  
  for (const image of unused) {
    const filename = path.basename(image.relPath);
    const uniqueName = ensureUniqueFilename(UNUSED_DIR, filename);
    const targetPath = path.join(UNUSED_DIR, uniqueName);
    const targetRelPath = `unused/${uniqueName}`;
    
    if (uniqueName !== filename) {
      collisions.push({
        original: image.relPath,
        resolved: targetRelPath
      });
    }
    
    // Only plan move if it's not already in unused directory
    if (!image.relPath.startsWith('unused/')) {
      movePlan.push({
        source: image.relPath,
        sourceFull: image.fullPath,
        target: targetRelPath,
        targetFull: targetPath,
        filename: uniqueName
      });
    }
  }
  
  console.log(`   Planned moves: ${movePlan.length}`);
  if (collisions.length > 0) {
    console.log(`   Resolved collisions: ${collisions.length}`);
  }
  console.log('');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN - Preview of changes:');
    console.log('');
    
    if (movePlan.length === 0) {
      console.log('   No moves planned.');
    } else {
      console.log(`   Will move ${movePlan.length} unused images to unused/:`);
      movePlan.slice(0, 20).forEach((move, idx) => {
        console.log(`   ${idx + 1}. ${move.source} -> ${move.target}`);
      });
      if (movePlan.length > 20) {
        console.log(`   ... and ${movePlan.length - 20} more`);
      }
    }
    
    console.log('');
    console.log('ℹ️  To apply these changes, run with --apply flag');
    console.log('');
  } else {
    // Apply moves
    console.log('🔧 APPLYING MOVES...');
    console.log('');
    
    const moves = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const move of movePlan) {
      try {
        // Move file
        fs.renameSync(move.sourceFull, move.targetFull);
        
        moves.push({
          source: move.source,
          target: move.target,
          success: true,
          timestamp: new Date().toISOString()
        });
        
        successCount++;
      } catch (error) {
        moves.push({
          source: move.source,
          target: move.target,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        errorCount++;
        console.error(`   ❌ Failed to move ${move.source}: ${error.message}`);
      }
    }
    
    console.log(`✅ Successfully moved: ${successCount}`);
    if (errorCount > 0) {
      console.log(`❌ Failed moves: ${errorCount}`);
    }
    console.log('');
    
    // Write move log
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const moveLogPath = path.join(__dirname, `unused-images-moves-${timestamp}.json`);
    fs.writeFileSync(moveLogPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      total_moves: movePlan.length,
      successful: successCount,
      failed: errorCount,
      moves: moves
    }, null, 2));
    
    console.log(`📄 Move log written: ${moveLogPath}`);
    console.log('');
    
    // Step 5: Clean up empty directories
    console.log('📊 Step 5: Cleaning up empty directories...');
    const emptyDirs = findEmptyDirectories(IMAGES_ROOT);
    const sortedDirs = sortByDepth(emptyDirs);
    
    // Filter out the unused directory
    const toDelete = sortedDirs.filter(dir => {
      const parts = dir.relPath.split('/');
      return parts[0] !== 'unused';
    });
    
    console.log(`   Found ${toDelete.length} empty directories`);
    console.log('');
    
    if (toDelete.length > 0) {
      let deleted = 0;
      let failed = 0;
      
      for (const dir of toDelete) {
        try {
          // Double-check directory is still empty before deleting
          const entries = fs.readdirSync(dir.path);
          if (entries.length === 0 || entries.every(e => e.startsWith('.'))) {
            fs.rmdirSync(dir.path);
            console.log(`   ✅ Deleted: ${dir.relPath}`);
            deleted++;
          } else {
            console.log(`   ⚠️  Skipped (no longer empty): ${dir.relPath}`);
          }
        } catch (error) {
          console.error(`   ❌ Failed to delete ${dir.relPath}: ${error.message}`);
          failed++;
        }
      }
      
      console.log('');
      console.log(`✅ Deleted ${deleted} empty directories`);
      if (failed > 0) {
        console.log(`❌ Failed: ${failed}`);
      }
    } else {
      console.log('   No empty directories to clean');
    }
    
    console.log('');
    console.log('✅ Process complete!');
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
