#!/usr/bin/env node

// Environment Configuration Helper for Google Vision API
// Run with: node configure-env.js

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🔧 Google Vision API Environment Configuration\n');

async function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function configureEnvironment() {
    try {
        console.log('This script will help you configure Google Vision API credentials.\n');
        
        // Step 1: Get project ID
        const projectId = await question('1️⃣ Enter your Google Cloud Project ID: ');
        if (!projectId.trim()) {
            console.log('❌ Project ID is required!');
            process.exit(1);
        }
        
        // Step 2: Get credentials file path
        console.log('\n2️⃣ Credentials file setup:');
        const credentialsPath = './credentials/google-vision-credentials.json';
        const fullCredPath = path.resolve(__dirname, credentialsPath);
        
        if (fs.existsSync(fullCredPath)) {
            console.log(`✅ Found credentials file: ${credentialsPath}`);
        } else {
            console.log(`⚠️  Credentials file not found: ${credentialsPath}`);
            console.log('   Please download your service account key and place it at:');
            console.log(`   ${fullCredPath}`);
            
            const continueSetup = await question('   Continue setup anyway? (y/n): ');
            if (continueSetup.toLowerCase() !== 'y') {
                console.log('Setup cancelled.');
                process.exit(0);
            }
        }
        
        // Step 3: Choose environment
        console.log('\n3️⃣ Environment selection:');
        console.log('   1. Development (.env.development)');
        console.log('   2. Production (.env.production)');
        console.log('   3. Both');
        
        const envChoice = await question('   Select environment (1/2/3): ');
        
        const envFiles = [];
        switch (envChoice) {
            case '1':
                envFiles.push('.env.development');
                break;
            case '2':
                envFiles.push('.env.production');
                break;
            case '3':
                envFiles.push('.env.development', '.env.production');
                break;
            default:
                console.log('❌ Invalid choice!');
                process.exit(1);
        }
        
        // Step 4: Generate configuration
        const config = `
# Google Cloud Vision API Configuration
GOOGLE_APPLICATION_CREDENTIALS=${credentialsPath}
GOOGLE_CLOUD_PROJECT_ID=${projectId}

# OCR Processing Settings
OCR_UPLOAD_DIR=./uploads/ocr
OCR_MAX_FILE_SIZE=10485760
OCR_ALLOWED_TYPES=image/jpeg,image/png,image/gif,image/bmp,image/tiff
OCR_PROCESSING_TIMEOUT=30000

# OCR Service Settings
OCR_QUEUE_POLL_INTERVAL=5000
OCR_MAX_CONCURRENT_JOBS=3
OCR_RETRY_ATTEMPTS=2
`;
        
        // Step 5: Update environment files
        console.log('\n4️⃣ Updating environment files...');
        
        for (const envFile of envFiles) {
            const envPath = path.resolve(__dirname, envFile);
            
            if (fs.existsSync(envPath)) {
                // Read existing content
                let existingContent = fs.readFileSync(envPath, 'utf8');
                
                // Remove existing Google Vision config
                existingContent = existingContent.replace(
                    /# Google Cloud Vision API Configuration[\s\S]*?(?=\n# |$)/g, 
                    ''
                );
                
                // Add new config
                const updatedContent = existingContent.trim() + '\n' + config;
                fs.writeFileSync(envPath, updatedContent);
                
                console.log(`✅ Updated ${envFile}`);
            } else {
                // Create new file
                fs.writeFileSync(envPath, config.trim());
                console.log(`✅ Created ${envFile}`);
            }
        }
        
        // Step 6: Create upload directory
        console.log('\n5️⃣ Setting up upload directory...');
        const uploadDir = path.resolve(__dirname, 'uploads/ocr');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            console.log(`✅ Created upload directory: ${uploadDir}`);
        } else {
            console.log(`✅ Upload directory exists: ${uploadDir}`);
        }
        
        // Step 7: Final instructions
        console.log('\n🎉 Configuration Complete!\n');
        console.log('📋 Next Steps:');
        console.log('   1. Download your Google Cloud service account key');
        console.log(`   2. Save it as: ${fullCredPath}`);
        console.log('   3. Run: node test-google-vision.js');
        console.log('   4. Run: node utils/setup-ocr-tables.js');
        console.log('   5. Start your server and test OCR functionality');
        
        console.log('\n🔗 Useful Links:');
        console.log('   - Google Cloud Console: https://console.cloud.google.com/');
        console.log('   - Vision API: https://console.cloud.google.com/apis/library/vision.googleapis.com');
        console.log('   - Service Accounts: https://console.cloud.google.com/iam-admin/serviceaccounts');
        
    } catch (error) {
        console.error('❌ Configuration failed:', error.message);
    } finally {
        rl.close();
    }
}

configureEnvironment();
