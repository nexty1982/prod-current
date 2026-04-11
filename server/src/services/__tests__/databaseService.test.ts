#!/usr/bin/env npx tsx
/**
 * Unit tests for services/databaseService.js (OMD-993)
 *
 * Coverage:
 *   - isRecordPath (pure): /admin/ exclusion, /api/records,
 *     /api/baptism, /api/marriage, /api/funeral, negatives
 *   - getPlatformDb / getDatabase: delegates to getAppPool
 *   - getChurchRecordDatabase: SELECT by userId, not-found throws
 *   - getChurchRecordDatabaseByChurchId: SELECT by churchId,
 *     not-found and null database_name both throw
 *   - queryPlatform: delegates to pool.query
 *   - getChurchMetadata: SELECT churches WHERE id=?, not-found throws
 *
 * Note: getChurchRecordConnection is documented BROKEN (uses DB_PASS).
 * queryChurchRecords is similarly broken. We cover only the non-broken
 * exports.
 *
 * Run: npx tsx server/src/services/__tests__/databaseService.test.ts
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

// ── Stub ../config/db-compat ────────────────────────────────────────
type QCall = { sql: string; params: any[] };
let qCalls: QCall[] = [];
let qRoutes: Array<{ match: RegExp; rows?: any[]; result?: any }> = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    qCalls.push({ sql, params });
    for (const r of qRoutes) {
      if (r.match.test(sql)) {
        if (r.rows !== undefined) return [r.rows, []];
        return [r.result ?? { affectedRows: 1 }, []];
      }
    }
    return [[], []];
  },
};

const dbCompatPath = require.resolve('../../config/db-compat');
require.cache[dbCompatPath] = {
  id: dbCompatPath,
  filename: dbCompatPath,
  loaded: true,
  exports: {
    getAppPool: () => fakePool,
  },
} as any;

const svc = require('../databaseService');
const {
  isRecordPath,
  getPlatformDb,
  getDatabase,
  getChurchRecordDatabase,
  getChurchRecordDatabaseByChurchId,
  queryPlatform,
  getChurchMetadata,
} = svc;

// Silence SUT error logs for expected failures
const origError = console.error;
function quiet() { console.error = () => {}; }
function loud() { console.error = origError; }

async function main() {

// ============================================================================
// isRecordPath
// ============================================================================
console.log('\n── isRecordPath ──────────────────────────────────────────');

// Positive — record paths
assertEq(isRecordPath('/api/records'), true, '/api/records');
assertEq(isRecordPath('/api/records/123'), true, '/api/records/123');
assertEq(isRecordPath('/api/baptism'), true, '/api/baptism');
assertEq(isRecordPath('/api/baptism-records'), true, '/api/baptism-records');
assertEq(isRecordPath('/api/marriage'), true, '/api/marriage');
assertEq(isRecordPath('/api/funeral'), true, '/api/funeral');
assertEq(isRecordPath('/api/funeral-records/new'), true, '/api/funeral-records/new');

// Negative — not record paths
assertEq(isRecordPath('/api/users'), false, '/api/users');
assertEq(isRecordPath('/api/churches'), false, '/api/churches');
assertEq(isRecordPath('/api/ocr'), false, '/api/ocr');
assertEq(isRecordPath('/api/settings'), false, '/api/settings');
assertEq(isRecordPath('/'), false, 'root path');
assertEq(isRecordPath(''), false, 'empty path');

// Admin exclusion — /admin/ overrides record detection
assertEq(isRecordPath('/api/admin/records'), false, '/admin/records excluded');
assertEq(isRecordPath('/api/admin/baptism'), false, '/admin/baptism excluded');
assertEq(isRecordPath('/api/admin/marriage-analytics'), false, '/admin/marriage excluded');

// ============================================================================
// getPlatformDb / getDatabase
// ============================================================================
console.log('\n── getPlatformDb / getDatabase ───────────────────────────');

{
  const db = getPlatformDb();
  assert(db === fakePool, 'getPlatformDb returns fake pool');
}

{
  const db = getDatabase();
  assert(db === fakePool, 'getDatabase returns fake pool');
}

// ============================================================================
// getChurchRecordDatabase
// ============================================================================
console.log('\n── getChurchRecordDatabase ───────────────────────────────');

qCalls = [];
qRoutes = [{
  match: /SELECT c\.database_name[\s\S]*FROM orthodoxmetrics_db\.users u/i,
  rows: [{ database_name: 'om_church_46' }],
}];
{
  const name = await getChurchRecordDatabase(42);
  assertEq(name, 'om_church_46', 'returns database_name');
  assertEq(qCalls[0].params, [42], 'userId param');
}

// User not found
qCalls = [];
qRoutes = [{ match: /SELECT/i, rows: [] }];
quiet();
{
  let thrown = false;
  try {
    await getChurchRecordDatabase(999);
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('No church database found'), 'error mentions not found');
    assert(e.message.includes('999'), 'error mentions userId');
  }
  assert(thrown, 'not found throws');
}
loud();

// ============================================================================
// getChurchRecordDatabaseByChurchId
// ============================================================================
console.log('\n── getChurchRecordDatabaseByChurchId ─────────────────────');

qCalls = [];
qRoutes = [{
  match: /SELECT database_name[\s\S]*FROM churches/i,
  rows: [{ database_name: 'om_church_10' }],
}];
{
  const name = await getChurchRecordDatabaseByChurchId(10);
  assertEq(name, 'om_church_10', 'returns db name');
  assertEq(qCalls[0].params, [10], 'churchId param');
}

// Church not found
qCalls = [];
qRoutes = [{ match: /SELECT/i, rows: [] }];
quiet();
{
  let thrown = false;
  try {
    await getChurchRecordDatabaseByChurchId(999);
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('No church found'), 'error mentions not found');
    assert(e.message.includes('999'), 'error mentions churchId');
  }
  assert(thrown, 'church not found throws');
}
loud();

// Church found but database_name is null
qCalls = [];
qRoutes = [{ match: /SELECT/i, rows: [{ database_name: null }] }];
quiet();
{
  let thrown = false;
  try {
    await getChurchRecordDatabaseByChurchId(5);
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('No database configured'), 'error mentions no database');
    assert(e.message.includes('5'), 'error mentions churchId');
  }
  assert(thrown, 'null database_name throws');
}
loud();

// ============================================================================
// queryPlatform
// ============================================================================
console.log('\n── queryPlatform ─────────────────────────────────────────');

qCalls = [];
qRoutes = [{ match: /SELECT 1/i, rows: [{ one: 1 }] }];
{
  const [rows] = await queryPlatform('SELECT 1', [42]);
  assertEq(rows, [{ one: 1 }], 'returns query results');
  assertEq(qCalls[0].sql, 'SELECT 1', 'SQL passed through');
  assertEq(qCalls[0].params, [42], 'params passed through');
}

// No params
qCalls = [];
qRoutes = [{ match: /SELECT/i, rows: [] }];
{
  await queryPlatform('SELECT * FROM users');
  assertEq(qCalls[0].params, [], 'default params []');
}

// ============================================================================
// getChurchMetadata
// ============================================================================
console.log('\n── getChurchMetadata ─────────────────────────────────────');

qCalls = [];
qRoutes = [{
  match: /SELECT[\s\S]*FROM churches[\s\S]*WHERE id = \?/i,
  rows: [{
    id: 5,
    name: 'Holy Trinity',
    email: 'contact@church.org',
    phone: '555-1234',
    address: '123 Main St',
    city: 'Boston',
    state_province: 'MA',
    postal_code: '02101',
    country: 'USA',
    preferred_language: 'en',
    timezone: 'America/New_York',
    currency: 'USD',
    tax_id: 'TX123',
    website: 'https://church.org',
    description_multilang: '{}',
    settings: '{}',
    is_active: 1,
    database_name: 'om_church_5',
    setup_complete: 1,
    created_at: '2026-01-01',
    updated_at: '2026-04-01',
  }],
}];
{
  const meta = await getChurchMetadata(5);
  assertEq(meta.id, 5, 'id');
  assertEq(meta.name, 'Holy Trinity', 'name');
  assertEq(meta.email, 'contact@church.org', 'email');
  assertEq(meta.database_name, 'om_church_5', 'database_name');
  assertEq(meta.is_active, 1, 'is_active');
  assertEq(qCalls[0].params, [5], 'churchId param');
}

// Not found
qCalls = [];
qRoutes = [{ match: /SELECT[\s\S]*FROM churches/i, rows: [] }];
{
  let thrown = false;
  try {
    await getChurchMetadata(999);
  } catch (e: any) {
    thrown = true;
    assert(e.message.includes('Church not found'), 'error mentions not found');
    assert(e.message.includes('999'), 'error mentions churchId');
  }
  assert(thrown, 'not found throws');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
