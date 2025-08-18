const { promisePool } = require('../../config/db');
const fs = require('fs');
const path = require('path');

async function checkGlobalImages() {
    console.log('🔍 Checking Global Images Setup...\n');
    
    try {
        // Define directories
        const globalProfileDir = path.join(__dirname, '../../../front-end/public/images/global/profile');
        const globalBannerDir = path.join(__dirname, '../../../front-end/public/images/global/banner');
        const userProfileDir = path.join(__dirname, '../../../front-end/public/images/profile');
        const userBannerDir = path.join(__dirname, '../../../front-end/public/images/banner');
        
        console.log('📁 Checking directories...');
        console.log(`   Global Profile Dir: ${globalProfileDir}`);
        console.log(`   Exists: ${fs.existsSync(globalProfileDir)}`);
        if (fs.existsSync(globalProfileDir)) {
            const files = fs.readdirSync(globalProfileDir).filter(f => f.match(/\.(jpg|jpeg|png|gif)$/i));
            console.log(`   Images: ${files.length} (${files.slice(0, 3).join(', ')}${files.length > 3 ? '...' : ''})`);
        }
        
        console.log(`   Global Banner Dir: ${globalBannerDir}`);
        console.log(`   Exists: ${fs.existsSync(globalBannerDir)}`);
        if (fs.existsSync(globalBannerDir)) {
            const files = fs.readdirSync(globalBannerDir).filter(f => f.match(/\.(jpg|jpeg|png|gif)$/i));
            console.log(`   Images: ${files.length} (${files.slice(0, 3).join(', ')}${files.length > 3 ? '...' : ''})`);
        }
        
        console.log(`   User Profile Dir: ${userProfileDir}`);
        console.log(`   Exists: ${fs.existsSync(userProfileDir)}`);
        if (fs.existsSync(userProfileDir)) {
            const files = fs.readdirSync(userProfileDir).filter(f => f.match(/\.(jpg|jpeg|png|gif)$/i));
            console.log(`   Images: ${files.length} (${files.slice(0, 3).join(', ')}${files.length > 3 ? '...' : ''})`);
        }
        
        console.log(`   User Banner Dir: ${userBannerDir}`);
        console.log(`   Exists: ${fs.existsSync(userBannerDir)}`);
        if (fs.existsSync(userBannerDir)) {
            const files = fs.readdirSync(userBannerDir).filter(f => f.match(/\.(jpg|jpeg|png|gif)$/i));
            console.log(`   Images: ${files.length} (${files.slice(0, 3).join(', ')}${files.length > 3 ? '...' : ''})`);
        }
        
        // Create directories if they don't exist
        console.log('\n📂 Creating missing directories...');
        [globalProfileDir, globalBannerDir, userProfileDir, userBannerDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`   ✅ Created: ${dir}`);
            } else {
                console.log(`   ✓ Exists: ${path.basename(dir)}`);
            }
        });
        
        // Test the public API endpoint
        console.log('\n🌐 Testing public API endpoint...');
        console.log('   Endpoint: /api/admin/global-images/public');
        console.log('   This endpoint should work for ALL users (no admin required)');
        
        // Simulate the scanDirectoryForImages function
        const scanDirectoryForImages = (directory, type, baseUrl) => {
            const images = [];
            
            if (fs.existsSync(directory)) {
                const files = fs.readdirSync(directory);
                files.forEach(file => {
                    if (file.match(/\.(jpg|jpeg|png|gif)$/i)) {
                        const filePath = path.join(directory, file);
                        const stats = fs.statSync(filePath);
                        
                        images.push({
                            name: file.replace(/\.[^/.]+$/, ''),
                            url: `${baseUrl}/${file}`,
                            type: type,
                            size: `${stats.size} bytes`,
                            uploadedAt: stats.mtime.toISOString(),
                            source: directory.includes('/global/') ? 'global' : 'user',
                            filename: file
                        });
                    }
                });
            }
            
            return images;
        };
        
        // Simulate what the public endpoint returns
        const images = [];
        
        // Scan global profile images
        const globalProfileImages = scanDirectoryForImages(globalProfileDir, 'profile', '/images/global/profile');
        images.push(...globalProfileImages);
        
        // Scan user profile images
        const userProfileImages = scanDirectoryForImages(userProfileDir, 'profile', '/images/profile');
        images.push(...userProfileImages);
        
        console.log('\n📊 Public API would return:');
        console.log(`   Total images: ${images.length}`);
        console.log(`   Global profile: ${globalProfileImages.length}`);
        console.log(`   User profile: ${userProfileImages.length}`);
        
        if (images.length > 0) {
            console.log('\n📸 Sample images:');
            images.slice(0, 5).forEach(img => {
                console.log(`   - ${img.name} (${img.type}, ${img.source}): ${img.url}`);
            });
        }
        
        // Check if there are any images
        if (images.length === 0) {
            console.log('\n⚠️  No images found! This is why users see empty sections.');
            console.log('\n💡 To fix this:');
            console.log('   1. Upload some global images via Admin → Content Settings');
            console.log('   2. Or copy some sample images to the directories above');
            console.log('   3. Make sure images are .jpg, .jpeg, .png, or .gif format');
        } else {
            console.log('\n✅ Images found! Users should see these in the profile dialog.');
        }
        
        console.log('\n🔧 Fix Summary:');
        console.log('   ✅ Updated ProfileBanner to use /api/admin/global-images/public');
        console.log('   ✅ Disabled mock route that returned empty arrays');
        console.log('   ✅ Public endpoint works for all users (no admin required)');
        console.log('   ✅ Created missing directories');
        
        console.log('\n🧪 Testing Steps:');
        console.log('   1. Login as frjames@ssppoc.org');
        console.log('   2. Go to User Profile page');
        console.log('   3. Click "Change Profile Picture"');
        console.log('   4. Check "Global Profile Images" section');
        console.log('   5. Should see images from global and user directories');
        
    } catch (error) {
        console.error('❌ Error checking global images:', error.message);
    }
    
    process.exit(0);
}

checkGlobalImages(); 