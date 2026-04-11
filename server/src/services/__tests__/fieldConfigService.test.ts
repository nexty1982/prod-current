#!/usr/bin/env npx tsx
/**
 * Unit tests for services/fieldConfigService.ts (OMD-1005)
 *
 * Covers:
 *   - getFieldConfig          happy path (returns field_config from first row),
 *                              not found (null), error propagation
 *   - saveFieldConfig         deactivates existing, queries next version,
 *                              inserts with version + JSON payload, returns id
 *   - getChurchFieldConfigs   SQL bind, returns rows
 *   - getFieldConfigHistory   SQL bind, returns rows
 *   - deleteFieldConfig       soft delete via UPDATE
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

// ── Stub utils/dbConnections BEFORE requiring SUT ────────────────────────
type Call = { sql: string; params: any[] };
const executeCalls: Call[] = [];
let executeRows: any[] = [];
let executeThrow: Error | null = null;

const connCalls: Call[] = [];
const connResults: any[] = []; // fifo: one result per execute()

const fakeConn = {
  execute: async (sql: string, params: any[] = []) => {
    connCalls.push({ sql, params });
    // Return the next queued result
    const rows = connResults.shift() ?? { rows: [], result: { insertId: 0, affectedRows: 1 } };
    return [rows.rows, rows.result ?? {}] as any;
  },
};

function resetAll() {
  executeCalls.length = 0;
  executeRows = [];
  executeThrow = null;
  connCalls.length = 0;
  connResults.length = 0;
}

const dbConnPath = require.resolve('../../utils/dbConnections');
require.cache[dbConnPath] = {
  id: dbConnPath,
  filename: dbConnPath,
  loaded: true,
  exports: {
    executeRecordsQuery: async (sql: string, params: any[] = []) => {
      executeCalls.push({ sql, params });
      if (executeThrow) throw executeThrow;
      return [executeRows, {}] as any;
    },
    withRecordsTransaction: async (fn: (conn: typeof fakeConn) => Promise<any>) => {
      return fn(fakeConn);
    },
  },
} as any;

const svc = require('../fieldConfigService');
const {
  getFieldConfig,
  saveFieldConfig,
  getChurchFieldConfigs,
  getFieldConfigHistory,
  deleteFieldConfig,
} = svc;

// Silence console
const origError = console.error;
function quiet() { console.error = () => {}; }
function loud() { console.error = origError; }

async function main() {

// ============================================================================
// getFieldConfig
// ============================================================================
console.log('\n── getFieldConfig ────────────────────────────────────────');

// Happy path — returns field_config from row 0
resetAll();
executeRows = [{
  id: 1,
  church_id: 5,
  record_type: 'baptism',
  field_config: { fields: [{ name: 'name', type: 'string' }] },
  is_active: true,
  version: 3,
}];
{
  const r = await getFieldConfig(5, 'baptism' as any);
  assertEq(
    r,
    { fields: [{ name: 'name', type: 'string' }] },
    'returns field_config from first row',
  );
  assertEq(executeCalls.length, 1, '1 query executed');
  assert(
    executeCalls[0].sql.includes('ocr_field_configurations'),
    'query hits ocr_field_configurations',
  );
  assert(
    executeCalls[0].sql.includes('is_active = TRUE'),
    'filters to active',
  );
  assertEq(executeCalls[0].params, [5, 'baptism'], 'params bound');
}

// Not found → null
resetAll();
executeRows = [];
{
  const r = await getFieldConfig(5, 'marriage' as any);
  assertEq(r, null, 'no rows → null');
}

// Error propagation (logs via console.error, then re-throws)
resetAll();
executeThrow = new Error('DB down');
quiet();
{
  let caught: Error | null = null;
  try { await getFieldConfig(5, 'baptism' as any); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 're-throws errors');
  assert(caught !== null && caught.message === 'DB down', 'original error preserved');
}
loud();

// ============================================================================
// saveFieldConfig: first config (version becomes 1)
// ============================================================================
console.log('\n── saveFieldConfig: new config ───────────────────────────');

resetAll();
// Queue: 1st execute() = UPDATE (deactivate) → no rows
//        2nd execute() = SELECT next_version → [{next_version: 1}]
//        3rd execute() = INSERT — SUT destructures `const [result] = ...`
//                                 which takes the FIRST array element.
//                                 mysql2 returns OK packet as the first
//                                 element for INSERT, so we put the
//                                 {insertId} object in the `rows` slot.
connResults.push({ rows: [], result: { affectedRows: 0 } });
connResults.push({ rows: [{ next_version: 1 }], result: {} });
connResults.push({ rows: { insertId: 999 } as any, result: {} });

{
  const req = {
    church_id: 7,
    record_type: 'baptism' as any,
    field_config: { fields: [{ name: 'child_name' }] },
    description: 'Initial setup',
  };
  const id = await saveFieldConfig(req);
  assertEq(id, 999, 'returns insertId from INSERT');
  assertEq(connCalls.length, 3, '3 execute calls (update, select, insert)');

  // 1: UPDATE deactivate
  assert(
    /^UPDATE/i.test(connCalls[0].sql.trim()),
    'first call is UPDATE',
  );
  assert(
    connCalls[0].sql.includes('is_active = FALSE'),
    'UPDATE deactivates existing',
  );
  assertEq(connCalls[0].params, [7, 'baptism'], 'deactivate params');

  // 2: SELECT next_version
  assert(
    /SELECT COALESCE/i.test(connCalls[1].sql),
    'second call is version SELECT',
  );
  assertEq(connCalls[1].params, [7, 'baptism'], 'select params');

  // 3: INSERT
  assert(
    /^INSERT/i.test(connCalls[2].sql.trim()),
    'third call is INSERT',
  );
  assertEq(connCalls[2].params[0], 7, 'church_id param');
  assertEq(connCalls[2].params[1], 'baptism', 'record_type param');
  assertEq(
    connCalls[2].params[2],
    JSON.stringify(req.field_config),
    'field_config serialized',
  );
  assertEq(connCalls[2].params[3], 'Initial setup', 'description');
  assertEq(connCalls[2].params[4], 1, 'version = 1');
}

// ============================================================================
// saveFieldConfig: subsequent version (next_version = 5)
// ============================================================================
console.log('\n── saveFieldConfig: next version ─────────────────────────');

resetAll();
connResults.push({ rows: [], result: { affectedRows: 2 } });
connResults.push({ rows: [{ next_version: 5 }], result: {} });
connResults.push({ rows: { insertId: 1010 } as any, result: {} });

{
  const id = await saveFieldConfig({
    church_id: 10,
    record_type: 'funeral' as any,
    field_config: { fields: [] },
    description: 'Revision',
  });
  assertEq(id, 1010, 'insertId returned');
  assertEq(connCalls[2].params[4], 5, 'version = 5 from COALESCE+1');
}

// ============================================================================
// getChurchFieldConfigs
// ============================================================================
console.log('\n── getChurchFieldConfigs ─────────────────────────────────');

resetAll();
executeRows = [
  { id: 1, church_id: 5, record_type: 'baptism', version: 2 },
  { id: 2, church_id: 5, record_type: 'marriage', version: 1 },
];
{
  const r = await getChurchFieldConfigs(5);
  assertEq(r.length, 2, '2 configs returned');
  assertEq(executeCalls.length, 1, '1 query');
  assert(
    executeCalls[0].sql.includes('is_active = TRUE'),
    'only active configs',
  );
  assertEq(executeCalls[0].params, [5], 'church_id bound');
}

// Empty → []
resetAll();
executeRows = [];
{
  const r = await getChurchFieldConfigs(99);
  assertEq(r, [], 'empty → []');
}

// ============================================================================
// getFieldConfigHistory
// ============================================================================
console.log('\n── getFieldConfigHistory ─────────────────────────────────');

resetAll();
executeRows = [
  { id: 3, version: 3, is_active: true },
  { id: 2, version: 2, is_active: false },
  { id: 1, version: 1, is_active: false },
];
{
  const r = await getFieldConfigHistory(5, 'baptism' as any);
  assertEq(r.length, 3, '3 history rows');
  assert(
    executeCalls[0].sql.includes('ORDER BY version DESC'),
    'ordered by version DESC',
  );
  // NOTE: history includes inactive rows — no is_active filter
  assert(
    !executeCalls[0].sql.includes('is_active = TRUE'),
    'history does NOT filter by is_active',
  );
  assertEq(executeCalls[0].params, [5, 'baptism'], 'both params');
}

// ============================================================================
// deleteFieldConfig
// ============================================================================
console.log('\n── deleteFieldConfig ─────────────────────────────────────');

resetAll();
{
  await deleteFieldConfig(42);
  assertEq(executeCalls.length, 1, '1 query');
  assert(
    /^UPDATE/i.test(executeCalls[0].sql.trim()),
    'UPDATE (soft delete)',
  );
  assert(
    executeCalls[0].sql.includes('is_active = FALSE'),
    'sets is_active = FALSE',
  );
  assertEq(executeCalls[0].params, [42], 'configId bound');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main()

main().catch((e) => {
  loud();
  console.error('Unhandled test error:', e);
  process.exit(1);
});
