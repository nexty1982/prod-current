#!/usr/bin/env node

// Test script for public OCR upload API
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testPublicOcrUpload() {
  console.log('🧪 Testing Public OCR Upload API...\n');

  try {
    // Create a simple test image with text
    const { createCanvas } = require('canvas');
    const canvas = createCanvas(400, 200);
    const ctx = canvas.getContext('2d');
    
    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 400, 200);
    
    // Black text
    ctx.fillStyle = 'black';
    ctx.font = '30px Arial';
    ctx.fillText('Hello World!', 50, 100);
    ctx.fillText('This is a test.', 50, 150);
    
    // Save to temp file
    const testImagePath = path.join(__dirname, 'temp', 'test-ocr-image.png');
    await fs.promises.mkdir(path.dirname(testImagePath), { recursive: true });
    
    const buffer = canvas.toBuffer('image/png');
    await fs.promises.writeFile(testImagePath, buffer);
    
    console.log(`📷 Created test image: ${testImagePath}`);
    
    // Test the OCR service directly (without HTTP)
    const ocrService = require('./services/ocrProcessingService');
    
    console.log('\n🔍 Testing OCR service directly...');
    const ocrResult = await ocrService.performOcr(testImagePath);
    
    console.log('OCR Result Structure:');
    console.log('- textAnnotations:', ocrResult.textAnnotations ? ocrResult.textAnnotations.length : 'none');
    if (ocrResult.textAnnotations && ocrResult.textAnnotations.length > 0) {
      console.log('- First annotation text:', ocrResult.textAnnotations[0].description?.substring(0, 100));
      console.log('- First annotation locale:', ocrResult.textAnnotations[0].locale);
    }
    
    // Test translation if needed
    if (ocrResult.textAnnotations && ocrResult.textAnnotations.length > 0) {
      const extractedText = ocrResult.textAnnotations[0].description;
      console.log('\n🌍 Testing translation service...');
      
      try {
        const translationResult = await ocrService.translateText(extractedText, 'en', 'es');
        console.log('Translation result:', translationResult);
      } catch (transError) {
        console.log('Translation test result:', transError.message);
      }
    }
    
    // Clean up
    await fs.promises.unlink(testImagePath);
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Install canvas if needed and run test
async function installAndTest() {
  try {
    require('canvas');
    await testPublicOcrUpload();
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('📦 Installing canvas package for test image generation...');
      const { exec } = require('child_process');
      exec('npm install canvas', (err, stdout, stderr) => {
        if (err) {
          console.error('❌ Failed to install canvas:', err);
          console.log('💡 You can manually test with an existing image file instead.');
          return;
        }
        console.log('✅ Canvas installed, running test...');
        testPublicOcrUpload();
      });
    } else {
      throw error;
    }
  }
}

if (require.main === module) {
  installAndTest();
}
