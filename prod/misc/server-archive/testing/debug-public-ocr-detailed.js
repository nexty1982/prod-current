#!/usr/bin/env node

// Debug script for Public OCR Service Issues
// Run with: node debug-public-ocr-detailed.js

console.log('🔍 Detailed Public OCR Service Debug\n');

// Test 1: Check OCR processing service directly
console.log('1️⃣ Testing OCR processing service directly...');
try {
  const OcrProcessingService = require('../services/ocrProcessingService');
  const ocrService = new OcrProcessingService();
  console.log('✅ OCR processing service imported and instantiated successfully');
  
  // Test with a simple function call
  console.log('   - performOcr method type:', typeof ocrService.performOcr);
  console.log('   - translateText method type:', typeof ocrService.translateText);
  
} catch(error) {
  console.error('❌ OCR service import error:', error.message);
  console.error('   Stack:', error.stack);
}

// Test 2: Check Google Vision setup
console.log('\n2️⃣ Testing Google Vision API setup...');
try {
  // Try to import and initialize Google Vision
  const vision = require('@google-cloud/vision');
  console.log('✅ Google Vision client library imported');
  
  const client = new vision.ImageAnnotatorClient();
  console.log('✅ Google Vision client created');
  
  // Check credentials
  console.log('📋 Environment variables:');
  console.log('   - GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
  console.log('   - GOOGLE_CLOUD_PROJECT:', process.env.GOOGLE_CLOUD_PROJECT);
  
} catch(error) {
  console.error('❌ Google Vision setup error:', error.message);
  console.error('   Stack:', error.stack);
}

// Test 3: Test file system operations
console.log('\n3️⃣ Testing file system operations...');
try {
  const fs = require('fs').promises;
  const path = require('path');
  
  // Check temp directory
  const tempDir = path.join(__dirname, 'temp');
  console.log('📁 Temp directory path:', tempDir);
  
  // Try to create temp directory
  await fs.mkdir(tempDir, { recursive: true });
  console.log('✅ Temp directory created/exists');
  
  // Test file write/read
  const testFile = path.join(tempDir, 'test-write.txt');
  await fs.writeFile(testFile, 'test content');
  const content = await fs.readFile(testFile, 'utf8');
  console.log('✅ File write/read operations work');
  
  // Clean up
  await fs.unlink(testFile);
  console.log('✅ File cleanup successful');
  
} catch(error) {
  console.error('❌ File system error:', error.message);
  console.error('   Stack:', error.stack);
}

// Test 4: Test with actual OCR processing
console.log('\n4️⃣ Testing actual OCR processing...');
async function testOCRProcessing() {
  try {
    const OcrProcessingService = require('../services/ocrProcessingService');
    
    // Create a simple test image with text
    const sharp = require('sharp');
    
    const testImageBuffer = await sharp({
      create: {
        width: 200,
        height: 100,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .png()
    .toBuffer();
    
    const fs = require('fs').promises;
    const path = require('path');
    const testImagePath = path.join(__dirname, 'test-ocr-image.png');
    
    await fs.writeFile(testImagePath, testImageBuffer);
    console.log('✅ Test image created');
    
    // Try OCR processing
    console.log('🔍 Attempting OCR processing...');
    const ocrService = new OcrProcessingService();
    const result = await ocrService.performOcr(testImagePath, 'en');
    console.log('✅ OCR processing successful!');
    console.log('   - Text:', result.text);
    console.log('   - Confidence:', result.confidence);
    console.log('   - Detected language:', result.detectedLanguage);
    
    // Clean up
    await fs.unlink(testImagePath);
    console.log('🧹 Test image cleaned up');
    
  } catch(error) {
    console.error('❌ OCR processing test error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

// Run async test
testOCRProcessing().then(() => {
  console.log('\n🎯 Debug Complete!');
  console.log('\n📋 Summary:');
  console.log('   If all tests pass, the issue is likely in the HTTP request handling');
  console.log('   If any test fails, that indicates the root cause');
  console.log('\n💡 Next steps:');
  console.log('   1. Fix any failing tests above');
  console.log('   2. Check server logs during actual OCR requests');
  console.log('   3. Verify the public OCR route is correctly handling file uploads');
}).catch(err => {
  console.error('❌ Debug script error:', err);
});
