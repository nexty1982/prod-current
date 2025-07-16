#!/usr/bin/env node

// Google Vision API Setup Script
// Run with: node setup-google-vision.js

const fs = require('fs');
const path = require('path');

console.log('🔧 Google Vision API Setup Guide\n');

// Step 1: Check current environment configuration
console.log('1️⃣ Checking current environment configuration...');

const envFiles = ['.env.development', '.env.production'];
let currentConfig = {};

envFiles.forEach(envFile => {
    const envPath = path.join(__dirname, envFile);
    if (fs.existsSync(envPath)) {
        console.log(`✅ Found ${envFile}`);
        const envContent = fs.readFileSync(envPath, 'utf8');
        
        // Check for existing Google Cloud config
        if (envContent.includes('GOOGLE_APPLICATION_CREDENTIALS')) {
            console.log(`   📁 GOOGLE_APPLICATION_CREDENTIALS already configured in ${envFile}`);
        } else {
            console.log(`   ⚠️  GOOGLE_APPLICATION_CREDENTIALS not found in ${envFile}`);
        }
        
        if (envContent.includes('GOOGLE_CLOUD_PROJECT_ID')) {
            console.log(`   🏗️  GOOGLE_CLOUD_PROJECT_ID already configured in ${envFile}`);
        } else {
            console.log(`   ⚠️  GOOGLE_CLOUD_PROJECT_ID not found in ${envFile}`);
        }
    } else {
        console.log(`❌ Missing ${envFile}`);
    }
});

// Step 2: Check if credentials directory exists
console.log('\n2️⃣ Checking credentials directory...');
const credentialsDir = path.join(__dirname, 'credentials');
if (!fs.existsSync(credentialsDir)) {
    fs.mkdirSync(credentialsDir, { recursive: true });
    console.log('✅ Created credentials directory');
} else {
    console.log('✅ Credentials directory exists');
}

// Check for existing service account files
const credFiles = fs.readdirSync(credentialsDir).filter(file => file.endsWith('.json'));
if (credFiles.length > 0) {
    console.log('📄 Found existing credential files:');
    credFiles.forEach(file => {
        console.log(`   - ${file}`);
    });
} else {
    console.log('⚠️  No credential files found in credentials directory');
}

// Step 3: Generate setup instructions
console.log('\n🔧 Google Vision API Setup Instructions\n');

console.log('3️⃣ Setting up Google Cloud Vision API:');
console.log('');
console.log('📋 Steps to configure Google Vision API:');
console.log('');
console.log('1. **Create Google Cloud Project** (if you don\'t have one):');
console.log('   - Go to: https://console.cloud.google.com/');
console.log('   - Click "Select a project" → "New Project"');
console.log('   - Enter project name: "orthodox-metrics-ocr"');
console.log('   - Click "Create"');
console.log('');
console.log('2. **Enable Vision API**:');
console.log('   - Go to: https://console.cloud.google.com/apis/library/vision.googleapis.com');
console.log('   - Click "Enable"');
console.log('');
console.log('3. **Create Service Account**:');
console.log('   - Go to: https://console.cloud.google.com/iam-admin/serviceaccounts');
console.log('   - Click "Create Service Account"');
console.log('   - Name: "orthodox-metrics-vision"');
console.log('   - Description: "Service account for OCR processing"');
console.log('   - Click "Create and Continue"');
console.log('');
console.log('4. **Assign Roles**:');
console.log('   - Add role: "Cloud Vision AI Service Agent"');
console.log('   - Add role: "Storage Object Viewer" (if using Cloud Storage)');
console.log('   - Click "Continue" → "Done"');
console.log('');
console.log('5. **Generate Key File**:');
console.log('   - Find your service account in the list');
console.log('   - Click the email address');
console.log('   - Go to "Keys" tab');
console.log('   - Click "Add Key" → "Create new key"');
console.log('   - Select "JSON"');
console.log('   - Click "Create" - file will download');
console.log('');
console.log('6. **Install Key File**:');
console.log(`   - Move the downloaded JSON file to: ${credentialsDir}/`);
console.log('   - Rename it to: google-vision-credentials.json');
console.log('');

// Step 4: Environment configuration template
console.log('4️⃣ Environment Configuration:');
console.log('');
console.log('Add these lines to your .env files:');
console.log('');
console.log('# Google Cloud Vision API Configuration');
console.log('GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-vision-credentials.json');
console.log('GOOGLE_CLOUD_PROJECT_ID=your-project-id-here');
console.log('');
console.log('# OCR Processing Settings');
console.log('OCR_UPLOAD_DIR=./uploads/ocr');
console.log('OCR_MAX_FILE_SIZE=10485760  # 10MB');
console.log('OCR_ALLOWED_TYPES=image/jpeg,image/png,image/gif,image/bmp,image/tiff');
console.log('OCR_PROCESSING_TIMEOUT=30000  # 30 seconds');
console.log('');

// Step 5: Test function
console.log('5️⃣ Testing Your Configuration:');
console.log('');
console.log('After setting up credentials, run:');
console.log('   node test-google-vision.js');
console.log('');

console.log('🚀 Setup Complete! Follow the instructions above to configure Google Vision API.');
