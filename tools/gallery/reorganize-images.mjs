#!/usr/bin/env node
/**
 * Reorganize Images Script
 * 
 * Reorganizes all images in front-end/public/images/** to ensure:
 * 1. All images are in one of 6 default directories (logos, backgrounds, icons, ui, records, misc)
 * 2. Unused images are moved to misc/unused
 * 3. Empty directories (except the 6 default ones) are deleted
 * 
 * Usage:
 *   node tools/gallery/reorganize-images.mjs --dry-run     # Preview changes
 *   node tools/gallery/reorganize-images.mjs --apply       # Apply reorganization
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get repo root
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
  
  const scriptDir = __dirname;
  const toolsDir = path.resolve(scriptDir, '..');
  const repoRoot = path.resolve(toolsDir, '..');
  
  return repoRoot;
}

const REPO_ROOT = getRepoRoot();
const IMAGES_ROOT = path.join(REPO_ROOT, 'front-end', 'public', 'images');

// The 6 default directories
const DEFAULT_DIRS = ['logos', 'backgrounds', 'icons', 'ui', 'records', 'misc'];
const UNUSED_DIR = path.join(IMAGES_ROOT, 'misc', 'unused');

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.tiff', '.bmp'];

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isApply = args.includes('--apply');

if (!isDryRun && !isApply) {
  console.error('❌ Error: Must specify --dry-run or --apply');
  process.exit(1);
}

// Check if image is used in codebase
function isImageUsed(imagePath, imageName) {
  const frontEndDir = path.join(REPO_ROOT, 'front-end');
  const serverDir = path.join(REPO_ROOT, 'server');
  const docsDir = path.join(REPO_ROOT, 'docs');
  
  const relativePath = path.relative(IMAGES_ROOT, imagePath).replace(/\\/g, '/');
  const imageUrlPath = `/images/${relativePath}`;
  const fileName = path.basename(imageName);
  const fileNameNoExt = path.basename(fileName, path.extname(fileName));
  
  const searchPatterns = [
    fileName,
    imageName,
    relativePath,
    imageUrlPath,
    `images/${relativePath}`,
    fileNameNoExt,
  ];
  
  const searchDirs = [
    path.join(frontEndDir, 'src'),
    path.join(serverDir, 'src'),
    path.join(serverDir, 'routes'),
    docsDir,
  ];
  
  const maxDepth = 5;
  const maxFileSize = 200 * 1024; // 200KB
  
  function searchInDirectory(dir, depth = 0) {
    if (depth > maxDepth || !fs.existsSync(dir)) return false;
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // Skip node_modules, dist, build, etc.
        if (entry.name.startsWith('.') || 
            entry.name === 'node_modules' || 
            entry.name === 'dist' || 
            entry.name === 'build') {
          continue;
        }
        
        if (entry.isDirectory()) {
          if (searchInDirectory(fullPath, depth + 1)) {
            return true;
          }
        } else if (entry.isFile()) {
          // Check common file extensions
          const ext = path.extname(entry.name).toLowerCase();
          if (['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.html', '.css', '.scss'].includes(ext)) {
            try {
              const stats = fs.statSync(fullPath);
              if (stats.size > maxFileSize) continue;
              
              const content = fs.readFileSync(fullPath, 'utf8');
              
              for (const pattern of searchPatterns) {
                if (content.includes(pattern)) {
                  return true;
                }
              }
            } catch (err) {
              // Skip files that can't be read
            }
          }
        }
      }
    } catch (err) {
      // Skip directories that can't be read
    }
    
    return false;
  }
  
  for (const searchDir of searchDirs) {
    if (fs.existsSync(searchDir) && searchInDirectory(searchDir)) {
      return true;
    }
  }
  
  return false;
}

// Get all image files recursively
function getAllImages(dir = IMAGES_ROOT, basePath = '', includeDefaultDirs = false) {
  const images = [];
  
  if (!fs.existsSync(dir)) {
    return images;
  }
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const currentDirName = path.basename(dir);
    const isDefaultDir = DEFAULT_DIRS.includes(currentDirName.toLowerCase());
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
      
      if (entry.isDirectory()) {
        // If we're in a default dir, recurse into it
        // If we're not in a default dir and this isn't a default dir, recurse
        // If this IS a default dir and we're not including them, skip
        if (includeDefaultDirs || !DEFAULT_DIRS.includes(entry.name.toLowerCase())) {
          images.push(...getAllImages(fullPath, relativePath, includeDefaultDirs));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (IMAGE_EXTENSIONS.includes(ext)) {
          images.push({
            name: entry.name,
            path: fullPath,
            relativePath: relativePath,
            dir: basePath,
            isInDefaultDir: isDefaultDir,
            currentDefaultDir: isDefaultDir ? currentDirName : null,
          });
        }
      }
    }
  } catch (err) {
    console.error(`Error reading ${dir}:`, err.message);
  }
  
  return images;
}

// Determine target directory for an image
function getTargetDirectory(imageName, currentDir) {
  const nameLower = imageName.toLowerCase();
  
  // Check filename patterns
  if (nameLower.includes('logo') || nameLower.includes('brand')) {
    return 'logos';
  }
  if (nameLower.includes('background') || nameLower.includes('bg') || nameLower.includes('wallpaper')) {
    return 'backgrounds';
  }
  if (nameLower.includes('icon') || nameLower.startsWith('icon-')) {
    return 'icons';
  }
  if (nameLower.includes('ui') || nameLower.includes('button') || nameLower.includes('component')) {
    return 'ui';
  }
  if (nameLower.includes('record') || nameLower.includes('data')) {
    return 'records';
  }
  
  // Default to misc
  return 'misc';
}

// Ensure directory exists
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    if (isApply) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📁 Created directory: ${path.relative(IMAGES_ROOT, dirPath)}`);
    } else {
      console.log(`📁 Would create directory: ${path.relative(IMAGES_ROOT, dirPath)}`);
    }
  }
}

// Move file
function moveFile(from, to) {
  if (isApply) {
    ensureDir(path.dirname(to));
    fs.renameSync(from, to);
    console.log(`✅ Moved: ${path.relative(IMAGES_ROOT, from)} → ${path.relative(IMAGES_ROOT, to)}`);
  } else {
    console.log(`📦 Would move: ${path.relative(IMAGES_ROOT, from)} → ${path.relative(IMAGES_ROOT, to)}`);
  }
}

// Delete empty directories (except default ones)
function deleteEmptyDirs(dir = IMAGES_ROOT, basePath = '') {
  if (!fs.existsSync(dir)) {
    return;
  }
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const dirName = path.basename(dir);
    
    // Don't delete default directories
    if (DEFAULT_DIRS.includes(dirName.toLowerCase())) {
      // But recurse into them to clean subdirectories
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subPath = path.join(dir, entry.name);
          deleteEmptyDirs(subPath, basePath ? `${basePath}/${entry.name}` : entry.name);
        }
      }
      return;
    }
    
    // Check if directory is empty
    if (entries.length === 0) {
      const relativePath = basePath || dirName;
      if (isApply) {
        fs.rmdirSync(dir);
        console.log(`🗑️  Deleted empty directory: ${relativePath}`);
      } else {
        console.log(`🗑️  Would delete empty directory: ${relativePath}`);
      }
      return;
    }
    
    // Recurse into subdirectories first
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subPath = path.join(dir, entry.name);
        const subRelativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
        deleteEmptyDirs(subPath, subRelativePath);
      }
    }
    
    // Check again after cleaning subdirectories
    const remainingEntries = fs.readdirSync(dir);
    if (remainingEntries.length === 0) {
      const relativePath = basePath || dirName;
      if (isApply) {
        fs.rmdirSync(dir);
        console.log(`🗑️  Deleted empty directory: ${relativePath}`);
      } else {
        console.log(`🗑️  Would delete empty directory: ${relativePath}`);
      }
    }
  } catch (err) {
    console.error(`Error processing directory ${dir}:`, err.message);
  }
}

// Main execution
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Image Reorganization Script');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'APPLY (changes will be made)'}\n`);
  console.log(`Images root: ${IMAGES_ROOT}\n`);
  
  if (!fs.existsSync(IMAGES_ROOT)) {
    console.error(`❌ Images root does not exist: ${IMAGES_ROOT}`);
    process.exit(1);
  }
  
  // Ensure default directories exist
  for (const dir of DEFAULT_DIRS) {
    const dirPath = path.join(IMAGES_ROOT, dir);
    ensureDir(dirPath);
  }
  
  // Ensure misc/unused exists
  ensureDir(UNUSED_DIR);
  
  // Get all images (including those in default directories)
  console.log('🔍 Scanning for images...\n');
  const allImages = getAllImages(IMAGES_ROOT, '', true);
  
  // Separate images into those in default dirs and those not
  const imagesInDefaultDirs = allImages.filter(img => img.isInDefaultDir);
  const imagesOutsideDefaultDirs = allImages.filter(img => !img.isInDefaultDir);
  
  console.log(`Found ${allImages.length} total images:`);
  console.log(`   In default directories: ${imagesInDefaultDirs.length}`);
  console.log(`   Outside default directories: ${imagesOutsideDefaultDirs.length}\n`);
  
  if (allImages.length === 0) {
    console.log('✅ No images found.\n');
  } else {
    // Check usage and organize
    console.log('🔍 Checking image usage in codebase...\n');
    
    const moves = [];
    let checked = 0;
    const totalToCheck = allImages.length;
    
    for (const image of allImages) {
      checked++;
      if (checked % 10 === 0) {
        process.stdout.write(`\r   Checked ${checked}/${totalToCheck} images...`);
      }
      
      const isUsed = isImageUsed(image.path, image.name);
      let targetDir;
      let targetPath;
      let needsMove = false;
      
      if (!isUsed) {
        // Unused images always go to misc/unused (even if already in a default dir)
        targetPath = path.join(UNUSED_DIR, image.name);
        needsMove = image.path !== targetPath;
        targetDir = 'misc/unused';
      } else {
        // Used images: if already in a default directory, keep them there
        if (image.isInDefaultDir) {
          // Already in a default directory and used - no move needed
          continue;
        } else {
          // Not in default directory, move to appropriate one based on filename
          targetDir = getTargetDirectory(image.name, image.dir);
          targetPath = path.join(IMAGES_ROOT, targetDir, image.name);
          needsMove = true;
        }
      }
      
      if (!needsMove) {
        continue;
      }
      
      // Handle name collisions
      let finalTargetPath = targetPath;
      let counter = 1;
      while (fs.existsSync(finalTargetPath) && finalTargetPath !== image.path) {
        const ext = path.extname(image.name);
        const nameWithoutExt = path.basename(image.name, ext);
        finalTargetPath = path.join(path.dirname(targetPath), `${nameWithoutExt}_${counter}${ext}`);
        counter++;
      }
      
      moves.push({
        from: image.path,
        to: finalTargetPath,
        relativeFrom: image.relativePath,
        relativeTo: path.relative(IMAGES_ROOT, finalTargetPath),
        isUsed,
        targetDir: targetDir,
      });
    }
    
    process.stdout.write(`\r   Checked ${checked}/${totalToCheck} images...\n\n`);
    
    // Group moves by target
    const usedMoves = moves.filter(m => m.isUsed);
    const unusedMoves = moves.filter(m => !m.isUsed);
    
    console.log(`📊 Summary:`);
    console.log(`   Total images to move: ${moves.length}`);
    console.log(`   Used images: ${usedMoves.length}`);
    console.log(`   Unused images: ${unusedMoves.length}\n`);
    
    // Show target distribution
    const targetCounts = {};
    for (const move of moves) {
      targetCounts[move.targetDir] = (targetCounts[move.targetDir] || 0) + 1;
    }
    
    console.log(`📁 Target distribution:`);
    for (const [dir, count] of Object.entries(targetCounts).sort()) {
      console.log(`   ${dir}: ${count} images`);
    }
    console.log('');
    
    // Execute moves
    console.log('📦 Moving images...\n');
    for (const move of moves) {
      moveFile(move.from, move.to);
    }
    console.log('');
  }
  
  // Delete empty directories
  console.log('🗑️  Cleaning up empty directories...\n');
  deleteEmptyDirs();
  console.log('');
  
  console.log('═══════════════════════════════════════════════════════════');
  if (isDryRun) {
    console.log('  ✅ Dry run complete. Use --apply to make changes.');
  } else {
    console.log('  ✅ Reorganization complete!');
  }
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
