// Quick test to verify server dependencies
console.log('🔍 Testing server dependencies...');

try {
  // Test required modules
  const express = require('express');
  const { promisePool } = require('../config/db');
  const { requireAuth, requireRole } = require('../middleware/auth');
  const { cleanRecords, cleanRecord } = require('../utils/dateFormatter');
  const { validateChurchData, sanitizeChurchData, generateChurchId } = require('../utils/churchValidation');
  const { getRecordsDbPool } = require('../utils/dbConnections');
  
  console.log('✅ All required modules loaded successfully');
  console.log('✅ Server should start without import errors');
  
  // Test database connections
  const { testConnections } = require('../utils/dbConnections');
  testConnections().then(success => {
    if (success) {
      console.log('✅ Database connections test passed');
    } else {
      console.log('⚠️  Database connections test failed');
    }
  }).catch(err => {
    console.log('❌ Database connection error:', err.message);
  });
  
} catch (error) {
  console.error('❌ Dependency test failed:', error.message);
  console.error('📍 Error details:', error.stack);
}
