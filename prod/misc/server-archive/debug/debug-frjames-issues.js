const { promisePool, testConnection, getDatabaseInfo } = require('../config/db-scripts');
const fs = require('fs');
const path = require('path');

async function debugFrjamesIssues() {
    console.log('🔍 Debugging frjames@ssppoc.org Issues...\n');
    
    try {
        // 0. Test database connection first
        console.log('0️⃣ DATABASE CONNECTION TEST:');
        console.log('='.repeat(50));
        
        const connectionTest = await testConnection();
        if (!connectionTest.success) {
            console.log('❌ Cannot connect to database. Script cannot continue.');
            console.log(`   Error: ${connectionTest.message}`);
            console.log('\n💡 Possible fixes:');
            console.log('   1. Check if MySQL server is running');
            console.log('   2. Verify database credentials in .env files');
            console.log('   3. Create a script-specific database user:');
            console.log('      CREATE USER "orthodoxmetrics_user"@"localhost" IDENTIFIED BY "Summerof1982@!";');
            console.log('      GRANT ALL PRIVILEGES ON orthodoxmetrics_db.* TO "orthodoxmetrics_user"@"localhost";');
            console.log('      FLUSH PRIVILEGES;');
            return;
        }
        
        // Get database info
        const dbInfo = await getDatabaseInfo();
        if (dbInfo.success) {
            console.log('✅ Database connection successful!');
            console.log(`   User: ${dbInfo.info.user}`);
            console.log(`   Database: ${dbInfo.info.database}`);
            console.log(`   Version: ${dbInfo.info.version}`);
            console.log(`   Tables: ${dbInfo.info.tableCount} found`);
        }
        
        // 1. Check user details and redirect logic
        console.log('1️⃣ USER REDIRECT ISSUE:');
        console.log('='.repeat(50));
        
        const [users] = await promisePool.execute(
            'SELECT id, email, role, church_id, first_name, last_name FROM users WHERE email = ?',
            ['frjames@ssppoc.org']
        );
        
        if (users.length === 0) {
            console.log('❌ User frjames@ssppoc.org not found in database');
            return;
        }
        
        const user = users[0];
        console.log('👤 User Details:');
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.first_name} ${user.last_name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Church ID: ${user.church_id || 'Not assigned'}`);
        
        // Check redirect logic
        console.log('\n🎯 SmartRedirect Logic Analysis:');
        if (user.role === 'super_admin') {
            console.log('   → USER IS SUPER_ADMIN: Will redirect to first church or church management');
            console.log('   → This explains why he goes to /admin-like pages!');
            console.log('   → To fix: Change role to "admin" or "user" if he should go to church records');
        } else {
            if (user.church_id) {
                console.log(`   → NON-SUPERADMIN with Church: Should redirect to /${user.church_id}-records`);
                
                // Get church details
                const [churches] = await promisePool.execute(
                    'SELECT id, church_id, name FROM churches WHERE id = ?',
                    [user.church_id]
                );
                
                if (churches.length > 0) {
                    const church = churches[0];
                    console.log(`   → Church: ${church.name} (ID: ${church.church_id || church.id})`);
                    console.log(`   → Expected URL: /${church.church_id || church.id}-records`);
                } else {
                    console.log('   ⚠️  Church not found in database!');
                }
            } else {
                console.log('   → NON-SUPERADMIN without Church: Should redirect to /apps/liturgical-calendar');
            }
        }
        
        // 2. Check global images issue
        console.log('\n\n2️⃣ GLOBAL IMAGES ISSUE:');
        console.log('='.repeat(50));
        
        // Define directories
        const globalProfileDir = path.join(__dirname, '../../../front-end/public/images/global/profile');
        const globalBannerDir = path.join(__dirname, '../../../front-end/public/images/global/banner');
        const userProfileDir = path.join(__dirname, '../../../front-end/public/images/profile');
        const userBannerDir = path.join(__dirname, '../../../front-end/public/images/banner');
        
        console.log('📁 Checking image directories...');
        
        const checkDirectory = (dir, type) => {
            console.log(`   ${type}:`);
            console.log(`     Path: ${dir}`);
            console.log(`     Exists: ${fs.existsSync(dir)}`);
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir).filter(f => f.match(/\.(jpg|jpeg|png|gif)$/i));
                console.log(`     Images: ${files.length}`);
                if (files.length > 0) {
                    console.log(`     Files: ${files.slice(0, 3).join(', ')}${files.length > 3 ? '...' : ''}`);
                }
            } else {
                // Create directory
                fs.mkdirSync(dir, { recursive: true });
                console.log(`     ✅ Created directory`);
            }
        };
        
        checkDirectory(globalProfileDir, 'Global Profile');
        checkDirectory(globalBannerDir, 'Global Banner');
        checkDirectory(userProfileDir, 'User Profile');
        checkDirectory(userBannerDir, 'User Banner');
        
        // Simulate the API response
        console.log('\n🌐 API Endpoint Test:');
        console.log('   Endpoint: /api/admin/global-images/public');
        
        const scanDirectoryForImages = (directory, type, baseUrl) => {
            const images = [];
            
            if (fs.existsSync(directory)) {
                const files = fs.readdirSync(directory);
                files.forEach(file => {
                    if (file.match(/\.(jpg|jpeg|png|gif)$/i)) {
                        const filePath = path.join(directory, file);
                        const stats = fs.statSync(filePath);
                        
                        images.push({
                            id: `${type}_${file}`,
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
        
        console.log(`   Response would have ${images.length} total images:`);
        console.log(`     Global profile: ${globalProfileImages.length}`);
        console.log(`     User profile: ${userProfileImages.length}`);
        
        if (images.length === 0) {
            console.log('\n❌ NO IMAGES FOUND! This is why the sections are empty.');
            console.log('\n💡 Quick Fix - Add sample images:');
            console.log('   1. Go to Admin → Content Settings');
            console.log('   2. Upload some global profile/banner images');
            console.log('   3. Or manually copy some .jpg/.png files to the directories above');
        } else {
            console.log('\n✅ Images found! Frontend should show these:');
            images.slice(0, 3).forEach(img => {
                console.log(`     - ${img.name} (${img.type}, ${img.source})`);
            });
        }
        
        // 3. Recommendations
        console.log('\n\n🔧 FIXES NEEDED:');
        console.log('='.repeat(50));
        
        console.log('\n📋 Issue 1: Login Redirect to /admin');
        if (user.role === 'super_admin') {
            console.log('   🎯 CAUSE: frjames has role "super_admin"');
            console.log('   💡 FIX: Change his role to "admin" if he should see church records');
            console.log(`   📝 SQL: UPDATE users SET role = 'admin' WHERE email = 'frjames@ssppoc.org';`);
        } else {
            if (!user.church_id) {
                console.log('   🎯 CAUSE: frjames has no church_id assigned');
                console.log('   💡 FIX: Assign him to a church');
                console.log('   📝 Run: node debug/assign-user-to-church.js');
            } else {
                console.log('   ✅ User settings look correct - check SmartRedirect component');
            }
        }
        
        console.log('\n📋 Issue 2: No Global Images Showing');
        if (images.length === 0) {
            console.log('   🎯 CAUSE: No images in the directories');
            console.log('   💡 FIX: Upload global images via admin panel');
            console.log('   📝 PATH: Admin → Settings → Content → Global Images');
        } else {
            console.log('   ✅ Images exist - check frontend console for API errors');
        }
        
        console.log('\n🧪 Testing Steps:');
        console.log('   1. Fix the role/church assignment issue first');
        console.log('   2. Restart server');
        console.log('   3. Test login redirect');
        console.log('   4. Upload some global images if needed');
        console.log('   5. Test profile picture dialog');
        
    } catch (error) {
        console.error('❌ Error during debug:', error.message);
    }
    
    process.exit(0);
}

debugFrjamesIssues(); 