#!/usr/bin/env npx tsx
/**
 * Unit tests for the main writeSacramentHistory function (OMD-951)
 *
 * The pure helpers in this module (normalizeValue, valuesEqual, computeDiff,
 * safeJsonStringify, generateRequestId) are already covered by
 * writeSacramentHistory.test.ts (OMD-883). This file fills the gap by
 * testing the main writeSacramentHistory function — its SQL building,
 * parameter binding, JSON encoding, diff computation, and error handling.
 *
 * Strategy: stub `./dbSwitcher` via require.cache BEFORE requiring the SUT.
 *
 * Coverage:
 *   - SQL is parameterized INSERT into the named history table
 *   - All 10 SQL parameters bound in correct order
 *   - record_data JSON includes before/after/meta sub-objects
 *   - meta.source, meta.actor_user_id, meta.request_id, meta.ip_address
 *   - diff_data JSON includes changed_fields + patch
 *   - works for baptism_history, marriage_history, funeral_history
 *   - create (before=null), delete (after=null), update, no-op (both null)
 *   - meta coalesces empty string requestId/ipAddress to null
 *     while raw SQL params still receive the empty string
 *   - DB error swallowed (history failure must not break main op)
 *
 * Run from server/: npx tsx src/utils/__tests__/writeSacramentHistoryFn.test.ts
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

// ── dbSwitcher stub ──────────────────────────────────────────────────
type Call = { sql: string; params: any[] };
const queries: Call[] = [];
let queryThrows = false;

function resetDb() {
  queries.length = 0;
  queryThrows = false;
}

const fakePool = {
  query: async (sql: string, params: any[]) => {
    queries.push({ sql, params });
    if (queryThrows) throw new Error('insert failed');
    return [{ insertId: 1 }];
  },
};

const dbSwitcherStub = {
  getChurchDbConnection: async (_databaseName: string) => fakePool,
};

const dbSwitcherPath = require.resolve('../dbSwitcher');
require.cache[dbSwitcherPath] = {
  id: dbSwitcherPath,
  filename: dbSwitcherPath,
  loaded: true,
  exports: dbSwitcherStub,
} as any;

const { writeSacramentHistory } = require('../writeSacramentHistory');

// Silence module's own console output
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

async function main() {

// ============================================================================
// SQL structure + parameter order
// ============================================================================
console.log('\n── writeSacramentHistory: SQL structure ──────────────────');

resetDb();
quiet();
await writeSacramentHistory({
  historyTableName: 'baptism_history',
  churchId: 46,
  recordId: 100,
  type: 'update',
  description: 'Updated baptism record',
  before: { name: 'Old', priest: 'Fr. A' },
  after:  { name: 'New', priest: 'Fr. A' },
  actorUserId: 5,
  source: 'api',
  requestId: 'req-abc',
  ipAddress: '10.0.0.1',
  databaseName: 'om_church_46',
});
loud();

{
  assertEq(queries.length, 1, '1 SQL query executed');
  const q = queries[0];
  assert(q.sql.includes('INSERT INTO baptism_history'), 'inserts into baptism_history');
  assert(
    q.sql.includes('(type, description, timestamp, record_id, record_data, church_id, actor_user_id, source, request_id, ip_address, diff_data)'),
    'column list correct'
  );
  assert(q.sql.includes('VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)'), 'parameterized VALUES');
  assertEq(q.params.length, 10, '10 SQL parameters');

  // Param order: [type, description, recordId, recordDataJson, churchId,
  //               actorUserId, source, requestId, ipAddress, diffDataJson]
  assertEq(q.params[0], 'update', 'param 0: type');
  assertEq(q.params[1], 'Updated baptism record', 'param 1: description');
  assertEq(q.params[2], 100, 'param 2: recordId');
  assert(typeof q.params[3] === 'string', 'param 3: recordData is JSON string');
  assertEq(q.params[4], 46, 'param 4: churchId');
  assertEq(q.params[5], 5, 'param 5: actorUserId');
  assertEq(q.params[6], 'api', 'param 6: source');
  assertEq(q.params[7], 'req-abc', 'param 7: requestId');
  assertEq(q.params[8], '10.0.0.1', 'param 8: ipAddress');
  assert(typeof q.params[9] === 'string', 'param 9: diffData is JSON string');
}

// ============================================================================
// record_data JSON content
// ============================================================================
console.log('\n── record_data JSON ──────────────────────────────────────');

{
  const recordData = JSON.parse(queries[0].params[3]);
  assertEq(recordData.before, { name: 'Old', priest: 'Fr. A' }, 'recordData.before');
  assertEq(recordData.after, { name: 'New', priest: 'Fr. A' }, 'recordData.after');
  assert(typeof recordData.meta === 'object', 'recordData.meta exists');
  assertEq(recordData.meta.source, 'api', 'meta.source');
  assertEq(recordData.meta.request_id, 'req-abc', 'meta.request_id');
  assertEq(recordData.meta.actor_user_id, 5, 'meta.actor_user_id');
  assertEq(recordData.meta.ip_address, '10.0.0.1', 'meta.ip_address');
}

// ============================================================================
// diff_data JSON content
// ============================================================================
console.log('\n── diff_data JSON ────────────────────────────────────────');

{
  const diffData = JSON.parse(queries[0].params[9]);
  assertEq(diffData.changed_fields, ['name'], 'diff: only name changed');
  assert(typeof diffData.patch === 'object', 'diff.patch exists');
  assertEq(diffData.patch.name, { before: 'Old', after: 'New' }, 'diff: name patch');
  assert(!('priest' in diffData.patch), 'unchanged priest not in patch');
}

// ============================================================================
// Different table — marriage_history (create)
// ============================================================================
console.log('\n── marriage_history (create) ─────────────────────────────');

resetDb();
quiet();
await writeSacramentHistory({
  historyTableName: 'marriage_history',
  churchId: 1,
  recordId: 7,
  type: 'create',
  description: 'New marriage',
  before: null,
  after: { groom: 'Bob', bride: 'Sue' },
  actorUserId: null,
  source: 'ui',
  requestId: null,
  ipAddress: null,
  databaseName: 'om_church_1',
});
loud();
{
  assert(queries[0].sql.includes('INSERT INTO marriage_history'), 'marriage_history table');
  assertEq(queries[0].params[0], 'create', 'create type');
  assertEq(queries[0].params[5], null, 'null actorUserId passed');
  assertEq(queries[0].params[7], null, 'null requestId passed');
  assertEq(queries[0].params[8], null, 'null ipAddress passed');

  const recordData = JSON.parse(queries[0].params[3]);
  assertEq(recordData.before, null, 'create: before null');
  assertEq(recordData.after, { groom: 'Bob', bride: 'Sue' }, 'create: after preserved');

  const diffData = JSON.parse(queries[0].params[9]);
  assertEq(diffData.changed_fields.sort(), ['bride', 'groom'], 'create: all fields in diff');
  assertEq(diffData.patch.groom, { before: null, after: 'Bob' }, 'create: groom from null');
  assertEq(diffData.patch.bride, { before: null, after: 'Sue' }, 'create: bride from null');
}

// ============================================================================
// funeral_history (delete)
// ============================================================================
console.log('\n── funeral_history (delete) ──────────────────────────────');

resetDb();
quiet();
await writeSacramentHistory({
  historyTableName: 'funeral_history',
  churchId: 2,
  recordId: 99,
  type: 'delete',
  description: 'Deleted funeral',
  before: { name: 'X', date: '2026-01-01' },
  after: null,
  actorUserId: 1,
  source: 'system',
  requestId: 'req-d',
  ipAddress: '127.0.0.1',
  databaseName: 'om_church_2',
});
loud();
{
  assert(queries[0].sql.includes('INSERT INTO funeral_history'), 'funeral_history table');
  assertEq(queries[0].params[0], 'delete', 'delete type');

  const recordData = JSON.parse(queries[0].params[3]);
  assertEq(recordData.before, { name: 'X', date: '2026-01-01' }, 'delete: before preserved');
  assertEq(recordData.after, null, 'delete: after null');

  const diffData = JSON.parse(queries[0].params[9]);
  assertEq(diffData.changed_fields.sort(), ['date', 'name'], 'delete: all fields in diff');
  assertEq(diffData.patch.name, { before: 'X', after: null }, 'delete: name patch to null');
}

// ============================================================================
// No-op: both before and after null
// ============================================================================
console.log('\n── no-op (both null) ─────────────────────────────────────');

resetDb();
quiet();
await writeSacramentHistory({
  historyTableName: 'baptism_history',
  churchId: 1,
  recordId: 1,
  type: 'restore',
  description: 'No-op',
  before: null,
  after: null,
  actorUserId: null,
  source: 'system',
  requestId: null,
  ipAddress: null,
  databaseName: 'om_church_1',
});
loud();
{
  assertEq(queries.length, 1, 'still inserts (no-op recorded)');
  assertEq(queries[0].params[0], 'restore', 'restore type');

  const recordData = JSON.parse(queries[0].params[3]);
  assertEq(recordData.before, null, 'before null');
  assertEq(recordData.after, null, 'after null');

  const diffData = JSON.parse(queries[0].params[9]);
  assertEq(diffData.changed_fields, [], 'no changes');
  assertEq(diffData.patch, {}, 'empty patch');
}

// ============================================================================
// Empty string requestId/ipAddress: meta coalesces to null,
// SQL params get the raw empty string
// ============================================================================
console.log('\n── empty-string coalescing ───────────────────────────────');

resetDb();
quiet();
await writeSacramentHistory({
  historyTableName: 'baptism_history',
  churchId: 1,
  recordId: 1,
  type: 'update',
  description: 'd',
  before: { a: 1 },
  after: { a: 2 },
  actorUserId: 3,
  source: 'import',
  requestId: '',  // empty string
  ipAddress: '',  // empty string
  databaseName: 'om_church_1',
});
loud();
{
  // Empty strings are falsy → `requestId || null` → null in meta
  const recordData = JSON.parse(queries[0].params[3]);
  assertEq(recordData.meta.request_id, null, 'meta: empty requestId → null');
  assertEq(recordData.meta.ip_address, null, 'meta: empty ipAddress → null');
  // But the raw SQL params receive the empty string (no || coalesce there)
  assertEq(queries[0].params[7], '', 'SQL param 7: raw empty string');
  assertEq(queries[0].params[8], '', 'SQL param 8: raw empty string');
}

// ============================================================================
// All event types pass through
// ============================================================================
console.log('\n── event types ───────────────────────────────────────────');

const eventTypes: Array<'create' | 'update' | 'delete' | 'import' | 'ocr' | 'merge' | 'restore'> =
  ['create', 'update', 'delete', 'import', 'ocr', 'merge', 'restore'];

for (const type of eventTypes) {
  resetDb();
  quiet();
  await writeSacramentHistory({
    historyTableName: 'baptism_history',
    churchId: 1,
    recordId: 1,
    type,
    description: `${type} test`,
    before: { a: 1 },
    after: { a: 2 },
    actorUserId: 1,
    source: 'api',
    requestId: 'r',
    ipAddress: '1.1.1.1',
    databaseName: 'om_church_1',
  });
  loud();
  assertEq(queries[0].params[0], type, `type=${type} passed through`);
}

// ============================================================================
// All source types pass through (via meta)
// ============================================================================
console.log('\n── source types ──────────────────────────────────────────');

const sources: Array<'ui' | 'api' | 'import' | 'ocr' | 'system'> =
  ['ui', 'api', 'import', 'ocr', 'system'];

for (const source of sources) {
  resetDb();
  quiet();
  await writeSacramentHistory({
    historyTableName: 'baptism_history',
    churchId: 1,
    recordId: 1,
    type: 'update',
    description: 'd',
    before: { a: 1 },
    after: { a: 2 },
    actorUserId: 1,
    source,
    requestId: 'r',
    ipAddress: '1.1.1.1',
    databaseName: 'om_church_1',
  });
  loud();
  assertEq(queries[0].params[6], source, `source=${source} in SQL`);
  const recordData = JSON.parse(queries[0].params[3]);
  assertEq(recordData.meta.source, source, `source=${source} in meta`);
}

// ============================================================================
// Error swallowing — DB throw must not propagate
// ============================================================================
console.log('\n── error swallowing ──────────────────────────────────────');

resetDb();
queryThrows = true;
quiet();
let threw = false;
try {
  await writeSacramentHistory({
    historyTableName: 'baptism_history',
    churchId: 1,
    recordId: 1,
    type: 'update',
    description: 'd',
    before: { a: 1 },
    after: { a: 2 },
    actorUserId: null,
    source: 'api',
    requestId: null,
    ipAddress: null,
    databaseName: 'om_church_1',
  });
} catch (e) {
  threw = true;
}
loud();
assertEq(threw, false, 'DB error swallowed (history failure must not break op)');
assertEq(queries.length, 1, 'query was attempted before throwing');
queryThrows = false;

// ============================================================================
// Diff data uses safeJsonStringify (date in before/after handled)
// ============================================================================
console.log('\n── date serialization in diff ────────────────────────────');

resetDb();
quiet();
await writeSacramentHistory({
  historyTableName: 'baptism_history',
  churchId: 1,
  recordId: 1,
  type: 'update',
  description: 'd',
  before: { date: new Date('2026-01-01T00:00:00.000Z') } as any,
  after:  { date: new Date('2026-02-01T00:00:00.000Z') } as any,
  actorUserId: null,
  source: 'api',
  requestId: null,
  ipAddress: null,
  databaseName: 'om_church_1',
});
loud();
{
  // safeJsonStringify converts Date to ISO string
  const recordData = JSON.parse(queries[0].params[3]);
  assertEq(recordData.before.date, '2026-01-01T00:00:00.000Z', 'before date → ISO');
  assertEq(recordData.after.date, '2026-02-01T00:00:00.000Z', 'after date → ISO');

  const diffData = JSON.parse(queries[0].params[9]);
  assertEq(diffData.changed_fields, ['date'], 'date diff detected');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main()

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
