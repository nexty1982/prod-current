#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/jsonToDatabaseMigrator.js (OMD-957)
 *
 * Comprehensive JSON-to-Database migration utility. Stubs fs.promises and
 * ../config/db-compat via Object.defineProperty + require.cache BEFORE
 * requiring the SUT.
 *
 * Coverage:
 *   - constructor              empty migrationStatus Map
 *   - updateMigrationStatus    in_progress branch (sets started_at);
 *                              completed branch (sets completed_at + optional
 *                              error_message); failed branch; default branch
 *                              (no completed_at); error swallowed
 *   - migrateOmaiCommands      reads JSON, iterates categories.commands,
 *                              inserts each + contextual_suggestions;
 *                              completed status with count; file read error
 *                              triggers failed status + rethrow
 *   - migrateComponentRegistry inserts each component with right param
 *                              defaults; recordsInserted counter; missing
 *                              data.components → 0 records; rethrow on error
 *   - migrateBuildConfiguration reads build-config.json + paths.config.example;
 *                              missing files only warn (do not fail);
 *                              still completes with whatever was read
 *   - migrateOmaiPolicies      inserts policy when security_policies present;
 *                              missing → 0 records
 *   - migrateParishMapData     inserts hardcoded sample parish data
 *   - runAllMigrations         tallies successes/failures; doesn't stop on
 *                              one failure
 *   - getMigrationStatus       returns rows; fallback [] on error
 *
 * Run from server/: npx tsx src/utils/__tests__/jsonToDatabaseMigrator.test.ts
 */

let passed = 0;
let failed = 0;

function assert(cond: any, message: string): void {
  if (cond) { console.log(`  PASS: ${message}`); passed++; }
  else { console.error(`  FAIL: ${message}`); failed++; }
}

function assertEq<T>(actual: T, expected: T, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { console.log(`  PASS: ${message}`); passed++; }
  else {
    console.error(`  FAIL: ${message}\n         expected: ${e}\n         actual:   ${a}`);
    failed++;
  }
}

// ── fs.promises stub (install BEFORE require) ────────────────────────
const fileMap = new Map<string, string>();
function resetFs() { fileMap.clear(); }

const fsPromisesStub = {
  readFile: async (p: string, _enc?: any) => {
    // Match by basename — the SUT uses path.join, so we don't know the
    // exact absolute path. Try exact key first, then basename match.
    if (fileMap.has(p)) return fileMap.get(p)!;
    const path = require('path');
    const base = path.basename(p);
    for (const [k, v] of fileMap) {
      if (path.basename(k) === base) return v;
    }
    const e: any = new Error(`ENOENT: ${p}`);
    e.code = 'ENOENT';
    throw e;
  },
  writeFile: async (p: string, data: string) => {
    fileMap.set(p, data);
  },
  mkdir: async (_p: string, _opts?: any) => {},
};

const fs = require('fs');
Object.defineProperty(fs, 'promises', {
  value: fsPromisesStub,
  configurable: true,
  writable: true,
});

// ── db-compat stub ───────────────────────────────────────────────────
type Query = { sql: string; params: any[] };
const queries: Query[] = [];
let queryReturns: any[] = [];
let queryErrorOnIndex: number | null = null;
let queryErrorOnSqlMatch: RegExp | null = null;

function resetDb() {
  queries.length = 0;
  queryReturns = [];
  queryErrorOnIndex = null;
  queryErrorOnSqlMatch = null;
}

function nextReturn(): any {
  return queryReturns.length > 0 ? queryReturns.shift() : [{}];
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queries.push({ sql, params });
    if (queryErrorOnIndex !== null && queries.length - 1 === queryErrorOnIndex) {
      throw new Error('pool query failure');
    }
    if (queryErrorOnSqlMatch && queryErrorOnSqlMatch.test(sql)) {
      throw new Error('pool query failure (sql match)');
    }
    return nextReturn();
  },
};

const dbCompatPath = require.resolve('../../config/db-compat');
require.cache[dbCompatPath] = {
  id: dbCompatPath,
  filename: dbCompatPath,
  loaded: true,
  exports: {
    getAppPool: () => fakePool,
    promisePool: fakePool,
    pool: fakePool,
    getAuthPool: () => fakePool,
    getOmaiPool: () => fakePool,
  },
} as any;

const Migrator = require('../jsonToDatabaseMigrator');

