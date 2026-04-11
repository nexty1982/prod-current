#!/usr/bin/env npx tsx
/**
 * Unit tests for services/databaseService.js (OMD-1150)
 *
 * Thin pass-through service layer for platform vs. church-record DB
 * access. Dependencies stubbed via require.cache BEFORE requiring SUT:
 *   - `../config/db-compat.getAppPool`: returns a route-dispatch fake
 *        pool whose query() matches SQL patterns.
 *   - `mysql2/promise`: createPool stubbed to return a sentinel object
 *        so getChurchRecordConnection returns something predictable.
 *   - `../utils/dbConnections`: lazy-required by getOcrDb(); stub
 *        exposes getOcrDbPool() returning an OCR pool sentinel.
 *
 * Coverage:
 *   - getPlatformDb / getDatabase → both return app pool
 *   - getOcrDb → delegates to lazy-required dbConnections.getOcrDbPool
 *   - getChurchRecordDatabase: lookup by userId; not-found throws;
 *       DB error re-thrown
 *   - getChurchRecordDatabaseByChurchId: not-found throws; null
 *       database_name throws; success returns name
 *   - getChurchRecordConnection: uses churchId lookup; caches
 *       connection by databaseName; second call returns same instance
 *   - queryChurchRecords: delegates to app pool (current impl)
 *   - queryPlatform: delegates to app pool query
 *   - getChurchMetadata: not-found throws; happy path returns row
 *   - isRecordPath:
 *       · /api/records, /api/baptism, /api/marriage, /api/funeral → true
 *       · /api/admin/records → false (admin override)
 *       · /api/users → false
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

// ── db-compat stub ───────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

let userLookupRows: any[] = [];   // SELECT c.database_name FROM users u JOIN churches c
let churchLookupRows: any[] = []; // SELECT database_name FROM churches
let churchMetadataRows: any[] = [];
let throwOnPattern: RegExp | null = null;
let genericRows: any[] = [];

const fakeAppPool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });

    if (throwOnPattern && throwOnPattern.test(sql)) {
      throw new Error('fake db failure');
    }

    // User-based lookup
    if (/JOIN churches c ON u\.church_id/i.test(sql)) {
      return [userLookupRows];
    }
    // Church-by-id lookup (for getChurchRecordDatabaseByChurchId)
    if (/FROM churches\s+WHERE id = \?/i.test(sql) && /SELECT database_name/i.test(sql)) {
      return [churchLookupRows];
    }
    // getChurchMetadata
    if (/SELECT[\s\S]+FROM churches/i.test(sql) && /WHERE id = \?/i.test(sql)) {
      return [churchMetadataRows];
    }

    return [genericRows];
  },
};

const dbCompatStub = { getAppPool: () => fakeAppPool };
const dbCompatPath = require.resolve('../../config/db-compat');
require.cache[dbCompatPath] = {
  id: dbCompatPath,
  filename: dbCompatPath,
  loaded: true,
  exports: dbCompatStub,
} as any;

// ── mysql2/promise stub ──────────────────────────────────────────────
type CreatePoolCall = { options: any };
const createPoolCalls: CreatePoolCall[] = [];
let poolSentinelCounter = 0;

const mysqlStub = {
  createPool: (options: any) => {
    createPoolCalls.push({ options });
    poolSentinelCounter++;
    return { __sentinel: `pool-${poolSentinelCounter}`, options };
  },
};

const mysqlPath = require.resolve('mysql2/promise');
require.cache[mysqlPath] = {
  id: mysqlPath,
  filename: mysqlPath,
  loaded: true,
  exports: mysqlStub,
} as any;

// ── dbConnections stub (lazy) ────────────────────────────────────────
let ocrPoolCallCount = 0;
const ocrPoolSentinel = { __sentinel: 'ocr-pool' };

const dbConnectionsStub = {
  getOcrDbPool: () => {
    ocrPoolCallCount++;
    return ocrPoolSentinel;
  },
};

// Stub BOTH .js and .ts resolutions. tsx's enhanced resolver returns the .ts
// path regardless, but when the SUT (a .js file) lazy-requires
// '../utils/dbConnections' at runtime, Node's stock resolver will pick the .js
// sibling. Different absolute paths → different cache keys → stub miss unless
// we populate BOTH.
const pathMod = require('path');
const tsxResolved = require.resolve('../../utils/dbConnections');
const dbConnectionsTsPath = tsxResolved;
const dbConnectionsJsPath = tsxResolved.replace(/\.ts$/, '.js');
for (const p of [dbConnectionsTsPath, dbConnectionsJsPath]) {
  require.cache[p] = {
    id: p,
    filename: p,
    loaded: true,
    exports: dbConnectionsStub,
  } as any;
}

// Silence noisy logs
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

function resetState() {
  queryLog.length = 0;
  userLookupRows = [];
  churchLookupRows = [];
  churchMetadataRows = [];
  genericRows = [];
  throwOnPattern = null;
  createPoolCalls.length = 0;
  poolSentinelCounter = 0;
  ocrPoolCallCount = 0;
}

// NOTE: churchDbConnections cache inside SUT is module-level. Tests
// that depend on caching use unique database names to avoid cross-test
// collisions.

const {
  getPlatformDb,
  getDatabase,
  getOcrDb,
  getChurchRecordDatabase,
  getChurchRecordDatabaseByChurchId,
  getChurchRecordConnection,
  queryChurchRecords,
  queryPlatform,
  getChurchMetadata,
  isRecordPath,
} = require('../databaseService');

async function main() {

// ============================================================================
// getPlatformDb / getDatabase
// ============================================================================
console.log('\n── getPlatformDb / getDatabase ───────────────────────────');

{
  const a = getPlatformDb();
  const b = getDatabase();
  assertEq(a, fakeAppPool, 'getPlatformDb returns fake pool');
  assertEq(b, fakeAppPool, 'getDatabase returns fake pool');
  assert(a === b, 'same instance');
}

// ============================================================================
// getOcrDb
// ============================================================================
console.log('\n── getOcrDb ──────────────────────────────────────────────');

resetState();
{
  const ocr = getOcrDb();
  assertEq(ocr, ocrPoolSentinel, 'returns OCR pool');
  assertEq(ocrPoolCallCount, 1, 'getOcrDbPool called once');
}

// ============================================================================
// getChurchRecordDatabase (by userId)
// ============================================================================
console.log('\n── getChurchRecordDatabase ───────────────────────────────');

// Happy path
resetState();
userLookupRows = [{ database_name: 'ssppoc_records_db' }];
{
  const dbName = await getChurchRecordDatabase(42);
  assertEq(dbName, 'ssppoc_records_db', 'returns database_name');
  assertEq(queryLog.length, 1, 'one query');
  assertEq(queryLog[0].params, [42], 'userId param');
}

// Not found
resetState();
userLookupRows = [];
quiet();
{
  let caught: Error | null = null;
  try { await getChurchRecordDatabase(999); } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'not found throws');
  assert(caught !== null && caught.message.includes('999'), 'error includes user id');
}

// DB error
resetState();
throwOnPattern = /JOIN churches/;
quiet();
{
  let caught: Error | null = null;
  try { await getChurchRecordDatabase(1); } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'DB error re-thrown');
}

// ============================================================================
// getChurchRecordDatabaseByChurchId
// ============================================================================
console.log('\n── getChurchRecordDatabaseByChurchId ─────────────────────');

// Happy path
resetState();
churchLookupRows = [{ database_name: 'om_church_46' }];
{
  const dbName = await getChurchRecordDatabaseByChurchId(46);
  assertEq(dbName, 'om_church_46', 'returns database_name');
}

// Not found
resetState();
churchLookupRows = [];
quiet();
{
  let caught: Error | null = null;
  try { await getChurchRecordDatabaseByChurchId(999); } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'not found throws');
  assert(caught !== null && caught.message.includes('999'), 'error includes church id');
}

// Null database_name
resetState();
churchLookupRows = [{ database_name: null }];
quiet();
{
  let caught: Error | null = null;
  try { await getChurchRecordDatabaseByChurchId(46); } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'null db name throws');
  assert(caught !== null && caught.message.includes('No database configured'), 'error message');
}

// ============================================================================
// getChurchRecordConnection
// ============================================================================
console.log('\n── getChurchRecordConnection ─────────────────────────────');

// First call creates a pool
resetState();
churchLookupRows = [{ database_name: 'om_church_unique_a' }];
quiet();
{
  const conn = await getChurchRecordConnection(100);
  loud();
  assert(conn !== undefined, 'connection returned');
  assertEq(createPoolCalls.length, 1, 'createPool called once');
  assertEq(createPoolCalls[0].options.database, 'om_church_unique_a', 'database set');
  assertEq(createPoolCalls[0].options.connectionLimit, 10, 'connectionLimit');
  assertEq(createPoolCalls[0].options.waitForConnections, true, 'waitForConnections');
  assertEq(createPoolCalls[0].options.queueLimit, 0, 'queueLimit');
}

// Second call with SAME database returns cached connection
resetState();
churchLookupRows = [{ database_name: 'om_church_unique_a' }];
quiet();
{
  const conn = await getChurchRecordConnection(100);
  loud();
  assertEq(createPoolCalls.length, 0, 'no new createPool (cached)');
}

// Different database creates a new pool
resetState();
churchLookupRows = [{ database_name: 'om_church_unique_b' }];
quiet();
{
  const conn = await getChurchRecordConnection(200);
  loud();
  assertEq(createPoolCalls.length, 1, 'new createPool for different db');
  assertEq(createPoolCalls[0].options.database, 'om_church_unique_b', 'different db');
}

// Lookup failure propagates
resetState();
churchLookupRows = [];
quiet();
{
  let caught: Error | null = null;
  try { await getChurchRecordConnection(9999); } catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'lookup failure propagates');
  assertEq(createPoolCalls.length, 0, 'no createPool on failure');
}

// ============================================================================
// queryChurchRecords
// ============================================================================
console.log('\n── queryChurchRecords ────────────────────────────────────');

resetState();
churchLookupRows = [{ database_name: 'om_church_unique_c' }];
genericRows = [{ id: 1, name: 'Alice' }];
quiet();
{
  const [rows] = await queryChurchRecords(300, 'SELECT * FROM test', [1]);
  loud();
  assertEq(rows, [{ id: 1, name: 'Alice' }], 'returns rows');
  // The SELECT is executed through getAppPool().query (current impl)
  // Confirm the query logged includes 'SELECT * FROM test'
  assert(queryLog.some(c => c.sql === 'SELECT * FROM test'), 'query executed');
}

// ============================================================================
// queryPlatform
// ============================================================================
console.log('\n── queryPlatform ─────────────────────────────────────────');

resetState();
genericRows = [{ count: 5 }];
{
  const [rows] = await queryPlatform('SELECT COUNT(*) as count', []);
  assertEq(rows, [{ count: 5 }], 'returns rows');
  assertEq(queryLog.length, 1, 'single query');
  assertEq(queryLog[0].sql, 'SELECT COUNT(*) as count', 'sql passed through');
}

// Params default
resetState();
{
  await queryPlatform('SELECT 1');
  assertEq(queryLog[0].params, [], 'default empty params');
}

// ============================================================================
// getChurchMetadata
// ============================================================================
console.log('\n── getChurchMetadata ─────────────────────────────────────');

// Happy path
resetState();
churchMetadataRows = [{
  id: 46, name: 'Holy Trinity', email: 'ht@example.com',
  phone: '555-1234', address: '1 Main St', city: 'Chicago',
  state_province: 'IL', postal_code: '60601', country: 'USA',
  preferred_language: 'en', timezone: 'America/Chicago', currency: 'USD',
  tax_id: null, website: null, description_multilang: null, settings: null,
  is_active: 1, database_name: 'om_church_46', setup_complete: 1,
  created_at: '2026-01-01', updated_at: '2026-04-01',
}];
{
  const meta = await getChurchMetadata(46);
  assertEq(meta.id, 46, 'id');
  assertEq(meta.name, 'Holy Trinity', 'name');
  assertEq(meta.database_name, 'om_church_46', 'database_name');
}

// Not found
resetState();
churchMetadataRows = [];
{
  let caught: Error | null = null;
  try { await getChurchMetadata(999); } catch (e: any) { caught = e; }
  assert(caught !== null, 'not found throws');
  assert(caught !== null && caught.message.includes('999'), 'error includes id');
}

// ============================================================================
// isRecordPath
// ============================================================================
console.log('\n── isRecordPath ──────────────────────────────────────────');

// Record paths
assertEq(isRecordPath('/api/records'), true, '/api/records → true');
assertEq(isRecordPath('/api/records/46'), true, '/api/records/46 → true');
assertEq(isRecordPath('/api/baptism'), true, '/api/baptism → true');
assertEq(isRecordPath('/api/baptism/create'), true, '/api/baptism/create → true');
assertEq(isRecordPath('/api/marriage'), true, '/api/marriage → true');
assertEq(isRecordPath('/api/funeral'), true, '/api/funeral → true');

// Admin override — even if it mentions "records"
assertEq(isRecordPath('/api/admin/records'), false, 'admin/records → false (platform op)');
assertEq(isRecordPath('/api/admin/baptism'), false, 'admin/baptism → false');

// Non-record paths
assertEq(isRecordPath('/api/users'), false, '/api/users → false');
assertEq(isRecordPath('/api/churches'), false, '/api/churches → false');
assertEq(isRecordPath('/api/auth/login'), false, '/api/auth/login → false');
assertEq(isRecordPath('/api/settings'), false, '/api/settings → false');
assertEq(isRecordPath('/'), false, 'root → false');
assertEq(isRecordPath(''), false, 'empty → false');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
