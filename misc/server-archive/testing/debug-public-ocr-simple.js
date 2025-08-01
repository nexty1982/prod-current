#!/usr/bin/env node

// Debug script for Public OCR Service - CommonJS version
// Run with: node debug-public-ocr-simple.js

console.log('🔍 Simple Public OCR Service Debug\n');

// Test 1: Test OCR processing service directly
console.log('1️⃣ Testing OCR processing service...');
try {
  const ocrService = require('./services/ocrProcessingService');
  console.log('✅ OCR service imported successfully');
  console.log('   - Service type:', typeof ocrService);
  console.log('   - Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(ocrService)).filter(name => name !== 'constructor'));
  
  // Test if we can create a temp directory
  const fs = require('fs');
  const path = require('path');
  
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log('✅ Temp directory created');
  } else {
    console.log('✅ Temp directory exists');
  }
  
} catch(error) {
  console.error('❌ OCR service test error:', error.message);
  console.error('   Stack:', error.stack);
}

// Test 2: Test Google Vision API directly
console.log('\n2️⃣ Testing Google Vision API...');
try {
  // Test if we can import Google Vision
  const vision = require('@google-cloud/vision');
  console.log('✅ Google Vision library imported');
  
  // Test client creation
  const client = new vision.ImageAnnotatorClient();
  console.log('✅ Google Vision client created');
  
  // Check credentials
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('✅ Google credentials configured');
    
    const fs = require('fs');
    if (fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      console.log('✅ Credentials file exists');
      
      // Try to read the credentials file
      try {
        const credentialsContent = fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8');
        const credentials = JSON.parse(credentialsContent);
        console.log('✅ Credentials file is valid JSON');
        console.log(`   Project ID: ${credentials.project_id}`);
        console.log(`   Client email: ${credentials.client_email}`);
      } catch(credError) {
        console.error('❌ Credentials file error:', credError.message);
      }
    } else {
      console.error('❌ Credentials file not found');
    }
  } else {
    console.error('❌ GOOGLE_APPLICATION_CREDENTIALS not set');
  }
  
} catch(error) {
  console.error('❌ Google Vision test error:', error.message);
  console.error('   Stack:', error.stack);
}

// Test 3: Test with a simple test image
console.log('\n3️⃣ Testing with simple image...');
async function testSimpleOCR() {
  try {
    const fs = require('fs');
    const path = require('path');
    const { createCanvas } = require('canvas');
    
    // Create a simple test image with text
    const canvas = createCanvas(400, 200);
    const ctx = canvas.getContext('2d');
    
    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 400, 200);
    
    // Black text
    ctx.fillStyle = 'black';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Hello Orthodox Church', 200, 80);
    ctx.fillText('Test OCR Document', 200, 130);
    
    // Save the image
    const testImagePath = path.join(__dirname, 'temp', 'test-ocr.png');
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(testImagePath, buffer);
    
    console.log('✅ Test image created');
    console.log(`   Path: ${testImagePath}`);
    console.log(`   Size: ${buffer.length} bytes`);
    
    // Now test OCR processing
    const ocrService = require('./services/ocrProcessingService');
    
    console.log('📄 Testing OCR processing...');
    const result = await ocrService.performOcr(testImagePath, 'en');
    
    console.log('✅ OCR processing successful!');
    console.log(`   Raw result:`, result);
    
    // Check if result has the expected structure
    if (result && result.length > 0 && result[0].textAnnotations) {
      const text = result[0].textAnnotations[0]?.description || '';
      const confidence = result[0].textAnnotations[0]?.confidence || 0;
      console.log(`   Detected text: "${text}"`);
      console.log(`   Confidence: ${(confidence * 100).toFixed(1)}%`);
    } else {
      console.log('   No text detected in image');
    }
    
  } catch(error) {
    console.error('❌ Simple OCR test failed:', error.message);
    console.error('   Stack:', error.stack);
  }
}

// Test 4: Test multer file handling
console.log('\n4️⃣ Testing multer configuration...');
try {
  const multer = require('multer');
  console.log('✅ Multer imported successfully');
  
  // Test multer storage configuration
  const storage = multer.memoryStorage();
  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
      files: 5 // Maximum 5 files
    }
  });
  
  console.log('✅ Multer configured successfully');
  
} catch(error) {
  console.error('❌ Multer test error:', error.message);
}

// Run the async test
console.log('\n🚀 Running async OCR test...');
testSimpleOCR().then(() => {
  console.log('\n🎉 Debug Complete!');
  console.log('\n📋 Summary:');
  console.log('   If OCR processing works here, the issue is in the HTTP route');
  console.log('   If OCR processing fails, check Google Vision API setup');
  console.log('\n💡 Check the server console for any real-time errors during actual requests');
}).catch((error) => {
  console.error('\n❌ Async test failed:', error.message);
  console.error('   This indicates the core OCR processing has issues');
});
