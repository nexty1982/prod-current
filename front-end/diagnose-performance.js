#!/usr/bin/env node

/**
 * Performance Diagnostic Tool
 * Helps identify what's causing slow dev server performance
 */

import { performance } from 'perf_hooks';
import { readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Vite Dev Server Performance Diagnostics\n');

// Test 1: File Read Speed
console.log('📁 Test 1: File System Performance');
const testFile = join(__dirname, 'package.json');
const iterations = 100;
const start = performance.now();

for (let i = 0; i < iterations; i++) {
  readFileSync(testFile, 'utf8');
}

const duration = performance.now() - start;
const avgTime = duration / iterations;

console.log(`   Read ${iterations}x package.json: ${duration.toFixed(2)}ms`);
console.log(`   Average per read: ${avgTime.toFixed(2)}ms`);

if (avgTime > 10) {
  console.log('   ⚠️  SLOW: File system is slow (network drive detected?)');
} else if (avgTime > 5) {
  console.log('   ⚠️  WARNING: File system is slower than optimal');
} else {
  console.log('   ✅ GOOD: File system is fast');
}

// Test 2: Project Size
console.log('\n📊 Test 2: Project Size');
try {
  const stats = statSync(join(__dirname, 'src'));
  console.log(`   Source directory exists: ✅`);
} catch (e) {
  console.log(`   Source directory: ❌ Not found`);
}

// Test 3: Network Location
console.log('\n🌐 Test 3: Network Location');
const cwd = process.cwd();
console.log(`   Current directory: ${cwd}`);

if (cwd.startsWith('\\\\') || /^[A-Z]:\\/.test(cwd) && cwd[0] !== 'C') {
  console.log('   ⚠️  WARNING: Running from network or mapped drive');
  console.log('   💡 TIP: Run dev server directly on the Linux server for best performance');
} else {
  console.log('   ✅ GOOD: Running from local drive');
}

// Recommendations
console.log('\n💡 Performance Recommendations:\n');
console.log('1. RUN DEV SERVER ON THE LINUX SERVER:');
console.log('   SSH into 192.168.1.239 and run:');
console.log('   $ cd /var/www/orthodoxmetrics/prod/front-end');
console.log('   $ npm run dev');
console.log('   Access at: http://192.168.1.239:5174\n');

console.log('2. OR USE SSH PORT FORWARDING:');
console.log('   Run on Linux server, forward to your Windows machine:');
console.log('   $ ssh -L 5174:localhost:5174 user@192.168.1.239');
console.log('   Access at: http://localhost:5174 (much faster!)\n');

console.log('3. TEMPORARY SPEED BOOST:');
console.log('   Clear Vite cache: npm run clean:cache');
console.log('   Use production build locally: npm run build && npm run preview\n');

console.log('4. REDUCE FILE WATCHING:');
console.log('   Close unnecessary editors/tools accessing the Z: drive');
console.log('   Disable antivirus scanning on Z: drive\n');
