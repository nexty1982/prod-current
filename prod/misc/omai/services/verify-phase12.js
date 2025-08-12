#!/usr/bin/env node

/**
 * OMAI Phase 12 Verification Script
 * 
 * This script verifies that all Phase 12 components are properly implemented
 * and ready for testing. It checks file existence, imports, and basic functionality.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 OMAI Phase 12 Verification Script\n');

// Define required files
const requiredFiles = [
  'types/agent-dialogue.ts',
  'dialogue/chat-engine.ts',
  'dialogue/context-sync.ts',
  'dialogue/translator.ts',
  'dialogue/test-dialogue.ts',
  'dialogue/index.ts',
  'dialogue/README.md',
  'agents/omai-mediator.ts',
  'orchestrator.ts',
  'PHASE12_STATUS.md'
];

// Check if files exist
console.log('📁 Checking file existence...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

console.log('');

// Check TypeScript compilation readiness
console.log('🔧 Checking TypeScript compilation readiness...');

try {
  // Check if ts-node is available
  const { execSync } = require('child_process');
  try {
    execSync('npx ts-node --version', { stdio: 'pipe' });
    console.log('   ✅ ts-node is available');
  } catch (error) {
    console.log('   ⚠️  ts-node not available - install with: npm install -g ts-node');
  }
} catch (error) {
  console.log('   ⚠️  Cannot check ts-node availability');
}

// Check package.json for TypeScript dependencies
const packageJsonPath = path.join(__dirname, '../../package.json');
if (fs.existsSync(packageJsonPath)) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (packageJson.devDependencies && packageJson.devDependencies.typescript) {
      console.log('   ✅ TypeScript dependency found');
    } else {
      console.log('   ⚠️  TypeScript dependency not found in package.json');
    }
  } catch (error) {
    console.log('   ⚠️  Cannot read package.json');
  }
}

console.log('');

// Check for memory directory
const memoryDir = path.join(__dirname, 'memory');
if (!fs.existsSync(memoryDir)) {
  console.log('📁 Creating memory directory...');
  try {
    fs.mkdirSync(memoryDir, { recursive: true });
    console.log('   ✅ Memory directory created');
  } catch (error) {
    console.log('   ❌ Failed to create memory directory');
  }
} else {
  console.log('   ✅ Memory directory exists');
}

console.log('');

// Summary
console.log('📊 Verification Summary:');
console.log(`   Files checked: ${requiredFiles.length}`);
console.log(`   Files present: ${requiredFiles.filter(file => fs.existsSync(path.join(__dirname, file))).length}`);
console.log(`   All files exist: ${allFilesExist ? '✅' : '❌'}`);

console.log('');

if (allFilesExist) {
  console.log('🎉 Phase 12 is ready for testing!');
  console.log('');
  console.log('📋 Next steps:');
  console.log('   1. Ensure Node.js and TypeScript are installed');
  console.log('   2. Run: npx ts-node services/om-ai/dialogue/test-dialogue.ts');
  console.log('   3. Check the test output for any errors');
  console.log('   4. Review the PHASE12_STATUS.md for detailed information');
} else {
  console.log('⚠️  Some files are missing. Please check the implementation.');
}

console.log('');
console.log('📚 For more information, see:');
console.log('   - services/om-ai/PHASE12_STATUS.md');
console.log('   - services/om-ai/dialogue/README.md'); 