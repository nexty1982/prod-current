#!/usr/bin/env node
/**
 * List all images and their paths that are actively being used in production
 * 
 * Usage: node server/scripts/list-used-images.js [--output json|csv|txt]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.tiff', '.bmp'];
const SOURCE_EXTENSIONS = ['.tsx', '.ts', '.js', '.jsx', '.html', '.css', '.scss', '.json'];
const OUTPUT_FORMAT = process.argv.includes('--output') 
  ? process.argv[process.argv.indexOf('--output') + 1] || 'txt'
  : 'txt';

// Get directories
const getFrontEndDir = () => {
  if (process.env.NODE_ENV === 'production') {
    return '/var/www/orthodoxmetrics/prod/front-end';
  }
  
  const possiblePaths = [
    path.join(__dirname, '../../front-end'),
    path.join(__dirname, '../../../front-end'),
    path.join(process.cwd(), 'front-end'),
    path.join(process.cwd(), '../front-end'),
  ];
  
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      return possiblePath;
    }
  }
  
  return possiblePaths[0];
};

const frontEndDir = getFrontEndDir();
const publicDir = path.join(frontEndDir, 'public');
const imagesDir = path.join(publicDir, 'images');

// Recursively find all image files
function findImageFiles(dir, basePath = '') {
  const imageFiles = [];
  
  if (!fs.existsSync(dir)) {
    return imageFiles;
  }
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      // Skip node_modules, .git, dist, build, etc.
      if (entry.name.startsWith('.') || 
          entry.name === 'node_modules' || 
          entry.name === 'dist' || 
          entry.name === 'build' ||
          entry.name === '.next') {
        continue;
      }
      
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);
      
      if (entry.isDirectory()) {
        imageFiles.push(...findImageFiles(fullPath, relativePath));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (IMAGE_EXTENSIONS.includes(ext)) {
          // Get file stats
          const stats = fs.statSync(fullPath);
          imageFiles.push({
            name: entry.name,
            path: `/images/${relativePath.replace(/\\/g, '/')}`,
            fullPath: fullPath,
            size: stats.size,
            modified: stats.mtime.toISOString(),
            created: stats.birthtime.toISOString(),
            type: ext.substring(1),
          });
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dir}:`, error.message);
  }
  
  return imageFiles;
}

// Check if an image is used in the codebase
function checkImageUsage(imagePath, imageName, frontEndSourceDir) {
  // Extract just the filename for searching
  const fileName = path.basename(imagePath);
  const fileNameWithoutExt = path.basename(fileName, path.extname(fileName));
  
  // Search patterns to look for
  const searchPatterns = [
    fileName, // Full filename
    fileNameWithoutExt, // Filename without extension
    imagePath, // Full path
    imagePath.replace(/^\//, ''), // Path without leading slash
    `images/${path.basename(imagePath)}`, // Relative path from images/
    path.basename(imagePath), // Just the basename
  ];

  try {
    // Use grep to search for image references in source files
    const searchCommand = `grep -r -l --include="*.tsx" --include="*.ts" --include="*.js" --include="*.jsx" --include="*.html" --include="*.css" --include="*.scss" --include="*.json" -E "${searchPatterns.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}" "${frontEndSourceDir}" 2>/dev/null || true`;
    
    const result = execSync(searchCommand, { 
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      cwd: frontEndSourceDir
    });
    
    if (result.trim().length > 0) {
      const files = result.trim().split('\n').filter(f => f);
      return {
        isUsed: true,
        referencedIn: files.map(f => path.relative(frontEndSourceDir, f))
      };
    }
  } catch (error) {
    // If grep fails, try file system traversal
    try {
      const searchInDirectory = (dir, depth = 0) => {
        if (depth > 4) return { isUsed: false, referencedIn: [] }; // Limit recursion depth
        
        const files = fs.readdirSync(dir, { withFileTypes: true });
        const references = [];
        
        for (const file of files) {
          // Skip node_modules and other large directories
          if (file.name === 'node_modules' || 
              file.name === '.git' || 
              file.name === 'dist' || 
              file.name === 'build' ||
              file.name === '.next' ||
              file.name.startsWith('.')) {
            continue;
          }
          
          const fullPath = path.join(dir, file.name);
          
          if (file.isDirectory()) {
            const subResult = searchInDirectory(fullPath, depth + 1);
            references.push(...subResult.referencedIn);
          } else if (file.isFile()) {
            const ext = path.extname(file.name).toLowerCase();
            if (SOURCE_EXTENSIONS.includes(ext)) {
              try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                if (searchPatterns.some(pattern => content.includes(pattern))) {
                  references.push(path.relative(frontEndSourceDir, fullPath));
                }
              } catch (readError) {
                // Skip files that can't be read
              }
            }
          }
        }
        
        return {
          isUsed: references.length > 0,
          referencedIn: references
        };
      };
      
      return searchInDirectory(frontEndSourceDir);
    } catch (fsError) {
      console.warn(`Could not check usage for ${imageName}:`, fsError.message);
      return { isUsed: false, referencedIn: [] };
    }
  }
  
  return { isUsed: false, referencedIn: [] };
}

// Main execution
console.log('🔍 Scanning for images...');
console.log(`📁 Front-end directory: ${frontEndDir}`);
console.log(`📁 Images directory: ${imagesDir}\n`);

const allImages = findImageFiles(imagesDir);
console.log(`📸 Found ${allImages.length} total images\n`);

console.log('🔎 Checking which images are used in codebase...');
const usedImages = [];
const unusedImages = [];

for (let i = 0; i < allImages.length; i++) {
  const image = allImages[i];
  process.stdout.write(`\r   Checking ${i + 1}/${allImages.length}: ${image.name}...`);
  
  const usage = checkImageUsage(image.path, image.name, frontEndDir);
  
  if (usage.isUsed) {
    usedImages.push({
      ...image,
      referencedIn: usage.referencedIn
    });
  } else {
    unusedImages.push(image);
  }
}

process.stdout.write('\r' + ' '.repeat(80) + '\r'); // Clear progress line
console.log(`✅ Checked ${allImages.length} images\n`);

// Output results
console.log(`📊 Results:`);
console.log(`   ✅ Used: ${usedImages.length}`);
console.log(`   ❌ Unused: ${unusedImages.length}\n`);

// Generate output
let output = '';

if (OUTPUT_FORMAT === 'json') {
  output = JSON.stringify({
    generated_at: new Date().toISOString(),
    total_images: allImages.length,
    used_images: usedImages.length,
    unused_images: unusedImages.length,
    used: usedImages.map(img => ({
      name: img.name,
      path: img.path,
      size: img.size,
      type: img.type,
      modified: img.modified,
      referenced_in: img.referencedIn
    }))
  }, null, 2);
} else if (OUTPUT_FORMAT === 'csv') {
  const headers = ['Name', 'Path', 'Size (bytes)', 'Type', 'Modified', 'Referenced In'];
  const rows = usedImages.map(img => [
    img.name,
    img.path,
    img.size,
    img.type,
    img.modified,
    img.referencedIn.join('; ')
  ]);
  
  output = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
} else {
  // Plain text format
  output = `# Images Actively Used in Production\n\n`;
  output += `Generated: ${new Date().toISOString()}\n`;
  output += `Total Images: ${allImages.length}\n`;
  output += `Used Images: ${usedImages.length}\n`;
  output += `Unused Images: ${unusedImages.length}\n\n`;
  output += `## Used Images (${usedImages.length})\n\n`;
  
  usedImages.forEach((img, index) => {
    output += `${index + 1}. **${img.name}**\n`;
    output += `   - Path: ${img.path}\n`;
    output += `   - Size: ${(img.size / 1024).toFixed(2)} KB\n`;
    output += `   - Type: ${img.type.toUpperCase()}\n`;
    output += `   - Modified: ${new Date(img.modified).toLocaleString()}\n`;
    if (img.referencedIn && img.referencedIn.length > 0) {
      output += `   - Referenced in:\n`;
      img.referencedIn.forEach(ref => {
        output += `     - ${ref}\n`;
      });
    }
    output += `\n`;
  });
}

// Write to file
const outputFile = `used-images-${new Date().toISOString().split('T')[0]}.${OUTPUT_FORMAT === 'json' ? 'json' : OUTPUT_FORMAT === 'csv' ? 'csv' : 'txt'}`;
fs.writeFileSync(outputFile, output, 'utf-8');

console.log(`📄 Output written to: ${outputFile}`);
console.log(`\n✅ Done!`);

// Also print summary to console
if (OUTPUT_FORMAT === 'txt') {
  console.log(`\n${output}`);
}
