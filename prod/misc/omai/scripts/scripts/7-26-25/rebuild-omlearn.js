#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${colors.bright}${colors.blue}[${step}]${colors.reset} ${message}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'cyan');
}

// Main rebuild function
async function rebuildOMLearn() {
  try {
    logStep('1', 'Starting OMLearn frontend rebuild...');
    
    // Check if we're in the right directory
    const currentDir = process.cwd();
    logInfo(`Current directory: ${currentDir}`);
    
    // Navigate to front-end directory
    const frontEndPath = path.join(currentDir, 'front-end');
    if (!fs.existsSync(frontEndPath)) {
      throw new Error('front-end directory not found. Please run this script from the project root.');
    }
    
    logStep('2', 'Navigating to front-end directory...');
    process.chdir(frontEndPath);
    logSuccess(`Changed to directory: ${process.cwd()}`);
    
    // Check if package.json exists
    if (!fs.existsSync('package.json')) {
      throw new Error('package.json not found in front-end directory');
    }
    
    logStep('3', 'Cleaning previous build artifacts...');
    
    // Remove node_modules if it exists
    if (fs.existsSync('node_modules')) {
      logInfo('Removing node_modules...');
      execSync('rm -rf node_modules', { stdio: 'inherit' });
      logSuccess('node_modules removed');
    }
    
    // Remove package-lock.json if it exists
    if (fs.existsSync('package-lock.json')) {
      logInfo('Removing package-lock.json...');
      execSync('rm -f package-lock.json', { stdio: 'inherit' });
      logSuccess('package-lock.json removed');
    }
    
    // Remove dist directory if it exists
    if (fs.existsSync('dist')) {
      logInfo('Removing dist directory...');
      execSync('rm -rf dist', { stdio: 'inherit' });
      logSuccess('dist directory removed');
    }
    
    logStep('4', 'Installing dependencies...');
    logInfo('Running npm install with legacy peer deps...');
    execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });
    logSuccess('Dependencies installed successfully');
    
    logStep('5', 'Building OMLearn module...');
    logInfo('Setting NODE_OPTIONS for increased memory...');
    
    // Set environment variable for increased memory
    process.env.NODE_OPTIONS = '--max-old-space-size=4096';
    
    logInfo('Running npm run build...');
    execSync('npm run build', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' }
    });
    
    logSuccess('Build completed successfully!');
    
    logStep('6', 'Build Summary');
    logInfo('OMLearn module has been rebuilt and is ready for deployment');
    logInfo('The module is now available at: /bigbook/omlearn');
    logInfo('All components have been compiled and optimized');
    
    // Check if dist directory was created
    if (fs.existsSync('dist')) {
      const distStats = fs.statSync('dist');
      logInfo(`Build output size: ${(distStats.size / 1024 / 1024).toFixed(2)} MB`);
    }
    
    log('\n' + '='.repeat(50), 'green');
    log('🎉 OMLearn rebuild completed successfully!', 'green');
    log('='.repeat(50), 'green');
    
  } catch (error) {
    logError('Rebuild failed!');
    logError(`Error: ${error.message}`);
    
    if (error.stdout) {
      logInfo('Command output:');
      console.log(error.stdout.toString());
    }
    
    if (error.stderr) {
      logWarning('Error output:');
      console.log(error.stderr.toString());
    }
    
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  log('OMLearn Frontend Rebuild Script', 'bright');
  log('================================', 'blue');
  log('');
  log('Usage: node rebuild-omlearn.js [options]', 'bright');
  log('');
  log('Options:', 'bright');
  log('  --help, -h     Show this help message', 'cyan');
  log('  --verbose, -v  Enable verbose output', 'cyan');
  log('');
  log('Description:', 'bright');
  log('  This script rebuilds the OMLearn frontend module by:', 'cyan');
  log('  1. Cleaning previous build artifacts', 'cyan');
  log('  2. Installing dependencies with legacy peer deps', 'cyan');
  log('  3. Building the project with increased memory allocation', 'cyan');
  log('');
  log('Requirements:', 'bright');
  log('  - Node.js and npm installed', 'cyan');
  log('  - Run from project root directory', 'cyan');
  log('  - front-end/ directory must exist', 'cyan');
  log('');
  process.exit(0);
}

// Run the rebuild
rebuildOMLearn(); 