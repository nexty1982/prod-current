#!/usr/bin/env npx tsx
/**
 * Unit tests for services/databaseService.js (OMD-1093)
 *
 * Thin wrapper layer around the app pool + a record-DB pool cache.
 * Three external deps:
 *   - ../config/db-compat       → getAppPool (platform pool)
 *   - mysql2/promise            → createPool (for church record DB)
 *   - ../utils/dbConnections    → getOcrDbPool
 *
 * All stubbed via require.cache BEFORE requiring the SUT.
 *
 * Coverage:
 *   - getPlatformDb / getDatabase: return the app pool
 *   - getOcrDb: lazy-requires and returns ocr pool
 *   - getChurchRecordDatabase (by user):
 *       · happy path returns database_name
 *       · no rows → throws "No church database found"
 *   - getChurchRecordDatabaseByChurchId:
 *       · happy path
 *       · no rows → "No church found"
 *       · null database_name → "No database configured"
 *   - getChurchRecordConnection:
 *       · creates a pool via mysql.createPool on first call
 *       · returns cached pool on subsequent calls (per DB name)
 *       · propagates errors from lookup
 *   - queryChurchRecords: gets connection but routes query via app pool
 *     (pre-existing pattern — documented here, not a bug fix)
 *   - queryPlatform: delegates to app pool
 *   - getChurchMetadata:
 *       · returns first row on match
 *       · throws on empty result
 *   - isRecordPath: /api/records, /api/baptism, /api/marriage, /api/funeral,
 *                    /admin/* override, non-record paths
 *
 * Run: npx tsx server/src/services/__tests__/databaseService.test.ts
 */

import * as pathMod from 'path';

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

// ── Fake app pool ────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const appQueryLog: QueryCall[] = [];
type Route = { match: RegExp; respond: (params: any[]) => any[] };
let routes: Route[] = [];

const fakeAppPool = {
  query: async (sql: string, params: any[] = []) => {
    appQueryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) return [r.respond(params), []];
    }
    return [[], []];
  },
};

const fakeDbCompat = { getAppPool: () => fakeAppPool };

// ── Fake mysql2/promise ──────────────────────────────────────────────
type CreatePoolCall = { opts: any };
const createPoolCalls: CreatePoolCall[] = [];
let nextPoolId = 1;

const fakeMysql = {
  createPool: (opts: any) => {
    createPoolCalls.push({ opts });
    return { __poolId: nextPoolId++, opts };
  },
};

// ── Fake ocr pool (lazy-required) ────────────────────────────────────
const fakeOcrPool = { __type: 'ocr-pool' };
const fakeDbConnections = { getOcrDbPool: () => fakeOcrPool };

// ── Stub modules ─────────────────────────────────────────────────────
// Stub BOTH .js and .ts resolutions — tsx will prefer .ts when the test
// (a .ts file) does require.resolve, but the SUT (a .js file) will get
// the .js resolution from Node. Stub both keys.
const fsSync = require('fs');
function stubModule(relFromSrc: string, exports: any) {
  const absWithoutExt = pathMod.resolve(__dirname, '..', '..', relFromSrc);
  const candidates = [`${absWithoutExt}.js`, `${absWithoutExt}.ts`];
  for (const candidate of candidates) {
    if (fsSync.existsSync(candidate)) {
      require.cache[candidate] = {
        id: candidate, filename: candidate, loaded: true, exports,
      } as any;
    }
  }
}

stubModule('config/db-compat', fakeDbCompat);
stubModule('utils/dbConnections', fakeDbConnections);

// mysql2/promise — resolve through node_modules
const mysqlResolved = require.resolve('mysql2/promise');
require.cache[mysqlResolved] = {
  id: mysqlResolved, filename: mysqlResolved, loaded: true, exports: fakeMysql,
} as any;

function resetRoutes() {
  appQueryLog.length = 0;
  routes = [];
  createPoolCalls.length = 0;
}

// Silence
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const svc = require('../databaseService');

