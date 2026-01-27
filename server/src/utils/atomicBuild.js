#!/usr/bin/env node

/**
 * Atomic Build System
 * 
 * Implements zero-downtime builds by:
 * 1. Building to a temporary dist-new directory
 * 2. Atomically swapping directories (dist → dist-old, dist-new → dist)
 * 3. Cleaning up old directory
 * 4. Setting maintenance flags during the process
 * 
 * This ensures Nginx always has a valid dist folder to serve.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { notifyBuildCompleted, notifyBuildFailed } = require('./superAdminNotifications');

const FRONT_END_PATH = path.join(__dirname, '../../../front-end');
const DIST_PATH = path.join(FRONT_END_PATH, 'dist');
const DIST_NEW_PATH = path.join(FRONT_END_PATH, 'dist-new');
const DIST_OLD_PATH = path.join(FRONT_END_PATH, 'dist-old');
const MAINTENANCE_FLAG = '/tmp/om-maintenance.flag';

/**
 * Set maintenance flag
 */
function setMaintenanceFlag() {
  try {
    const timestamp = new Date().toISOString();
    fs.writeFileSync(MAINTENANCE_FLAG, JSON.stringify({
      status: 'building',
      startTime: timestamp,
      message: 'System is being updated. Please wait...'
    }), 'utf8');
    console.log('🚧 Maintenance flag set');
  } catch (err) {
    console.warn('⚠️  Could not set maintenance flag:', err.message);
  }
}

/**
 * Clear maintenance flag
 */
function clearMaintenanceFlag() {
  try {
    if (fs.existsSync(MAINTENANCE_FLAG)) {
      fs.unlinkSync(MAINTENANCE_FLAG);
      console.log('✅ Maintenance flag cleared');
    }
  } catch (err) {
    console.warn('⚠️  Could not clear maintenance flag:', err.message);
  }
}

/**
 * Clean up old directories
 */
function cleanupOldDirs() {
  try {
    if (fs.existsSync(DIST_OLD_PATH)) {
      console.log('🧹 Removing old dist-old directory...');
      execSync('rm -rf "' + DIST_OLD_PATH + '"', { stdio: 'inherit' });
    }
    if (fs.existsSync(DIST_NEW_PATH)) {
      console.log('🧹 Removing stale dist-new directory...');
      execSync('rm -rf "' + DIST_NEW_PATH + '"', { stdio: 'inherit' });
    }
  } catch (err) {
    console.error('❌ Cleanup failed:', err.message);
    throw err;
  }
}

/**
 * Build to dist-new directory
 */
function buildToDistNew() {
  try {
    console.log('🔨 Building to dist-new directory...');
    
    // Run the build
    execSync(
      'NODE_OPTIONS="--max-old-space-size=4096" npx vite build --mode production --outDir dist-new',
      { 
        cwd: FRONT_END_PATH,
        stdio: 'inherit'
      }
    );
    
    console.log('✅ Build completed successfully');
    return true;
  } catch (err) {
    console.error('❌ Build failed:', err.message);
    return false;
  }
}

/**
 * Perform atomic directory swap
 */
function atomicSwap() {
  try {
    console.log('🔄 Performing atomic directory swap...');
    
    // Verify dist-new exists and has content
    if (!fs.existsSync(DIST_NEW_PATH)) {
      throw new Error('dist-new directory does not exist');
    }
    
    const distNewFiles = fs.readdirSync(DIST_NEW_PATH);
    if (distNewFiles.length === 0) {
      throw new Error('dist-new directory is empty');
    }
    
    console.log('   Found ' + distNewFiles.length + ' items in dist-new');
    
    // Atomic swap: dist → dist-old, dist-new → dist
    const commands = [];
    
    if (fs.existsSync(DIST_PATH)) {
      commands.push('mv "' + DIST_PATH + '" "' + DIST_OLD_PATH + '"');
    }
    
    commands.push('mv "' + DIST_NEW_PATH + '" "' + DIST_PATH + '"');
    
    if (fs.existsSync(DIST_OLD_PATH)) {
      commands.push('rm -rf "' + DIST_OLD_PATH + '"');
    }
    
    // Execute all commands in one shell to ensure atomicity
    const fullCommand = commands.join(' && ');
    execSync(fullCommand, { cwd: FRONT_END_PATH, stdio: 'inherit' });
    
    console.log('✅ Atomic swap completed');
    return true;
  } catch (err) {
    console.error('❌ Atomic swap failed:', err.message);
    
    // Attempt rollback if dist-old exists
    if (fs.existsSync(DIST_OLD_PATH) && !fs.existsSync(DIST_PATH)) {
      console.log('🔙 Attempting rollback...');
      try {
        execSync('mv "' + DIST_OLD_PATH + '" "' + DIST_PATH + '"', { stdio: 'inherit' });
        console.log('✅ Rollback successful');
      } catch (rollbackErr) {
        console.error('❌ Rollback failed:', rollbackErr.message);
      }
    }
    
    return false;
  }
}

/**
 * Main atomic build process
 */
async function atomicBuild() {
  console.log('🚀 Starting atomic build process...\n');
  
  const startTime = Date.now();
  
  try {
    // Set maintenance flag
    setMaintenanceFlag();
    
    // Clean up any old directories
    cleanupOldDirs();
    
    // Build to dist-new
    const buildSuccess = buildToDistNew();
    if (!buildSuccess) {
      throw new Error('Build failed');
    }
    
    // Perform atomic swap
    const swapSuccess = atomicSwap();
    if (!swapSuccess) {
      throw new Error('Atomic swap failed');
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n✅ Atomic build completed successfully in ' + duration + 's');
    console.log('   Zero-downtime deployment achieved! 🎉\n');
    
    // Notify super admins
    try {
      await notifyBuildCompleted(duration, 'production');
    } catch (notifyErr) {
      console.warn('Failed to send build notification:', notifyErr.message);
    }
    
    return true;
  } catch (err) {
    console.error('\n❌ Atomic build failed:', err.message);
    console.error('   The live dist folder remains unchanged.\n');
    
    // Notify super admins of failure
    try {
      await notifyBuildFailed(err.message, 'production');
    } catch (notifyErr) {
      console.warn('Failed to send build failure notification:', notifyErr.message);
    }
    
    return false;
  } finally {
    // Always clear maintenance flag
    clearMaintenanceFlag();
  }
}

// Run if called directly
if (require.main === module) {
  atomicBuild().then(function(success) {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { atomicBuild };
