#!/usr/bin/env node

/**
 * Quick script to verify which OCR test scripts exist and are runnable
 * Run with: node verify-ocr-scripts.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying existing OCR test scripts...\n');

const expectedScripts = [
    'test-ocr-complete.js',
    'test-ocr-upload.js', 
    'test-ocr-pipeline.js',
    'test-ocr-jobs-api.js',
    'test-public-ocr.js',
    'test-public-ocr-upload.js',
    'test-ocr-simple.js',
    'test-ocr-router.js',
    'setup-ocr-tables.js'
];

const scriptsDir = __dirname;
console.log(`Scripts directory: ${scriptsDir}\n`);

expectedScripts.forEach(scriptName => {
    const scriptPath = path.join(scriptsDir, scriptName);
    const exists = fs.existsSync(scriptPath);
    console.log(`${exists ? '✅' : '❌'} ${scriptName}`);
    
    if (exists) {
        const stats = fs.statSync(scriptPath);
        console.log(`   Size: ${stats.size} bytes, Modified: ${stats.mtime.toISOString()}`);
    }
});

console.log('\n📋 Summary of available OCR testing infrastructure:');
console.log('─'.repeat(50));

// Check main database connection script
const dbScript = path.join(__dirname, '../check-database-connection.js');
console.log(`${fs.existsSync(dbScript) ? '✅' : '❌'} check-database-connection.js (main directory)`);

// Check OCR service
const ocrService = path.join(__dirname, '../services/ocrProcessingService.js');
console.log(`${fs.existsSync(ocrService) ? '✅' : '❌'} ocrProcessingService.js`);

// Check OCR routes
const ocrRoutes = path.join(__dirname, '../routes/church/ocr.js');
console.log(`${fs.existsSync(ocrRoutes) ? '✅' : '❌'} church OCR routes`);

const publicOcrRoutes = path.join(__dirname, '../routes/public/ocr.js');
console.log(`${fs.existsSync(publicOcrRoutes) ? '✅' : '❌'} public OCR routes`);

// Check OCR controller
const ocrController = path.join(__dirname, '../controllers/churchOcrController.js');
console.log(`${fs.existsSync(ocrController) ? '✅' : '❌'} churchOcrController.js`);

console.log('\n🎯 Recommended Phase 0 test sequence:');
console.log('1. check-database-connection.js - Verify all database connections');
console.log('2. setup-ocr-tables.js - Ensure OCR tables exist');
console.log('3. test-ocr-complete.js - Test complete OCR system');
console.log('4. test-public-ocr.js - Test Google Vision API');
console.log('5. test-ocr-upload.js - Test OCR upload functionality');
console.log('6. test-ocr-pipeline.js - Test end-to-end processing');

console.log('\n📝 Next: Run ./phase0-ocr-system-test.js to execute all tests');
