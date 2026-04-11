#!/usr/bin/env npx tsx
/**
 * Unit tests for services/omDailyItemHydrator.js (OMD-971)
 *
 * Cross-DB hydration helper. Stubs `../config/db` via require.cache
 * with a fake getOmaiPool() returning a pool that captures SQL/params.
 *
 * Coverage:
 *   - fetchByIds: empty/null/falsy → empty Map
 *   - fetchByIds: dedups, drops falsy, coerces to Number
 *   - fetchByIds: default column set
 *   - fetchByIds: custom columns wrapped in backticks
 *   - fetchByIds: returns Map<id, row> for O(1) lookup
 *   - hydrateRows: empty/null → returns as-is
 *   - hydrateRows: default idField=om_daily_item_id
 *   - hydrateRows: default fieldMap aliases (item_title, item_status, etc.)
 *   - hydrateRows: custom idField + custom fieldMap
 *   - hydrateRows: missing item → null fill for all destAliases
 *   - hydrateRows: preserves original row fields
 *
 * Run: npx tsx server/src/services/__tests__/omDailyItemHydrator.test.ts
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

// ── Stub ../config/db BEFORE requiring SUT ───────────────────────────
type Call = { sql: string; params: any[] };
const calls: Call[] = [];
let nextRows: any[] = [];

const fakePool = {
  query: async (sql: string, params: any[]) => {
    calls.push({ sql, params });
    return [nextRows];
  },
};

function reset(rows: any[] = []) {
  calls.length = 0;
  nextRows = rows;
}

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getOmaiPool: () => fakePool },
} as any;

const { fetchByIds, hydrateRows } = require('../omDailyItemHydrator');

async function main() {

// ============================================================================
// fetchByIds — empty/null
// ============================================================================
console.log('\n── fetchByIds: empty/null inputs ─────────────────────────');

reset();
{
  const m = await fetchByIds([]);
  assert(m instanceof Map, 'returns Map');
  assertEq(m.size, 0, 'empty array → empty Map');
  assertEq(calls.length, 0, 'no DB query');
}

reset();
{
  const m = await fetchByIds(null as any);
  assertEq(m.size, 0, 'null → empty Map');
  assertEq(calls.length, 0, 'no DB query');
}

reset();
{
  const m = await fetchByIds(undefined as any);
  assertEq(m.size, 0, 'undefined → empty Map');
}

// All falsy values filtered → empty
reset();
{
  const m = await fetchByIds([0, null, undefined, false, ''] as any);
  assertEq(m.size, 0, 'all falsy → empty Map');
  assertEq(calls.length, 0, 'no DB query for all-falsy');
}

// ============================================================================
// fetchByIds — dedup + Number coercion
// ============================================================================
console.log('\n── fetchByIds: dedup + coerce ────────────────────────────');

reset([
  { id: 1, title: 'a', status: 'backlog' },
  { id: 2, title: 'b', status: 'in_progress' },
]);
{
  await fetchByIds(['1', 1, '2', 2, 1] as any);
  assertEq(calls.length, 1, 'one query');
  // unique = [1, 2]
  assertEq(calls[0].params, [1, 2], 'params deduped + coerced');
  assert(/IN \(\?,\?\)/.test(calls[0].sql), 'placeholders match unique count');
}

// ============================================================================
// fetchByIds — default columns
// ============================================================================
console.log('\n── fetchByIds: default columns ───────────────────────────');

reset([{ id: 1, title: 'foo' }]);
{
  await fetchByIds([1]);
  const sql = calls[0].sql;
  assert(/SELECT id, title, status, priority, category, task_type/.test(sql), 'default cols include common set');
  assert(/github_issue_number/.test(sql), 'includes github_issue_number');
  assert(/github_branch/.test(sql), 'includes github_branch');
  assert(/branch_type/.test(sql), 'includes branch_type');
  assert(/FROM om_daily_items/.test(sql), 'FROM om_daily_items');
}

// ============================================================================
// fetchByIds — custom columns wrapped in backticks
// ============================================================================
console.log('\n── fetchByIds: custom columns ────────────────────────────');

reset([{ id: 1, title: 'x', priority: 'high' }]);
{
  await fetchByIds([1], ['id', 'title', 'priority']);
  assert(/`id`, `title`, `priority`/.test(calls[0].sql), 'custom cols wrapped in backticks');
}

// ============================================================================
// fetchByIds — Map<id, row>
// ============================================================================
console.log('\n── fetchByIds: Map<id, row> ──────────────────────────────');

reset([
  { id: 10, title: 'ten' },
  { id: 20, title: 'twenty' },
  { id: 30, title: 'thirty' },
]);
{
  const m = await fetchByIds([10, 20, 30]);
  assertEq(m.size, 3, '3 entries');
  assertEq(m.get(10).title, 'ten', 'lookup id=10');
  assertEq(m.get(20).title, 'twenty', 'lookup id=20');
  assertEq(m.get(30).title, 'thirty', 'lookup id=30');
  assertEq(m.get(999), undefined, 'unknown id → undefined');
}

// ============================================================================
// hydrateRows — empty/null
// ============================================================================
console.log('\n── hydrateRows: empty/null ───────────────────────────────');

reset();
{
  const out = await hydrateRows([]);
  assertEq(out, [], 'empty array → empty array');
  assertEq(calls.length, 0, 'no DB query');
}

reset();
{
  const out = await hydrateRows(null as any);
  assertEq(out, null, 'null → null');
  assertEq(calls.length, 0, 'no DB query');
}

// ============================================================================
// hydrateRows — default idField + fieldMap
// ============================================================================
console.log('\n── hydrateRows: defaults ─────────────────────────────────');

reset([
  { id: 5, title: 'Item A', status: 'in_progress', priority: 'high',
    category: 'om-backend', github_issue_number: 42, github_branch: 'feat/foo',
    branch_type: 'feature' },
]);
{
  const rows = [
    { change_set_id: 100, om_daily_item_id: 5, note: 'hello' },
  ];
  const out = await hydrateRows(rows);
  assertEq(out.length, 1, '1 row');
  // Original fields preserved
  assertEq(out[0].change_set_id, 100, 'change_set_id preserved');
  assertEq(out[0].note, 'hello', 'note preserved');
  assertEq(out[0].om_daily_item_id, 5, 'idField preserved');
  // Hydrated fields
  assertEq(out[0].item_title, 'Item A', 'item_title');
  assertEq(out[0].item_status, 'in_progress', 'item_status');
  assertEq(out[0].item_priority, 'high', 'item_priority');
  assertEq(out[0].item_category, 'om-backend', 'item_category');
  assertEq(out[0].github_issue_number, 42, 'github_issue_number');
  assertEq(out[0].item_branch, 'feat/foo', 'item_branch alias');
  assertEq(out[0].branch_type, 'feature', 'branch_type');
}

// ============================================================================
// hydrateRows — missing item → null fill
// ============================================================================
console.log('\n── hydrateRows: missing item null fill ───────────────────');

reset([
  { id: 5, title: 'Found', status: 'done', priority: 'low',
    category: 'docs', github_issue_number: null, github_branch: null,
    branch_type: null },
]);
{
  const rows = [
    { om_daily_item_id: 5, label: 'has item' },
    { om_daily_item_id: 999, label: 'missing item' },
  ];
  const out = await hydrateRows(rows);
  // Found row
  assertEq(out[0].item_title, 'Found', 'found: item_title');
  assertEq(out[0].label, 'has item', 'found: label preserved');
  // Missing row → null fill
  assertEq(out[1].item_title, null, 'missing: item_title null');
  assertEq(out[1].item_status, null, 'missing: item_status null');
  assertEq(out[1].item_priority, null, 'missing: item_priority null');
  assertEq(out[1].item_category, null, 'missing: item_category null');
  assertEq(out[1].github_issue_number, null, 'missing: github_issue_number null');
  assertEq(out[1].item_branch, null, 'missing: item_branch null');
  assertEq(out[1].branch_type, null, 'missing: branch_type null');
  assertEq(out[1].label, 'missing item', 'missing: label preserved');
}

// ============================================================================
// hydrateRows — custom idField + custom fieldMap
// ============================================================================
console.log('\n── hydrateRows: custom idField + fieldMap ────────────────');

reset([
  { id: 7, title: 'Custom', status: 'review' },
]);
{
  const rows = [
    { my_ref: 7, foo: 'bar' },
  ];
  const out = await hydrateRows(rows, {
    idField: 'my_ref',
    fieldMap: {
      title:  'task_name',
      status: 'task_status',
    },
  });
  assertEq(out[0].task_name, 'Custom', 'custom alias task_name');
  assertEq(out[0].task_status, 'review', 'custom alias task_status');
  assertEq(out[0].foo, 'bar', 'preserved foo');
  // Default aliases NOT applied when fieldMap is overridden
  assertEq(out[0].item_title, undefined, 'default item_title NOT set');
}

// hydrateRows filters falsy idField values from query but still returns rows
reset([
  { id: 5, title: 'Five' },
]);
{
  const rows = [
    { om_daily_item_id: 5, n: 1 },
    { om_daily_item_id: null, n: 2 },
    { om_daily_item_id: 0, n: 3 },
  ];
  const out = await hydrateRows(rows);
  assertEq(out.length, 3, 'all 3 rows returned');
  assertEq(out[0].item_title, 'Five', 'row[0] hydrated');
  assertEq(out[1].item_title, null, 'row[1] null id → null fill');
  assertEq(out[2].item_title, null, 'row[2] zero id → null fill');
  // Query should only have run for id=5
  assertEq(calls[0].params, [5], 'falsy ids excluded from query');
}

// ============================================================================
// hydrateRows — undefined item field → null
// ============================================================================
console.log('\n── hydrateRows: undefined → null ─────────────────────────');

reset([
  // Item exists but missing some columns (e.g. custom column subset)
  { id: 8, title: 'Sparse' },
]);
{
  const rows = [{ om_daily_item_id: 8 }];
  const out = await hydrateRows(rows);
  assertEq(out[0].item_title, 'Sparse', 'present field copied');
  assertEq(out[0].item_status, null, 'undefined field → null');
  assertEq(out[0].item_priority, null, 'undefined field → null');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
} // end main

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
