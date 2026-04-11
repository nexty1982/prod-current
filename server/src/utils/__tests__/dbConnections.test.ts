#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/dbConnections.ts (OMD-942)
 *
 * 14 exports covering Records + OCR cross-DB pools, connection accessors,
 * execute*Query wrappers, single-DB and cross-DB transaction wrappers,
 * getChurchInfo, validateUserPermissions, testConnections, closeAllConnections.
 *
 * Strategy: stub `mysql2/promise` and `../config/db` via require.cache
 * BEFORE requiring the SUT. The mysql stub records every createPool config
 * and returns pool objects whose .execute()/.getConnection()/.end() are
 * tracked. The db stub provides a fake `promisePool` whose .execute() is
 * tracked separately and can be programmed to return canned rows.
 *
 * Note: tsx resolves dbConnections.ts (not dbConnections.js) — they are
 * parallel implementations with different APIs. We test the .ts variant.
 *
 * Run from server/: npx tsx src/utils/__tests__/dbConnections.test.ts
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

// ── mysql2/promise stub ──────────────────────────────────────────────
type ExecCall = { sql: string; params: any[]; poolKind: string };
const createPoolCalls: any[] = [];
const poolExecCalls: ExecCall[] = [];
const endedPools: string[] = [];
const releasedConnections: string[] = [];
const beganTransactions: string[] = [];
const committedTransactions: string[] = [];
const rolledBackTransactions: string[] = [];

let connShouldThrow = false;
let recordsExecResult: any = [[], []];
let ocrExecResult: any = [[], []];

function makePool(kind: string) {
  return {
    _kind: kind,
    execute: async (sql: string, params: any[] = []) => {
      poolExecCalls.push({ sql, params, poolKind: kind });
      return kind === 'records' ? recordsExecResult : ocrExecResult;
    },
    end: async () => { endedPools.push(kind); },
    getConnection: async () => {
      if (connShouldThrow) throw new Error('connect failed');
      const connKind = `${kind}-conn`;
      return {
        _kind: connKind,
        release: () => { releasedConnections.push(connKind); },
        beginTransaction: async () => { beganTransactions.push(connKind); },
        commit: async () => { committedTransactions.push(connKind); },
        rollback: async () => { rolledBackTransactions.push(connKind); }
      };
    }
  };
}

const mysqlStub = {
  default: {
    createPool: (config: any) => {
      createPoolCalls.push(config);
      // Determine kind from database name
      const kind = config.database === 'ssppoc_records_db' ? 'records' : 'ocr';
      return makePool(kind);
    }
  }
};
// Also provide as named export for ESM-style imports
(mysqlStub as any).createPool = mysqlStub.default.createPool;

const mysqlPath = require.resolve('mysql2/promise');
require.cache[mysqlPath] = {
  id: mysqlPath, filename: mysqlPath, loaded: true,
  exports: mysqlStub
} as any;

// ── db.ts/js stub: fake promisePool with trackable .execute() ────────
const centralExecCalls: Array<{ sql: string; params: any[] }> = [];
let centralExecImpl: (sql: string, params: any[]) => any = async () => [[], []];

const fakeCentralPool = {
  execute: async (sql: string, params: any[] = []) => {
    centralExecCalls.push({ sql, params });
    return centralExecImpl(sql, params);
  },
  query: async (sql: string, params: any[] = []) => {
    centralExecCalls.push({ sql, params });
    return centralExecImpl(sql, params);
  }
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: {
    promisePool: fakeCentralPool,
    getAppPool: () => fakeCentralPool,
    pool: fakeCentralPool
  }
} as any;

// Set known env vars BEFORE requiring SUT
process.env.DB_HOST = 'test-host';
process.env.DB_USER = 'test-user';
process.env.DB_PASSWORD = 'test-pass';

// Now require the SUT
const db = require('../dbConnections');

function resetTracking() {
  createPoolCalls.length = 0;
  poolExecCalls.length = 0;
  endedPools.length = 0;
  releasedConnections.length = 0;
  beganTransactions.length = 0;
  committedTransactions.length = 0;
  rolledBackTransactions.length = 0;
  centralExecCalls.length = 0;
  connShouldThrow = false;
  recordsExecResult = [[], []];
  ocrExecResult = [[], []];
  centralExecImpl = async () => [[], []];
}

