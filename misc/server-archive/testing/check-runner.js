#!/usr/bin/env node

/**
 * Link & Permission Check Runner
 * 
 * Provides a simple interface to run different types of link and permission checks
 */

const { execSync } = require('child_process');
const path = require('path');

function printUsage() {
  console.log('🔍 Orthodox Metrics Link & Permission Checker');
  console.log('=' .repeat(50));
  console.log('');
  console.log('Available commands:');
  console.log('');
  console.log('1. Quick Test (no login required):');
  console.log('   npm run check:quick');
  console.log('   node scripts/quick-permission-test.js');
  console.log('');
  console.log('2. Full Link Check (with auto-login):');
  console.log('   npm run check:full');
  console.log('   node scripts/check-links-permissions.js');
  console.log('');
  console.log('3. Browser Session Test (use your browser cookies):');
  console.log('   npm run check:session -- --cookie "your-session-cookie"');
  console.log('   node scripts/browser-session-test.js --cookie "your-session-cookie"');
  console.log('');
  console.log('Environment variables:');
  console.log('  BASE_URL - Application URL (default: http://localhost:3001)');
  console.log('  ADMIN_EMAIL - Admin email (default: superadmin@orthodoxmetrics.com)');
  console.log('  ADMIN_PASSWORD - Admin password (default: admin123)');
  console.log('');
  console.log('Examples:');
  console.log('  BASE_URL=http://localhost:3000 npm run check:quick');
  console.log('  npm run check:session -- --cookie "connect.sid=s%3A..."');
  console.log('');
}

function runCommand(command, description) {
  console.log(`🚀 ${description}`);
  console.log('=' .repeat(50));
  console.log('');
  
  try {
    execSync(command, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
  } catch (error) {
    console.error(`❌ Command failed: ${error.message}`);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'quick':
    runCommand('node scripts/quick-permission-test.js', 'Running Quick Permission Test');
    break;
    
  case 'full':
    runCommand('node scripts/check-links-permissions.js', 'Running Full Link & Permission Check');
    break;
    
  case 'session':
    const cookieArg = args.find((arg, index) => args[index - 1] === '--cookie');
    if (!cookieArg) {
      console.error('❌ Session cookie required for browser session test');
      console.log('Usage: npm run check:session -- --cookie "your-session-cookie"');
      process.exit(1);
    }
    runCommand(`node scripts/browser-session-test.js --cookie "${cookieArg}"`, 'Running Browser Session Test');
    break;
    
  case 'help':
  case '--help':
  case '-h':
  default:
    printUsage();
    break;
}
