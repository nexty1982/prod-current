#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for console output
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
  const timestamp = new Date().toISOString();
  const source = process.argv.includes('--ui') ? '[WEB-UI]' : '[CLI]';
  console.log(`${colors[color]}[${timestamp}] ${source} ${message}${colors.reset}`);
}

function readConfig() {
  try {
    const configPath = path.join(process.cwd(), 'build.config.json');
    const configContent = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configContent);
  } catch (error) {
    log('Error reading build.config.json', 'red');
    log('Using default configuration', 'yellow');
    return {
      mode: 'incremental',
      memory: 4096,
      installPackage: '',
      legacyPeerDeps: true,
      skipInstall: false,
      dryRun: false
    };
  }
}

function executeCommand(command, description) {
  try {
    log(`Executing: ${description}`, 'cyan');
    if (process.argv.includes('--ui')) {
      log(`Command: ${command}`, 'blue');
    }
    
    const result = execSync(command, { 
      encoding: 'utf8',
      stdio: process.argv.includes('--ui') ? 'pipe' : 'inherit'
    });
    
    if (process.argv.includes('--ui')) {
      log(`✓ ${description} completed successfully`, 'green');
      return result;
    }
    return result;
  } catch (error) {
    log(`✗ ${description} failed`, 'red');
    if (process.argv.includes('--ui')) {
      log(`Error: ${error.message}`, 'red');
      return error.message;
    }
    process.exit(1);
  }
}

function writeBuildLog(config, success, output = '', error = '') {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      config,
      success,
      output: output.substring(0, 10000), // Limit output size
      error: error.substring(0, 5000) // Limit error size
    };
    
    const logPath = path.join(process.cwd(), 'build.log');
    const existingLogs = fs.existsSync(logPath) 
      ? JSON.parse(fs.readFileSync(logPath, 'utf8')) 
      : [];
    
    existingLogs.push(logEntry);
    
    // Keep only last 50 builds
    if (existingLogs.length > 50) {
      existingLogs.splice(0, existingLogs.length - 50);
    }
    
    fs.writeFileSync(logPath, JSON.stringify(existingLogs, null, 2));
  } catch (error) {
    log('Warning: Could not write to build.log', 'yellow');
  }
}

function writeBuildMeta(config, success, duration) {
  try {
    const meta = {
      lastBuild: new Date().toISOString(),
      config,
      success,
      duration,
      version: require('../package.json').version || 'unknown'
    };
    
    const metaPath = path.join(process.cwd(), 'build.meta.json');
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  } catch (error) {
    log('Warning: Could not write to build.meta.json', 'yellow');
  }
}

function main() {
  const startTime = Date.now();
  let buildOutput = '';
  let buildError = '';
  const isUIMode = process.argv.includes('--ui');
  
  // Capture all output for UI mode
  if (isUIMode) {
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args) => {
      buildOutput += args.join(' ') + '\n';
      originalLog(...args);
    };
    
    console.error = (...args) => {
      buildError += args.join(' ') + '\n';
      originalError(...args);
    };
  }
  
  try {
    log('🚀 Starting OrthodoxMetrics Build System', 'bright');
    
    // Read configuration
    const config = readConfig();
    log(`Configuration loaded: mode=${config.mode}, memory=${config.memory}MB`, 'blue');
    
    if (config.dryRun) {
      log('🔍 DRY RUN MODE - No actual execution', 'yellow');
      log(`Would execute: ${config.mode} build with ${config.memory}MB memory`, 'cyan');
      if (config.installPackage) {
        log(`Would install package: ${config.installPackage}`, 'cyan');
      }
      
      if (isUIMode) {
        console.log(JSON.stringify({
          success: true,
          output: buildOutput,
          error: '',
          duration: Date.now() - startTime,
          config: config,
          dryRun: true
        }));
      }
      return;
    }
    
    // Set NODE_OPTIONS for memory
    process.env.NODE_OPTIONS = `--max-old-space-size=${config.memory}`;
    log(`Set NODE_OPTIONS=--max-old-space-size=${config.memory}`, 'blue');
    
    // Navigate to front-end directory
    const frontEndPath = path.join(process.cwd(), 'front-end');
    if (!fs.existsSync(frontEndPath)) {
      throw new Error('front-end directory not found');
    }
    
    process.chdir(frontEndPath);
    log('Changed to front-end directory', 'blue');
    
    // Install package if specified
    if (config.installPackage && !config.skipInstall) {
      const installCommand = config.legacyPeerDeps 
        ? `npm install ${config.installPackage} --legacy-peer-deps`
        : `npm install ${config.installPackage}`;
      
      const result = executeCommand(installCommand, `Installing package: ${config.installPackage}`);
      if (process.argv.includes('--ui')) {
        buildOutput += `Package installation: ${result}\n`;
      }
    }
    
    // Run build based on mode
    if (config.mode === 'full') {
      log('🧹 Running full build (clean install + build)', 'cyan');
      
      if (!config.skipInstall) {
        const cleanCommand = 'rm -rf dist node_modules package-lock.json';
        const result = executeCommand(cleanCommand, 'Cleaning previous build artifacts');
        if (process.argv.includes('--ui')) {
          buildOutput += `Clean: ${result}\n`;
        }
        
        const installCommand = config.legacyPeerDeps 
          ? 'npm install --legacy-peer-deps'
          : 'npm install';
        
        const result2 = executeCommand(installCommand, 'Installing dependencies');
        if (process.argv.includes('--ui')) {
          buildOutput += `Install: ${result2}\n`;
        }
      }
      
      const buildResult = executeCommand('npm run build', 'Building application');
      if (process.argv.includes('--ui')) {
        buildOutput += `Build: ${buildResult}\n`;
      }
    } else {
      // Incremental build
      log('⚡ Running incremental build', 'cyan');
      const buildResult = executeCommand('npm run build', 'Building application');
      if (process.argv.includes('--ui')) {
        buildOutput += `Build: ${buildResult}\n`;
      }
    }
    
    const duration = Date.now() - startTime;
    log(`✅ Build completed successfully in ${duration}ms`, 'green');
    
    // Write logs and metadata
    writeBuildLog(config, true, buildOutput);
    writeBuildMeta(config, true, duration);
    
    if (process.argv.includes('--ui')) {
      console.log(JSON.stringify({
        success: true,
        output: buildOutput,
        duration,
        config
      }));
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`❌ Build failed after ${duration}ms`, 'red');
    log(`Error: ${error.message}`, 'red');
    
    buildError = error.message;
    
    // Write logs and metadata
    const config = readConfig();
    writeBuildLog(config, false, buildOutput, buildError);
    writeBuildMeta(config, false, duration);
    
    if (process.argv.includes('--ui')) {
      console.log(JSON.stringify({
        success: false,
        error: buildError,
        duration,
        config
      }));
    }
    
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
OrthodoxMetrics Build System

Usage: node scripts/build.js [options]

Options:
  --ui          Run in UI mode (returns JSON output)
  --help, -h    Show this help message

Configuration:
  Reads from build.config.json in the project root.
  
  Fields:
  - mode: "full" | "incremental"
  - memory: number (MB)
  - installPackage: string (optional npm package)
  - legacyPeerDeps: boolean
  - skipInstall: boolean
  - dryRun: boolean

Examples:
  node scripts/build.js
  node scripts/build.js --ui
  node scripts/build.js --help
`);
  process.exit(0);
}

main(); 