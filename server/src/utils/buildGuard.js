#!/usr/bin/env node

/**
 * Build Concurrency Guard
 * 
 * Prevents multiple concurrent builds from running simultaneously.
 * Uses a lock file at /tmp/om-build.lock with the current process PID.
 * 
 * Features:
 * - Checks if another build is already running
 * - Creates lock file with current PID
 * - Automatically cleans up lock file on exit
 * - Retries once after 30 seconds if build is in progress
 */

const fs = require('fs');
const path = require('path');

const LOCK_FILE = '/tmp/om-build.lock';
const RETRY_DELAY_MS = 30000; // 30 seconds
const MAX_RETRIES = 1;

/**
 * Check if a process with the given PID is still running
 */
function isProcessRunning(pid) {
  try {
    // Sending signal 0 checks if process exists without killing it
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // ESRCH means process doesn't exist
    return err.code !== 'ESRCH';
  }
}

/**
 * Check if lock file exists and if the process is still running
 */
function checkLock() {
  if (!fs.existsSync(LOCK_FILE)) {
    return { locked: false };
  }

  try {
    const lockContent = fs.readFileSync(LOCK_FILE, 'utf8').trim();
    const lockPid = parseInt(lockContent, 10);

    if (isNaN(lockPid)) {
      console.warn('⚠️  Invalid PID in lock file. Removing stale lock.');
      fs.unlinkSync(LOCK_FILE);
      return { locked: false };
    }

    if (isProcessRunning(lockPid)) {
      return { locked: true, pid: lockPid };
    } else {
      console.warn('⚠️  Stale lock file detected (PID ' + lockPid + ' not running). Removing.');
      fs.unlinkSync(LOCK_FILE);
      return { locked: false };
    }
  } catch (err) {
    console.error('❌ Error checking lock file:', err.message);
    return { locked: false };
  }
}

/**
 * Create lock file with current process PID
 */
function createLock() {
  try {
    fs.writeFileSync(LOCK_FILE, process.pid.toString(), 'utf8');
    console.log('🔒 Build lock acquired (PID: ' + process.pid + ')');
    return true;
  } catch (err) {
    console.error('❌ Failed to create lock file:', err.message);
    return false;
  }
}

/**
 * Remove lock file
 */
function removeLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const lockContent = fs.readFileSync(LOCK_FILE, 'utf8').trim();
      const lockPid = parseInt(lockContent, 10);
      
      // Only remove if this process owns the lock
      if (lockPid === process.pid) {
        fs.unlinkSync(LOCK_FILE);
        console.log('🔓 Build lock released (PID: ' + process.pid + ')');
      }
    }
  } catch (err) {
    console.error('⚠️  Error removing lock file:', err.message);
  }
}

/**
 * Wait for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main guard logic with retry
 */
async function guardBuild(retryCount) {
  if (typeof retryCount === 'undefined') retryCount = 0;
  
  const lockStatus = checkLock();

  if (lockStatus.locked) {
    if (retryCount < MAX_RETRIES) {
      console.log('⏳ Build in progress by another agent (PID: ' + lockStatus.pid + ').');
      console.log('   Waiting ' + (RETRY_DELAY_MS / 1000) + ' seconds before retry...');
      await sleep(RETRY_DELAY_MS);
      return guardBuild(retryCount + 1);
    } else {
      console.error('❌ Build in progress by another agent (PID: ' + lockStatus.pid + '). Please wait.');
      process.exit(1);
    }
  }

  // No lock exists, create one
  if (!createLock()) {
    console.error('❌ Failed to acquire build lock.');
    process.exit(1);
  }

  // Register cleanup handlers
  const cleanup = function() {
    removeLock();
  };

  process.on('exit', cleanup);
  process.on('SIGINT', function() {
    cleanup();
    process.exit(130); // Standard exit code for SIGINT
  });
  process.on('SIGTERM', function() {
    cleanup();
    process.exit(143); // Standard exit code for SIGTERM
  });
  process.on('uncaughtException', function(err) {
    console.error('❌ Uncaught exception:', err);
    cleanup();
    process.exit(1);
  });

  console.log('✅ Build guard check passed. Proceeding with build...');
}

// Run the guard
guardBuild().catch(function(err) {
  console.error('❌ Build guard error:', err);
  process.exit(1);
});
