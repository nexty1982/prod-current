#!/usr/bin/env node
/**
 * Admin Capabilities Inventory Script
 *
 * Scans server/src for Express route declarations and upserts them into
 * the admin_capabilities table in orthodoxmetrics_db.
 *
 * Usage:
 *   node server/src/scripts/inventory-admin-capabilities.js
 *   node server/src/scripts/inventory-admin-capabilities.js --dry-run
 *
 * Prerequisites:
 *   - Run the migration: server/database/migrations/2026-02-09_admin_capabilities.sql
 *   - .env must exist at server/.env with DB credentials
 */

const path = require('path');
const fs = require('fs');

// Load .env from server root
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const mysql = require('mysql2/promise');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const DRY_RUN = process.argv.includes('--dry-run');
const SERVER_SRC = path.resolve(__dirname, '..');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'orthodoxapps',
  password: process.env.DB_PASSWORD || process.env.DB_PASS,
  database: 'orthodoxmetrics_db',
  connectTimeout: 30000,
  waitForConnections: true,
  connectionLimit: 5,
  charset: 'utf8mb4',
});

// ---------------------------------------------------------------------------
// Route scanning helpers
// ---------------------------------------------------------------------------

/**
 * Recursively collect all .js and .ts files under a directory.
 */
function walkFiles(dir, ext = ['.js', '.ts']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // skip node_modules, dist, .git
      if (['node_modules', 'dist', '.git', 'old-src'].includes(entry.name)) continue;
      results = results.concat(walkFiles(full, ext));
    } else if (ext.some(e => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Extract route declarations from a single source file.
 * Returns array of { method, path, auth, tags, source }.
 *
 * Recognises patterns like:
 *   router.get('/path', ...)
 *   router.post('/path', ...)
 *   app.use('/prefix', router)
 */
function extractRoutesFromFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const capabilities = [];
  const relPath = path.relative(SERVER_SRC, filePath).replace(/\\/g, '/');

  // Pattern 1: router.<method>('/path', ...) or app.<method>('/path', ...)
  const routeRegex = /(?:router|app)\.(get|post|put|patch|delete|all|options|head)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  let match;
  while ((match = routeRegex.exec(src)) !== null) {
    const method = match[1].toUpperCase();
    const routePath = match[2];

    // Skip internal/test patterns
    if (routePath === '*' || routePath === '/') continue;

    capabilities.push({
      method,
      path: routePath,
      source: relPath,
    });
  }

  // Pattern 2: app.use('/prefix', someRouter)  — mount points
  const mountRegex = /app\.use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)/g;
  while ((match = mountRegex.exec(src)) !== null) {
    const mountPath = match[1];
    const routerName = match[2];
    // Record mount point as a meta-capability
    capabilities.push({
      method: 'USE',
      path: mountPath,
      source: relPath,
      _routerName: routerName,
    });
  }

  return capabilities;
}

/**
 * Classify auth type from path.
 */
function classifyAuth(routePath) {
  const noAuth = ['/api/system/health', '/api/maintenance/status', '/api/auth/login'];
  if (noAuth.includes(routePath)) return 'none';
  if (routePath.startsWith('/api/admin')) return 'super_admin';
  if (routePath.startsWith('/__debug')) return 'none';
  return 'session';
}

/**
 * Classify a tag from the path.
 */
function classifyTag(routePath) {
  if (routePath.startsWith('/api/admin/churches')) return 'churches';
  if (routePath.startsWith('/api/admin/users'))    return 'users';
  if (routePath.startsWith('/api/admin/sessions')) return 'sessions';
  if (routePath.startsWith('/api/admin'))           return 'admin';
  if (routePath.startsWith('/api/system'))          return 'system';
  if (routePath.startsWith('/api/auth'))            return 'auth';
  if (routePath.startsWith('/api/ocr'))             return 'ocr';
  if (routePath.startsWith('/api/records'))         return 'records';
  if (routePath.startsWith('/api/church'))          return 'church';
  return 'other';
}

/**
 * Derive group from path (first segment after /api/).
 */
function deriveGroup(routePath) {
  const m = routePath.match(/^\/api\/([^/]+)/);
  return m ? m[1] : 'misc';
}

/**
 * Build a stable key for a capability.
 */
function buildKey(method, routePath) {
  const normalised = routePath
    .replace(/\/:[^/]+/g, '/_param_')
    .replace(/[^a-zA-Z0-9/_-]/g, '')
    .replace(/\/+/g, '.');
  return `api.${deriveGroup(routePath)}.${method.toLowerCase()}.${normalised}`.substring(0, 255);
}

