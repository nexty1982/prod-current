#!/usr/bin/env npx tsx
/**
 * Unit tests for services/recordHistoryLogger.js (OMD-966)
 *
 * Logs INSERT/UPDATE/DELETE on *_records tables to *_history tables.
 * One external dep: `../utils/dbSwitcher.getChurchDbConnection`.
 *
 * Strategy: stub dbSwitcher via require.cache with a fake pool/connection
 * that records `execute` calls and returns scriptable responses keyed by
 * SQL regex. Silence console.log/warn/error to reduce noise.
 *
 * Coverage:
 *   - getHistoryTableName: _records → _history; non-matching → null
 *   - logRecordChange:
 *       · invalid recordsTableName → null (no DB work)
 *       · invalid action → throws
 *       · history table exists → INSERT; returns insertId
 *       · history table missing → CREATE then INSERT
 *       · beforeData/afterData JSON-serialized (null preserved)
 *       · connection.release() called even on error (via finally)
 *       · DB error swallowed → returns null
 *   - verifyHistoryTables:
 *       · all *_records tables enumerated
 *       · missing list populated for non-existing history tables
 *       · errors swallowed (captured in results.errors)
 *       · connection.release() called
 *   - createHistoryTable: executes CREATE TABLE with expected schema
 *
 * Run: npx tsx server/src/services/__tests__/recordHistoryLogger.test.ts
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

// ── Fake connection + pool ──────────────────────────────────────────
type ExecuteCall = { sql: string; params: any[] };
const executeLog: ExecuteCall[] = [];
let releaseCount = 0;

// Scriptable responses
let tableExists = true;          // INFORMATION_SCHEMA for history table
let insertIdValue = 42;
let recordsTables: string[] = [];  // SELECT ..._records
let historyTableExistsMap: Record<string, boolean> = {};
let executeThrowsOnPattern: RegExp | null = null;

const fakeConnection = {
  execute: async (sql: string, params: any[] = []) => {
    executeLog.push({ sql, params });

    if (executeThrowsOnPattern && executeThrowsOnPattern.test(sql)) {
      throw new Error('fake db failure');
    }

    // List *_records tables
    if (/TABLE_NAME LIKE '%_records'/i.test(sql)) {
      const rows = recordsTables.map(name => ({ TABLE_NAME: name }));
      return [rows];
    }

    // Check specific history table exists
    if (/INFORMATION_SCHEMA\.TABLES/i.test(sql) && /TABLE_NAME = \?/i.test(sql)) {
      const target = params[1];
      // Two-phase logic: for logRecordChange, use tableExists flag.
      // For verifyHistoryTables, use map.
      if (target in historyTableExistsMap) {
        return [historyTableExistsMap[target] ? [{ TABLE_NAME: target }] : []];
      }
      return [tableExists ? [{ TABLE_NAME: target }] : []];
    }

    // CREATE TABLE
    if (/^\s*CREATE TABLE/i.test(sql)) {
      return [{}];
    }

    // INSERT INTO history table
    if (/^\s*INSERT INTO/i.test(sql)) {
      return [{ insertId: insertIdValue }];
    }

    return [[]];
  },
  release: () => { releaseCount++; },
};

const fakeChurchDb = {
  getConnection: async () => fakeConnection,
};

const dbSwitcherStub = {
  getChurchDbConnection: async (_dbName: string) => fakeChurchDb,
};

const dbSwitcherPath = require.resolve('../../utils/dbSwitcher');
require.cache[dbSwitcherPath] = {
  id: dbSwitcherPath,
  filename: dbSwitcherPath,
  loaded: true,
  exports: dbSwitcherStub,
} as any;

function resetState() {
  executeLog.length = 0;
  releaseCount = 0;
  tableExists = true;
  insertIdValue = 42;
  recordsTables = [];
  historyTableExistsMap = {};
  executeThrowsOnPattern = null;
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
  logRecordChange,
  verifyHistoryTables,
  getHistoryTableName,
  createHistoryTable,
} = require('../recordHistoryLogger');

async function main() {

// ============================================================================
// getHistoryTableName (pure)
// ============================================================================
console.log('\n── getHistoryTableName ───────────────────────────────────');

assertEq(getHistoryTableName('baptism_records'), 'baptism_history', 'baptism');
assertEq(getHistoryTableName('marriage_records'), 'marriage_history', 'marriage');
assertEq(getHistoryTableName('funeral_records'), 'funeral_history', 'funeral');
assertEq(getHistoryTableName('cemetery_records'), 'cemetery_history', 'cemetery');
assertEq(getHistoryTableName('users'), null, 'non-records → null');
assertEq(getHistoryTableName(''), null, 'empty string → null');
assertEq(getHistoryTableName('records_backup'), null, 'does not end with _records → null');

// ============================================================================
// logRecordChange — invalid table name → null
// ============================================================================
console.log('\n── logRecordChange: invalid name ─────────────────────────');

resetState();
quiet();
{
  const result = await logRecordChange(46, 'users', 'INSERT', 1, null, { a: 1 }, 7);
  loud();
  assertEq(result, null, 'non-_records table → null');
  assertEq(executeLog.length, 0, 'no DB calls');
}

// ============================================================================
// logRecordChange — invalid action → throws
// ============================================================================
console.log('\n── logRecordChange: invalid action ───────────────────────');

resetState();
{
  let caught: Error | null = null;
  try {
    await logRecordChange(46, 'baptism_records', 'BOGUS', 1, null, null, 7);
  } catch (e: any) {
    caught = e;
  }
  assert(caught !== null, 'invalid action throws');
  assert(caught !== null && caught.message.includes('Invalid action'), 'error mentions action');
}

// ============================================================================
// logRecordChange — happy path (table exists)
// ============================================================================
console.log('\n── logRecordChange: happy path ───────────────────────────');

resetState();
tableExists = true;
insertIdValue = 999;
quiet();
{
  const afterData = { first_name: 'Alice', age: 30 };
  const result = await logRecordChange(46, 'baptism_records', 'INSERT', 5, null, afterData, 7);
  loud();
  assertEq(result, 999, 'returns insertId');
  // Expected calls: 1) table-exists check, 2) INSERT
  assertEq(executeLog.length, 2, '2 queries');
  assert(/INFORMATION_SCHEMA/.test(executeLog[0].sql), 'first: existence check');
  assertEq(executeLog[0].params[0], 'om_church_46', 'dbName param');
  assertEq(executeLog[0].params[1], 'baptism_history', 'history table param');
  assert(/INSERT INTO/.test(executeLog[1].sql), 'second: INSERT');
  assert(executeLog[1].sql.includes('baptism_history'), 'INSERT into baptism_history');
  // Params: [recordId, action, userId, beforeJson, afterJson]
  assertEq(executeLog[1].params[0], 5, 'recordId');
  assertEq(executeLog[1].params[1], 'INSERT', 'action');
  assertEq(executeLog[1].params[2], 7, 'userId');
  assertEq(executeLog[1].params[3], null, 'beforeJson null');
  assertEq(
    executeLog[1].params[4],
    JSON.stringify(afterData),
    'afterJson serialized'
  );
  assertEq(releaseCount, 1, 'connection released');
}

// UPDATE with both before and after
resetState();
tableExists = true;
quiet();
{
  const before = { name: 'old' };
  const after = { name: 'new' };
  await logRecordChange(10, 'marriage_records', 'UPDATE', 3, before, after, null);
  loud();
  assertEq(executeLog[1].params[1], 'UPDATE', 'UPDATE action');
  assertEq(executeLog[1].params[2], null, 'null userId');
  assertEq(executeLog[1].params[3], JSON.stringify(before), 'beforeJson serialized');
  assertEq(executeLog[1].params[4], JSON.stringify(after), 'afterJson serialized');
  assert(executeLog[1].sql.includes('marriage_history'), 'marriage_history target');
}

// DELETE with only before
resetState();
tableExists = true;
quiet();
{
  await logRecordChange(10, 'funeral_records', 'DELETE', 9, { x: 1 }, null);
  loud();
  assertEq(executeLog[1].params[1], 'DELETE', 'DELETE action');
  assertEq(executeLog[1].params[4], null, 'afterJson null');
}

// ============================================================================
// logRecordChange — history table missing → CREATE then INSERT
// ============================================================================
console.log('\n── logRecordChange: missing table creation ───────────────');

resetState();
tableExists = false;
insertIdValue = 123;
quiet();
{
  const result = await logRecordChange(46, 'baptism_records', 'INSERT', 1, null, { a: 1 }, 7);
  loud();
  assertEq(result, 123, 'still returns insertId');
  // Expected: 1) existence check, 2) CREATE TABLE, 3) INSERT
  assertEq(executeLog.length, 3, '3 queries');
  assert(/INFORMATION_SCHEMA/.test(executeLog[0].sql), 'exists check');
  assert(/CREATE TABLE/.test(executeLog[1].sql), 'create table');
  assert(executeLog[1].sql.includes('baptism_history'), 'creates baptism_history');
  assert(/INSERT INTO/.test(executeLog[2].sql), 'insert row');
  assertEq(releaseCount, 1, 'released');
}

// ============================================================================
// logRecordChange — DB error swallowed → null, connection released
// ============================================================================
console.log('\n── logRecordChange: error swallowing ─────────────────────');

resetState();
tableExists = true;
executeThrowsOnPattern = /INSERT INTO/;
quiet();
{
  const result = await logRecordChange(46, 'baptism_records', 'INSERT', 1, null, { a: 1 }, 7);
  loud();
  assertEq(result, null, 'error → null (swallowed)');
  assertEq(releaseCount, 1, 'connection still released (finally)');
}

// ============================================================================
// createHistoryTable (direct call)
// ============================================================================
console.log('\n── createHistoryTable ────────────────────────────────────');

resetState();
quiet();
{
  await createHistoryTable(fakeConnection, 'test_history');
  loud();
  assertEq(executeLog.length, 1, 'one execute');
  const sql = executeLog[0].sql;
  assert(/CREATE TABLE/i.test(sql), 'CREATE TABLE');
  assert(sql.includes('test_history'), 'uses given table name');
  assert(/record_id INT NOT NULL/i.test(sql), 'record_id column');
  assert(/ENUM\('INSERT', 'UPDATE', 'DELETE'\)/i.test(sql), 'action ENUM');
  assert(/before_json LONGTEXT/i.test(sql), 'before_json column');
  assert(/after_json LONGTEXT/i.test(sql), 'after_json column');
  assert(/INDEX idx_record_id/i.test(sql), 'record_id index');
}

// ============================================================================
// verifyHistoryTables
// ============================================================================
console.log('\n── verifyHistoryTables ───────────────────────────────────');

// All tables present
resetState();
recordsTables = ['baptism_records', 'marriage_records', 'funeral_records'];
historyTableExistsMap = {
  baptism_history: true,
  marriage_history: true,
  funeral_history: true,
};
quiet();
{
  const r = await verifyHistoryTables(46);
  loud();
  assertEq(r.church_id, 46, 'church_id');
  assertEq(r.tables_checked.length, 3, '3 tables checked');
  assertEq(r.missing.length, 0, 'none missing');
  assertEq(r.errors.length, 0, 'no errors');
  assertEq(r.tables_checked[0].records_table, 'baptism_records', 'records_table');
  assertEq(r.tables_checked[0].history_table, 'baptism_history', 'history_table');
  assertEq(r.tables_checked[0].exists, true, 'exists flag');
  assertEq(releaseCount, 1, 'connection released');
}

// Some missing
resetState();
recordsTables = ['baptism_records', 'marriage_records'];
historyTableExistsMap = {
  baptism_history: true,
  marriage_history: false,
};
quiet();
{
  const r = await verifyHistoryTables(46);
  loud();
  assertEq(r.tables_checked.length, 2, '2 checked');
  assertEq(r.missing.length, 1, '1 missing');
  assertEq(r.missing[0].records_table, 'marriage_records', 'missing records_table');
  assertEq(r.missing[0].history_table, 'marriage_history', 'missing history_table');
}

// No records tables at all
resetState();
recordsTables = [];
quiet();
{
  const r = await verifyHistoryTables(46);
  loud();
  assertEq(r.tables_checked.length, 0, 'nothing checked');
  assertEq(r.missing.length, 0, 'nothing missing');
  assertEq(r.errors.length, 0, 'no errors');
}

// DB error on the LIST query → captured in errors
resetState();
executeThrowsOnPattern = /TABLE_NAME LIKE '%_records'/;
quiet();
{
  const r = await verifyHistoryTables(46);
  loud();
  assert(r.errors.length > 0, 'error captured');
  assert(r.errors[0].includes('fake db failure'), 'error message preserved');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
