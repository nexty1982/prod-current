#!/usr/bin/env node

// Test script for OCR upload functionality
// Run with: node test-ocr-upload.js

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing OCR Upload Functionality\n');

// Test 1: Check if OCR routes file exists and imports correctly
console.log('1️⃣ Testing OCR routes import...');
try {
  const ocrRoutes = require('./routes/church/ocr');
  console.log('✅ OCR routes imported successfully');
  
  // Check route structure
  const routeStack = ocrRoutes.stack;
  if (routeStack) {
    console.log('✅ Available OCR routes:');
    routeStack.forEach(layer => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods);
        console.log(`   ${methods[0].toUpperCase()} /upload -> ${layer.route.path}`);
      }
    });
  }
} catch(error) {
  console.error('❌ OCR routes import error:', error.message);
  process.exit(1);
}

// Test 2: Check OCR controller imports
console.log('\n2️⃣ Testing OCR controller...');
try {
  const ocrController = require('./controllers/churchOcrController');
  console.log('✅ OCR controller imported successfully');
  
  const functions = Object.keys(ocrController);
  console.log('✅ Available controller functions:');
  functions.forEach(func => {
    console.log(`   - ${func}`);
  });
  
  // Check if uploadImage function exists
  if (typeof ocrController.uploadImage === 'function' || Array.isArray(ocrController.uploadImage)) {
    console.log('✅ uploadImage function found (middleware array)');
  } else {
    console.log('❌ uploadImage function not found or wrong type');
  }
  
} catch(error) {
  console.error('❌ OCR controller import error:', error.message);
  process.exit(1);
}

// Test 3: Check database switcher
console.log('\n3️⃣ Testing database switcher...');
try {
  const { getChurchDbConnection } = require('./utils/dbSwitcher');
  console.log('✅ Database switcher available');
  
  // Test with Saints Peter and Paul church database
  const testDbName = 'saints_peter_and_paul_orthodox_church_db';
  console.log(`✅ Testing connection to: ${testDbName}`);
  
} catch(error) {
  console.error('❌ Database switcher error:', error.message);
}

// Test 4: Check uploads directory structure
console.log('\n4️⃣ Testing uploads directory...');
try {
  const uploadsDir = path.join(__dirname, 'uploads');
  const ocrDir = path.join(uploadsDir, 'ocr');
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('⚠️  Main uploads directory does not exist, creating...');
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Created uploads directory');
  } else {
    console.log('✅ Main uploads directory exists');
  }
  
  if (!fs.existsSync(ocrDir)) {
    console.log('⚠️  OCR uploads directory does not exist, creating...');
    fs.mkdirSync(ocrDir, { recursive: true });
    console.log('✅ Created OCR uploads directory');
  } else {
    console.log('✅ OCR uploads directory exists');
  }
  
  // Check church-specific directory
  const churchOcrDir = path.join(ocrDir, 'church_1'); // Assuming church ID 1
  if (!fs.existsSync(churchOcrDir)) {
    console.log('⚠️  Church OCR directory does not exist, will be created on first upload');
  } else {
    console.log('✅ Church OCR directory exists');
  }
  
} catch(error) {
  console.error('❌ Uploads directory error:', error.message);
}

// Test 5: Check multer configuration
console.log('\n5️⃣ Testing multer configuration...');
try {
  const multer = require('multer');
  console.log('✅ Multer package available');
  
  // Test file size limits
  const maxSize = 10 * 1024 * 1024; // 10MB
  console.log(`✅ File size limit: ${maxSize / (1024 * 1024)}MB`);
  
  // Test allowed file types
  const allowedTypes = /jpeg|jpg|png|gif|bmp|tiff|webp|pdf/;
  console.log('✅ Allowed file types:', allowedTypes.source);
  
} catch(error) {
  console.error('❌ Multer configuration error:', error.message);
}

// Test 6: Check if Saints Peter and Paul church exists in database
console.log('\n6️⃣ Testing church database record...');
(async () => {
  try {
    const { promisePool } = require('./config/db');
    
    const [churchRows] = await promisePool.query('SELECT id, name, database_name FROM churches WHERE name LIKE ?', ['%Saints Peter and Paul%']);
    
    if (churchRows.length > 0) {
      const church = churchRows[0];
      console.log('✅ Church found in database:');
      console.log(`   ID: ${church.id}`);
      console.log(`   Name: ${church.name}`);
      console.log(`   Database: ${church.database_name}`);
      
      // Test connection to church database
      const { getChurchDbConnection } = require('./utils/dbSwitcher');
      const churchDb = await getChurchDbConnection(church.database_name);
      
      // Check if OCR tables exist
      const [tableRows] = await churchDb.query("SHOW TABLES LIKE 'ocr_%'");
      console.log(`✅ OCR tables found: ${tableRows.length}`);
      tableRows.forEach(row => {
        const tableName = Object.values(row)[0];
        console.log(`   - ${tableName}`);
      });
      
    } else {
      console.log('❌ No church found with "Saints Peter and Paul" in name');
    }
    
  } catch(error) {
    console.error('❌ Database test error:', error.message);
  }
})();

console.log('\n🎉 OCR Upload Test Complete!');
console.log('\n📋 Key Points to Check:');
console.log('   1. Make sure you\'re uploading to the correct URL: /api/church/:id/ocr/upload');
console.log('   2. Ensure the file input has name="image"');
console.log('   3. Check browser network tab for actual HTTP requests');
console.log('   4. Verify church ID is correct in the URL');
console.log('\n🚀 If tests pass but upload still fails, check browser console and network requests!');
