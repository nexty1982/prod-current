#!/usr/bin/env node

// Diagnostic script for Parish Map auto-install system
console.log('🔍 Diagnosing Parish Map Auto-Install System...');
console.log('================================================');

try {
  // Test if we can require the bigbook routes
  console.log('1. Testing BigBook routes loading...');
  const bigBookRouter = require('../server/routes/bigbook');
  console.log('✅ BigBook routes loaded successfully');
  
  // Test if multer is available
  console.log('2. Testing multer dependency...');
  const multer = require('multer');
  console.log('✅ Multer is available');
  
  // Test if adm-zip is available
  console.log('3. Testing adm-zip dependency...');
  try {
    const AdmZip = require('adm-zip');
    console.log('✅ AdmZip is available');
  } catch (e) {
    console.log('❌ AdmZip is NOT available:', e.message);
    console.log('   💡 Solution: Install adm-zip with: npm install adm-zip');
  }
  
  // Test if auth middleware is available
  console.log('4. Testing auth middleware...');
  try {
    const { authenticate, authorize } = require('../server/middleware/auth');
    console.log('✅ Auth middleware is available');
  } catch (e) {
    console.log('❌ Auth middleware is NOT available:', e.message);
    console.log('   💡 Check path: ../server/middleware/auth');
  }
  
  // Test if config/db is available
  console.log('5. Testing database config...');
  try {
    const db = require('../server/config/db');
    console.log('✅ Database config is available');
  } catch (e) {
    console.log('❌ Database config is NOT available:', e.message);
  }
  
  // Check if server/index.js includes bigbook routes
  console.log('6. Checking server index.js for bigbook routes...');
  const fs = require('fs');
  const serverIndexPath = '../server/index.js';
  if (fs.existsSync(serverIndexPath)) {
    const serverContent = fs.readFileSync(serverIndexPath, 'utf8');
    if (serverContent.includes('bigbook') && serverContent.includes('/api/bigbook')) {
      console.log('✅ BigBook routes are registered in server/index.js');
    } else {
      console.log('❌ BigBook routes are NOT properly registered in server/index.js');
    }
  } else {
    console.log('❌ server/index.js not found');
  }
  
} catch (error) {
  console.log('❌ Critical error testing BigBook routes:', error.message);
  console.log('Full error:', error);
}

console.log('');
console.log('🏁 Diagnosis complete!');
console.log('');
console.log('📋 Next steps if issues found:');
console.log('   1. Install missing dependencies');
console.log('   2. Fix middleware paths'); 
console.log('   3. Restart the server');
console.log('   4. Test Parish Map upload again'); 