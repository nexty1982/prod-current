#!/usr/bin/env node
/**
 * Move Used Images to incode Directory and Update All References
 * 
 * This comprehensive script:
 * 1. Parses used-images-2026-01-23.txt
 * 2. Moves images from current locations to /images/incode/
 * 3. Updates ALL code references (handles multiple path formats)
 * 
 * Run on Linux server: node scripts/move-images-to-incode-complete.cjs
 */

const fs = require('fs');
const path = require('path');

const repoRoot = '/var/www/orthodoxmetrics/prod';
const imagesRoot = path.join(repoRoot, 'front-end', 'public', 'images');
const incodeDir = path.join(imagesRoot, 'incode');
const usedImagesFile = path.join(repoRoot, 'used-images-2026-01-23.txt');

// Ensure incode directory exists
if (!fs.existsSync(incodeDir)) {
    fs.mkdirSync(incodeDir, { recursive: true });
    console.log(`✅ Created directory: ${incodeDir}`);
}

// Parse the used images file
function parseUsedImages() {
    if (!fs.existsSync(usedImagesFile)) {
        throw new Error(`Used images file not found: ${usedImagesFile}\nPlease ensure the file exists.`);
    }
    
    const content = fs.readFileSync(usedImagesFile, 'utf8');
    const images = [];
    
    let currentImage = null;
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Match image entry (e.g., "1. **bgtiled1.png**")
        const imageMatch = line.match(/^\d+\.\s+\*\*([^*]+)\*\*/);
        if (imageMatch) {
            if (currentImage) {
                images.push(currentImage);
            }
            currentImage = {
                filename: imageMatch[1],
                references: []
            };
        }
        
        // Match path (e.g., "- Path: /images/backgrounds/bgtiled1.png")
        if (currentImage && line.startsWith('- Path:')) {
            const pathMatch = line.match(/Path:\s+(.+)/);
            if (pathMatch) {
                currentImage.oldPath = pathMatch[1].trim();
                currentImage.newPath = `/images/incode/${currentImage.filename}`;
            }
        }
        
        // Match references (e.g., "- src/features/pages/frontend-pages/Header.tsx")
        if (currentImage && line.startsWith('- src/')) {
            currentImage.references.push(line.replace(/^-\s+/, '').trim());
        }
    }
    
    if (currentImage) {
        images.push(currentImage);
    }
    
    return images;
}

// Move image file
function moveImage(image) {
    // Remove /images/ prefix to get relative path from imagesRoot
    const relativePath = image.oldPath.replace(/^\/images\//, '');
    const oldFullPath = path.join(imagesRoot, relativePath);
    const newFullPath = path.join(incodeDir, image.filename);
    
    if (!fs.existsSync(oldFullPath)) {
        console.log(`⚠️  Image not found: ${oldFullPath}`);
        return false;
    }
    
    // Skip if already exists in destination
    if (fs.existsSync(newFullPath)) {
        console.log(`⏭️  Already exists: ${image.filename}`);
        return true;
    }
    
    // Copy file
    try {
        fs.copyFileSync(oldFullPath, newFullPath);
        return true;
    } catch (error) {
        console.log(`❌ Error copying ${image.filename}: ${error.message}`);
        return false;
    }
}

// Update references in a file - comprehensive pattern matching
function updateFileReferences(filePath, image) {
    const fullPath = path.join(repoRoot, 'front-end', filePath);
    
    if (!fs.existsSync(fullPath)) {
        return false;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;
    const filename = image.filename;
    const newPath = image.newPath;
    
    // Escape filename for regex
    const escapedFilename = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedOldPath = image.oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Pattern 1: Full old path in quotes
    content = content.replace(new RegExp(`"${escapedOldPath}"`, 'g'), `"${newPath}"`);
    content = content.replace(new RegExp(`'${escapedOldPath}'`, 'g'), `'${newPath}'`);
    content = content.replace(new RegExp(`\`${escapedOldPath}\``, 'g'), `\`${newPath}\``);
    
    // Pattern 2: Short path /images/filename (common case)
    content = content.replace(new RegExp(`"/images/${escapedFilename}"`, 'g'), `"${newPath}"`);
    content = content.replace(new RegExp(`'/images/${escapedFilename}'`, 'g'), `'${newPath}'`);
    content = content.replace(new RegExp(`\`/images/${escapedFilename}\``, 'g'), `\`${newPath}\``);
    
    // Pattern 3: URL patterns url(/images/...)
    content = content.replace(new RegExp(`url\\(${escapedOldPath}\\)`, 'g'), `url(${newPath})`);
    content = content.replace(new RegExp(`url\\(/images/${escapedFilename}\\)`, 'g'), `url(${newPath})`);
    content = content.replace(new RegExp(`url\\(['"]?/images/[^)]*${escapedFilename}['"]?\\)`, 'g'), `url(${newPath})`);
    
    // Pattern 4: Any /images/.../filename pattern
    content = content.replace(new RegExp(`/images/[^"'\`\\s/]+/${escapedFilename}`, 'g'), newPath);
    
    // Pattern 5: Standalone filename (be careful - only if it's clearly a path)
    // Look for patterns like: /images/filename or images/filename
    content = content.replace(new RegExp(`([^/])/images/${escapedFilename}([^/])`, 'g'), `$1${newPath}$2`);
    
    if (content !== originalContent) {
        try {
            fs.writeFileSync(fullPath, content, 'utf8');
            return true;
        } catch (error) {
            console.log(`❌ Error updating ${filePath}: ${error.message}`);
            return false;
        }
    }
    
    return false;
}

// Main execution
try {
    console.log('🚀 Starting image migration to incode directory...\n');
    console.log(`Repository root: ${repoRoot}`);
    console.log(`Images root: ${imagesRoot}`);
    console.log(`Incode directory: ${incodeDir}`);
    console.log(`Used images file: ${usedImagesFile}\n`);

    const images = parseUsedImages();
    console.log(`📋 Found ${images.length} images to migrate\n`);

    let movedCount = 0;
    let updatedFiles = new Set();
    let totalUpdates = 0;

    // Step 1: Move all images
    console.log('📦 Step 1: Moving images to incode directory...');
    images.forEach((image, index) => {
        if (moveImage(image)) {
            movedCount++;
        }
        if ((index + 1) % 10 === 0) {
            process.stdout.write(`  Processed ${index + 1}/${images.length}...\r`);
        }
    });
    console.log(`\n✅ Moved ${movedCount}/${images.length} images\n`);

    // Step 2: Update references
    console.log('✏️  Step 2: Updating code references...\n');
    images.forEach((image, index) => {
        if ((index + 1) % 10 === 0) {
            console.log(`  Processing ${index + 1}/${images.length}...`);
        }
        
        image.references.forEach(ref => {
            if (updateFileReferences(ref, image)) {
                updatedFiles.add(ref);
                totalUpdates++;
            }
        });
    });

    console.log(`\n✅ Updated ${totalUpdates} references across ${updatedFiles.size} files\n`);

    // Summary
    console.log('='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Images processed: ${images.length}`);
    console.log(`Images moved: ${movedCount}`);
    console.log(`Files updated: ${updatedFiles.size}`);
    console.log(`Total reference updates: ${totalUpdates}`);
    console.log(`\nNew location: ${incodeDir}`);
    console.log('\n⚠️  Note: Original images are still in their old locations.');
    console.log('    Review the changes and delete originals if everything looks good.');
    console.log('');
    
} catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
}
