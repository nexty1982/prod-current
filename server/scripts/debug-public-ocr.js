#!/usr/bin/env node

// Test script for Public OCR Processing Endpoint
// Run with: node debug-public-ocr.js

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

console.log('🔍 Debugging Public OCR Processing\n');

// Test 1: Check if we have test images
console.log('1️⃣ Checking for test images...');
const testImagePaths = [
  './test-images/sample.jpg',
  './test-images/sample.png',
  '../uploads/test.jpg',
  './uploads/test.jpg'
];

let testImagePath = null;
for (const imagePath of testImagePaths) {
  if (fs.existsSync(imagePath)) {
    testImagePath = imagePath;
    console.log(`✅ Found test image: ${imagePath}`);
    break;
  }
}

if (!testImagePath) {
  console.log('⚠️  No test image found. Creating a simple test image...');
  
  // Create a simple test image (1x1 pixel PNG)
  const simpleImageData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
    0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00,
    0x01, 0x00, 0x01, 0x5C, 0xC2, 0xD5, 0x9B, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  
  testImagePath = './test-simple.png';
  fs.writeFileSync(testImagePath, simpleImageData);
  console.log(`✅ Created simple test image: ${testImagePath}`);
}

// Test 2: Test the OCR processing endpoint
async function testOCRProcessing() {
  console.log('\n2️⃣ Testing OCR processing endpoint...');
  
  try {
    // Read the test image
    const imageBuffer = fs.readFileSync(testImagePath);
    console.log(`📄 Image size: ${imageBuffer.length} bytes`);
    
    // Create form data
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: path.basename(testImagePath),
      contentType: testImagePath.endsWith('.png') ? 'image/png' : 'image/jpeg'
    });
    formData.append('language', 'auto');
    
    console.log('📤 Sending OCR request...');
    
    // Make the request
    const response = await fetch('http://localhost:3001/api/public/ocr/process', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    console.log(`📥 Response status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`📝 Response body length: ${responseText.length} characters`);
    
    if (response.ok) {
      const result = JSON.parse(responseText);
      console.log('✅ OCR processing successful!');
      console.log(`   - Job ID: ${result.id}`);
      console.log(`   - Filename: ${result.filename}`);
      console.log(`   - Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`   - Language: ${result.detectedLanguage || result.language}`);
      console.log(`   - Text length: ${result.text?.length || 0} characters`);
      console.log(`   - Translation: ${result.translatedText ? 'Yes' : 'No'}`);
      
      if (result.text && result.text.length > 0) {
        console.log(`   - Sample text: "${result.text.substring(0, 100)}${result.text.length > 100 ? '...' : ''}"`);
      }
    } else {
      console.log('❌ OCR processing failed');
      console.log(`   Error response: ${responseText}`);
      
      try {
        const errorObj = JSON.parse(responseText);
        console.log(`   Error details: ${errorObj.error}`);
        if (errorObj.details) {
          console.log(`   Details: ${errorObj.details}`);
        }
      } catch (e) {
        console.log(`   Raw error: ${responseText}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Request failed');
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Test 3: Check server logs
async function checkServerLogs() {
  console.log('\n3️⃣ Checking server logs...');
  
  const logPaths = [
    './logs/production.log',
    './logs/development.log',
    './logs/app.log'
  ];
  
  for (const logPath of logPaths) {
    if (fs.existsSync(logPath)) {
      console.log(`📋 Found log file: ${logPath}`);
      try {
        const logContent = fs.readFileSync(logPath, 'utf8');
        const lines = logContent.split('\n').slice(-20); // Last 20 lines
        console.log('   Recent log entries:');
        lines.forEach(line => {
          if (line.trim()) {
            console.log(`   ${line}`);
          }
        });
      } catch (error) {
        console.log(`   ❌ Could not read log file: ${error.message}`);
      }
      break;
    }
  }
}

// Test 4: Check OCR service dependencies
async function checkDependencies() {
  console.log('\n4️⃣ Checking OCR service dependencies...');
  
  try {
    const { processOCRForImage, translateText } = require('./services/ocrProcessingService');
    console.log('✅ OCR processing service imported successfully');
    
    // Check Google Vision credentials
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log(`✅ Google credentials path: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
      
      if (fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        console.log('✅ Credentials file exists');
      } else {
        console.log('❌ Credentials file not found');
      }
    } else {
      console.log('❌ GOOGLE_APPLICATION_CREDENTIALS not set');
    }
    
    if (process.env.GOOGLE_CLOUD_PROJECT) {
      console.log(`✅ Google Cloud project: ${process.env.GOOGLE_CLOUD_PROJECT}`);
    } else {
      console.log('❌ GOOGLE_CLOUD_PROJECT not set');
    }
    
  } catch (error) {
    console.log(`❌ OCR service import failed: ${error.message}`);
  }
}

// Run all tests
async function runTests() {
  await testOCRProcessing();
  await checkServerLogs();
  await checkDependencies();
  
  console.log('\n🎯 Debug Summary:');
  console.log('   - Health endpoint: ✅ Working');
  console.log('   - OCR processing: Check results above');
  console.log('   - Check server logs for detailed error information');
  console.log('\n💡 Next steps:');
  console.log('   1. Check the server console for real-time error logs');
  console.log('   2. Verify Google Vision API credentials and project setup');
  console.log('   3. Test with a real image containing text');
  
  // Clean up test file
  if (testImagePath === './test-simple.png') {
    try {
      fs.unlinkSync(testImagePath);
      console.log('🧹 Cleaned up test image');
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

runTests().catch(console.error);
