#!/usr/bin/env npx tsx
/**
 * Unit tests for services/fieldConfigService.ts (OMD-1214)
 *
 * Thin service layer over the `ocr_field_configurations` table.
 * Dependencies:
 *   - `../utils/dbConnections` → executeRecordsQuery, withRecordsTransaction
 *   - `../types/ocrTypes`      → TABLE_NAMES constant (compile-time types otherwise)
 *
 * Strategy: stub dbConnections via require.cache under BOTH `.js` and `.ts`
 * paths (whichever tsx resolves to first will hit our stub). Dispatch queries
 * by regex, recording every call for assertions.
 *
 * Coverage:
 *   - getFieldConfig        row found → returns field_config
 *                           no rows   → null
 *                           DB throws → re-throws (after console.error)
 *   - saveFieldConfig       transaction flow: deactivate → version → insert
 *                           returns insertId
 *                           version increment works from existing max
 *   - getChurchFieldConfigs returns all active rows for church
 *   - getFieldConfigHistory returns full history ordered by version DESC
 *   - deleteFieldConfig     issues UPDATE setting is_active = FALSE
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

// ── Call recording ──────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryCalls: QueryCall[] = [];
const txExecCalls: QueryCall[] = [];

// Scriptable responses for executeRecordsQuery (top-level, non-transaction)
let executeRows: any[] = [];
let executeThrows = false;

// Scriptable responses for transaction connection.execute
// Resolved in order: [deactivate UPDATE, version SELECT, INSERT]
let txDeactivateResult: any = { affectedRows: 0 };
let txVersionRows: any[] = [{ next_version: 1 }];
let txInsertResult: any = { insertId: 0 };
let txThrows = false;

function resetState() {
  queryCalls.length = 0;
  txExecCalls.length = 0;
  executeRows = [];
  executeThrows = false;
  txDeactivateResult = { affectedRows: 0 };
  txVersionRows = [{ next_version: 1 }];
  txInsertResult = { insertId: 0 };
  txThrows = false;
}

// ── Fake executeRecordsQuery ────────────────────────────────────────
async function fakeExecuteRecordsQuery(sql: string, params: any[] = []) {
  queryCalls.push({ sql, params });
  if (executeThrows) throw new Error('fake db error');
  // Mysql2 shape: [rows, fields]
  return [executeRows, []];
}

// ── Fake withRecordsTransaction ─────────────────────────────────────
//
// Provides a fake connection whose `execute` returns scripted results
// based on the SQL: UPDATE → deactivate, SELECT → version rows, INSERT
// → result. Wraps the callback in try/catch to mimic rollback semantics.
async function fakeWithRecordsTransaction<T>(
  callback: (conn: any) => Promise<T>
): Promise<T> {
  if (txThrows) throw new Error('transaction open failed');

  const connection = {
    execute: async (sql: string, params: any[] = []) => {
      txExecCalls.push({ sql, params });
      if (/^\s*UPDATE/i.test(sql)) {
        return [txDeactivateResult, []];
      }
      if (/^\s*SELECT/i.test(sql)) {
        return [txVersionRows, []];
      }
      if (/^\s*INSERT/i.test(sql)) {
        return [txInsertResult, []];
      }
      return [[], []];
    },
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
  };

  return await callback(connection);
}

const dbConnectionsStub = {
  executeRecordsQuery: fakeExecuteRecordsQuery,
  withRecordsTransaction: fakeWithRecordsTransaction,
};

// Stub under both possible resolutions (tsx may pick .ts; Node picks .js)
const path = require('path');
const dbConnectionsDir = path.resolve(__dirname, '..', '..', 'utils');
for (const ext of ['.js', '.ts']) {
  const p = path.join(dbConnectionsDir, 'dbConnections' + ext);
  require.cache[p] = {
    id: p,
    filename: p,
    loaded: true,
    exports: dbConnectionsStub,
  } as any;
}

// Silence console.error (SUT logs on getFieldConfig failure)
const origError = console.error;
function quiet() { console.error = () => {}; }
function loud() { console.error = origError; }

// ── Load the SUT ────────────────────────────────────────────────────
const {
  getFieldConfig,
  saveFieldConfig,
  getChurchFieldConfigs,
  getFieldConfigHistory,
  deleteFieldConfig,
} = require('../fieldConfigService');

const TABLE = 'ocr_field_configurations';

async function main() {

// ============================================================================
// getFieldConfig
// ============================================================================
console.log('\n── getFieldConfig: row found ─────────────────────────────');

resetState();
executeRows = [
  { field_config: { fields: [{ name: 'first_name', type: 'text' }] } },
];
{
  const result = await getFieldConfig(46, 'baptism');
  assertEq(queryCalls.length, 1, 'one query issued');
  assert(queryCalls[0].sql.includes(TABLE), 'query targets ocr_field_configurations');
  assert(/WHERE church_id = \?/.test(queryCalls[0].sql), 'WHERE church_id');
  assert(/record_type = \?/.test(queryCalls[0].sql), 'WHERE record_type');
  assert(/is_active = TRUE/.test(queryCalls[0].sql), 'is_active filter');
  assert(/ORDER BY version DESC/.test(queryCalls[0].sql), 'order by version DESC');
  assert(/LIMIT 1/.test(queryCalls[0].sql), 'limit 1');
  assertEq(queryCalls[0].params, [46, 'baptism'], 'params [churchId, recordType]');
  assertEq(
    result,
    { fields: [{ name: 'first_name', type: 'text' }] },
    'returns row.field_config',
  );
}

console.log('\n── getFieldConfig: no rows → null ────────────────────────');

resetState();
executeRows = [];
{
  const result = await getFieldConfig(99, 'marriage');
  assertEq(result, null, 'returns null when no rows');
  assertEq(queryCalls[0].params, [99, 'marriage'], 'params forwarded');
}

console.log('\n── getFieldConfig: db error re-thrown ────────────────────');

resetState();
executeThrows = true;
quiet();
{
  let caught: Error | null = null;
  try {
    await getFieldConfig(1, 'funeral');
  } catch (e: any) {
    caught = e;
  }
  loud();
  assert(caught !== null, 'error re-thrown');
  assert(caught !== null && /fake db error/.test(caught.message), 'error message preserved');
}

// ============================================================================
// saveFieldConfig
// ============================================================================
console.log('\n── saveFieldConfig: happy path, version = 1 ──────────────');

resetState();
txDeactivateResult = { affectedRows: 0 };
txVersionRows = [{ next_version: 1 }];
txInsertResult = { insertId: 501 };
{
  const req = {
    church_id: 46,
    record_type: 'baptism' as const,
    field_config: { fields: [{ name: 'first_name', type: 'text' }] },
    description: 'initial baptism layout',
  };
  const id = await saveFieldConfig(req);

  assertEq(id, 501, 'returns insertId from final insert');
  assertEq(txExecCalls.length, 3, '3 queries inside transaction');

  // 1) Deactivate existing
  assert(/^\s*UPDATE/i.test(txExecCalls[0].sql), '1st: UPDATE');
  assert(txExecCalls[0].sql.includes(TABLE), '1st: correct table');
  assert(/is_active = FALSE/.test(txExecCalls[0].sql), '1st: sets is_active = FALSE');
  assert(/updated_at = CURRENT_TIMESTAMP/.test(txExecCalls[0].sql), '1st: updates timestamp');
  assertEq(txExecCalls[0].params, [46, 'baptism'], '1st params: [church_id, record_type]');

  // 2) Version lookup
  assert(/^\s*SELECT/i.test(txExecCalls[1].sql), '2nd: SELECT');
  assert(/COALESCE\(MAX\(version\), 0\) \+ 1/.test(txExecCalls[1].sql), '2nd: COALESCE+1');
  assert(/as next_version/.test(txExecCalls[1].sql), '2nd: aliased next_version');
  assertEq(txExecCalls[1].params, [46, 'baptism'], '2nd params: [church_id, record_type]');

  // 3) Insert new row
  assert(/^\s*INSERT INTO/i.test(txExecCalls[2].sql), '3rd: INSERT');
  assert(txExecCalls[2].sql.includes(TABLE), '3rd: correct table');
  assert(/is_active/.test(txExecCalls[2].sql), '3rd: includes is_active');
  assertEq(txExecCalls[2].params[0], 46, '3rd param[0]: church_id');
  assertEq(txExecCalls[2].params[1], 'baptism', '3rd param[1]: record_type');
  assertEq(
    txExecCalls[2].params[2],
    JSON.stringify({ fields: [{ name: 'first_name', type: 'text' }] }),
    '3rd param[2]: field_config JSON-serialized',
  );
  assertEq(txExecCalls[2].params[3], 'initial baptism layout', '3rd param[3]: description');
  assertEq(txExecCalls[2].params[4], 1, '3rd param[4]: version from SELECT');
}

console.log('\n── saveFieldConfig: version increments from max ──────────');

resetState();
txVersionRows = [{ next_version: 7 }];
txInsertResult = { insertId: 602 };
{
  const id = await saveFieldConfig({
    church_id: 12,
    record_type: 'marriage' as const,
    field_config: { cols: ['a', 'b'] },
    description: 'v7 update',
  });
  assertEq(id, 602, 'returns insertId');
  assertEq(txExecCalls[2].params[4], 7, 'version uses returned next_version');
  assertEq(txExecCalls[0].params, [12, 'marriage'], 'deactivate uses request church/type');
}

console.log('\n── saveFieldConfig: insertId = 0 still returned ──────────');

resetState();
txInsertResult = { insertId: 0 };
{
  const id = await saveFieldConfig({
    church_id: 1,
    record_type: 'funeral' as const,
    field_config: {},
    description: 'empty',
  });
  assertEq(id, 0, 'zero insertId passed through');
}

// ============================================================================
// getChurchFieldConfigs
// ============================================================================
console.log('\n── getChurchFieldConfigs ─────────────────────────────────');

resetState();
executeRows = [
  { id: 1, church_id: 46, record_type: 'baptism', version: 3, is_active: true },
  { id: 2, church_id: 46, record_type: 'marriage', version: 2, is_active: true },
  { id: 3, church_id: 46, record_type: 'funeral', version: 1, is_active: true },
];
{
  const rows = await getChurchFieldConfigs(46);
  assertEq(queryCalls.length, 1, 'one query');
  assert(queryCalls[0].sql.includes(TABLE), 'targets ocr_field_configurations');
  assert(/WHERE church_id = \?/.test(queryCalls[0].sql), 'WHERE church_id');
  assert(/is_active = TRUE/.test(queryCalls[0].sql), 'filters active only');
  assert(/ORDER BY record_type, version DESC/.test(queryCalls[0].sql), 'sort order');
  assertEq(queryCalls[0].params, [46], 'params [churchId]');
  assertEq(rows.length, 3, 'returns all rows');
  assertEq((rows as any[])[0].record_type, 'baptism', '1st row record_type');
}

resetState();
executeRows = [];
{
  const rows = await getChurchFieldConfigs(999);
  assertEq(rows.length, 0, 'empty result returned verbatim');
  assertEq(queryCalls[0].params, [999], 'params forwarded');
}

// ============================================================================
// getFieldConfigHistory
// ============================================================================
console.log('\n── getFieldConfigHistory ─────────────────────────────────');

resetState();
executeRows = [
  { id: 10, version: 3, is_active: true },
  { id: 9, version: 2, is_active: false },
  { id: 8, version: 1, is_active: false },
];
{
  const rows = await getFieldConfigHistory(46, 'baptism');
  assertEq(queryCalls.length, 1, 'one query');
  assert(queryCalls[0].sql.includes(TABLE), 'targets table');
  assert(/WHERE church_id = \?/.test(queryCalls[0].sql), 'WHERE church_id');
  assert(/record_type = \?/.test(queryCalls[0].sql), 'record_type filter');
  assert(!/is_active\s*=\s*TRUE/i.test(queryCalls[0].sql), 'does NOT filter is_active (full history)');
  assert(/ORDER BY version DESC/.test(queryCalls[0].sql), 'sorted version DESC');
  assertEq(queryCalls[0].params, [46, 'baptism'], 'params [churchId, recordType]');
  assertEq(rows.length, 3, 'all 3 versions returned');
  assertEq((rows as any[])[0].version, 3, 'first row highest version');
  assertEq((rows as any[])[2].version, 1, 'last row lowest version');
}

// ============================================================================
// deleteFieldConfig
// ============================================================================
console.log('\n── deleteFieldConfig ─────────────────────────────────────');

resetState();
{
  const result = await deleteFieldConfig(123);
  assertEq(result, undefined, 'returns void');
  assertEq(queryCalls.length, 1, 'one query');
  assert(/^\s*UPDATE/i.test(queryCalls[0].sql), 'UPDATE query');
  assert(queryCalls[0].sql.includes(TABLE), 'targets table');
  assert(/is_active = FALSE/.test(queryCalls[0].sql), 'sets is_active = FALSE');
  assert(/updated_at = CURRENT_TIMESTAMP/.test(queryCalls[0].sql), 'bumps updated_at');
  assert(/WHERE id = \?/.test(queryCalls[0].sql), 'WHERE id');
  assertEq(queryCalls[0].params, [123], 'params [configId]');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
