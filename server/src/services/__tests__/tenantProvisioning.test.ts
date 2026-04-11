#!/usr/bin/env npx tsx
/**
 * Unit tests for services/tenantProvisioning.js (OMD-1136)
 *
 * Provisions a new om_church_<id> DB from record_template1 via mysqldump.
 *
 * Strategy:
 *   - Route-dispatch fake pool for SQL queries
 *   - Stub child_process.execSync via require.cache
 *   - Stub ../config via require.cache
 *
 * Coverage:
 *   - classifyError: all error code branches
 *   - validateTemplate: missing DB, missing meta, bad version, not frozen,
 *     too few tables, force override, happy path
 *   - verifyTenantDb: missing critical tables, missing template tables,
 *     non-empty table, default column mismatch, missing OCR cols,
 *     missing audit cols, clean pass
 *   - provisionTenantDb:
 *       · idempotent replay via request_id
 *       · duplicate guard (churches row + prior audit success)
 *       · allowExisting path
 *       · happy path creates DB, clones, sets defaults, verifies, updates churches
 *       · mysqldump failure → rollback + error
 *       · force bypasses duplicate check + version check
 *
 * Run: npx tsx server/src/services/__tests__/tenantProvisioning.test.ts
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

// ── Stub child_process.execSync ─────────────────────────────────────
let execSyncCalls: string[] = [];
let execSyncThrows = false;
let execSyncThrowMessage = 'dump failed';

const cpPath = require.resolve('child_process');
const origCp = require('child_process');
require.cache[cpPath] = {
  id: cpPath,
  filename: cpPath,
  loaded: true,
  exports: {
    ...origCp,
    execSync: (cmd: string, _opts?: any) => {
      execSyncCalls.push(cmd);
      if (execSyncThrows) throw new Error(execSyncThrowMessage);
      return Buffer.from('');
    },
  },
} as any;

// ── Stub ../config ──────────────────────────────────────────────────
const configPath = require.resolve('../../config');
require.cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: {
    default: {
      db: {
        app: {
          host: 'testhost',
          port: 3307,
          user: 'testuser',
          password: "pa's$w'ord",  // includes a single quote to test escaping
        },
      },
    },
  },
} as any;

// ── Route-dispatch fake pool ────────────────────────────────────────
type Route = {
  match: RegExp;
  handler: (sql: string, params: any[]) => any;
};

let routes: Route[] = [];
const queryLog: Array<{ sql: string; params: any[] }> = [];

const pool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        return r.handler(sql, params);
      }
    }
    // Default: empty rows
    return [[], {}];
  },
};

function resetAll() {
  routes = [];
  queryLog.length = 0;
  execSyncCalls = [];
  execSyncThrows = false;
  execSyncThrowMessage = 'dump failed';
}

// Silence noisy logs
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}
function loud() {
  console.log = origLog;
  console.warn = origWarn;
  console.error = origError;
}

const {
  provisionTenantDb,
  validateTemplate,
  verifyTenantDb,
  verifyExistingTenantDb,
  TEMPLATE_DB,
  APPROVED_VERSION,
  EXPECTED_TABLE_COUNT,
} = require('../tenantProvisioning');

// We need access to classifyError, but it's not exported. Skip direct testing;
// test it through provisionTenantDb error paths.

async function main() {

// ============================================================================
// Constants
// ============================================================================
console.log('\n── Module exports ────────────────────────────────────────');
assertEq(TEMPLATE_DB, 'record_template1', 'TEMPLATE_DB');
assertEq(APPROVED_VERSION, '2.0.0', 'APPROVED_VERSION');
assertEq(EXPECTED_TABLE_COUNT, 20, 'EXPECTED_TABLE_COUNT');

// ============================================================================
// validateTemplate
// ============================================================================
console.log('\n── validateTemplate: template DB missing ─────────────────');

resetAll();
routes = [
  { match: /SCHEMATA/, handler: () => [[], {}] },
];
{
  const r = await validateTemplate(pool);
  assertEq(r.valid, false, 'invalid when template missing');
  assert(r.reason.includes('does not exist'), 'reason mentions does not exist');
}

console.log('\n── validateTemplate: template_meta missing row ───────────');
resetAll();
routes = [
  { match: /SCHEMATA/, handler: () => [[{ SCHEMA_NAME: 'record_template1' }], {}] },
  { match: /template_meta WHERE id = 1/, handler: () => [[], {}] },
];
{
  const r = await validateTemplate(pool);
  assertEq(r.valid, false, 'invalid when meta missing');
  assert(r.reason.includes('template_meta row missing'), 'reason mentions missing meta');
}

console.log('\n── validateTemplate: version mismatch (no force) ─────────');
resetAll();
routes = [
  { match: /SCHEMATA/, handler: () => [[{ SCHEMA_NAME: 'record_template1' }], {}] },
  { match: /template_meta/, handler: () => [[{ version: '1.0.0', frozen_at: new Date() }], {}] },
];
{
  const r = await validateTemplate(pool);
  assertEq(r.valid, false, 'invalid on version mismatch');
  assert(r.reason.includes('1.0.0'), 'reason mentions actual version');
  assert(r.reason.includes('2.0.0'), 'reason mentions approved version');
}

console.log('\n── validateTemplate: version mismatch with force ─────────');
resetAll();
routes = [
  { match: /SCHEMATA/, handler: () => [[{ SCHEMA_NAME: 'record_template1' }], {}] },
  { match: /template_meta/, handler: () => [[{ version: '1.5.0', frozen_at: new Date() }], {}] },
  { match: /COUNT\(\*\) AS cnt FROM information_schema\.TABLES/, handler: () => [[{ cnt: 20 }], {}] },
];
quiet();
{
  const r = await validateTemplate(pool, { force: true });
  loud();
  assertEq(r.valid, true, 'valid with force override');
  assertEq(r.version, '1.5.0', 'actual version returned');
  assertEq(r.versionOverride, true, 'versionOverride flag set');
}

console.log('\n── validateTemplate: not frozen ──────────────────────────');
resetAll();
routes = [
  { match: /SCHEMATA/, handler: () => [[{ SCHEMA_NAME: 'record_template1' }], {}] },
  { match: /template_meta/, handler: () => [[{ version: '2.0.0', frozen_at: null }], {}] },
];
{
  const r = await validateTemplate(pool);
  assertEq(r.valid, false, 'invalid when not frozen');
  assert(r.reason.includes('not frozen'), 'reason mentions not frozen');
}

console.log('\n── validateTemplate: too few tables ──────────────────────');
resetAll();
routes = [
  { match: /SCHEMATA/, handler: () => [[{ SCHEMA_NAME: 'record_template1' }], {}] },
  { match: /template_meta/, handler: () => [[{ version: '2.0.0', frozen_at: new Date() }], {}] },
  { match: /COUNT\(\*\) AS cnt FROM information_schema\.TABLES/, handler: () => [[{ cnt: 10 }], {}] },
];
{
  const r = await validateTemplate(pool);
  assertEq(r.valid, false, 'invalid when too few tables');
  assert(r.reason.includes('10 tables'), 'reason mentions actual count');
}

console.log('\n── validateTemplate: template_meta read error ────────────');
resetAll();
routes = [
  { match: /SCHEMATA/, handler: () => [[{ SCHEMA_NAME: 'record_template1' }], {}] },
  { match: /template_meta/, handler: () => { throw new Error('access denied'); } },
];
{
  const r = await validateTemplate(pool);
  assertEq(r.valid, false, 'invalid when meta query fails');
  assert(r.reason.includes('Cannot read template_meta'), 'reason wraps error');
}

console.log('\n── validateTemplate: happy path ──────────────────────────');
resetAll();
routes = [
  { match: /SCHEMATA/, handler: () => [[{ SCHEMA_NAME: 'record_template1' }], {}] },
  { match: /template_meta/, handler: () => [[{ version: '2.0.0', frozen_at: new Date() }], {}] },
  { match: /COUNT\(\*\) AS cnt FROM information_schema\.TABLES/, handler: () => [[{ cnt: 20 }], {}] },
];
{
  const r = await validateTemplate(pool);
  assertEq(r.valid, true, 'valid when all checks pass');
  assertEq(r.version, '2.0.0', 'version = 2.0.0');
  assertEq(r.versionOverride, false, 'no override');
}

// ============================================================================
// verifyTenantDb
// ============================================================================

// Full list of expected tables from the source
const ALL_EXPECTED = [
  'activity_log', 'baptism_history', 'baptism_records',
  'change_log', 'church_settings',
  'funeral_history', 'funeral_records',
  'marriage_history', 'marriage_records',
  'ocr_draft_records', 'ocr_feeder_artifacts', 'ocr_feeder_pages',
  'ocr_finalize_history', 'ocr_fused_drafts', 'ocr_jobs',
  'ocr_mappings', 'ocr_settings', 'ocr_setup_state',
  'record_supplements', 'template_meta',
];

const OCR_COLS = ['source_scan_id', 'ocr_confidence', 'verified_by', 'verified_at'];
const AUDIT_COLS = ['diff_data', 'actor_user_id', 'source', 'request_id', 'ip_address'];

function makeHappyVerifyRoutes(): Route[] {
  return [
    // List tables in tenant DB
    {
      match: /TABLE_NAME FROM information_schema\.TABLES WHERE TABLE_SCHEMA = \?/,
      handler: () => [ALL_EXPECTED.map(t => ({ TABLE_NAME: t })), {}],
    },
    // COUNT(*) FROM each table (all empty)
    {
      match: /COUNT\(\*\) AS cnt FROM/i,
      handler: () => [[{ cnt: 0 }], {}],
    },
    // baptism_records.entry_type default
    {
      match: /COLUMN_NAME = 'entry_type'/,
      handler: () => [[{ COLUMN_DEFAULT: "'Baptism'", IS_NULLABLE: 'NO' }], {}],
    },
    // baptism_records OCR columns
    {
      match: /baptism_records' AND COLUMN_NAME IN/,
      handler: () => [OCR_COLS.map(c => ({ COLUMN_NAME: c })), {}],
    },
    // History tables audit columns (generic fallback)
    {
      match: /COLUMN_NAME IN/,
      handler: () => [AUDIT_COLS.map(c => ({ COLUMN_NAME: c })), {}],
    },
  ];
}

console.log('\n── verifyTenantDb: happy path ────────────────────────────');
resetAll();
routes = makeHappyVerifyRoutes();
{
  const r = await verifyTenantDb(pool, 'om_church_46');
  assertEq(r.passed, true, 'passed');
  assertEq(r.tableCount, 20, 'tableCount');
  assertEq(r.issues.length, 0, 'no issues');
  assertEq(r.missingTables.length, 0, 'no missing');
  assertEq(r.extraTables.length, 0, 'no extras');
  assertEq(r.expectedTableCount, 20, 'expected count');
}

console.log('\n── verifyTenantDb: missing critical table ────────────────');
resetAll();
{
  const reduced = ALL_EXPECTED.filter(t => t !== 'baptism_records' && t !== 'baptism_history');
  routes = [
    {
      match: /TABLE_NAME FROM information_schema\.TABLES WHERE TABLE_SCHEMA = \?/,
      handler: () => [reduced.map(t => ({ TABLE_NAME: t })), {}],
    },
    { match: /COUNT\(\*\) AS cnt FROM/i, handler: () => [[{ cnt: 0 }], {}] },
    {
      match: /COLUMN_NAME = 'entry_type'/,
      handler: () => [[], {}],  // no baptism_records at all
    },
    {
      match: /baptism_records' AND COLUMN_NAME IN/,
      handler: () => [[], {}],
    },
    {
      match: /COLUMN_NAME IN/,
      handler: () => [AUDIT_COLS.map(c => ({ COLUMN_NAME: c })), {}],
    },
  ];
  const r = await verifyTenantDb(pool, 'om_church_46');
  assertEq(r.passed, false, 'not passed');
  assert(r.issues.some((i: string) => i.includes('Missing critical')), 'missing critical issue');
  assert(r.issues.some((i: string) => i.includes('baptism_records')), 'mentions baptism_records');
  assert(r.missingTables.includes('baptism_records'), 'missingTables includes baptism_records');
}

console.log('\n── verifyTenantDb: non-empty table ───────────────────────');
resetAll();
{
  let countCalls = 0;
  routes = [
    {
      match: /TABLE_NAME FROM information_schema\.TABLES WHERE TABLE_SCHEMA = \?/,
      handler: () => [ALL_EXPECTED.map(t => ({ TABLE_NAME: t })), {}],
    },
    {
      match: /COUNT\(\*\) AS cnt FROM/i,
      handler: (_s, _p) => {
        countCalls++;
        // First count call returns 5 rows, rest are empty
        return [[{ cnt: countCalls === 1 ? 5 : 0 }], {}];
      },
    },
    { match: /COLUMN_NAME = 'entry_type'/, handler: () => [[{ COLUMN_DEFAULT: "'Baptism'", IS_NULLABLE: 'NO' }], {}] },
    { match: /baptism_records' AND COLUMN_NAME IN/, handler: () => [OCR_COLS.map(c => ({ COLUMN_NAME: c })), {}] },
    { match: /COLUMN_NAME IN/, handler: () => [AUDIT_COLS.map(c => ({ COLUMN_NAME: c })), {}] },
  ];
  const r = await verifyTenantDb(pool, 'om_church_46');
  assertEq(r.passed, false, 'not passed when rows present');
  assert(r.issues.some((i: string) => i.includes('has 5 rows')), 'issue mentions row count');
}

console.log('\n── verifyTenantDb: wrong entry_type default ──────────────');
resetAll();
routes = [
  {
    match: /TABLE_NAME FROM information_schema\.TABLES WHERE TABLE_SCHEMA = \?/,
    handler: () => [ALL_EXPECTED.map(t => ({ TABLE_NAME: t })), {}],
  },
  { match: /COUNT\(\*\) AS cnt FROM/i, handler: () => [[{ cnt: 0 }], {}] },
  { match: /COLUMN_NAME = 'entry_type'/, handler: () => [[{ COLUMN_DEFAULT: "'Marriage'", IS_NULLABLE: 'NO' }], {}] },
  { match: /baptism_records' AND COLUMN_NAME IN/, handler: () => [OCR_COLS.map(c => ({ COLUMN_NAME: c })), {}] },
  { match: /COLUMN_NAME IN/, handler: () => [AUDIT_COLS.map(c => ({ COLUMN_NAME: c })), {}] },
];
{
  const r = await verifyTenantDb(pool, 'om_church_46');
  assertEq(r.passed, false, 'not passed on wrong default');
  assert(r.issues.some((i: string) => i.includes("entry_type default")), 'issue mentions entry_type');
  assert(r.issues.some((i: string) => i.includes('Marriage')), 'issue mentions actual default');
}

console.log('\n── verifyTenantDb: missing OCR columns ───────────────────');
resetAll();
routes = [
  {
    match: /TABLE_NAME FROM information_schema\.TABLES WHERE TABLE_SCHEMA = \?/,
    handler: () => [ALL_EXPECTED.map(t => ({ TABLE_NAME: t })), {}],
  },
  { match: /COUNT\(\*\) AS cnt FROM/i, handler: () => [[{ cnt: 0 }], {}] },
  { match: /COLUMN_NAME = 'entry_type'/, handler: () => [[{ COLUMN_DEFAULT: "'Baptism'", IS_NULLABLE: 'NO' }], {}] },
  // Only 2 of 4 OCR columns present
  { match: /baptism_records' AND COLUMN_NAME IN/, handler: () => [[{ COLUMN_NAME: 'source_scan_id' }, { COLUMN_NAME: 'ocr_confidence' }], {}] },
  { match: /COLUMN_NAME IN/, handler: () => [AUDIT_COLS.map(c => ({ COLUMN_NAME: c })), {}] },
];
{
  const r = await verifyTenantDb(pool, 'om_church_46');
  assertEq(r.passed, false, 'not passed');
  assert(r.issues.some((i: string) => i.includes('missing OCR columns')), 'issue mentions OCR cols');
  assert(r.issues.some((i: string) => i.includes('verified_by')), 'lists verified_by');
}

console.log('\n── verifyTenantDb: missing audit columns ─────────────────');
resetAll();
{
  let auditCallNum = 0;
  routes = [
    {
      match: /TABLE_NAME FROM information_schema\.TABLES WHERE TABLE_SCHEMA = \?/,
      handler: () => [ALL_EXPECTED.map(t => ({ TABLE_NAME: t })), {}],
    },
    { match: /COUNT\(\*\) AS cnt FROM/i, handler: () => [[{ cnt: 0 }], {}] },
    { match: /COLUMN_NAME = 'entry_type'/, handler: () => [[{ COLUMN_DEFAULT: "'Baptism'", IS_NULLABLE: 'NO' }], {}] },
    { match: /baptism_records' AND COLUMN_NAME IN/, handler: () => [OCR_COLS.map(c => ({ COLUMN_NAME: c })), {}] },
    {
      match: /COLUMN_NAME IN/,
      handler: () => {
        auditCallNum++;
        // First history table (baptism_history) missing 2 cols
        if (auditCallNum === 1) {
          return [[{ COLUMN_NAME: 'diff_data' }, { COLUMN_NAME: 'actor_user_id' }, { COLUMN_NAME: 'source' }], {}];
        }
        return [AUDIT_COLS.map(c => ({ COLUMN_NAME: c })), {}];
      },
    },
  ];
  const r = await verifyTenantDb(pool, 'om_church_46');
  assertEq(r.passed, false, 'not passed');
  assert(r.issues.some((i: string) => i.includes('baptism_history missing audit columns')), 'mentions history table audit cols');
}

console.log('\n── verifyExistingTenantDb: DB does not exist ─────────────');
resetAll();
routes = [
  { match: /SCHEMATA/, handler: () => [[], {}] },
];
{
  const r = await verifyExistingTenantDb('om_church_999', pool);
  assertEq(r.passed, false, 'not passed');
  assertEq(r.tableCount, 0, 'zero tables');
  assert(r.issues[0].includes('does not exist'), 'issue mentions does not exist');
}

console.log('\n── verifyExistingTenantDb: delegates to verifyTenantDb ───');
resetAll();
routes = [
  { match: /SCHEMATA/, handler: () => [[{ SCHEMA_NAME: 'om_church_46' }], {}] },
  ...makeHappyVerifyRoutes(),
];
{
  const r = await verifyExistingTenantDb('om_church_46', pool);
  assertEq(r.passed, true, 'delegates and passes');
  assertEq(r.tableCount, 20, 'counts tables');
}

// ============================================================================
// provisionTenantDb: idempotent replay
// ============================================================================
console.log('\n── provisionTenantDb: idempotent via request_id ──────────');
resetAll();
routes = [
  // findByRequestId returns a prior row
  {
    match: /FROM tenant_provisioning_log WHERE request_id = \?/,
    handler: () => [[{
      id: 42,
      church_id: 46,
      db_name: 'om_church_46',
      template_version: '2.0.0',
      status: 'success',
      duration_ms: 1234,
      error_message: null,
      error_type: null,
      verification_passed: 1,
      expected_table_count: 20,
      actual_table_count: 20,
      warnings: null,
      version_override: 0,
    }], {}],
  },
];
quiet();
{
  const r = await provisionTenantDb(46, pool, { requestId: 'req-abc' });
  loud();
  assertEq(r.idempotent, true, 'idempotent flag');
  assertEq(r.success, true, 'carries success');
  assertEq(r.targetDb, 'om_church_46', 'targetDb');
  assertEq(r.templateVersion, '2.0.0', 'templateVersion');
  assertEq(r.tablesCreated, 20, 'tablesCreated from actual_table_count');
  assertEq(r.verified, true, 'verified flag');
  assertEq(r.durationMs, 1234, 'durationMs');
  assert(r.warnings.some((w: string) => w.includes('Idempotent return')), 'warning about idempotent');
  // Should NOT have called execSync
  assertEq(execSyncCalls.length, 0, 'no mysqldump on idempotent');
}

// ============================================================================
// provisionTenantDb: duplicate guard via churches.db_name
// ============================================================================
console.log('\n── provisionTenantDb: duplicate via churches row ─────────');
resetAll();
routes = [
  // no prior request_id (N/A — we don't pass requestId)
  // audit log start insert
  { match: /INSERT INTO tenant_provisioning_log/, handler: () => [{ insertId: 1 }, {}] },
  { match: /UPDATE tenant_provisioning_log/, handler: () => [{}, {}] },
  // churches lookup
  {
    match: /SELECT db_name, database_name FROM churches/,
    handler: () => [[{ db_name: 'om_church_46', database_name: 'om_church_46' }], {}],
  },
];
quiet();
{
  const r = await provisionTenantDb(46, pool, {});
  loud();
  assertEq(r.success, false, 'not success');
  assert(r.error!.includes('already provisioned'), 'error mentions already provisioned');
  assertEq(r.errorType, 'DUPLICATE_PROVISION', 'errorType DUPLICATE_PROVISION');
}

// ============================================================================
// provisionTenantDb: duplicate guard via prior audit success
// ============================================================================
console.log('\n── provisionTenantDb: duplicate via prior audit ──────────');
resetAll();
routes = [
  { match: /INSERT INTO tenant_provisioning_log/, handler: () => [{ insertId: 2 }, {}] },
  { match: /UPDATE tenant_provisioning_log/, handler: () => [{}, {}] },
  // churches has no db_name
  { match: /SELECT db_name, database_name FROM churches/, handler: () => [[{ db_name: null, database_name: null }], {}] },
  // audit log already has success
  {
    match: /FROM tenant_provisioning_log WHERE church_id = \?/,
    handler: () => [[{ id: 99, db_name: 'om_church_47' }], {}],
  },
];
quiet();
{
  const r = await provisionTenantDb(47, pool, {});
  loud();
  assertEq(r.success, false, 'not success');
  assertEq(r.errorType, 'DUPLICATE_PROVISION', 'DUPLICATE_PROVISION');
  assert(r.error!.includes('audit log id=99'), 'error mentions prior log id');
}

// ============================================================================
// provisionTenantDb: force bypasses duplicate check
// ============================================================================
console.log('\n── provisionTenantDb: force bypasses dup + happy ─────────');
resetAll();
routes = [
  { match: /INSERT INTO tenant_provisioning_log/, handler: () => [{ insertId: 3 }, {}] },
  { match: /UPDATE tenant_provisioning_log/, handler: () => [{}, {}] },
  // validateTemplate
  { match: /SCHEMATA WHERE SCHEMA_NAME = \?/, handler: (_s, p) => {
      if (p[0] === 'record_template1') return [[{ SCHEMA_NAME: 'record_template1' }], {}];
      // tenant DB check
      return [[], {}];
    }
  },
  { match: /template_meta/, handler: () => [[{ version: '2.0.0', frozen_at: new Date() }], {}] },
  { match: /COUNT\(\*\) AS cnt FROM information_schema\.TABLES/, handler: () => [[{ cnt: 20 }], {}] },
  // CREATE DATABASE
  { match: /CREATE DATABASE/, handler: () => [{}, {}] },
  // setChurchIdDefaults — check for church_id column
  { match: /COLUMN_NAME = 'church_id'/, handler: () => [[{ COLUMN_NAME: 'church_id', COLUMN_KEY: '' }], {}] },
  // ALTER TABLE for defaults
  { match: /ALTER TABLE/, handler: () => [{}, {}] },
  // verifyTenantDb routes
  {
    match: /TABLE_NAME FROM information_schema\.TABLES WHERE TABLE_SCHEMA = \?/,
    handler: () => [ALL_EXPECTED.map(t => ({ TABLE_NAME: t })), {}],
  },
  { match: /COUNT\(\*\) AS cnt FROM/i, handler: () => [[{ cnt: 0 }], {}] },
  { match: /COLUMN_NAME = 'entry_type'/, handler: () => [[{ COLUMN_DEFAULT: "'Baptism'", IS_NULLABLE: 'NO' }], {}] },
  { match: /baptism_records' AND COLUMN_NAME IN/, handler: () => [OCR_COLS.map(c => ({ COLUMN_NAME: c })), {}] },
  { match: /COLUMN_NAME IN/, handler: () => [AUDIT_COLS.map(c => ({ COLUMN_NAME: c })), {}] },
  // updateChurchDbName
  { match: /UPDATE churches SET/, handler: () => [{}, {}] },
];
quiet();
{
  const r = await provisionTenantDb(46, pool, { force: true });
  loud();
  assertEq(r.success, true, 'success with force');
  assertEq(r.dbCreated, true, 'dbCreated');
  assertEq(r.churchIdDefaultsSet, true, 'churchIdDefaultsSet');
  assertEq(r.verified, true, 'verified');
  assertEq(r.tablesCreated, 20, 'tablesCreated');
  assertEq(r.templateVersion, '2.0.0', 'templateVersion');
  assert(execSyncCalls.length === 1, 'one mysqldump call');
  assert(execSyncCalls[0].includes('testhost'), 'uses configured host');
  assert(execSyncCalls[0].includes('mysqldump'), 'runs mysqldump');
  assert(execSyncCalls[0].includes('om_church_46'), 'targets correct tenant DB');
}

// ============================================================================
// provisionTenantDb: allowExisting path
// ============================================================================
console.log('\n── provisionTenantDb: allowExisting path ─────────────────');
resetAll();
routes = [
  { match: /INSERT INTO tenant_provisioning_log/, handler: () => [{ insertId: 4 }, {}] },
  { match: /UPDATE tenant_provisioning_log/, handler: () => [{}, {}] },
  // No duplicate (force=false path not taken; allowExisting is separate)
  { match: /SELECT db_name, database_name FROM churches/, handler: () => [[{ db_name: null, database_name: null }], {}] },
  { match: /FROM tenant_provisioning_log WHERE church_id = \?/, handler: () => [[], {}] },
  // validate template
  { match: /SCHEMATA WHERE SCHEMA_NAME = \?/, handler: (_s, p) => {
      if (p[0] === 'record_template1') return [[{ SCHEMA_NAME: 'record_template1' }], {}];
      // tenant DB DOES exist
      return [[{ SCHEMA_NAME: 'om_church_50' }], {}];
    }
  },
  { match: /template_meta/, handler: () => [[{ version: '2.0.0', frozen_at: new Date() }], {}] },
  { match: /COUNT\(\*\) AS cnt FROM information_schema\.TABLES/, handler: () => [[{ cnt: 20 }], {}] },
  { match: /UPDATE churches SET/, handler: () => [{}, {}] },
];
quiet();
{
  const r = await provisionTenantDb(50, pool, { allowExisting: true });
  loud();
  assertEq(r.success, true, 'success with allowExisting');
  assertEq(r.dbCreated, false, 'dbCreated = false (already existed)');
  assert(r.warnings.some((w: string) => w.includes('already exists')), 'warning about existing');
  assertEq(execSyncCalls.length, 0, 'no mysqldump');
}

// ============================================================================
// provisionTenantDb: DB exists without allowExisting → error
// ============================================================================
console.log('\n── provisionTenantDb: exists without allowExisting ──────');
resetAll();
routes = [
  { match: /INSERT INTO tenant_provisioning_log/, handler: () => [{ insertId: 5 }, {}] },
  { match: /UPDATE tenant_provisioning_log/, handler: () => [{}, {}] },
  { match: /SELECT db_name, database_name FROM churches/, handler: () => [[{ db_name: null, database_name: null }], {}] },
  { match: /FROM tenant_provisioning_log WHERE church_id = \?/, handler: () => [[], {}] },
  { match: /SCHEMATA WHERE SCHEMA_NAME = \?/, handler: (_s, p) => {
      if (p[0] === 'record_template1') return [[{ SCHEMA_NAME: 'record_template1' }], {}];
      return [[{ SCHEMA_NAME: 'om_church_51' }], {}];
    }
  },
  { match: /template_meta/, handler: () => [[{ version: '2.0.0', frozen_at: new Date() }], {}] },
  { match: /COUNT\(\*\) AS cnt FROM information_schema\.TABLES/, handler: () => [[{ cnt: 20 }], {}] },
];
quiet();
{
  const r = await provisionTenantDb(51, pool, {});
  loud();
  assertEq(r.success, false, 'not success');
  assertEq(r.errorType, 'DB_ALREADY_EXISTS', 'DB_ALREADY_EXISTS');
}

// ============================================================================
// provisionTenantDb: mysqldump failure → rollback
// ============================================================================
console.log('\n── provisionTenantDb: mysqldump failure → rollback ──────');
resetAll();
routes = [
  { match: /INSERT INTO tenant_provisioning_log/, handler: () => [{ insertId: 6 }, {}] },
  { match: /UPDATE tenant_provisioning_log/, handler: () => [{}, {}] },
  { match: /SELECT db_name, database_name FROM churches/, handler: () => [[{ db_name: null, database_name: null }], {}] },
  { match: /FROM tenant_provisioning_log WHERE church_id = \?/, handler: () => [[], {}] },
  { match: /SCHEMATA WHERE SCHEMA_NAME = \?/, handler: (_s, p) => {
      if (p[0] === 'record_template1') return [[{ SCHEMA_NAME: 'record_template1' }], {}];
      return [[], {}];
    }
  },
  { match: /template_meta/, handler: () => [[{ version: '2.0.0', frozen_at: new Date() }], {}] },
  { match: /COUNT\(\*\) AS cnt FROM information_schema\.TABLES/, handler: () => [[{ cnt: 20 }], {}] },
  { match: /CREATE DATABASE/, handler: () => [{}, {}] },
  // Rollback: information_schema.TABLES to count tables (empty = safe to drop)
  { match: /TABLE_NAME FROM information_schema\.TABLES WHERE TABLE_SCHEMA = \?/, handler: () => [[], {}] },
  { match: /DROP DATABASE/, handler: () => [{}, {}] },
];
execSyncThrows = true;
execSyncThrowMessage = 'mysqldump: connection refused';
quiet();
{
  const r = await provisionTenantDb(52, pool, {});
  loud();
  assertEq(r.success, false, 'not success');
  assertEq(r.errorType, 'SCHEMA_CLONE_FAILED', 'SCHEMA_CLONE_FAILED');
  assert(r.error!.includes('Schema clone failed'), 'error wrapped');
  assert(r.dbCreated, 'dbCreated (before rollback)');
  // Verify the rollback DROP was issued
  const dropCalled = queryLog.some(q => /DROP DATABASE/.test(q.sql));
  assert(dropCalled, 'rollback DROP DATABASE issued');
}

// ============================================================================
// provisionTenantDb: template validation failure short-circuits
// ============================================================================
console.log('\n── provisionTenantDb: template validation fails ─────────');
resetAll();
routes = [
  { match: /INSERT INTO tenant_provisioning_log/, handler: () => [{ insertId: 7 }, {}] },
  { match: /UPDATE tenant_provisioning_log/, handler: () => [{}, {}] },
  { match: /SELECT db_name, database_name FROM churches/, handler: () => [[{ db_name: null, database_name: null }], {}] },
  { match: /FROM tenant_provisioning_log WHERE church_id = \?/, handler: () => [[], {}] },
  { match: /SCHEMATA WHERE SCHEMA_NAME = \?/, handler: () => [[], {}] },  // template missing
];
quiet();
{
  const r = await provisionTenantDb(53, pool, {});
  loud();
  assertEq(r.success, false, 'not success');
  assertEq(r.errorType, 'TEMPLATE_NOT_FOUND', 'TEMPLATE_NOT_FOUND');
  assert(r.error!.includes('does not exist'), 'error mentions does not exist');
  assertEq(execSyncCalls.length, 0, 'no mysqldump');
}

// ============================================================================
// provisionTenantDb: skipChurchUpdate
// ============================================================================
console.log('\n── provisionTenantDb: skipChurchUpdate ────────────────────');
resetAll();
routes = [
  { match: /INSERT INTO tenant_provisioning_log/, handler: () => [{ insertId: 8 }, {}] },
  { match: /UPDATE tenant_provisioning_log/, handler: () => [{}, {}] },
  { match: /SCHEMATA WHERE SCHEMA_NAME = \?/, handler: (_s, p) => {
      if (p[0] === 'record_template1') return [[{ SCHEMA_NAME: 'record_template1' }], {}];
      return [[], {}];
    }
  },
  { match: /template_meta/, handler: () => [[{ version: '2.0.0', frozen_at: new Date() }], {}] },
  { match: /COUNT\(\*\) AS cnt FROM information_schema\.TABLES/, handler: () => [[{ cnt: 20 }], {}] },
  { match: /CREATE DATABASE/, handler: () => [{}, {}] },
  { match: /COLUMN_NAME = 'church_id'/, handler: () => [[{ COLUMN_NAME: 'church_id', COLUMN_KEY: '' }], {}] },
  { match: /ALTER TABLE/, handler: () => [{}, {}] },
  { match: /TABLE_NAME FROM information_schema\.TABLES WHERE TABLE_SCHEMA = \?/,
    handler: () => [ALL_EXPECTED.map(t => ({ TABLE_NAME: t })), {}] },
  { match: /COUNT\(\*\) AS cnt FROM/i, handler: () => [[{ cnt: 0 }], {}] },
  { match: /COLUMN_NAME = 'entry_type'/, handler: () => [[{ COLUMN_DEFAULT: "'Baptism'", IS_NULLABLE: 'NO' }], {}] },
  { match: /baptism_records' AND COLUMN_NAME IN/, handler: () => [OCR_COLS.map(c => ({ COLUMN_NAME: c })), {}] },
  { match: /COLUMN_NAME IN/, handler: () => [AUDIT_COLS.map(c => ({ COLUMN_NAME: c })), {}] },
];
quiet();
{
  const r = await provisionTenantDb(54, pool, { force: true, skipChurchUpdate: true });
  loud();
  assertEq(r.success, true, 'success');
  const churchUpdate = queryLog.filter(q => /UPDATE churches SET/.test(q.sql));
  assertEq(churchUpdate.length, 0, 'no churches UPDATE when skipChurchUpdate');
}

// ============================================================================
// setChurchIdDefaults: primary-key column skipped
// ============================================================================
console.log('\n── provisionTenantDb: PK church_id skipped ───────────────');
resetAll();
routes = [
  { match: /INSERT INTO tenant_provisioning_log/, handler: () => [{ insertId: 9 }, {}] },
  { match: /UPDATE tenant_provisioning_log/, handler: () => [{}, {}] },
  { match: /SCHEMATA WHERE SCHEMA_NAME = \?/, handler: (_s, p) => {
      if (p[0] === 'record_template1') return [[{ SCHEMA_NAME: 'record_template1' }], {}];
      return [[], {}];
    }
  },
  { match: /template_meta/, handler: () => [[{ version: '2.0.0', frozen_at: new Date() }], {}] },
  { match: /COUNT\(\*\) AS cnt FROM information_schema\.TABLES/, handler: () => [[{ cnt: 20 }], {}] },
  { match: /CREATE DATABASE/, handler: () => [{}, {}] },
  // All church_id columns reported as PRIMARY
  { match: /COLUMN_NAME = 'church_id'/, handler: () => [[{ COLUMN_NAME: 'church_id', COLUMN_KEY: 'PRI' }], {}] },
  { match: /TABLE_NAME FROM information_schema\.TABLES WHERE TABLE_SCHEMA = \?/,
    handler: () => [ALL_EXPECTED.map(t => ({ TABLE_NAME: t })), {}] },
  { match: /COUNT\(\*\) AS cnt FROM/i, handler: () => [[{ cnt: 0 }], {}] },
  { match: /COLUMN_NAME = 'entry_type'/, handler: () => [[{ COLUMN_DEFAULT: "'Baptism'", IS_NULLABLE: 'NO' }], {}] },
  { match: /baptism_records' AND COLUMN_NAME IN/, handler: () => [OCR_COLS.map(c => ({ COLUMN_NAME: c })), {}] },
  { match: /COLUMN_NAME IN/, handler: () => [AUDIT_COLS.map(c => ({ COLUMN_NAME: c })), {}] },
  { match: /UPDATE churches SET/, handler: () => [{}, {}] },
];
quiet();
{
  const r = await provisionTenantDb(55, pool, { force: true });
  loud();
  assertEq(r.success, true, 'success');
  const alters = queryLog.filter(q => /ALTER TABLE/.test(q.sql));
  assertEq(alters.length, 0, 'no ALTER for PK-only church_id columns');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
