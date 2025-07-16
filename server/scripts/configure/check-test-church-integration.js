#!/usr/bin/env node

/**
 * Test Church Feature Integration Verification
 * Quick check to see if the feature is properly integrated
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 Test Church Feature Integration Check');
console.log('=' .repeat(50));

// Check frontend component
const frontendPath = path.join(__dirname, '..', 'front-end', 'src', 'components', 'admin', 'ChurchWizard.jsx');

if (fs.existsSync(frontendPath)) {
  const content = fs.readFileSync(frontendPath, 'utf8');
  
  console.log('\n📱 Frontend Component Check:');
  
  if (content.includes('is_test_church')) {
    console.log('  ✅ Test church checkbox found');
  } else {
    console.log('  ❌ Test church checkbox missing');
    console.log('  💡 Run the setup script to add the test church feature');
  }
  
  if (content.includes('testChurch:')) {
    console.log('  ✅ Test church form state found');
  } else {
    console.log('  ❌ Test church form state missing');
  }
  
  if (content.includes('Create as Test Church')) {
    console.log('  ✅ Test church UI elements found');
  } else {
    console.log('  ❌ Test church UI elements missing');
  }
  
} else {
  console.log('  ❌ ChurchWizard.jsx not found');
}

// Check backend routes
const backendPath = path.join(__dirname, 'routes', 'churchSetupWizard.js');

if (fs.existsSync(backendPath)) {
  const content = fs.readFileSync(backendPath, 'utf8');
  
  console.log('\n🔧 Backend Routes Check:');
  
  if (content.includes('TestChurchDataGenerator')) {
    console.log('  ✅ Test data generator imported');
  } else {
    console.log('  ❌ Test data generator not imported');
  }
  
  if (content.includes('is_test_church')) {
    console.log('  ✅ Test church parameter handling found');
  } else {
    console.log('  ❌ Test church parameter handling missing');
  }
  
} else {
  console.log('  ❌ churchSetupWizard.js not found');
}

// Check test data generator
const generatorPath = path.join(__dirname, 'services', 'testChurchDataGenerator.js');

if (fs.existsSync(generatorPath)) {
  console.log('\n🧪 Test Data Generator Check:');
  console.log('  ✅ Test data generator service found');
} else {
  console.log('\n🧪 Test Data Generator Check:');
  console.log('  ❌ Test data generator service missing');
}

console.log('\n📋 Integration Summary:');
const frontendReady = fs.existsSync(frontendPath) && fs.readFileSync(frontendPath, 'utf8').includes('is_test_church');
const backendReady = fs.existsSync(backendPath) && fs.readFileSync(backendPath, 'utf8').includes('TestChurchDataGenerator');
const generatorReady = fs.existsSync(generatorPath);

if (frontendReady && backendReady && generatorReady) {
  console.log('  ✅ Test Church Feature is fully integrated!');
  console.log('  🎯 You should see the test church checkbox in the Church Setup Wizard');
} else {
  console.log('  ⚠️  Test Church Feature needs setup');
  console.log('  🚀 Run: node setup-test-church-feature.js');
}

console.log('\n' + '=' .repeat(50));