async function main() {

// ============================================================================
// getPlatformDb / getDatabase
// ============================================================================
console.log('\n── getPlatformDb / getDatabase ───────────────────────────');

assert(svc.getPlatformDb() === fakeAppPool, 'getPlatformDb returns app pool');
assert(svc.getDatabase() === fakeAppPool, 'getDatabase returns app pool');

// ============================================================================
// getOcrDb
// ============================================================================
console.log('\n── getOcrDb ──────────────────────────────────────────────');

assert(svc.getOcrDb() === fakeOcrPool, 'returns OCR pool');

// ============================================================================
// getChurchRecordDatabase (by user)
// ============================================================================
console.log('\n── getChurchRecordDatabase ───────────────────────────────');

resetRoutes();
routes = [{
  match: /FROM orthodoxmetrics_db\.users/i,
  respond: (params) => {
    // Verify user id is passed
    if (params[0] === 42) return [{ database_name: 'om_church_7' }];
    return [];
  },
}];

{
  const name = await svc.getChurchRecordDatabase(42);
  assertEq(name, 'om_church_7', 'returns database_name');
  assertEq(appQueryLog[0].params[0], 42, 'userId passed to query');
}

// No rows → throws
resetRoutes();
routes = [{
  match: /FROM orthodoxmetrics_db\.users/i,
  respond: () => [],
}];
{
  let caught: any = null;
  quiet();
  try { await svc.getChurchRecordDatabase(999); } catch (e) { caught = e; }
  loud();
  assert(caught !== null, 'no rows throws');
  assert(caught && /No church database found for user ID: 999/.test(caught.message), 'error message');
}

// ============================================================================
// getChurchRecordDatabaseByChurchId
// ============================================================================
console.log('\n── getChurchRecordDatabaseByChurchId ─────────────────────');

// Happy path
resetRoutes();
routes = [{
  match: /FROM churches/i,
  respond: (params) => {
    if (params[0] === 46) return [{ database_name: 'om_church_46' }];
    return [];
  },
}];
{
  const name = await svc.getChurchRecordDatabaseByChurchId(46);
  assertEq(name, 'om_church_46', 'returns db name');
}

// Church not found
resetRoutes();
routes = [{ match: /FROM churches/i, respond: () => [] }];
{
  let caught: any = null;
  quiet();
  try { await svc.getChurchRecordDatabaseByChurchId(77); } catch (e) { caught = e; }
  loud();
  assert(caught !== null, 'no church throws');
  assert(caught && /No church found with ID: 77/.test(caught.message), 'error message');
}

// database_name null
resetRoutes();
routes = [{ match: /FROM churches/i, respond: () => [{ database_name: null }] }];
{
  let caught: any = null;
  quiet();
  try { await svc.getChurchRecordDatabaseByChurchId(50); } catch (e) { caught = e; }
  loud();
  assert(caught !== null, 'null db_name throws');
  assert(caught && /No database configured for church ID: 50/.test(caught.message), 'error message');
}

// ============================================================================
// getChurchRecordConnection — caching
// ============================================================================
console.log('\n── getChurchRecordConnection ─────────────────────────────');

// First call for a new church → creates pool
resetRoutes();
routes = [{
  match: /FROM churches/i,
  respond: (params) => {
    if (params[0] === 100) return [{ database_name: 'om_church_100' }];
    if (params[0] === 200) return [{ database_name: 'om_church_200' }];
    return [];
  },
}];

quiet();
const pool1 = await svc.getChurchRecordConnection(100);
loud();
assertEq(createPoolCalls.length, 1, 'createPool called once');
assertEq(createPoolCalls[0].opts.database, 'om_church_100', 'pool for correct DB');
assertEq(createPoolCalls[0].opts.connectionLimit, 10, 'connectionLimit=10');
assertEq(createPoolCalls[0].opts.waitForConnections, true, 'waitForConnections');
assertEq(createPoolCalls[0].opts.queueLimit, 0, 'queueLimit=0');

// Second call for same church → cached, no new pool
const pool1Again = await svc.getChurchRecordConnection(100);
assertEq(createPoolCalls.length, 1, 'cached: still 1 createPool call');
assert(pool1 === pool1Again, 'same pool returned from cache');

// Different church → new pool
quiet();
const pool2 = await svc.getChurchRecordConnection(200);
loud();
assertEq(createPoolCalls.length, 2, '2 createPool calls for 2 churches');
assert(pool1 !== pool2, 'different pools');
assertEq(createPoolCalls[1].opts.database, 'om_church_200', 'second pool DB');

// Error propagation from lookup
resetRoutes();
routes = [{ match: /FROM churches/i, respond: () => [] }];
{
  let caught: any = null;
  quiet();
  try { await svc.getChurchRecordConnection(999); } catch (e) { caught = e; }
  loud();
  assert(caught !== null, 'lookup error propagates');
}

// ============================================================================
// queryPlatform
// ============================================================================
console.log('\n── queryPlatform ─────────────────────────────────────────');

resetRoutes();
routes = [{
  match: /SELECT 1/i,
  respond: () => [{ x: 1 }],
}];

{
  const result = await svc.queryPlatform('SELECT 1 AS x', []);
  // queryPlatform returns the raw query result [rows, fields]
  assertEq(result[0], [{ x: 1 }], 'rows returned');
}

// ============================================================================
// getChurchMetadata
// ============================================================================
console.log('\n── getChurchMetadata ─────────────────────────────────────');

resetRoutes();
routes = [{
  match: /FROM churches/i,
  respond: (params) => {
    if (params[0] === 46) {
      return [{
        id: 46, name: 'Holy Trinity', email: 'info@ht.org',
        phone: '555', address: '1 Main', city: 'X', state_province: 'Y',
        postal_code: '12345', country: 'US', preferred_language: 'en',
        timezone: 'UTC', currency: 'USD', tax_id: null, website: null,
        description_multilang: null, settings: null, is_active: 1,
        database_name: 'om_church_46', setup_complete: 1,
        created_at: '2026-01-01', updated_at: '2026-04-01',
      }];
    }
    return [];
  },
}];

{
  const meta = await svc.getChurchMetadata(46);
  assertEq(meta.id, 46, 'id');
  assertEq(meta.name, 'Holy Trinity', 'name');
  assertEq(meta.database_name, 'om_church_46', 'database_name');
}

// Not found
resetRoutes();
routes = [{ match: /FROM churches/i, respond: () => [] }];
{
  let caught: any = null;
  try { await svc.getChurchMetadata(999); } catch (e) { caught = e; }
  assert(caught !== null, 'throws when not found');
  assert(caught && /Church not found with ID: 999/.test(caught.message), 'error message');
}

// ============================================================================
// isRecordPath
// ============================================================================
console.log('\n── isRecordPath ──────────────────────────────────────────');

assertEq(svc.isRecordPath('/api/records'), true, '/api/records');
assertEq(svc.isRecordPath('/api/records/123'), true, '/api/records/123');
assertEq(svc.isRecordPath('/api/baptism'), true, '/api/baptism');
assertEq(svc.isRecordPath('/api/baptism/list'), true, '/api/baptism/list');
assertEq(svc.isRecordPath('/api/marriage'), true, '/api/marriage');
assertEq(svc.isRecordPath('/api/funeral'), true, '/api/funeral');
assertEq(svc.isRecordPath('/api/users'), false, '/api/users');
assertEq(svc.isRecordPath('/api/churches'), false, '/api/churches');
assertEq(svc.isRecordPath('/api/auth/login'), false, '/api/auth/login');

// Admin override
assertEq(svc.isRecordPath('/admin/records'), false, '/admin/records excluded');
assertEq(svc.isRecordPath('/api/admin/baptism'), false, '/api/admin/baptism excluded');
assertEq(svc.isRecordPath('/admin/baptism/list'), false, '/admin/baptism excluded');

// Edge cases
assertEq(svc.isRecordPath(''), false, 'empty path');
assertEq(svc.isRecordPath('/'), false, 'root path');

// ============================================================================
// queryChurchRecords — routes through app pool (documented behavior)
// ============================================================================
console.log('\n── queryChurchRecords ────────────────────────────────────');

resetRoutes();
// Stub the church lookup so getChurchRecordConnection can run without error
routes = [
  {
    match: /FROM churches/i,
    respond: (params) => params[0] === 46 ? [{ database_name: 'om_church_46' }] : [],
  },
  {
    match: /SELECT \* FROM baptism_records/i,
    respond: () => [{ id: 1, first_name: 'Alice' }],
  },
];

quiet();
const result = await svc.queryChurchRecords(46, 'SELECT * FROM baptism_records WHERE id = ?', [1]);
loud();
// The function calls getAppPool().query with the raw SQL, so we get [rows, fields]
assertEq(result[0], [{ id: 1, first_name: 'Alice' }], 'returns rows from app pool');
// Verify query was logged to app pool
const userQuery = appQueryLog.find((q) => /baptism_records/.test(q.sql));
assert(userQuery !== undefined, 'query routed through app pool (current behavior)');
assertEq(userQuery!.params, [1], 'params forwarded');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
