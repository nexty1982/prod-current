#!/usr/bin/env node
/**
 * Move Used Images to incode Directory and Update References
 * 
 * This script:
 * 1. Parses used-images-2026-01-23.txt to get list of images
 * 2. Moves images from their current locations to /images/incode/
 * 3. Updates all code references to point to /images/incode/
 * 
 * Usage: node scripts/move-images-to-incode.js
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
        throw new Error(`Used images file not found: ${usedImagesFile}`);
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
    
    // Copy file (don't delete original yet)
    try {
        fs.copyFileSync(oldFullPath, newFullPath);
        return true;
    } catch (error) {
        console.log(`❌ Error copying ${image.filename}: ${error.message}`);
        return false;
    }
}

// Update references in a file - handles multiple path variations
function updateFileReferences(filePath, image) {
    const fullPath = path.join(repoRoot, 'front-end', filePath);
    
    if (!fs.existsSync(fullPath)) {
        return false;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;
    
    // Get just the filename for pattern matching
    const filename = image.filename;
    const newPath = image.newPath;
    
    // Build patterns to match:
    // 1. Full old path: /images/backgrounds/bgtiled1.png
    // 2. Short path: /images/bgtiled1.png (if code uses shortened version)
    // 3. Any path ending with the filename
    
    const patterns = [
        // Full old path in quotes
        new RegExp(`"${image.oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
        new RegExp(`'${image.oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g'),
        new RegExp(`\`${image.oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\``, 'g'),
        
        // Short path (just /images/filename) in quotes
        new RegExp(`"/images/${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
        new RegExp(`'/images/${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g'),
        new RegExp(`\`/images/${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\``, 'g'),
        
        // URL patterns
        new RegExp(`url\\(${image.oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g'),
        new RegExp(`url\\(/images/${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g'),
        
        // Any path ending with this filename (more aggressive)
        new RegExp(`(/images/[^"'\`\\s]+/)${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'),
    ];
    
    // Apply replacements
    patterns.forEach(pattern => {
        content = content.replace(pattern, (match) => {
            if (match.includes('url(')) {
                return match.replace(/\/images\/[^)]+/, newPath);
            }
            if (match.includes('"') || match.includes("'") || match.includes('`')) {
                return match.replace(/\/images\/[^"'\`]+/, newPath);
            }
            return newPath;
        });
    });
    
    // Also handle standalone paths (not in quotes) - be careful
    // Look for /images/.../filename patterns
    const standalonePattern = new RegExp(`(/images/[^"'\`\\s/]+/)?${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
    content = content.replace(standalonePattern, (match) => {
        // Only replace if it's a full path match
        if (match.startsWith('/images/') || match === filename) {
            return newPath;
        }
        return match;
    });
    
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
    console.log(`Incode directory: ${incodeDir}\n`);

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
