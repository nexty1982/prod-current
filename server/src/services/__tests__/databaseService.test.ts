#!/usr/bin/env npx tsx
/**
 * Unit tests for services/databaseService.js (OMD-1218)
 *
 * Dependencies:
 *   - `../config/db-compat`     → getAppPool (used everywhere)
 *   - `mysql2/promise`          → createPool (used in getChurchRecordConnection)
 *   - `../utils/dbConnections`  → getOcrDbPool (runtime require in getOcrDb)
 *
 * Strategy: stub all three via require.cache BEFORE requiring the SUT.
 * Regex-dispatch fake pool with scripted responses; track createPool calls.
 *
 * NOTE: `getChurchRecordConnection` uses `process.env.DB_PASS` which is
 * documented in CLAUDE.md as BROKEN (should use `getTenantPool` instead).
 * We test the code path as-written — not the pre-existing bug.
 *
 * Coverage:
 *   - getPlatformDb / getDatabase return fake pool
 *   - getChurchRecordDatabase: happy / not-found throws / DB error re-thrown
 *   - getChurchRecordDatabaseByChurchId: happy / not-found / null db name
 *   - getChurchRecordConnection: creates pool, caches, re-uses
 *   - getOcrDb: calls getOcrDbPool from dbConnections
 *   - queryChurchRecords: fetches connection, queries (via getAppPool)
 *   - queryPlatform: delegates to pool.query
 *   - getChurchMetadata: happy + not-found throws
 *   - isRecordPath: all branches (admin negatives, records/baptism/marriage/funeral)
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

// ── Fake platform pool ──────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const poolCalls: QueryCall[] = [];
type Responder = { match: RegExp; respond: (params: any[]) => any };
let responders: Responder[] = [];
let throwNext = false;

function respond(match: RegExp, result: any) {
  const fn = typeof result === 'function' ? result : () => result;
  responders.push({ match, respond: fn });
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    poolCalls.push({ sql, params });
    if (throwNext) { throwNext = false; throw new Error('fake db error'); }
    for (const r of responders) {
      if (r.match.test(sql)) return r.respond(params);
    }
    return [[], []];
  },
};

const dbCompatPath = require.resolve('../../config/db-compat');
require.cache[dbCompatPath] = {
  id: dbCompatPath,
  filename: dbCompatPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

// ── Fake mysql2/promise.createPool ──────────────────────────────────
const createPoolCalls: any[] = [];
const fakeMysql = {
  createPool: (config: any) => {
    createPoolCalls.push(config);
    return { __fakePool: true, config };
  },
};

const mysqlPath = require.resolve('mysql2/promise');
require.cache[mysqlPath] = {
  id: mysqlPath,
  filename: mysqlPath,
  loaded: true,
  exports: fakeMysql,
} as any;

// ── Fake dbConnections ──────────────────────────────────────────────
let ocrDbPoolReturned: any = { __ocrPool: true };
const fakeDbConnections = {
  getOcrDbPool: () => ocrDbPoolReturned,
};

// Install stubs for BOTH .js and .ts resolutions. Node resolves to `.js`
// but tsx may prefer `.ts` when invoked as a runtime require; both exist.
const path = require('path');
const dbConnectionsDir = path.resolve(__dirname, '..', '..', 'utils');
for (const ext of ['.js', '.ts']) {
  const p = path.join(dbConnectionsDir, 'dbConnections' + ext);
  require.cache[p] = {
    id: p,
    filename: p,
    loaded: true,
    exports: fakeDbConnections,
  } as any;
}

function resetState() {
  poolCalls.length = 0;
  responders = [];
  throwNext = false;
  createPoolCalls.length = 0;
}

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

// ── Load SUT ────────────────────────────────────────────────────────
const dbService = require('../databaseService');
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
} = dbService;

async function main() {

// ============================================================================
// getPlatformDb / getDatabase
// ============================================================================
console.log('\n── getPlatformDb / getDatabase ───────────────────────────');

assertEq(getPlatformDb(), fakePool, 'getPlatformDb returns fake pool');
assertEq(getDatabase(), fakePool, 'getDatabase returns fake pool');
assertEq(getPlatformDb(), getDatabase(), 'both aliases return same instance');

// ============================================================================
// getChurchRecordDatabase (by userId)
// ============================================================================
console.log('\n── getChurchRecordDatabase ───────────────────────────────');

resetState();
respond(/FROM orthodoxmetrics_db\.users u/, [[{ database_name: 'om_church_46' }], []]);
{
  const name = await getChurchRecordDatabase(123);
  assertEq(name, 'om_church_46', 'returns database_name');
  assertEq(poolCalls[0].params, [123], 'userId param');
}

// Not found
resetState();
respond(/FROM orthodoxmetrics_db\.users u/, [[], []]);
quiet();
{
  let caught: Error | null = null;
  try { await getChurchRecordDatabase(999); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null && /No church database found/.test(caught.message), 'not found throws');
}

// Re-throws DB errors
resetState();
throwNext = true;
quiet();
{
  let caught: Error | null = null;
  try { await getChurchRecordDatabase(1); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null && /fake db error/.test(caught.message), 'DB error re-thrown');
}

// ============================================================================
// getChurchRecordDatabaseByChurchId
// ============================================================================
console.log('\n── getChurchRecordDatabaseByChurchId ─────────────────────');

resetState();
respond(/SELECT database_name\s+FROM churches/, [[{ database_name: 'ssppoc_records_db' }], []]);
{
  const name = await getChurchRecordDatabaseByChurchId(46);
  assertEq(name, 'ssppoc_records_db', 'returns name');
  assertEq(poolCalls[0].params, [46], 'churchId param');
}

// Not found
resetState();
respond(/FROM churches/, [[], []]);
quiet();
{
  let caught: Error | null = null;
  try { await getChurchRecordDatabaseByChurchId(999); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null && /No church found/.test(caught.message), 'not found throws');
}

// Null database_name
resetState();
respond(/FROM churches/, [[{ database_name: null }], []]);
quiet();
{
  let caught: Error | null = null;
  try { await getChurchRecordDatabaseByChurchId(46); }
  catch (e: any) { caught = e; }
  loud();
  assert(
    caught !== null && /No database configured/.test(caught.message),
    'null database_name throws',
  );
}

// ============================================================================
// getChurchRecordConnection — create + cache
// ============================================================================
console.log('\n── getChurchRecordConnection ─────────────────────────────');

resetState();
respond(/FROM churches/, [[{ database_name: 'om_church_99' }], []]);
process.env.DB_HOST = 'fake-host';
process.env.DB_USER = 'fake-user';
process.env.DB_PASS = 'fake-pass';

quiet();
{
  const conn = await getChurchRecordConnection(99);
  loud();
  assertEq(createPoolCalls.length, 1, 'mysql.createPool called once');
  assertEq(createPoolCalls[0].host, 'fake-host', 'host env used');
  assertEq(createPoolCalls[0].user, 'fake-user', 'user env used');
  assertEq(createPoolCalls[0].password, 'fake-pass', 'pass env used');
  assertEq(createPoolCalls[0].database, 'om_church_99', 'database name');
  assertEq(createPoolCalls[0].connectionLimit, 10, 'connection limit');
  assertEq(createPoolCalls[0].waitForConnections, true, 'waitForConnections');
  assert((conn as any).__fakePool, 'returned the created pool');
}

// Cached second call — no new createPool
quiet();
{
  const conn2 = await getChurchRecordConnection(99);
  loud();
  // Only one new createPool across both calls
  assertEq(createPoolCalls.length, 1, 'second call does NOT re-create pool (cached)');
  assert((conn2 as any).__fakePool, 'returned cached pool');
}

// ============================================================================
// getOcrDb
// ============================================================================
console.log('\n── getOcrDb ──────────────────────────────────────────────');

assertEq(getOcrDb(), ocrDbPoolReturned, 'returns pool from getOcrDbPool');
ocrDbPoolReturned = { __differentPool: true };
assertEq(getOcrDb(), ocrDbPoolReturned, 'updates reflect in fresh call');

// ============================================================================
// queryChurchRecords
// ============================================================================
console.log('\n── queryChurchRecords ────────────────────────────────────');

resetState();
// First call (lookup for new churchId 77) → churches query
respond(/FROM churches/, [[{ database_name: 'om_church_77' }], []]);
// Then the actual query the service delegates to getAppPool().query
respond(/SELECT \* FROM baptism_records/, [[{ id: 1 }], []]);

quiet();
{
  const [rows] = await queryChurchRecords(77, 'SELECT * FROM baptism_records WHERE id = ?', [5]);
  loud();
  // Should have: 1) SELECT database_name, 2) the SELECT query
  assert(poolCalls.length >= 2, 'multiple queries issued (lookup + query)');
  const userQuery = poolCalls.find(c => /baptism_records/.test(c.sql));
  assert(userQuery !== undefined, 'user query reached pool');
  assertEq(userQuery!.params, [5], 'params forwarded');
  assertEq(rows, [{ id: 1 }], 'rows returned');
}

// ============================================================================
// queryPlatform
// ============================================================================
console.log('\n── queryPlatform ─────────────────────────────────────────');

resetState();
respond(/SELECT 1/, [[{ one: 1 }], []]);
{
  const [rows] = await queryPlatform('SELECT 1 as one');
  assertEq(rows, [{ one: 1 }], 'platform query executes');
  assertEq(poolCalls[0].sql, 'SELECT 1 as one', 'sql forwarded');
}

// ============================================================================
// getChurchMetadata
// ============================================================================
console.log('\n── getChurchMetadata ─────────────────────────────────────');

resetState();
respond(/FROM churches/, [[{
  id: 46, name: 'Holy Trinity', email: 'c@t', phone: '555',
  address: null, city: 'NYC', state_province: 'NY',
  postal_code: '10001', country: 'US', preferred_language: 'en',
  timezone: 'America/New_York', currency: 'USD', tax_id: null,
  website: null, description_multilang: null, settings: null,
  is_active: 1, database_name: 'om_church_46',
  setup_complete: 1, created_at: '2025-01-01', updated_at: '2025-12-01',
}], []]);
{
  const meta = await getChurchMetadata(46);
  assertEq((meta as any).id, 46, 'id');
  assertEq((meta as any).name, 'Holy Trinity', 'name');
  assertEq((meta as any).database_name, 'om_church_46', 'database_name');
  assertEq(poolCalls[0].params, [46], 'churchId param');
}

resetState();
respond(/FROM churches/, [[], []]);
{
  let caught: Error | null = null;
  try { await getChurchMetadata(999); }
  catch (e: any) { caught = e; }
  assert(
    caught !== null && /Church not found/.test(caught.message),
    'not found throws',
  );
}

// ============================================================================
// isRecordPath
// ============================================================================
console.log('\n── isRecordPath ──────────────────────────────────────────');

assertEq(isRecordPath('/api/records/1'), true, '/api/records → true');
assertEq(isRecordPath('/api/baptism/create'), true, '/api/baptism → true');
assertEq(isRecordPath('/api/marriage/list'), true, '/api/marriage → true');
assertEq(isRecordPath('/api/funeral'), true, '/api/funeral → true');

assertEq(isRecordPath('/api/admin/records/all'), false, 'admin records → false');
assertEq(isRecordPath('/api/churches'), false, '/api/churches → false');
assertEq(isRecordPath('/api/users'), false, '/api/users → false');
assertEq(isRecordPath('/api/ocr/jobs'), false, '/api/ocr → false');
assertEq(isRecordPath('/'), false, 'root → false');
assertEq(isRecordPath(''), false, 'empty → false');

// ============================================================================
// Module export shape
// ============================================================================
console.log('\n── exports ───────────────────────────────────────────────');

const exportKeys = [
  'getPlatformDb',
  'getDatabase',
  'getOcrDb',
  'getChurchRecordDatabase',
  'getChurchRecordDatabaseByChurchId',
  'getChurchRecordConnection',
  'queryChurchRecords',
  'queryPlatform',
  'getChurchMetadata',
  'isRecordPath',
];
for (const k of exportKeys) {
  assertEq(typeof (dbService as any)[k], 'function', `exports.${k} is a function`);
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