(async () => {

// Drain any pools created during require()
await db.closeAllConnections();
resetTracking();

// ============================================================================
// getRecordsDbPool: lazy create + cache
// ============================================================================
console.log('\n── getRecordsDbPool ──────────────────────────────────────');

{
  const a = db.getRecordsDbPool();
  assertEq(createPoolCalls.length, 1, 'createPool called once');
  const cfg = createPoolCalls[0];
  assertEq(cfg.host, 'test-host', 'host from env');
  assertEq(cfg.user, 'test-user', 'user from env');
  assertEq(cfg.password, 'test-pass', 'password from env');
  assertEq(cfg.database, 'ssppoc_records_db', 'database = ssppoc_records_db');
  assertEq(cfg.charset, 'utf8mb4', 'charset utf8mb4');
  assertEq(cfg.connectionLimit, 10, 'connectionLimit 10');

  const b = db.getRecordsDbPool();
  assertEq(a, b, 'cached pool reference');
  assertEq(createPoolCalls.length, 1, 'no new createPool');
}

// ============================================================================
// getOcrDbPool: lazy create + cache + env override
// ============================================================================
console.log('\n── getOcrDbPool ──────────────────────────────────────────');

{
  const a = db.getOcrDbPool();
  assertEq(createPoolCalls.length, 2, 'second createPool call');
  const cfg = createPoolCalls[1];
  assertEq(cfg.database, 'orthodoxmetrics_ocr_db', 'default OCR database');

  const b = db.getOcrDbPool();
  assertEq(a, b, 'cached');
  assertEq(createPoolCalls.length, 2, 'still cached');
}

// Records and OCR pools are distinct
{
  const r = db.getRecordsDbPool();
  const o = db.getOcrDbPool();
  assert(r !== o, 'records ≠ ocr pool');
  assertEq((r as any)._kind, 'records', 'records pool kind');
  assertEq((o as any)._kind, 'ocr', 'ocr pool kind');
}

// ============================================================================
// getRecordsDbConnection / getOcrDbConnection
// ============================================================================
console.log('\n── getRecordsDbConnection / getOcrDbConnection ───────────');

{
  const conn = await db.getRecordsDbConnection();
  assertEq((conn as any)._kind, 'records-conn', 'records connection kind');
  assert(typeof conn.release === 'function', 'has release()');
}
{
  const conn = await db.getOcrDbConnection();
  assertEq((conn as any)._kind, 'ocr-conn', 'ocr connection kind');
}

// Connection failure propagates
{
  connShouldThrow = true;
  let caught: Error | null = null;
  try { await db.getRecordsDbConnection(); } catch (e: any) { caught = e; }
  assertEq(caught?.message, 'connect failed', 'connect error propagates');
  connShouldThrow = false;
}

// ============================================================================
// executeRecordsQuery / executeOcrQuery / executeCentralQuery
// ============================================================================
console.log('\n── execute*Query ─────────────────────────────────────────');

resetTracking();
{
  recordsExecResult = [[{ id: 1 }], []];
  const result = await db.executeRecordsQuery('SELECT * FROM x', [42]);
  assertEq(poolExecCalls.length, 1, 'records pool .execute() called');
  assertEq(poolExecCalls[0].poolKind, 'records', 'routed to records pool');
  assertEq(poolExecCalls[0].sql, 'SELECT * FROM x', 'sql passed through');
  assertEq(poolExecCalls[0].params, [42], 'params passed through');
  assertEq(result[0], [{ id: 1 }], 'rows returned');
}

resetTracking();
{
  ocrExecResult = [[{ ocr: 'ok' }], []];
  await db.executeOcrQuery('SELECT 2');
  assertEq(poolExecCalls[0].poolKind, 'ocr', 'routed to ocr pool');
  assertEq(poolExecCalls[0].params, [], 'default empty params');
}

resetTracking();
{
  await db.executeCentralQuery('SELECT 3', ['a', 'b']);
  assertEq(centralExecCalls.length, 1, 'central pool .execute() called');
  assertEq(centralExecCalls[0].sql, 'SELECT 3', 'sql passed');
  assertEq(centralExecCalls[0].params, ['a', 'b'], 'params passed');
}

// ============================================================================
// withRecordsTransaction / withOcrTransaction — happy path
// ============================================================================
console.log('\n── withRecordsTransaction / withOcrTransaction ───────────');

resetTracking();
{
  const result = await db.withRecordsTransaction(async (conn: any) => 'records-result');
  assertEq(result, 'records-result', 'callback return value');
  assertEq(beganTransactions, ['records-conn'], 'records begin');
  assertEq(committedTransactions, ['records-conn'], 'records commit');
  assertEq(rolledBackTransactions.length, 0, 'no rollback');
  assertEq(releasedConnections, ['records-conn'], 'records released');
}

resetTracking();
{
  const result = await db.withOcrTransaction(async () => ({ ocr: true }));
  assertEq(result, { ocr: true }, 'ocr callback return');
  assertEq(beganTransactions, ['ocr-conn'], 'ocr begin');
  assertEq(committedTransactions, ['ocr-conn'], 'ocr commit');
  assertEq(releasedConnections, ['ocr-conn'], 'ocr released');
}

// ============================================================================
// withRecordsTransaction — rollback path
// ============================================================================
console.log('\n── withRecordsTransaction: rollback ──────────────────────');

resetTracking();
{
  let caught: Error | null = null;
  try {
    await db.withRecordsTransaction(async () => { throw new Error('callback boom'); });
  } catch (e: any) { caught = e; }
  assertEq(caught?.message, 'callback boom', 'error rethrown');
  assertEq(beganTransactions, ['records-conn'], 'still began');
  assertEq(committedTransactions.length, 0, 'no commit');
  assertEq(rolledBackTransactions, ['records-conn'], 'rolled back');
  assertEq(releasedConnections, ['records-conn'], 'still released (finally)');
}

// ============================================================================
// withCrossDbTransaction
// ============================================================================
console.log('\n── withCrossDbTransaction ────────────────────────────────');

// Happy path: both pools begin/commit/release in order
resetTracking();
{
  const result = await db.withCrossDbTransaction(async (rConn: any, oConn: any) => {
    assertEq(rConn._kind, 'records-conn', 'rConn is records');
    assertEq(oConn._kind, 'ocr-conn', 'oConn is ocr');
    return 'cross-result';
  });
  assertEq(result, 'cross-result', 'cross callback return');
  assertEq(beganTransactions.length, 2, 'both begin');
  assert(beganTransactions.includes('records-conn') && beganTransactions.includes('ocr-conn'), 'both connections began');
  assertEq(committedTransactions.length, 2, 'both commit');
  assertEq(releasedConnections.length, 2, 'both released');
  assertEq(rolledBackTransactions.length, 0, 'no rollback');
}

// Rollback path: callback throws → both rollback, both released, rethrow
resetTracking();
{
  let caught: Error | null = null;
  try {
    await db.withCrossDbTransaction(async () => { throw new Error('cross boom'); });
  } catch (e: any) { caught = e; }
  assertEq(caught?.message, 'cross boom', 'cross error rethrown');
  assertEq(committedTransactions.length, 0, 'no commits');
  assertEq(rolledBackTransactions.length, 2, 'both rolled back');
  assertEq(releasedConnections.length, 2, 'both released');
}

// ============================================================================
// getChurchInfo
// ============================================================================
console.log('\n── getChurchInfo ─────────────────────────────────────────');

resetTracking();
{
  centralExecImpl = async () => [[{ id: 7, name: 'Test Church' }], []];
  const church = await db.getChurchInfo(7);
  assertEq(church, { id: 7, name: 'Test Church' }, 'first row returned');
  assertEq(centralExecCalls.length, 1, 'central .execute called once');
  assert(centralExecCalls[0].sql.includes('FROM churches WHERE id = ?'), 'sql includes WHERE id');
  assertEq(centralExecCalls[0].params, [7], 'params = [churchId]');
}

// Not found → throws
resetTracking();
{
  centralExecImpl = async () => [[], []];
  let caught: Error | null = null;
  try {
    await db.getChurchInfo(999);
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when no rows');
  assert(caught?.message.includes('999'), 'error mentions churchId');
}

// ============================================================================
// validateUserPermissions
// ============================================================================
console.log('\n── validateUserPermissions ───────────────────────────────');

// User not found → false
resetTracking();
{
  centralExecImpl = async () => [[], []];
  const ok = await db.validateUserPermissions(123, 'ocr_upload');
  assertEq(ok, false, 'unknown user → false');
}

// Super admin → true regardless of action
resetTracking();
{
  centralExecImpl = async () => [[{ id: 1, email: 'superadmin@orthodoxmetrics.com', role_name: 'volunteer' }], []];
  const ok = await db.validateUserPermissions(1, 'ocr_configure');
  assertEq(ok, true, 'superadmin always true');
}

// Role-based: admin has ocr_configure
resetTracking();
{
  centralExecImpl = async () => [[{ id: 2, email: 'a@b.com', role_name: 'admin' }], []];
  const ok = await db.validateUserPermissions(2, 'ocr_configure');
  assertEq(ok, true, 'admin role permits ocr_configure');
}

// Role-based: clergy does NOT have ocr_configure (but has ocr_review)
resetTracking();
{
  centralExecImpl = async () => [[{ id: 3, email: 'c@b.com', role_name: 'clergy' }], []];
  const ok = await db.validateUserPermissions(3, 'ocr_configure');
  assertEq(ok, false, 'clergy lacks ocr_configure');
}
resetTracking();
{
  centralExecImpl = async () => [[{ id: 3, email: 'c@b.com', role_name: 'clergy' }], []];
  const ok = await db.validateUserPermissions(3, 'ocr_review');
  assertEq(ok, true, 'clergy has ocr_review');
}

// Volunteer: only ocr_upload
resetTracking();
{
  centralExecImpl = async () => [[{ id: 4, email: 'v@b.com', role_name: 'volunteer' }], []];
  const ok = await db.validateUserPermissions(4, 'ocr_upload');
  assertEq(ok, true, 'volunteer has ocr_upload');
}

// Unknown role → no permissions
resetTracking();
{
  centralExecImpl = async () => [[{ id: 5, email: 'x@b.com', role_name: 'mystery' }], []];
  const ok = await db.validateUserPermissions(5, 'ocr_upload');
  assertEq(ok, false, 'unknown role → false');
}

// Church-specific permission row → true (overrides role check)
resetTracking();
{
  let call = 0;
  centralExecImpl = async () => {
    call++;
    if (call === 1) return [[{ id: 6, email: 'p@b.com', role_name: 'mystery' }], []];
    // Second call: church_permissions lookup
    return [[{ user_id: 6, church_id: 10, permission_type: 'ocr_upload' }], []];
  };
  const ok = await db.validateUserPermissions(6, 'ocr_upload', 10);
  assertEq(ok, true, 'church-specific permission grants access');
  assertEq(centralExecCalls.length, 2, 'two central queries (user + church_permissions)');
}

// Internal error → caught, returns false
resetTracking();
{
  centralExecImpl = async () => { throw new Error('db down'); };
  const ok = await db.validateUserPermissions(7, 'ocr_upload');
  assertEq(ok, false, 'internal error → false (caught)');
}

// ============================================================================
// testConnections — returns { success, results }
// ============================================================================
console.log('\n── testConnections ───────────────────────────────────────');

// All three pools succeed
resetTracking();
{
  recordsExecResult = [[{ test: 1 }], []];
  ocrExecResult = [[{ test: 1 }], []];
  centralExecImpl = async () => [[{ test: 1 }], []];
  const r = await db.testConnections();
  assertEq(r.success, true, 'success when all 3 pass');
  assertEq(r.results.central.connected, true, 'central connected');
  assertEq(r.results.records.connected, true, 'records connected');
  assertEq(r.results.ocr.connected, true, 'ocr connected');
}

// One failure → success false but partial results
resetTracking();
{
  recordsExecResult = [[{ test: 1 }], []];
  ocrExecResult = [[{ test: 1 }], []];
  centralExecImpl = async () => { throw new Error('central down'); };
  const r = await db.testConnections();
  assertEq(r.success, false, 'success false when central fails');
  assertEq(r.results.central.connected, false, 'central not connected');
  assertEq(r.results.records.connected, true, 'records still ok');
  assertEq(r.results.ocr.connected, true, 'ocr still ok');
  assertEq(r.results.central.error, 'central down', 'central error captured');
}

// ============================================================================
// closeAllConnections
// ============================================================================
console.log('\n── closeAllConnections ───────────────────────────────────');

// Both pools currently exist from prior tests
resetTracking();
{
  await db.closeAllConnections();
  assertEq(endedPools.length, 2, 'both pools .end() called');
  assert(endedPools.includes('records'), 'records ended');
  assert(endedPools.includes('ocr'), 'ocr ended');
}

// After close: pools nullified, recreated on next access
resetTracking();
{
  db.getRecordsDbPool();
  db.getOcrDbPool();
  assertEq(createPoolCalls.length, 2, 'pools recreated after close');
}

// closeAll with one pool only
resetTracking();
await db.closeAllConnections();
{
  db.getRecordsDbPool(); // create only records
  resetTracking();
  await db.closeAllConnections();
  assertEq(endedPools.length, 1, 'only records ended (ocr was null)');
  assertEq(endedPools[0], 'records', 'records ended');
}

// closeAll with no pools is a no-op
resetTracking();
await db.closeAllConnections();
{
  await db.closeAllConnections();
  assertEq(endedPools.length, 0, 'no-op when both null');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

})();
