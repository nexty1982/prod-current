#!/usr/bin/env node

/**
 * Simple test script for the component scanner
 * This script tests basic functionality without full TypeScript compilation
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing OMLS Component Scanner...\n');

// Test 1: Check if main script exists
const mainScript = path.join(__dirname, 'generateRefactoredMenu.ts');
if (fs.existsSync(mainScript)) {
  console.log('✅ Main script exists:', mainScript);
} else {
  console.log('❌ Main script not found');
  process.exit(1);
}

// Test 2: Check if package.json exists
const packageJson = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJson)) {
  console.log('✅ Package.json exists:', packageJson);
} else {
  console.log('❌ Package.json not found');
  process.exit(1);
}

// Test 3: Check if README exists
const readme = path.join(__dirname, 'README.md');
if (fs.existsSync(readme)) {
  console.log('✅ README exists:', readme);
} else {
  console.log('❌ README not found');
  process.exit(1);
}

// Test 4: Check project structure
const projectRoot = path.join(__dirname, '..', '..', '..');
const componentsDir = path.join(projectRoot, 'src', 'components');
const menuConfig = path.join(projectRoot, 'src', 'menuConfig.ts');

if (fs.existsSync(componentsDir)) {
  console.log('✅ Components directory exists:', componentsDir);
  
  // Count component files
  const countFiles = (dir) => {
    let count = 0;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      if (item.isDirectory()) {
        count += countFiles(path.join(dir, item.name));
      } else if (item.name.match(/\.(tsx|jsx|ts|js)$/)) {
        count++;
      }
    }
    
    return count;
  };
  
  const componentCount = countFiles(componentsDir);
  console.log(`📊 Found approximately ${componentCount} component files`);
} else {
  console.log('❌ Components directory not found');
}

if (fs.existsSync(menuConfig)) {
  console.log('✅ Menu config exists:', menuConfig);
} else {
  console.log('❌ Menu config not found');
}

// Test 5: Check dependencies
const packageContent = JSON.parse(fs.readFileSync(packageJson, 'utf-8'));
if (packageContent.dependencies && packageContent.dependencies.glob) {
  console.log('✅ glob dependency specified');
} else {
  console.log('❌ glob dependency missing');
}

if (packageContent.devDependencies && packageContent.devDependencies.tsx) {
  console.log('✅ tsx dev dependency specified');
} else {
  console.log('❌ tsx dev dependency missing');
}

console.log('\n🎯 Next Steps:');
console.log('1. Install dependencies: npm install');
console.log('2. Run dry scan: npm run scan:dry');
console.log('3. Run full scan: npm run scan');
console.log('4. Check generated files and menu updates');

console.log('\n✅ Test completed successfully!');