// ---------------------------------------------------------------------------
// Mount-path resolution
// ---------------------------------------------------------------------------

/**
 * Try to resolve full route paths by matching mount points to route files.
 *
 * index.ts has: app.use('/api/admin/users', usersRouter)
 * users.js has: router.get('/:id', ...)
 * => full path: /api/admin/users/:id  GET
 *
 * This is best-effort; we use the mount map to prefix routes found in
 * non-index files.
 */
function resolveMounts(allCapabilities) {
  // Collect mount points from index.ts (method === 'USE')
  const mounts = allCapabilities.filter(c => c.method === 'USE');

  // Collect route declarations (method !== 'USE')
  const routes = allCapabilities.filter(c => c.method !== 'USE');

  // For routes already defined in index.ts, the path is already absolute
  // For routes in sub-files, we need to find the mount prefix
  const resolvedRoutes = [];

  for (const route of routes) {
    if (route.path.startsWith('/api/') || route.path.startsWith('/__')) {
      // Already has an absolute path (probably from index.ts or apiExplorer.js)
      resolvedRoutes.push(route);
    } else {
      // Relative path — find likely mount prefix from the file's directory
      const routeDir = path.dirname(route.source);
      const routeFile = path.basename(route.source, path.extname(route.source));

      // Try to find a matching mount in index.ts
      let bestMount = null;

      for (const mount of mounts) {
        // Heuristic: mount router name often matches file name
        const rName = (mount._routerName || '').toLowerCase();
        const fName = routeFile.toLowerCase().replace(/[-_]/g, '');
        if (rName.includes(fName) || fName.includes(rName.replace(/router$/i, ''))) {
          bestMount = mount;
          break;
        }
      }

      if (bestMount) {
        const fullPath = bestMount.path + (route.path === '/' ? '' : route.path);
        resolvedRoutes.push({ ...route, path: fullPath });
      } else {
        // Can't resolve — keep the relative path but flag it
        resolvedRoutes.push(route);
      }
    }
  }

  return resolvedRoutes;
}

// ---------------------------------------------------------------------------
// DB operations
// ---------------------------------------------------------------------------

async function ensureTableExists() {
  const migrationPath = path.resolve(__dirname, '../../database/migrations/2026-02-09_admin_capabilities.sql');
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    console.error('   Run: mysql < server/database/migrations/2026-02-09_admin_capabilities.sql');
    process.exit(1);
  }

  // Check if table exists
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.tables 
     WHERE table_schema = 'orthodoxmetrics_db' AND table_name = 'admin_capabilities'`
  );
  if (rows[0].cnt === 0) {
    console.log('⚠️  admin_capabilities table not found. Running migration...');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    // Split by semicolons and execute each statement (skip empty)
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));
    for (const stmt of statements) {
      await pool.query(stmt);
    }
    console.log('✅ Migration applied successfully.');
  }
}

async function upsertCapability(cap) {
  const key = buildKey(cap.method, cap.path);
  const name = `${cap.method} ${cap.path}`;
  const group = deriveGroup(cap.path);
  const tag = classifyTag(cap.path);
  const auth = classifyAuth(cap.path);

  const sql = `
    INSERT INTO admin_capabilities (\`key\`, kind, name, method, path, source_file, roles_json, tags_json, auth, status, last_seen_at)
    VALUES (?, 'route', ?, ?, ?, ?, ?, ?, ?, 'active', NOW())
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      method = VALUES(method),
      path = VALUES(path),
      source_file = VALUES(source_file),
      roles_json = VALUES(roles_json),
      tags_json = VALUES(tags_json),
      auth = VALUES(auth),
      status = 'active',
      last_seen_at = NOW()
  `;

  const roles = auth === 'super_admin' ? ['super_admin'] :
                auth === 'session' ? ['authenticated'] : [];

  await pool.execute(sql, [
    key,
    name,
    cap.method,
    cap.path,
    cap.source || null,
    JSON.stringify(roles),
    JSON.stringify([tag, group].filter(Boolean)),
    auth,
  ]);

  return key;
}

async function deprecateMissing(seenKeys) {
  if (seenKeys.length === 0) return 0;
  const placeholders = seenKeys.map(() => '?').join(',');
  const [result] = await pool.execute(
    `UPDATE admin_capabilities 
     SET status = 'deprecated' 
     WHERE status = 'active' 
       AND kind = 'route' 
       AND \`key\` NOT IN (${placeholders})
       AND last_seen_at < DATE_SUB(NOW(), INTERVAL 1 MINUTE)`,
    seenKeys
  );
  return result.affectedRows || 0;
}

