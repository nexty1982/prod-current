#!/usr/bin/env npx tsx
/**
 * Unit tests for services/orthodoxScheduleGuidelinesService.js (OMD-970)
 *
 * Pure DB read service. Stubs `../config/db-compat` via require.cache
 * with a fake pool that records the SQL/params and returns canned rows.
 *
 * Coverage:
 *   - getGuidelines selects church-aware SQL when churchId provided
 *   - getGuidelines selects global-only SQL when churchId is 0/null
 *   - hasData=false when DB returns empty
 *   - Merge: church-specific row overrides global with same composite key
 *   - Merge: rows with different keys both kept
 *   - Re-sort after merge: sort_order → start_date → id
 *
 * Run: npx tsx server/src/services/__tests__/orthodoxScheduleGuidelinesService.test.ts
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

// ── Stub ../config/db-compat BEFORE requiring SUT ────────────────────
type Call = { sql: string; params: any[] };
const calls: Call[] = [];
let nextRows: any[] = [];

const fakePool = {
  query: async (sql: string, params: any[]) => {
    calls.push({ sql, params });
    return [nextRows];
  },
};

function reset(rows: any[]) {
  calls.length = 0;
  nextRows = rows;
}

const dbCompatPath = require.resolve('../../config/db-compat');
require.cache[dbCompatPath] = {
  id: dbCompatPath,
  filename: dbCompatPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

const { getGuidelines } = require('../orthodoxScheduleGuidelinesService');

async function main() {

// ============================================================================
// Empty result
// ============================================================================
console.log('\n── empty result ──────────────────────────────────────────');

reset([]);
{
  const result = await getGuidelines({ churchId: 1, year: 2026, calendarType: 'new' });
  assertEq(result.rows, [], 'empty rows');
  assertEq(result.hasData, false, 'hasData=false');
}

// ============================================================================
// SQL selection: with churchId
// ============================================================================
console.log('\n── SQL selection: with churchId ──────────────────────────');

reset([]);
{
  await getGuidelines({ churchId: 42, year: 2026, calendarType: 'new' });
  assertEq(calls.length, 1, 'one query');
  assert(/church_id = \?/.test(calls[0].sql), 'church-aware SQL includes "church_id = ?"');
  assert(/church_id IS NULL/.test(calls[0].sql), 'still allows NULL (global)');
  assertEq(calls[0].params, [2026, 'new', 42], 'params: year, type, churchId');
  assert(/is_active\s+= 1/.test(calls[0].sql), 'is_active filter');
  assert(/ORDER BY sort_order ASC/.test(calls[0].sql), 'ORDER BY sort_order');
}

// ============================================================================
// SQL selection: global-only (churchId=0/null)
// ============================================================================
console.log('\n── SQL selection: global only ────────────────────────────');

reset([]);
{
  await getGuidelines({ churchId: 0, year: 2026, calendarType: 'old' });
  assertEq(calls.length, 1, 'one query');
  assert(!/church_id = \?/.test(calls[0].sql), 'no "church_id = ?" placeholder');
  assert(/church_id IS NULL/.test(calls[0].sql), 'global-only SQL has church_id IS NULL');
  assertEq(calls[0].params, [2026, 'old'], 'params: year, type only');
}

reset([]);
{
  await getGuidelines({ churchId: null, year: 2027, calendarType: 'new' });
  assertEq(calls[0].params, [2027, 'new'], 'null churchId → global-only');
}

// ============================================================================
// Merge: church-specific overrides global
// ============================================================================
console.log('\n── merge: church overrides global ────────────────────────');

reset([
  // Same composite key, global comes first
  { id: 1, church_id: null, guideline_year: 2026, calendar_type: 'new',
    event_key: 'pascha', start_date: '2026-04-19', end_date: '2026-04-19',
    sort_order: 10, label: 'Pascha (Global)' },
  { id: 2, church_id: 42, guideline_year: 2026, calendar_type: 'new',
    event_key: 'pascha', start_date: '2026-04-19', end_date: '2026-04-19',
    sort_order: 10, label: 'Pascha (Church)' },
]);
{
  const result = await getGuidelines({ churchId: 42, year: 2026, calendarType: 'new' });
  assertEq(result.rows.length, 1, 'merged to 1 row');
  assertEq(result.rows[0].label, 'Pascha (Church)', 'church row wins');
  assertEq(result.rows[0].id, 2, 'church row id=2');
  assertEq(result.hasData, true, 'hasData=true');
}

// Reverse order: church-specific first, then global → still church wins
reset([
  { id: 5, church_id: 42, guideline_year: 2026, calendar_type: 'new',
    event_key: 'pascha', start_date: '2026-04-19', end_date: '2026-04-19',
    sort_order: 10, label: 'Pascha (Church)' },
  { id: 6, church_id: null, guideline_year: 2026, calendar_type: 'new',
    event_key: 'pascha', start_date: '2026-04-19', end_date: '2026-04-19',
    sort_order: 10, label: 'Pascha (Global)' },
]);
{
  const result = await getGuidelines({ churchId: 42, year: 2026, calendarType: 'new' });
  assertEq(result.rows.length, 1, 'merged to 1 row');
  assertEq(result.rows[0].label, 'Pascha (Church)', 'church row still wins (kept first)');
}

// ============================================================================
// Merge: different keys both kept
// ============================================================================
console.log('\n── merge: different keys kept ────────────────────────────');

reset([
  { id: 1, church_id: null, guideline_year: 2026, calendar_type: 'new',
    event_key: 'pascha', start_date: '2026-04-19', end_date: '2026-04-19',
    sort_order: 10, label: 'Pascha' },
  { id: 2, church_id: null, guideline_year: 2026, calendar_type: 'new',
    event_key: 'nativity', start_date: '2026-12-25', end_date: '2026-12-25',
    sort_order: 20, label: 'Nativity' },
  { id: 3, church_id: null, guideline_year: 2026, calendar_type: 'new',
    event_key: 'theophany', start_date: '2026-01-06', end_date: '2026-01-06',
    sort_order: 5, label: 'Theophany' },
]);
{
  const result = await getGuidelines({ churchId: 0, year: 2026, calendarType: 'new' });
  assertEq(result.rows.length, 3, 'all 3 different keys kept');
}

// ============================================================================
// Re-sort after merge: sort_order → start_date → id
// ============================================================================
console.log('\n── re-sort after merge ───────────────────────────────────');

reset([
  // Insertion order intentionally scrambled
  { id: 10, church_id: null, guideline_year: 2026, calendar_type: 'new',
    event_key: 'b', start_date: '2026-06-01', end_date: '2026-06-01',
    sort_order: 20, label: 'B' },
  { id: 5, church_id: null, guideline_year: 2026, calendar_type: 'new',
    event_key: 'a', start_date: '2026-01-01', end_date: '2026-01-01',
    sort_order: 10, label: 'A1' },
  { id: 7, church_id: null, guideline_year: 2026, calendar_type: 'new',
    event_key: 'c', start_date: '2026-01-15', end_date: '2026-01-15',
    sort_order: 10, label: 'A2' },
]);
{
  const result = await getGuidelines({ churchId: 0, year: 2026, calendarType: 'new' });
  assertEq(result.rows.length, 3, '3 rows');
  // sort_order 10 < 20, so A1/A2 first; A1 has earlier start_date
  assertEq(result.rows[0].label, 'A1', 'sort_order=10, earliest start_date first');
  assertEq(result.rows[1].label, 'A2', 'sort_order=10, later start_date second');
  assertEq(result.rows[2].label, 'B', 'sort_order=20 last');
}

// Tie-break on id when sort_order and start_date equal
reset([
  { id: 99, church_id: null, guideline_year: 2026, calendar_type: 'new',
    event_key: 'x', start_date: '2026-03-01', end_date: '2026-03-01',
    sort_order: 5, label: 'X99' },
  { id: 1, church_id: null, guideline_year: 2026, calendar_type: 'new',
    event_key: 'y', start_date: '2026-03-01', end_date: '2026-03-01',
    sort_order: 5, label: 'Y1' },
]);
{
  const result = await getGuidelines({ churchId: 0, year: 2026, calendarType: 'new' });
  assertEq(result.rows[0].label, 'Y1', 'lower id wins on full tie');
  assertEq(result.rows[1].label, 'X99', 'higher id second');
}

// ============================================================================
// Composite key includes year, calendar_type, event_key, start_date, end_date
// ============================================================================
console.log('\n── composite key sensitivity ─────────────────────────────');

reset([
  // Same event but different end_date → different keys, both kept
  { id: 1, church_id: null, guideline_year: 2026, calendar_type: 'new',
    event_key: 'lent', start_date: '2026-03-01', end_date: '2026-03-15',
    sort_order: 10, label: 'Lent A' },
  { id: 2, church_id: null, guideline_year: 2026, calendar_type: 'new',
    event_key: 'lent', start_date: '2026-03-01', end_date: '2026-03-31',
    sort_order: 10, label: 'Lent B' },
]);
{
  const result = await getGuidelines({ churchId: 0, year: 2026, calendarType: 'new' });
  assertEq(result.rows.length, 2, 'different end_date → different keys');
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
