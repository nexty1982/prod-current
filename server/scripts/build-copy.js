/*
  Post-build copy step to make dist/ self-contained.
  - Copies JS runtime modules that are not emitted by tsc
  - Preserves directory structure under dist/
*/

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

async function copyDir(srcRel, destRel, { filter } = {}) {
  const src = path.join(ROOT, srcRel);
  const dest = path.join(DIST, destRel);
  if (!exists(src)) return; // nothing to copy
  await fse.ensureDir(dest);
  await fse.copy(src, dest, {
    overwrite: true,
    filter: (srcPath) => {
      if (typeof filter === 'function') return filter(srcPath);
      // default: exclude TypeScript sources from copy
      return !srcPath.endsWith('.ts') && !srcPath.endsWith('.tsx');
    }
  });
  console.log(`[build-copy] Copied ${srcRel} -> ${destRel}`);
}

async function copyFile(srcRel, destRel, { required = false } = {}) {
  const src = path.join(ROOT, srcRel);
  const dest = path.join(DIST, destRel);
  if (!exists(src)) {
    if (required) {
      throw new Error(`Required file not found: ${srcRel}`);
    }
    return; // optional
  }
  await fse.ensureDir(path.dirname(dest));
  await fse.copy(src, dest, { overwrite: true });
  console.log(`[build-copy] Copied ${srcRel} -> ${destRel}`);
}

async function main() {
  // Ensure dist exists
  await fse.ensureDir(DIST);

  // Copy runtime JS that lives outside src (or not emitted by tsc)
  // Note: src/routes is copied AFTER routes to ensure src/routes takes precedence
  await copyDir('routes', 'routes');
  await copyDir('middleware', 'middleware');
  await copyDir('controllers', 'controllers');
  await copyDir('dal', 'dal');
  await copyDir('database', 'database');

  // Copy specific config files (avoid overwriting tsc outputs inadvertently)
  // IMPORTANT: Copy these AFTER TypeScript compilation to ensure they overwrite any compiled versions
  // CRITICAL: config/session.js must be copied from root to overwrite the bridge file from src/config/session.js
  // The bridge file requires '../config/session' which doesn't work from dist/config/
  await copyFile('config/session.js', 'config/session.js', { required: true });
  // Verify the file was copied
  const sessionFile = path.join(DIST, 'config/session.js');
  if (!exists(sessionFile)) {
    console.error('[build-copy] ❌ ERROR: Failed to copy config/session.js to dist/config/session.js');
    throw new Error('Failed to copy config/session.js - file does not exist after copy');
  } else {
    console.log('[build-copy] ✅ Verified dist/config/session.js exists');
  }
  await copyFile('config/db-compat.js', 'config/db-compat.js');
  // CRITICAL: config/db.js must be copied from root to overwrite any compiled TypeScript version
  // This ensures getAppPool() and getAuthPool() functions are available
  // The compiled src/config/db.ts creates dist/config/db.js with only default export,
  // but we need the root config/db.js which has named exports (getAppPool, getAuthPool)
  await copyFile('config/db.js', 'config/db.js');
  
  // Verify the copied file has getAppPool export
  const dbFile = path.join(DIST, 'config/db.js');
  if (exists(dbFile)) {
    const dbContent = fs.readFileSync(dbFile, 'utf8');
    if (!dbContent.includes('function getAppPool') && !dbContent.includes('getAppPool')) {
      console.warn('[build-copy] ⚠️  WARNING: dist/config/db.js may not have getAppPool export');
    } else {
      console.log('[build-copy] ✅ Verified dist/config/db.js has getAppPool export');
    }
  }
  
  // Copy src/config directory (TypeScript files will be compiled by tsc, but we ensure structure exists)
  // Note: tsc will compile .ts files to .js in dist/src/config/
  // We don't need to copy them here, but we ensure the directory structure is ready

  // Copy JS modules kept under src but not emitted (because allowJs is off)
  await copyDir('src/api', 'api');
  await copyDir('src/utils', 'utils');
  // Copy utils/ files that aren't in src/utils (like safeRequire.js)
  await copyDir('utils', 'utils');
  await copyDir('src/services', 'services');
  // Copy src/routes AFTER routes so src/routes files take precedence
  await copyDir('src/routes', 'routes', {
    filter: (srcPath) => {
      // Copy only .js files from src/routes (exclude .ts files which are compiled by tsc)
      return !srcPath.endsWith('.ts') && !srcPath.endsWith('.tsx');
    }
  });
  
  // Verify critical route files have correct imports
  const usersRouteFile = path.join(DIST, 'routes/admin/users.js');
  if (exists(usersRouteFile)) {
    const usersContent = fs.readFileSync(usersRouteFile, 'utf8');
    if (usersContent.includes("require('../../src/services/databaseService')")) {
      console.warn('[build-copy] ⚠️  WARNING: dist/routes/admin/users.js has incorrect import path');
      console.warn('[build-copy]    Expected: require("../../services/databaseService")');
      console.warn('[build-copy]    Found: require("../../src/services/databaseService")');
    } else if (usersContent.includes("require('../../services/databaseService')")) {
      console.log('[build-copy] ✅ Verified dist/routes/admin/users.js has correct import path');
    }
  }

  // Static assets to serve from dist/assets
  await copyDir('src/assets', 'assets', {
    filter: () => true // copy everything under assets
  });
}

main().catch((err) => {
  console.error('[build-copy] Failed:', err);
  process.exit(1);
});
