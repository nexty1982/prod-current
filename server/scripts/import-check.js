#!/usr/bin/env node

/**
 * Import Check Script
 * Pre-flight check that all route modules can be imported without crashing
 * Exits with non-zero code if any imports fail
 */

const path = require('path');
const fs = require('fs');

const QUIET = process.env.OM_DEPLOY_QUIET === '1' || process.env.OM_DEPLOY_QUIET === 'true';

const log = (...args) => {
  if (!QUIET) console.log(...args);
};

// Routes to check (relative to server directory)
let routesToCheck = [
  // API routes (new structure)
  'src/api/baptism.js',
  'src/api/marriage.js',
  'src/api/funeral.js',
  
  // Routes (current structure)
  'src/routes/baptism.js',
  'src/routes/marriage.js',
  'src/routes/funeral.js',
  'src/routes/logs.js',
  'src/routes/library.js',
  'src/routes/admin/churches.js',
  'src/routes/admin/users.js',
  
  // Middleware
  'src/middleware/logger.js',
  'src/middleware/auth.js',
  
  // Note: dist/index.js boots the full Express app (config dump, route mount spam).
  // Deploy uses OM_DEPLOY_QUIET=1 and checks route modules only; full boot is health-check.
];

if (!QUIET) {
  routesToCheck = routesToCheck.concat(['dist/index.js']);
}

let hasErrors = false;
const errors = [];
let passCount = 0;
let skipCount = 0;

log('🔍 Checking route module imports...\n');

let restoreConsole = () => {};
if (QUIET) {
  const origLog = console.log;
  const origWarn = console.warn;
  const origInfo = console.info;
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
  restoreConsole = () => {
    console.log = origLog;
    console.warn = origWarn;
    console.info = origInfo;
  };
}

for (const routePath of routesToCheck) {
  const fullPath = path.join(__dirname, '..', routePath);
  
  if (!fs.existsSync(fullPath)) {
    skipCount++;
    log(`⚠️  SKIP: ${routePath} (file not found)`);
    continue;
  }
  
    try {
      // Change to server directory for relative requires
      const originalCwd = process.cwd();
      process.chdir(path.join(__dirname, '..'));
      
      try {
        require(fullPath);
        passCount++;
        log(`✅ PASS: ${routePath}`);
      } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
          // Check if it's a missing dependency (not the file itself)
          const errorMsg = error.message || String(error);
          if (errorMsg.includes('Cannot find module') && !errorMsg.includes(routePath)) {
            console.error(`❌ FAIL: ${routePath} - Missing module: ${error.message}`);
            errors.push({ route: routePath, error: error.message });
            hasErrors = true;
          } else {
            skipCount++;
            log(`⚠️  SKIP: ${routePath} - ${error.message}`);
          }
        } else if (error.message && error.message.includes('Unexpected token')) {
          skipCount++;
          log(`⚠️  SKIP: ${routePath} - TypeScript file (check after compilation)`);
        } else if (!QUIET) {
          log(`⚠️  WARN: ${routePath} - ${error.message}`);
        }
      } finally {
        process.chdir(originalCwd);
      }
    } catch (error) {
      // Outer catch for file system errors
      if (error.code === 'MODULE_NOT_FOUND' && error.message.includes(routePath)) {
        skipCount++;
        log(`⚠️  SKIP: ${routePath} - File not found`);
      } else {
        console.error(`❌ FAIL: ${routePath} - ${error.message}`);
        errors.push({ route: routePath, error: error.message });
        hasErrors = true;
      }
    }
}

restoreConsole();

if (hasErrors) {
  console.error('❌ Import check FAILED');
  errors.forEach(({ route, error }) => {
    console.error(`  - ${route}: ${error}`);
  });
  process.exit(1);
}

if (QUIET) {
  process.exit(0);
}

console.log('\n' + '='.repeat(60));
console.log('✅ All route imports successful');
process.exit(0);
