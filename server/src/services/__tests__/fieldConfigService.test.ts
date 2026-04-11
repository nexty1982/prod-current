#!/usr/bin/env npx tsx
/**
 * Unit tests for services/fieldConfigService.ts (OMD-1187)
 *
 * Thin CRUD around `ocr_field_configurations` with versioning + soft delete.
 * External deps:
 *   - ../utils/dbConnections: executeRecordsQuery, withRecordsTransaction
 *   - ../types/ocrTypes:      TABLE_NAMES (used in SQL template strings)
 *
 * We stub both via require.cache BEFORE requiring the SUT.
 *
 * Coverage:
 *   - getFieldConfig: returns field_config of first row; null when empty;
 *                     propagates + logs errors
 *   - saveFieldConfig: inside transaction, runs deactivate UPDATE,
 *                      next-version SELECT, INSERT; returns insertId;
 *                      version = 1 when no prior; version = max+1 otherwise;
 *                      field_config JSON-serialized
 *   - getChurchFieldConfigs: returns rows array
 *   - getFieldConfigHistory: returns rows array
 *   - deleteFieldConfig: issues UPDATE with id param
 *
 * Run: npx tsx server/src/services/__tests__/fieldConfigService.test.ts
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

// ── ocrTypes stub ────────────────────────────────────────────────────
const ocrTypesStub: any = {
  TABLE_NAMES: {
    OCR_FIELD_CONFIGURATIONS: 'ocr_field_configurations',
  },
};
ocrTypesStub.default = ocrTypesStub;

function stubModule(relative: string, exports: any) {
  try {
    const p = require.resolve(relative);
    require.cache[p] = { id: p, filename: p, loaded: true, exports } as any;
  } catch {}
}
stubModule('../../types/ocrTypes', ocrTypesStub);

// ── dbConnections stub ───────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };

let execQueryRows: any[] = [];
let execQueryThrowsOnPattern: RegExp | null = null;
const execQueryLog: QueryCall[] = [];

type Script = { match: RegExp; rows: any[] };
let execQueryScripts: Script[] = [];

function resetExec() {
  execQueryLog.length = 0;
  execQueryRows = [];
  execQueryScripts = [];
  execQueryThrowsOnPattern = null;
}

async function executeRecordsQuery(sql: string, params: any[] = []) {
  execQueryLog.push({ sql, params });
  if (execQueryThrowsOnPattern && execQueryThrowsOnPattern.test(sql)) {
    throw new Error('fake query error');
  }
  for (const s of execQueryScripts) {
    if (s.match.test(sql)) return [s.rows];
  }
  return [execQueryRows];
}

// Transaction stub — same execute signature, with scriptable responses
type TxnScript = { match: RegExp; result: any };
let txnScripts: TxnScript[] = [];
const txnLog: QueryCall[] = [];
let txnCommitted = false;
let txnRolledBack = false;

function resetTxn() {
  txnScripts = [];
  txnLog.length = 0;
  txnCommitted = false;
  txnRolledBack = false;
}

async function withRecordsTransaction(fn: (conn: any) => Promise<any>) {
  const conn = {
    execute: async (sql: string, params: any[] = []) => {
      txnLog.push({ sql, params });
      for (const s of txnScripts) {
        if (s.match.test(sql)) return [s.result];
      }
      return [[]];
    },
  };
  try {
    const out = await fn(conn);
    txnCommitted = true;
    return out;
  } catch (e) {
    txnRolledBack = true;
    throw e;
  }
}

const dbConnectionsStub = { executeRecordsQuery, withRecordsTransaction };
stubModule('../../utils/dbConnections', dbConnectionsStub);

// ── Silence logs ─────────────────────────────────────────────────────
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

// ── Require SUT ──────────────────────────────────────────────────────
const {
  getFieldConfig,
  saveFieldConfig,
  getChurchFieldConfigs,
  getFieldConfigHistory,
  deleteFieldConfig,
} = require('../fieldConfigService');

async function main() {

// ============================================================================
// getFieldConfig
// ============================================================================
console.log('\n── getFieldConfig ────────────────────────────────────────');

resetExec();
execQueryRows = [
  { id: 1, church_id: 42, record_type: 'baptism', field_config: { fields: ['a', 'b'] }, version: 3, is_active: true },
];
{
  const result = await getFieldConfig(42, 'baptism');
  assertEq(result, { fields: ['a', 'b'] }, 'returns field_config of first row');
  assertEq(execQueryLog.length, 1, 'one query');
  assert(/ocr_field_configurations/.test(execQueryLog[0].sql), 'SQL uses table name');
  assert(/is_active = TRUE/.test(execQueryLog[0].sql), 'filters is_active');
  assert(/version DESC/.test(execQueryLog[0].sql), 'orders by version desc');
  assert(/LIMIT 1/.test(execQueryLog[0].sql), 'limit 1');
  assertEq(execQueryLog[0].params, [42, 'baptism'], 'params');
}

// Empty → null
resetExec();
execQueryRows = [];
{
  const result = await getFieldConfig(42, 'marriage');
  assertEq(result, null, 'no rows → null');
}

// Error propagation
resetExec();
execQueryThrowsOnPattern = /SELECT \* FROM ocr_field_configurations/;
quiet();
{
  let caught: any = null;
  try { await getFieldConfig(42, 'funeral'); } catch (e) { caught = e; }
  loud();
  assert(caught !== null, 'propagates error');
  assert(caught && /fake query error/.test(caught.message), 'error message preserved');
}

// ============================================================================
// saveFieldConfig
// ============================================================================
console.log('\n── saveFieldConfig ───────────────────────────────────────');

// Existing version present → next_version = max+1
resetTxn();
txnScripts = [
  { match: /SELECT COALESCE/, result: [{ next_version: 5 }] },
  { match: /^INSERT INTO/, result: { insertId: 999 } },
];
{
  const request = {
    church_id: 42,
    record_type: 'baptism',
    field_config: { fields: ['x', 'y'] },
    description: 'v5 config',
  };
  const id = await saveFieldConfig(request);
  assertEq(id, 999, 'returns insertId');
  assertEq(txnLog.length, 3, 'three queries in transaction');
  assert(/^UPDATE/.test(txnLog[0].sql.trim()), 'first: deactivate UPDATE');
  assert(/is_active = FALSE/.test(txnLog[0].sql), 'sets is_active = FALSE');
  assertEq(txnLog[0].params, [42, 'baptism'], 'deactivate params');
  assert(/SELECT COALESCE/.test(txnLog[1].sql), 'second: next version SELECT');
  assert(/INSERT INTO/.test(txnLog[2].sql), 'third: INSERT');
  assertEq(txnLog[2].params[0], 42, 'insert church_id');
  assertEq(txnLog[2].params[1], 'baptism', 'insert record_type');
  assertEq(txnLog[2].params[2], JSON.stringify({ fields: ['x', 'y'] }), 'field_config JSON-serialized');
  assertEq(txnLog[2].params[3], 'v5 config', 'description');
  assertEq(txnLog[2].params[4], 5, 'version = 5');
  assertEq(txnCommitted, true, 'transaction committed');
}

// No prior version → next_version = 1
resetTxn();
txnScripts = [
  { match: /SELECT COALESCE/, result: [{ next_version: 1 }] },
  { match: /^INSERT INTO/, result: { insertId: 1 } },
];
{
  const request = {
    church_id: 100,
    record_type: 'marriage',
    field_config: { fields: [] },
    description: 'initial',
  };
  const id = await saveFieldConfig(request);
  assertEq(id, 1, 'first insert id');
  assertEq(txnLog[2].params[4], 1, 'version = 1 for first');
  assertEq(txnCommitted, true, 'committed');
}

// ============================================================================
// getChurchFieldConfigs
// ============================================================================
console.log('\n── getChurchFieldConfigs ─────────────────────────────────');

resetExec();
execQueryRows = [
  { id: 1, church_id: 42, record_type: 'baptism', version: 2 },
  { id: 2, church_id: 42, record_type: 'marriage', version: 1 },
];
{
  const rows = await getChurchFieldConfigs(42);
  assertEq(rows.length, 2, 'returns 2 rows');
  assertEq(rows[0].record_type, 'baptism', 'first row record_type');
  assertEq(execQueryLog.length, 1, 'one query');
  assert(/is_active = TRUE/.test(execQueryLog[0].sql), 'active only');
  assert(/record_type, version DESC/.test(execQueryLog[0].sql), 'orders by record_type,version desc');
  assertEq(execQueryLog[0].params, [42], 'params');
}

// Empty
resetExec();
execQueryRows = [];
{
  const rows = await getChurchFieldConfigs(99);
  assertEq(rows.length, 0, 'empty rows');
}

// ============================================================================
// getFieldConfigHistory
// ============================================================================
console.log('\n── getFieldConfigHistory ─────────────────────────────────');

resetExec();
execQueryRows = [
  { id: 3, version: 3, is_active: true },
  { id: 2, version: 2, is_active: false },
  { id: 1, version: 1, is_active: false },
];
{
  const rows = await getFieldConfigHistory(42, 'baptism');
  assertEq(rows.length, 3, '3 historical rows');
  assertEq(rows[0].version, 3, 'first = latest');
  assertEq(rows[2].version, 1, 'last = oldest');
  assert(/version DESC/.test(execQueryLog[0].sql), 'version desc order');
  assert(!/is_active = TRUE/.test(execQueryLog[0].sql), 'no active filter (history includes inactive)');
  assertEq(execQueryLog[0].params, [42, 'baptism'], 'params');
}

// ============================================================================
// deleteFieldConfig (soft delete)
// ============================================================================
console.log('\n── deleteFieldConfig ─────────────────────────────────────');

resetExec();
{
  await deleteFieldConfig(77);
  assertEq(execQueryLog.length, 1, 'one query');
  assert(/^UPDATE/.test(execQueryLog[0].sql.trim()), 'UPDATE statement');
  assert(/is_active = FALSE/.test(execQueryLog[0].sql), 'sets is_active FALSE');
  assert(/WHERE id = \?/.test(execQueryLog[0].sql), 'where id');
  assertEq(execQueryLog[0].params, [77], 'id param');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
