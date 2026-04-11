#!/usr/bin/env npx tsx
/**
 * Unit tests for services/databaseService.js (OMD-1064)
 *
 * Database service layer wrapping the platform pool, church-records DBs,
 * and the OCR DB. Provides query helpers, church-DB lookup, and a tiny
 * isRecordPath utility.
 *
 * External deps (all stubbed via require.cache BEFORE requiring SUT):
 *   - ../config/db-compat        (getAppPool)
 *   - mysql2/promise             (createPool — for getChurchRecordConnection cache)
 *   - ../utils/dbConnections     (getOcrDbPool — lazy-required inside getOcrDb)
 *
 * Coverage:
 *   - getPlatformDb / getDatabase: returns the platform pool
 *   - getOcrDb: delegates to getOcrDbPool
 *   - getChurchRecordDatabase(userId): found + not-found throw, query shape
 *   - getChurchRecordDatabaseByChurchId(churchId): found, not-found, null db_name
 *   - getChurchRecordConnection: creates pool first time, caches on reuse
 *   - queryChurchRecords: delegates to platform pool (note: current impl
 *     runs the query on getAppPool, not the cached connection — documented
 *     by the test)
 *   - queryPlatform: delegates
 *   - getChurchMetadata: found + not-found
 *   - isRecordPath: records/baptism/marriage/funeral/admin-exclusion
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

// ─── Stubs ──────────────────────────────────────────────────────────────────

type Route = { match: RegExp; rows?: any[]; respond?: (params: any[]) => any[] };
let routes: Route[] = [];
const queryLog: { sql: string; params: any[] }[] = [];
let queryThrows: Error | null = null;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (queryThrows) throw queryThrows;
    for (const r of routes) {
      if (r.match.test(sql)) {
        const rows = r.respond ? r.respond(params) : (r.rows || []);
        return [rows];
      }
    }
    return [[]];
  },
};

const dbCompatStub = {
  getAppPool: () => fakePool,
};

const dbCompatPath = require.resolve('../../config/db-compat');
require.cache[dbCompatPath] = {
  id: dbCompatPath, filename: dbCompatPath, loaded: true, exports: dbCompatStub,
} as any;

// mysql2/promise stub
type CreatePoolCall = { config: any };
const createPoolCalls: CreatePoolCall[] = [];
const createdPools: any[] = [];
const mysqlStub = {
  createPool: (config: any) => {
    createPoolCalls.push({ config });
    const pool = { __config: config, query: async () => [[]] };
    createdPools.push(pool);
    return pool;
  },
};
const mysqlPath = require.resolve('mysql2/promise');
require.cache[mysqlPath] = {
  id: mysqlPath, filename: mysqlPath, loaded: true, exports: mysqlStub,
} as any;

// dbConnections stub (lazy-required inside getOcrDb)
const ocrPool = { __marker: 'ocr' };
const dbConnectionsStub = {
  getOcrDbPool: () => ocrPool,
};
// Stub both .js and .ts paths — tsx resolves differently depending on the
// source file extension. From a .ts test file `require.resolve` points at
// .ts, but when the real .js SUT requires the module it gets .js.
{
  const path = require('path');
  const utilsDir = path.resolve(__dirname, '../../utils');
  for (const fn of ['dbConnections.js', 'dbConnections.ts']) {
    const abs = path.join(utilsDir, fn);
    require.cache[abs] = {
      id: abs, filename: abs, loaded: true, exports: dbConnectionsStub,
    } as any;
  }
}

// Silence console
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

function resetState() {
  routes = [];
  queryLog.length = 0;
  queryThrows = null;
  createPoolCalls.length = 0;
  createdPools.length = 0;
}

async function main() {

// ============================================================================
// getPlatformDb / getDatabase
// ============================================================================
console.log('\n── getPlatformDb / getDatabase ───────────────────────────');

resetState();
{
  const db = getPlatformDb();
  assert(db === fakePool, 'getPlatformDb returns the fake pool');

  const alias = getDatabase();
  assert(alias === fakePool, 'getDatabase alias also returns the pool');
}

// ============================================================================
// getOcrDb
// ============================================================================
console.log('\n── getOcrDb ──────────────────────────────────────────────');

{
  const ocr = getOcrDb();
  assert(ocr === ocrPool, 'getOcrDb delegates to getOcrDbPool');
}

// ============================================================================
// getChurchRecordDatabase(userId)
// ============================================================================
console.log('\n── getChurchRecordDatabase(userId) ───────────────────────');

// Happy path
resetState();
routes = [{
  match: /FROM orthodoxmetrics_db\.users/,
  respond: (params) => {
    assertEq(params[0], 42, 'userId passed');
    return [{ database_name: 'om_church_42' }];
  },
}];
{
  const db = await getChurchRecordDatabase(42);
  assertEq(db, 'om_church_42', 'returns database name');
  assertEq(queryLog.length, 1, '1 query');
  assert(/JOIN churches/.test(queryLog[0].sql), 'joins churches');
}

// Not found → throws
resetState();
routes = [{ match: /FROM orthodoxmetrics_db\.users/, rows: [] }];
quiet();
{
  let caught: Error | null = null;
  try { await getChurchRecordDatabase(999); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'not found throws');
  assert(caught !== null && caught.message.includes('No church database'), 'error message');
  assert(caught !== null && caught.message.includes('999'), 'includes user id');
}

// Query error → bubbles
resetState();
queryThrows = new Error('db down');
quiet();
{
  let caught: Error | null = null;
  try { await getChurchRecordDatabase(1); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'query error bubbles');
  assert(caught !== null && caught.message.includes('db down'), 'original error');
}

// ============================================================================
// getChurchRecordDatabaseByChurchId
// ============================================================================
console.log('\n── getChurchRecordDatabaseByChurchId ─────────────────────');

// Happy
resetState();
routes = [{
  match: /FROM churches/,
  respond: (params) => {
    assertEq(params[0], 46, 'churchId passed');
    return [{ database_name: 'om_church_46' }];
  },
}];
{
  const db = await getChurchRecordDatabaseByChurchId(46);
  assertEq(db, 'om_church_46', 'returns db name');
}

// Not found
resetState();
routes = [{ match: /FROM churches/, rows: [] }];
quiet();
{
  let caught: Error | null = null;
  try { await getChurchRecordDatabaseByChurchId(999); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'throws');
  assert(caught !== null && caught.message.includes('No church found'), 'error message');
  assert(caught !== null && caught.message.includes('999'), 'includes id');
}

// Null database_name (provisioned but no DB)
resetState();
routes = [{ match: /FROM churches/, rows: [{ database_name: null }] }];
quiet();
{
  let caught: Error | null = null;
  try { await getChurchRecordDatabaseByChurchId(5); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'null db_name throws');
  assert(caught !== null && caught.message.includes('No database configured'), 'error message');
}

// ============================================================================
// getChurchRecordConnection (cache behavior)
// ============================================================================
console.log('\n── getChurchRecordConnection ─────────────────────────────');

// First call creates pool; second call reuses cached pool
resetState();
// Route returns db name for this church
routes = [{
  match: /FROM churches/,
  rows: [{ database_name: 'om_church_100' }],
}];
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'testuser';
process.env.DB_PASS = 'testpass';
quiet();
{
  const c1 = await getChurchRecordConnection(100);
  loud();
  assert(c1 !== null, 'returns connection');
  assertEq(createPoolCalls.length, 1, '1 createPool call');
  assertEq(createPoolCalls[0].config.database, 'om_church_100', 'database in config');
  assertEq(createPoolCalls[0].config.host, 'localhost', 'host from env');
  assertEq(createPoolCalls[0].config.user, 'testuser', 'user from env');
  assertEq(createPoolCalls[0].config.waitForConnections, true, 'waitForConnections');
  assertEq(createPoolCalls[0].config.connectionLimit, 10, 'connectionLimit');

  // Second call with same church → cached
  quiet();
  const c2 = await getChurchRecordConnection(100);
  loud();
  assert(c1 === c2, 'same pool returned from cache');
  assertEq(createPoolCalls.length, 1, 'createPool NOT called again');
}

// Different church → new pool
resetState();
routes = [{
  match: /FROM churches/,
  respond: (params) => [{ database_name: `om_church_${params[0]}` }],
}];
quiet();
{
  const c1 = await getChurchRecordConnection(200);
  const c2 = await getChurchRecordConnection(201);
  loud();
  assert(c1 !== c2, 'different pools for different churches');
  assertEq(createPoolCalls.length, 2, '2 createPool calls');
  assertEq(createPoolCalls[0].config.database, 'om_church_200', 'first db');
  assertEq(createPoolCalls[1].config.database, 'om_church_201', 'second db');
}

// Church lookup fails → throws
resetState();
routes = [{ match: /FROM churches/, rows: [] }];
quiet();
{
  let caught: Error | null = null;
  try { await getChurchRecordConnection(888); }
  catch (e: any) { caught = e; }
  loud();
  assert(caught !== null, 'throws on missing church');
}

// ============================================================================
// queryChurchRecords
// ============================================================================
console.log('\n── queryChurchRecords ────────────────────────────────────');

// Note: current impl calls `getAppPool().query(...)` after resolving the
// church connection. We verify that behavior (not the cached pool usage).
resetState();
routes = [
  { match: /FROM churches/, rows: [{ database_name: 'om_church_300' }] },
  { match: /SELECT \* FROM baptism/, rows: [{ id: 1, name: 'Alice' }] },
];
quiet();
{
  const [rows] = await queryChurchRecords(300, 'SELECT * FROM baptism_records WHERE id = ?', [1]);
  loud();
  assert(Array.isArray(rows), 'returns array');
  assertEq(rows.length, 1, '1 row');
  assertEq(rows[0].name, 'Alice', 'row data');
}

// ============================================================================
// queryPlatform
// ============================================================================
console.log('\n── queryPlatform ─────────────────────────────────────────');

resetState();
routes = [{
  match: /SELECT \* FROM users/,
  respond: (params) => {
    assertEq(params[0], 7, 'param passed');
    return [{ id: 7, email: 'a@b.com' }];
  },
}];
{
  const [rows] = await queryPlatform('SELECT * FROM users WHERE id = ?', [7]);
  assertEq(rows.length, 1, '1 row');
  assertEq(rows[0].email, 'a@b.com', 'row data');
}

// Default params = []
resetState();
routes = [{ match: /SELECT 1/, rows: [{ result: 1 }] }];
{
  const [rows] = await queryPlatform('SELECT 1 as result');
  assertEq(rows.length, 1, 'default params → still works');
  assertEq(queryLog[0].params, [], 'params defaulted to []');
}

// ============================================================================
// getChurchMetadata
// ============================================================================
console.log('\n── getChurchMetadata ─────────────────────────────────────');

// Happy
resetState();
routes = [{
  match: /SELECT[\s\S]*FROM churches/,
  respond: (params) => {
    assertEq(params[0], 46, 'churchId passed');
    return [{
      id: 46,
      name: 'Holy Trinity',
      email: 'contact@example.com',
      database_name: 'om_church_46',
      is_active: 1,
    }];
  },
}];
{
  const meta = await getChurchMetadata(46);
  assertEq(meta.id, 46, 'id');
  assertEq(meta.name, 'Holy Trinity', 'name');
  assertEq(meta.database_name, 'om_church_46', 'database_name');
  // Verify columns requested
  assert(queryLog[0].sql.includes('preferred_language'), 'selects preferred_language');
  assert(queryLog[0].sql.includes('settings'), 'selects settings');
  assert(queryLog[0].sql.includes('setup_complete'), 'selects setup_complete');
}

// Not found
resetState();
routes = [{ match: /SELECT[\s\S]*FROM churches/, rows: [] }];
{
  let caught: Error | null = null;
  try { await getChurchMetadata(999); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'not found throws');
  assert(caught !== null && caught.message.includes('Church not found'), 'error message');
  assert(caught !== null && caught.message.includes('999'), 'includes id');
}

// ============================================================================
// isRecordPath
// ============================================================================
console.log('\n── isRecordPath ──────────────────────────────────────────');

assertEq(isRecordPath('/api/records'), true, '/api/records');
assertEq(isRecordPath('/api/records/list'), true, '/api/records/list');
assertEq(isRecordPath('/api/baptism/create'), true, '/api/baptism/*');
assertEq(isRecordPath('/api/marriage/update'), true, '/api/marriage/*');
assertEq(isRecordPath('/api/funeral/delete'), true, '/api/funeral/*');

assertEq(isRecordPath('/api/users'), false, '/api/users');
assertEq(isRecordPath('/api/churches'), false, '/api/churches');
assertEq(isRecordPath('/'), false, 'root');
assertEq(isRecordPath('/api/health'), false, '/api/health');

// Admin exclusion
assertEq(isRecordPath('/api/admin/records'), false, '/api/admin/records excluded');
assertEq(isRecordPath('/api/admin/baptism'), false, '/api/admin/baptism excluded');
assertEq(isRecordPath('/admin/records/list'), false, 'admin prefix excluded');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
