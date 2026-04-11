#!/usr/bin/env npx tsx
/**
 * Unit tests for services/databaseService.js (OMD-1170)
 *
 * Thin wrapper around the platform DB pool + church record database lookups.
 * Dependencies:
 *   - ../config/db-compat (getAppPool)
 *   - mysql2/promise (createPool) — called lazily inside getChurchRecordConnection
 *   - ../utils/dbConnections (getOcrDbPool) — called lazily inside getOcrDb
 *
 * Strategy: stub db-compat, mysql2/promise, and dbConnections via require.cache
 * BEFORE requiring the SUT.
 *
 * Coverage:
 *   - getPlatformDb / getDatabase: delegate to getAppPool (same instance)
 *   - getChurchRecordDatabase(userId): SQL lookup, found / not found
 *   - getChurchRecordDatabaseByChurchId(churchId): found / not found / null name
 *   - getChurchRecordConnection: createPool, caching, errors
 *   - getOcrDb: delegates to getOcrDbPool
 *   - queryChurchRecords: returns platform pool query results (known bug)
 *   - queryPlatform: delegates to getAppPool().query
 *   - getChurchMetadata: found / not found
 *   - isRecordPath: /admin/ excluded, /api/records, /api/baptism, etc.
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

// ── Fake getAppPool ──────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

let scriptedResults: any[] = [];
let nextResultIndex = 0;

const fakeAppPool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (nextResultIndex < scriptedResults.length) {
      return scriptedResults[nextResultIndex++];
    }
    return [[]];
  },
};

const dbCompatPath = require.resolve('../../config/db-compat');
require.cache[dbCompatPath] = {
  id: dbCompatPath,
  filename: dbCompatPath,
  loaded: true,
  exports: { getAppPool: () => fakeAppPool },
} as any;

// ── Fake mysql2/promise ──────────────────────────────────────────────
const createPoolCalls: any[] = [];
const fakeMysqlPool = { tag: 'fake-mysql-pool' };
const mysqlStub = {
  createPool: (config: any) => {
    createPoolCalls.push(config);
    return fakeMysqlPool;
  },
};

const mysqlPath = require.resolve('mysql2/promise');
require.cache[mysqlPath] = {
  id: mysqlPath,
  filename: mysqlPath,
  loaded: true,
  exports: mysqlStub,
} as any;

// ── Fake utils/dbConnections ─────────────────────────────────────────
const fakeOcrPool = { tag: 'fake-ocr-pool' };
const dbConnectionsStub = {
  getOcrDbPool: () => fakeOcrPool,
};

// dbConnections is required lazily inside getOcrDb() — stub BEFORE SUT loads.
// Cache under BOTH .js and .ts since tsx may resolve differently from
// .ts test file vs .js SUT file.
const dbConnectionsPath = require.resolve('../../utils/dbConnections');
const dbConnectionsStubModule = {
  id: dbConnectionsPath,
  filename: dbConnectionsPath,
  loaded: true,
  exports: dbConnectionsStub,
} as any;
require.cache[dbConnectionsPath] = dbConnectionsStubModule;
// Also cache the .js variant explicitly (in case tsx resolves .ts here)
const dbConnectionsJsPath = dbConnectionsPath.replace(/\.ts$/, '.js');
if (dbConnectionsJsPath !== dbConnectionsPath) {
  require.cache[dbConnectionsJsPath] = dbConnectionsStubModule;
}
const dbConnectionsTsPath = dbConnectionsPath.replace(/\.js$/, '.ts');
if (dbConnectionsTsPath !== dbConnectionsPath) {
  require.cache[dbConnectionsTsPath] = dbConnectionsStubModule;
}

function resetState() {
  queryLog.length = 0;
  scriptedResults = [];
  nextResultIndex = 0;
  createPoolCalls.length = 0;
}

function scriptResult(rows: any[]) {
  scriptedResults.push([rows]);
}

// Silence noisy logs
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

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

assertEq(getPlatformDb(), fakeAppPool, 'getPlatformDb returns app pool');
assertEq(getDatabase(), fakeAppPool, 'getDatabase returns app pool');
assert(getPlatformDb() === getDatabase(), 'both return same instance');

// ============================================================================
// getOcrDb
// ============================================================================
console.log('\n── getOcrDb ──────────────────────────────────────────────');

assertEq(getOcrDb(), fakeOcrPool, 'getOcrDb delegates to getOcrDbPool');

// ============================================================================
// getChurchRecordDatabase (by userId)
// ============================================================================
console.log('\n── getChurchRecordDatabase ───────────────────────────────');

resetState();
scriptResult([{ database_name: 'ssppoc_records_db' }]);
{
  const dbName = await getChurchRecordDatabase(42);
  assertEq(dbName, 'ssppoc_records_db', 'returns database name');
  assertEq(queryLog.length, 1, '1 query');
  assert(/FROM orthodoxmetrics_db\.users u/.test(queryLog[0].sql), 'joins users table');
  assert(/JOIN churches c/i.test(queryLog[0].sql), 'joins churches');
  assert(/WHERE u\.id = \?/.test(queryLog[0].sql), 'filters by user id');
  assertEq(queryLog[0].params, [42], 'user id param');
}

// Not found
resetState();
scriptResult([]);
quiet();
{
  let caught: Error | null = null;
  try {
    await getChurchRecordDatabase(999);
  } catch (e: any) {
    caught = e;
  }
  loud();
  assert(caught !== null, 'not found throws');
  assert(caught !== null && caught.message.includes('999'), 'error mentions user id');
}

// ============================================================================
// getChurchRecordDatabaseByChurchId
// ============================================================================
console.log('\n── getChurchRecordDatabaseByChurchId ─────────────────────');

resetState();
scriptResult([{ database_name: 'om_church_46' }]);
{
  const dbName = await getChurchRecordDatabaseByChurchId(46);
  assertEq(dbName, 'om_church_46', 'returns database name');
  assert(/FROM churches/.test(queryLog[0].sql), 'queries churches');
  assert(/WHERE id = \?/.test(queryLog[0].sql), 'filters by id');
  assertEq(queryLog[0].params, [46], 'church id param');
}

// Church not found
resetState();
scriptResult([]);
quiet();
{
  let caught: Error | null = null;
  try {
    await getChurchRecordDatabaseByChurchId(999);
  } catch (e: any) {
    caught = e;
  }
  loud();
  assert(caught !== null, 'not found throws');
  assert(caught !== null && caught.message.includes('999'), 'error mentions church id');
}

// Church has no database_name configured
resetState();
scriptResult([{ database_name: null }]);
quiet();
{
  let caught: Error | null = null;
  try {
    await getChurchRecordDatabaseByChurchId(1);
  } catch (e: any) {
    caught = e;
  }
  loud();
  assert(caught !== null, 'null db name throws');
  assert(caught !== null && caught.message.includes('No database configured'), 'clear error');
}

// ============================================================================
// getChurchRecordConnection (creates pool, caches)
// ============================================================================
console.log('\n── getChurchRecordConnection ─────────────────────────────');

resetState();
scriptResult([{ database_name: 'om_church_test' }]);
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'test_user';
process.env.DB_PASS = 'test_pass';
quiet();
{
  const conn = await getChurchRecordConnection(46);
  loud();
  assertEq(conn, fakeMysqlPool, 'returns created pool');
  assertEq(createPoolCalls.length, 1, '1 createPool call');
  assertEq(createPoolCalls[0].host, 'localhost', 'host from env');
  assertEq(createPoolCalls[0].user, 'test_user', 'user from env');
  assertEq(createPoolCalls[0].database, 'om_church_test', 'database name');
  assertEq(createPoolCalls[0].waitForConnections, true, 'waitForConnections');
  assertEq(createPoolCalls[0].connectionLimit, 10, 'connection limit 10');
}

// Second call with same churchId → cached (no new createPool)
resetState();
scriptResult([{ database_name: 'om_church_test' }]);
quiet();
{
  const conn = await getChurchRecordConnection(46);
  loud();
  assertEq(conn, fakeMysqlPool, 'cached pool returned');
  assertEq(createPoolCalls.length, 0, 'no new createPool');
  // Note: the SQL for lookup STILL runs — caching is on db name, not churchId
  assertEq(queryLog.length, 1, 'SQL lookup still happens');
}

// Different churchId → new pool created
resetState();
scriptResult([{ database_name: 'om_church_other' }]);
quiet();
{
  const conn = await getChurchRecordConnection(99);
  loud();
  assertEq(createPoolCalls.length, 1, 'new createPool for new db');
  assertEq(createPoolCalls[0].database, 'om_church_other', 'new db name');
}

// Error case: lookup throws → propagated
resetState();
// No scripted result, empty rows → not found error
quiet();
{
  let caught: Error | null = null;
  try {
    await getChurchRecordConnection(12345);
  } catch (e: any) {
    caught = e;
  }
  loud();
  assert(caught !== null, 'lookup error propagates');
}

// ============================================================================
// queryPlatform
// ============================================================================
console.log('\n── queryPlatform ─────────────────────────────────────────');

resetState();
scriptResult([{ id: 1, name: 'test' }]);
{
  const [rows] = await queryPlatform('SELECT * FROM t WHERE x = ?', [5]);
  assertEq(rows, [{ id: 1, name: 'test' }], 'returns rows');
  assertEq(queryLog[0].sql, 'SELECT * FROM t WHERE x = ?', 'passes SQL through');
  assertEq(queryLog[0].params, [5], 'passes params through');
}

// Default params
resetState();
scriptResult([]);
{
  await queryPlatform('SELECT 1');
  assertEq(queryLog[0].params, [], 'default empty params');
}

// ============================================================================
// queryChurchRecords (note: uses platform pool, not church pool — known bug)
// ============================================================================
console.log('\n── queryChurchRecords ────────────────────────────────────');

resetState();
scriptResult([{ database_name: 'om_church_46' }]);  // for lookup
scriptResult([[{ id: 1 }]]);                        // for the actual query
quiet();
{
  const result = await queryChurchRecords(46, 'SELECT * FROM baptism_records', []);
  loud();
  // The SUT calls getChurchRecordConnection (triggers lookup + cache hit) then
  // runs the query on getAppPool() — NOT on the church pool. Verify this odd
  // behavior persists.
  assert(Array.isArray(result) || typeof result === 'object', 'returns something');
  // Query log should have at least 2 entries: lookup + actual query
  assert(queryLog.length >= 2, 'at least 2 queries');
  const lastQuery = queryLog[queryLog.length - 1];
  assertEq(lastQuery.sql, 'SELECT * FROM baptism_records', 'passes SQL');
}

// ============================================================================
// getChurchMetadata
// ============================================================================
console.log('\n── getChurchMetadata ─────────────────────────────────────');

resetState();
const fakeChurch = {
  id: 46,
  name: 'Holy Trinity',
  email: 'contact@ht.org',
  phone: '555-1234',
  address: '123 Main St',
  city: 'Anytown',
  state_province: 'NY',
  postal_code: '12345',
  country: 'USA',
  preferred_language: 'en',
  timezone: 'America/New_York',
  currency: 'USD',
  tax_id: null,
  website: 'https://ht.org',
  description_multilang: null,
  settings: null,
  is_active: 1,
  database_name: 'om_church_46',
  setup_complete: 1,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-06-01'),
};
scriptResult([fakeChurch]);
{
  const church = await getChurchMetadata(46);
  assertEq(church.id, 46, 'id');
  assertEq(church.name, 'Holy Trinity', 'name');
  assertEq(church.database_name, 'om_church_46', 'database_name');
  assert(/FROM churches/.test(queryLog[0].sql), 'queries churches');
  assertEq(queryLog[0].params, [46], 'church id param');
}

// Not found
resetState();
scriptResult([]);
{
  let caught: Error | null = null;
  try {
    await getChurchMetadata(999);
  } catch (e: any) {
    caught = e;
  }
  assert(caught !== null, 'throws on not found');
  assert(caught !== null && caught.message.includes('999'), 'error mentions id');
}

// ============================================================================
// isRecordPath
// ============================================================================
console.log('\n── isRecordPath ──────────────────────────────────────────');

// Positive cases
assertEq(isRecordPath('/api/records'), true, '/api/records');
assertEq(isRecordPath('/api/records/list'), true, '/api/records/list');
assertEq(isRecordPath('/api/baptism'), true, '/api/baptism');
assertEq(isRecordPath('/api/baptism/create'), true, '/api/baptism/create');
assertEq(isRecordPath('/api/marriage'), true, '/api/marriage');
assertEq(isRecordPath('/api/funeral'), true, '/api/funeral');

// Admin exclusion (overrides)
assertEq(isRecordPath('/api/admin/records'), false, '/api/admin/records excluded');
assertEq(isRecordPath('/api/admin/baptism'), false, '/api/admin/baptism excluded');
assertEq(isRecordPath('/admin/records'), false, '/admin/records excluded');

// Negative cases
assertEq(isRecordPath('/api/users'), false, '/api/users');
assertEq(isRecordPath('/api/churches'), false, '/api/churches');
assertEq(isRecordPath('/api/settings'), false, '/api/settings');
assertEq(isRecordPath(''), false, 'empty path');
assertEq(isRecordPath('/'), false, 'root path');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
