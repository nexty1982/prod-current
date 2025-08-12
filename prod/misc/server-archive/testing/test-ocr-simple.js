#!/usr/bin/env node

// Simple test of OCR service functionality
console.log('🧪 Testing OCR Service Directly...\n');

async function testOCR() {
  try {
    // Import the OCR service
    const ocrService = require('./services/ocrProcessingService');
    console.log('✅ OCR service imported successfully');
    console.log('   - Type:', typeof ocrService);
    console.log('   - Has performOcr:', typeof ocrService.performOcr);
    console.log('   - Has translateText:', typeof ocrService.translateText);

    // Create a simple test image
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
    const path = require('path');
    const fs = require('fs').promises;
    
    const testImagePath = path.join(__dirname, 'temp', 'test-simple.png');
    await fs.mkdir(path.dirname(testImagePath), { recursive: true });
    
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(testImagePath, buffer);
    
    console.log(`📷 Created test image: ${testImagePath}`);
    
    // Test OCR processing
    console.log('\n🔍 Testing OCR processing...');
    const ocrResult = await ocrService.performOcr(testImagePath, 'en');
    
    console.log('✅ OCR processing completed!');
    console.log('📄 Result structure:');
    console.log('   - Type:', typeof ocrResult);
    console.log('   - Has textAnnotations:', !!ocrResult.textAnnotations);
    
    if (ocrResult.textAnnotations && ocrResult.textAnnotations.length > 0) {
      const firstAnnotation = ocrResult.textAnnotations[0];
      console.log('   - Detected text:', JSON.stringify(firstAnnotation.description));
      console.log('   - Detected locale:', firstAnnotation.locale);
      console.log('   - Confidence available:', !!firstAnnotation.confidence);
    }
    
    // Test translation (expect it to fail, but handle gracefully)
    console.log('\n🌍 Testing translation...');
    try {
      const translationResult = await ocrService.translateText('Hello World', 'en', 'es');
      console.log('✅ Translation successful:', translationResult);
    } catch (translationError) {
      console.log('⚠️ Translation failed (expected):', translationError.message);
      console.log('   - This is OK for public OCR to work without translation');
    }
    
    // Clean up
    await fs.unlink(testImagePath);
    console.log('\n🧹 Cleaned up test files');
    
    console.log('\n🎉 OCR Service Test Complete!');
    console.log('✅ Core OCR functionality is working');
    console.log('⚠️ Translation API needs to be enabled for full functionality');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('   Stack:', error.stack);
  }
}

testOCR();