// Silence console
const origLog = console.log;
const origError = console.error;
const origWarn = console.warn;
function quiet() { console.log = () => {}; console.error = () => {}; console.warn = () => {}; }
function loud() { console.log = origLog; console.error = origError; console.warn = origWarn; }

quiet(); // Silence for the entire test suite (lots of [MIGRATION] logs)

async function main() {

// ============================================================================
// constructor
// ============================================================================
loud();
console.log('\n── constructor ───────────────────────────────────────────');
quiet();

{
  const m = new Migrator();
  assert(m.migrationStatus instanceof Map, 'migrationStatus is a Map');
  assertEq(m.migrationStatus.size, 0, 'initially empty');
}

// ============================================================================
// updateMigrationStatus — branches
// ============================================================================
loud();
console.log('\n── updateMigrationStatus ─────────────────────────────────');
quiet();

// in_progress
{
  const m = new Migrator();
  resetDb();
  await m.updateMigrationStatus('test_mig', 'in_progress', 0, 100);
  assertEq(queries.length, 1, '1 query');
  assert(queries[0].sql.includes('started_at = NOW()'), 'sets started_at');
  assert(queries[0].sql.includes('UPDATE migration_status'), 'updates migration_status');
  assertEq(queries[0].params, ['in_progress', 0, 100, 'test_mig'], 'params');
}

// completed
{
  const m = new Migrator();
  resetDb();
  await m.updateMigrationStatus('test_mig', 'completed', 50, 50);
  assert(queries[0].sql.includes('completed_at = NOW()'), 'sets completed_at');
  assert(!queries[0].sql.includes('error_message = ?'), 'no error_message in SQL');
  assertEq(queries[0].params, ['completed', 50, 50, null, 'test_mig'], 'params include null error');
}

// completed with error message
{
  const m = new Migrator();
  resetDb();
  await m.updateMigrationStatus('test_mig', 'completed', 5, 10, 'partial failure');
  assert(queries[0].sql.includes('error_message = ?'), 'error_message in SQL');
  assertEq(queries[0].params, ['completed', 5, 10, 'partial failure', 'test_mig'], 'params include error');
}

// failed
{
  const m = new Migrator();
  resetDb();
  await m.updateMigrationStatus('test_mig', 'failed', 0, 0, 'bad thing');
  assert(queries[0].sql.includes('completed_at = NOW()'), 'failed also sets completed_at');
  assert(queries[0].sql.includes('error_message = ?'), 'error_message in SQL');
  assertEq(queries[0].params, ['failed', 0, 0, 'bad thing', 'test_mig'], 'params');
}

// default (other status, no error)
{
  const m = new Migrator();
  resetDb();
  await m.updateMigrationStatus('test_mig', 'pending', 0, 0);
  assert(!queries[0].sql.includes('completed_at'), 'no completed_at for default');
  assert(!queries[0].sql.includes('started_at'), 'no started_at for default');
  assertEq(queries[0].params, ['pending', 0, 0, 'test_mig'], 'params (no error)');
}

// default with error message
{
  const m = new Migrator();
  resetDb();
  await m.updateMigrationStatus('test_mig', 'pending', 0, 0, 'oops');
  assert(queries[0].sql.includes('error_message = ?'), 'error_message in SQL');
  assertEq(queries[0].params, ['pending', 0, 0, 'oops', 'test_mig'], 'params with error');
}

// Error swallowed (no throw)
{
  const m = new Migrator();
  resetDb();
  queryErrorOnIndex = 0;
  let threw = false;
  try { await m.updateMigrationStatus('mig', 'in_progress'); } catch { threw = true; }
  assertEq(threw, false, 'updateMigrationStatus swallows errors');
}

// ============================================================================
// migrateOmaiCommands
// ============================================================================
loud();
console.log('\n── migrateOmaiCommands ───────────────────────────────────');
quiet();

{
  const m = new Migrator();
  resetDb();
  resetFs();
  fileMap.set('omai-commands.json', JSON.stringify({
    categories: {
      restart: {
        commands: {
          'restart-server': {
            patterns: ['restart server', 'reboot'],
            description: 'Restart',
            action: 'systemctl restart',
            safety: 'safe',
            context_aware: true,
            requires_hands_on: false,
            requires_confirmation: true,
            requires_parameters: { service: 'string' },
          },
          'restart-db': {
            patterns: ['restart db'],
            action: 'systemctl restart mariadb',
          },
        },
      },
    },
    contextual_suggestions: {
      '/admin': ['restart-server'],
      '/dashboard': ['restart-db'],
    },
    settings: { allowedRoles: ['super_admin', 'admin'] },
  }));

  await m.migrateOmaiCommands();
  // Queries: 1 status update (in_progress) + 2 omai_commands inserts +
  // 2 omai_command_contexts inserts + 1 status update (completed) = 6
  assertEq(queries.length, 6, '6 queries total');
  assertEq(queries[0].params[0], 'in_progress', 'first: in_progress status');
  // Command insert params
  const cmdInsert = queries[1];
  assert(cmdInsert.sql.includes('INSERT INTO omai_commands'), 'cmd insert sql');
  assertEq(cmdInsert.params[0], 'restart-server', 'commandKey');
  assertEq(cmdInsert.params[1], 'restart', 'category');
  assertEq(JSON.parse(cmdInsert.params[2]), ['restart server', 'reboot'], 'patterns serialized');
  assertEq(cmdInsert.params[3], 'Restart', 'description');
  assertEq(cmdInsert.params[4], 'systemctl restart', 'action');
  assertEq(cmdInsert.params[5], 'safe', 'safety');
  assertEq(cmdInsert.params[6], true, 'context_aware');
  assertEq(cmdInsert.params[7], false, 'requires_hands_on');
  assertEq(cmdInsert.params[8], true, 'requires_confirmation');
  assertEq(JSON.parse(cmdInsert.params[9]), { service: 'string' }, 'requires_parameters serialized');
  assertEq(JSON.parse(cmdInsert.params[10]), ['super_admin', 'admin'], 'allowedRoles');
  // Defaults for second command
  const cmd2 = queries[2];
  assertEq(cmd2.params[3], null, 'description default null');
  assertEq(cmd2.params[5], 'safe', 'safety default safe');
  assertEq(cmd2.params[6], false, 'context_aware default false');
  // Context inserts
  assert(queries[3].sql.includes('INSERT INTO omai_command_contexts'), 'context insert');
  assertEq(queries[3].params[0], '/admin', 'page_path');
  assertEq(JSON.parse(queries[3].params[1]), ['restart-server'], 'suggestions');
  // Final completed status (4 records: 2 cmds + 2 contexts)
  const final = queries[5];
  assertEq(final.params[0], 'completed', 'final: completed');
  assertEq(final.params[1], 4, 'records migrated = 4');
}

// File read error → status failed + rethrow
{
  const m = new Migrator();
  resetDb();
  resetFs();
  // No file → ENOENT
  let threw = false;
  try {
    await m.migrateOmaiCommands();
  } catch { threw = true; }
  assertEq(threw, true, 'rethrows on read failure');
  // Status updates: in_progress + failed
  const statuses = queries.filter(q => q.sql.includes('migration_status'));
  const lastStatus = statuses[statuses.length - 1];
  assertEq(lastStatus.params[0], 'failed', 'sets status failed');
}

// Default allowedRoles when settings missing
{
  const m = new Migrator();
  resetDb();
  resetFs();
  fileMap.set('omai-commands.json', JSON.stringify({
    categories: {
      cat1: {
        commands: {
          'c1': { action: 'echo' },
        },
      },
    },
  }));
  await m.migrateOmaiCommands();
  const cmd = queries[1];
  assertEq(JSON.parse(cmd.params[10]), ['super_admin'], 'default allowedRoles');
}

// ============================================================================
// migrateComponentRegistry
// ============================================================================
loud();
console.log('\n── migrateComponentRegistry ──────────────────────────────');
quiet();

{
  const m = new Migrator();
  resetDb();
  resetFs();
  fileMap.set('auto-discovered-components.json', JSON.stringify({
    version: '2.0.0',
    components: [
      {
        name: 'Btn', filePath: '/src/Btn.tsx', relativePath: 'src/Btn.tsx',
        directory: 'src', extension: '.tsx', category: 'forms',
        props: [{ name: 'label' }], imports: ['react'], exports: ['Btn'],
        isDefault: ['Btn'], hasJSX: true, hasHooks: false,
        dependencies: ['react'], size: 1234,
      },
    ],
  }));
  await m.migrateComponentRegistry();
  // Queries: 1 in_progress + 1 component insert + 1 completed = 3
  assertEq(queries.length, 3, '3 queries (1 component)');
  const insert = queries[1];
  assert(insert.sql.includes('INSERT INTO component_registry'), 'inserts component_registry');
  assertEq(insert.params[0], 'Btn', 'name');
  assertEq(insert.params[1], '/src/Btn.tsx', 'filePath');
  assertEq(JSON.parse(insert.params[6]), [{ name: 'label' }], 'props serialized');
  assertEq(insert.params[9], true, 'isDefault truthy when array non-empty');
  assertEq(insert.params[10], true, 'hasJSX');
  assertEq(insert.params[14], '2.0.0', 'discovery_version');
}

// Component with isDefault false (empty array)
{
  const m = new Migrator();
  resetDb();
  resetFs();
  fileMap.set('auto-discovered-components.json', JSON.stringify({
    components: [
      { name: 'X', isDefault: [] },
    ],
  }));
  await m.migrateComponentRegistry();
  const insert = queries[1];
  assertEq(insert.params[9], false, 'isDefault false when array empty');
  assertEq(insert.params[14], '1.0.0', 'discovery_version default');
}

// Missing components key
{
  const m = new Migrator();
  resetDb();
  resetFs();
  fileMap.set('auto-discovered-components.json', JSON.stringify({}));
  await m.migrateComponentRegistry();
  // Just in_progress + completed (no inserts)
  const inserts = queries.filter(q => q.sql.includes('INSERT INTO component_registry'));
  assertEq(inserts.length, 0, 'no inserts when components missing');
  const final = queries[queries.length - 1];
  assertEq(final.params[1], 0, 'records = 0');
}

// File read error → fail + rethrow
{
  const m = new Migrator();
  resetDb();
  resetFs();
  let threw = false;
  try { await m.migrateComponentRegistry(); } catch { threw = true; }
  assertEq(threw, true, 'rethrows');
}

// ============================================================================
// migrateBuildConfiguration
// ============================================================================
loud();
console.log('\n── migrateBuildConfiguration ─────────────────────────────');
quiet();

// Both files present
{
  const m = new Migrator();
  resetDb();
  resetFs();
  fileMap.set('build-config.json', JSON.stringify({
    mode: 'incremental', memory: 8192, installPackage: 'pnpm',
    legacyPeerDeps: false, skipInstall: true, dryRun: false,
  }));
  fileMap.set('paths.config.example', '# example config');
  await m.migrateBuildConfiguration();
  // 1 in_progress + 1 build_configs insert + 1 build_paths insert + 1 completed
  assertEq(queries.length, 4, '4 queries');
  const cfg = queries[1];
  assert(cfg.sql.includes('INSERT INTO build_configs'), 'inserts build_configs');
  // SUT uses `buildConfig.legacyPeerDeps || true` — false coerces to true (SUT quirk)
  assertEq(cfg.params, ['default', 'incremental', 8192, 'pnpm', true, true, false, 'production'], 'config params (legacyPeerDeps quirk: false → true)');
  const pth = queries[2];
  assert(pth.sql.includes('INSERT INTO build_paths'), 'inserts build_paths');
  assertEq(pth.params[0], 'production', 'environment');
}

// Missing build-config but paths present — only paths inserted
{
  const m = new Migrator();
  resetDb();
  resetFs();
  fileMap.set('paths.config.example', '');
  await m.migrateBuildConfiguration();
  const builds = queries.filter(q => q.sql.includes('INSERT INTO build_configs'));
  const paths = queries.filter(q => q.sql.includes('INSERT INTO build_paths'));
  assertEq(builds.length, 0, 'no build_configs insert');
  assertEq(paths.length, 1, '1 build_paths insert');
}

// Both missing — no inserts but completes successfully (1 record per inserted)
{
  const m = new Migrator();
  resetDb();
  resetFs();
  let threw = false;
  try { await m.migrateBuildConfiguration(); } catch { threw = true; }
  assertEq(threw, false, 'completes even with both missing');
  const final = queries[queries.length - 1];
  assertEq(final.params[0], 'completed', 'completed status');
  assertEq(final.params[1], 0, '0 records');
}

// ============================================================================
// migrateOmaiPolicies
// ============================================================================
loud();
console.log('\n── migrateOmaiPolicies ───────────────────────────────────');
quiet();

{
  const m = new Migrator();
  resetDb();
  resetFs();
  fileMap.set('omai_security_policy.json', JSON.stringify({
    security_policies: {
      allowed_users: ['admin'],
      blocked_commands: ['rm -rf'],
      require_confirmation: ['restart'],
      max_command_length: 500,
      timeout_seconds: 60,
      log_all_commands: false,
    },
  }));
  await m.migrateOmaiPolicies();
  // 1 in_progress + 1 insert + 1 completed
  assertEq(queries.length, 3, '3 queries');
  const insert = queries[1];
  assert(insert.sql.includes('INSERT INTO omai_policies'), 'inserts omai_policies');
  assertEq(insert.params[0], 'default_security_policy', 'name');
  assertEq(JSON.parse(insert.params[2]), ['admin'], 'allowed_users');
  assertEq(JSON.parse(insert.params[3]), ['rm -rf'], 'blocked_commands');
  assertEq(insert.params[5], 500, 'max_command_length');
}

// No security_policies → 0 records
{
  const m = new Migrator();
  resetDb();
  resetFs();
  fileMap.set('omai_security_policy.json', JSON.stringify({}));
  await m.migrateOmaiPolicies();
  const inserts = queries.filter(q => q.sql.includes('INSERT INTO omai_policies'));
  assertEq(inserts.length, 0, 'no insert');
}

// ============================================================================
// migrateParishMapData
// ============================================================================
loud();
console.log('\n── migrateParishMapData ──────────────────────────────────');
quiet();

{
  const m = new Migrator();
  resetDb();
  resetFs();
  await m.migrateParishMapData();
  // 1 in_progress + 1 hardcoded sample insert + 1 completed
  assertEq(queries.length, 3, '3 queries');
  const insert = queries[1];
  assert(insert.sql.includes('INSERT INTO parish_map_data'), 'inserts parish_map_data');
  assertEq(insert.params[0], 'Holy Trinity Orthodox Church', 'parish name');
  assertEq(insert.params[1], 'church', 'type');
  assertEq(insert.params[8], 'Greek Orthodox', 'denomination');
}

// ============================================================================
// runAllMigrations — tally
// ============================================================================
loud();
console.log('\n── runAllMigrations ──────────────────────────────────────');
quiet();

{
  // Leave fileMap empty: omaiCommands, componentRegistry, omaiPolicies throw
  // (strict read-from-disk); buildConfiguration tolerates missing files and
  // completes with 0 records; parishMapData has hardcoded data and succeeds.
  const m = new Migrator();
  resetDb();
  resetFs();
  const r = await m.runAllMigrations();
  assertEq(r.successful, 2, 'buildConfiguration + parishMapData succeed');
  assertEq(r.failed, 3, '3 file-based migrations fail');
  assertEq(r.total, 5, 'total = 5');
}

// All succeed
{
  const m = new Migrator();
  resetDb();
  resetFs();
  fileMap.set('omai-commands.json', JSON.stringify({ categories: {} }));
  fileMap.set('auto-discovered-components.json', JSON.stringify({ components: [] }));
  fileMap.set('omai_security_policy.json', JSON.stringify({}));
  // build-config + paths can be missing — that migration tolerates it
  const r = await m.runAllMigrations();
  assertEq(r.successful, 5, 'all 5 succeed');
  assertEq(r.failed, 0, '0 failed');
}

// ============================================================================
// getMigrationStatus
// ============================================================================
loud();
console.log('\n── getMigrationStatus ────────────────────────────────────');
quiet();

{
  const m = new Migrator();
  resetDb();
  queryReturns.push([[
    { migration_name: 'omai_commands', status: 'completed', records_migrated: 10, total_records: 10 },
  ]]);
  const r = await m.getMigrationStatus();
  assertEq(r.length, 1, '1 row');
  assertEq(r[0].migration_name, 'omai_commands', 'name');
  assertEq(r[0].status, 'completed', 'status');
  assert(queries[0].sql.includes('FROM migration_status'), 'queries migration_status');
}

// Error → fallback []
{
  const m = new Migrator();
  resetDb();
  queryErrorOnIndex = 0;
  const r = await m.getMigrationStatus();
  assertEq(r, [], 'fallback []');
}

// ============================================================================
// Summary
// ============================================================================
loud();
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main()

main().catch((e) => {
  loud();
  console.error('Unhandled test error:', e);
  process.exit(1);
});