async function recordScanRun(summary) {
  await pool.execute(
    `INSERT INTO admin_capability_runs (started_at, ended_at, total_found, upserted, deprecated, errors, summary_json)
     VALUES (?, NOW(), ?, ?, ?, ?, ?)`,
    [
      summary.startedAt,
      summary.totalFound,
      summary.upserted,
      summary.deprecated,
      summary.errors,
      JSON.stringify(summary),
    ]
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(70));
  console.log('Admin Capabilities Inventory Scanner');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no DB writes)' : 'LIVE'}`);
  console.log(`Scanning: ${SERVER_SRC}`);
  console.log('='.repeat(70));

  const startedAt = new Date();

  // Step 1: Scan files
  const files = walkFiles(SERVER_SRC);
  console.log(`\n📁 Found ${files.length} source files to scan`);

  // Step 2: Extract routes from all files
  let allCapabilities = [];
  for (const file of files) {
    try {
      const caps = extractRoutesFromFile(file);
      allCapabilities = allCapabilities.concat(caps);
    } catch (err) {
      console.warn(`⚠️  Error scanning ${file}: ${err.message}`);
    }
  }
  console.log(`🔍 Found ${allCapabilities.length} raw route declarations`);

  // Step 3: Resolve mount-path prefixes
  const resolved = resolveMounts(allCapabilities);
  console.log(`🔗 Resolved ${resolved.length} routes after mount-path resolution`);

  // Step 4: Deduplicate
  const seen = new Set();
  const unique = [];
  for (const cap of resolved) {
    const key = `${cap.method}:${cap.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(cap);
  }
  console.log(`✅ ${unique.length} unique route capabilities after dedup`);

  // Categorise for reporting
  const adminRoutes = unique.filter(c => c.path.startsWith('/api/admin'));
  const systemRoutes = unique.filter(c => c.path.startsWith('/api/system'));
  const otherRoutes = unique.filter(c => !c.path.startsWith('/api/admin') && !c.path.startsWith('/api/system'));

  console.log(`\n📊 Breakdown:`);
  console.log(`   Admin routes:  ${adminRoutes.length}`);
  console.log(`   System routes: ${systemRoutes.length}`);
  console.log(`   Other routes:  ${otherRoutes.length}`);

  if (DRY_RUN) {
    console.log('\n--- DRY RUN: Route inventory ---');
    for (const cap of unique) {
      console.log(`  ${cap.method.padEnd(7)} ${cap.path.padEnd(60)} [${cap.source}]`);
    }
    console.log(`\nTotal: ${unique.length} capabilities would be upserted.`);
    await pool.end();
    return;
  }

  // Step 5: Ensure table exists
  await ensureTableExists();

  // Step 6: Upsert into DB
  let upserted = 0;
  let errors = 0;
  const seenKeys = [];

  for (const cap of unique) {
    try {
      const key = await upsertCapability(cap);
      seenKeys.push(key);
      upserted++;
    } catch (err) {
      console.error(`❌ Failed to upsert ${cap.method} ${cap.path}: ${err.message}`);
      errors++;
    }
  }
  console.log(`\n💾 Upserted: ${upserted}, Errors: ${errors}`);

  // Step 7: Mark deprecated
  let deprecated = 0;
  try {
    deprecated = await deprecateMissing(seenKeys);
    if (deprecated > 0) {
      console.log(`⚠️  Deprecated: ${deprecated} previously-seen capabilities no longer found`);
    }
  } catch (err) {
    console.warn(`⚠️  Failed to deprecate missing capabilities: ${err.message}`);
  }

  // Step 8: Record scan run
  const summary = {
    startedAt,
    totalFound: unique.length,
    upserted,
    deprecated,
    errors,
    adminRoutes: adminRoutes.length,
    systemRoutes: systemRoutes.length,
    otherRoutes: otherRoutes.length,
  };

  try {
    await recordScanRun(summary);
    console.log('📝 Scan run recorded in admin_capability_runs');
  } catch (err) {
    console.warn(`⚠️  Failed to record scan run: ${err.message}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Inventory complete');
  console.log(`   Total routes found:  ${unique.length}`);
  console.log(`   Admin routes found:  ${adminRoutes.length}`);
  console.log(`   Upserted:            ${upserted}`);
  console.log(`   Deprecated:          ${deprecated}`);
  console.log(`   Errors:              ${errors}`);
  console.log('='.repeat(70));

  await pool.end();
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  pool.end().catch(() => {});
  process.exit(1);
});
