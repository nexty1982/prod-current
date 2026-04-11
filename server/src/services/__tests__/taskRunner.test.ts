#!/usr/bin/env npx tsx
/**
 * Unit tests for services/taskRunner.js (OMD-976)
 *
 * Pool-as-parameter helpers — pass a fake pool directly. The
 * `../config/db` getAppPool() fallback is exercised by passing
 * undefined explicitly; we stub that path too.
 *
 * Coverage:
 *   - createTask: INSERT shape, defaults (source_feature=null, total_count=0,
 *     metadata_json stringified), returns insertId, getAppPool fallback
 *   - updateTask: only whitelisted fields included
 *   - updateTask: *_json fields stringified when object
 *   - updateTask: status='running' adds COALESCE started_at
 *   - updateTask: terminal status adds COALESCE finished_at
 *   - updateTask: last_heartbeat always set
 *   - updateTask: empty updates → no query
 *   - addTaskEvent: INSERT shape, default level='info', detail_json stringified
 *   - isCancelled: returns true when cancel_requested_at set, false otherwise,
 *     false when row not found
 *   - findActiveTaskByScope: SELECT shape (queued/running, ORDER BY created_at)
 *   - findActiveTaskByScope: parses string metadata_json, skips invalid
 *   - findActiveTaskByScope: normalize null/undefined/'' to null
 *   - findActiveTaskByScope: returns first matching row, null when no match
 *
 * Run: npx tsx server/src/services/__tests__/taskRunner.test.ts
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

// ── Stub ../config/db getAppPool() to track fallback usage ───────────
type Call = { sql: string; params: any[] };
const fallbackPoolCalls: Call[] = [];
let fallbackInsertId = 999;
let fallbackSelectRows: any[] = [];

const fallbackPool = {
  query: async (sql: string, params: any[] = []) => {
    fallbackPoolCalls.push({ sql, params });
    if (/^\s*INSERT/i.test(sql)) return [{ insertId: fallbackInsertId, affectedRows: 1 }];
    if (/^\s*SELECT/i.test(sql)) return [fallbackSelectRows];
    return [{ affectedRows: 1 }];
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fallbackPool },
} as any;

const {
  createTask, updateTask, addTaskEvent, isCancelled, findActiveTaskByScope,
} = require('../taskRunner');

// ── Helper: build a fake pool that records calls and returns canned values ──
function makePool(opts: { selectRows?: any[][]; insertId?: number } = {}) {
  const calls: Call[] = [];
  const selectRows = opts.selectRows || [];
  let selectIdx = 0;
  const pool = {
    query: async (sql: string, params: any[] = []) => {
      calls.push({ sql, params });
      if (/^\s*INSERT/i.test(sql)) return [{ insertId: opts.insertId ?? 42, affectedRows: 1 }];
      if (/^\s*SELECT/i.test(sql)) {
        const rows = selectRows[selectIdx++] || [];
        return [rows];
      }
      return [{ affectedRows: 1 }];
    },
  };
  return { pool, calls };
}

async function main() {

// ============================================================================
// createTask: defaults + INSERT shape
// ============================================================================
console.log('\n── createTask: defaults + shape ──────────────────────────');

{
  const { pool, calls } = makePool({ insertId: 7 });
  const id = await createTask(pool, { task_type: 'enrichment', title: 'Test' });
  assertEq(id, 7, 'returns insertId');
  assertEq(calls.length, 1, 'one INSERT');
  assert(/INSERT INTO omai_tasks/.test(calls[0].sql), 'INTO omai_tasks');
  assert(/'queued'/.test(calls[0].sql), "status defaults to 'queued'");
  assert(/UTC_TIMESTAMP\(\)/.test(calls[0].sql), 'created_at = UTC_TIMESTAMP()');
  // Params: type, source_feature(null), title, created_by(null),
  //         created_by_name(null), total_count(0), metadata_json(null)
  assertEq(calls[0].params, ['enrichment', null, 'Test', null, null, 0, null], 'default params');
}

// createTask with full opts
{
  const { pool, calls } = makePool({ insertId: 100 });
  const id = await createTask(pool, {
    task_type: 'enrichment_batch',
    source_feature: 'church-enrichment',
    title: 'Batch X',
    created_by: 5,
    created_by_name: 'svc',
    total_count: 50,
    metadata_json: { church_id: 42, region: 'us' },
  });
  assertEq(id, 100, 'returns insertId');
  const params = calls[0].params;
  assertEq(params[0], 'enrichment_batch', 'task_type');
  assertEq(params[1], 'church-enrichment', 'source_feature');
  assertEq(params[2], 'Batch X', 'title');
  assertEq(params[3], 5, 'created_by');
  assertEq(params[4], 'svc', 'created_by_name');
  assertEq(params[5], 50, 'total_count');
  assertEq(JSON.parse(params[6]), { church_id: 42, region: 'us' }, 'metadata_json stringified');
}

// createTask: getAppPool fallback when pool=undefined
fallbackPoolCalls.length = 0;
fallbackInsertId = 555;
{
  const id = await createTask(undefined as any, { task_type: 'sync', title: 'fb' });
  assertEq(id, 555, 'used fallback pool insertId');
  assertEq(fallbackPoolCalls.length, 1, 'fallback pool received query');
}

// ============================================================================
// updateTask: whitelisted fields + JSON
// ============================================================================
console.log('\n── updateTask: whitelisted + JSON ────────────────────────');

{
  const { pool, calls } = makePool();
  await updateTask(pool, 10, {
    stage: 'fetching',
    completed_count: 5,
    bogus_field: 'ignored',
    metadata_json: { foo: 1 },
    result_json: 'plain string',
  });
  assertEq(calls.length, 1, 'one UPDATE');
  const sql = calls[0].sql;
  assert(/UPDATE omai_tasks SET/.test(sql), 'UPDATE omai_tasks SET');
  assert(/stage = \?/.test(sql), 'stage included');
  assert(/completed_count = \?/.test(sql), 'completed_count included');
  assert(/metadata_json = \?/.test(sql), 'metadata_json included');
  assert(/result_json = \?/.test(sql), 'result_json included');
  assert(!/bogus_field/.test(sql), 'bogus field rejected');
  assert(/last_heartbeat = UTC_TIMESTAMP/.test(sql), 'last_heartbeat always set');
  assert(/WHERE id = \?$/.test(sql), 'WHERE id = ? at end');

  // Params: stage, completed_count, metadata_json (stringified),
  //         result_json (NOT stringified — already string), id
  const params = calls[0].params;
  assertEq(params[0], 'fetching', 'stage param');
  assertEq(params[1], 5, 'completed_count param');
  assertEq(JSON.parse(params[2]), { foo: 1 }, 'metadata_json stringified');
  assertEq(params[3], 'plain string', 'result_json NOT stringified (was already string)');
  assertEq(params[4], 10, 'id last');
}

// ============================================================================
// updateTask: status='running' adds started_at
// ============================================================================
console.log('\n── updateTask: status timestamps ─────────────────────────');

{
  const { pool, calls } = makePool();
  await updateTask(pool, 11, { status: 'running' });
  assert(/started_at = COALESCE\(started_at, UTC_TIMESTAMP/.test(calls[0].sql), 'started_at COALESCE');
  assert(!/finished_at/.test(calls[0].sql), 'no finished_at on running');
}

// status='succeeded' adds finished_at
{
  const { pool, calls } = makePool();
  await updateTask(pool, 12, { status: 'succeeded' });
  assert(/finished_at = COALESCE\(finished_at, UTC_TIMESTAMP/.test(calls[0].sql), 'finished_at COALESCE');
  assert(!/started_at/.test(calls[0].sql), 'no started_at on succeeded');
}

{
  const { pool, calls } = makePool();
  await updateTask(pool, 13, { status: 'failed' });
  assert(/finished_at = COALESCE/.test(calls[0].sql), 'failed → finished_at');
}

{
  const { pool, calls } = makePool();
  await updateTask(pool, 14, { status: 'cancelled' });
  assert(/finished_at = COALESCE/.test(calls[0].sql), 'cancelled → finished_at');
}

// status='queued' adds neither started_at nor finished_at
{
  const { pool, calls } = makePool();
  await updateTask(pool, 15, { status: 'queued' });
  assert(!/started_at/.test(calls[0].sql), 'no started_at on queued');
  assert(!/finished_at/.test(calls[0].sql), 'no finished_at on queued');
}

// ============================================================================
// updateTask: empty updates (no recognized fields, no status)
// ============================================================================
console.log('\n── updateTask: empty updates ─────────────────────────────');

{
  const { pool, calls } = makePool();
  // sets array gets last_heartbeat appended unconditionally — so even
  // an empty updates object will produce a query (last_heartbeat-only).
  // This is the actual SUT behavior; verify it.
  await updateTask(pool, 99, {});
  assertEq(calls.length, 1, 'still issues query (last_heartbeat update)');
  assert(/last_heartbeat = UTC_TIMESTAMP/.test(calls[0].sql), 'updates last_heartbeat');
}

// ============================================================================
// addTaskEvent
// ============================================================================
console.log('\n── addTaskEvent ──────────────────────────────────────────');

{
  const { pool, calls } = makePool();
  await addTaskEvent(pool, 50, { message: 'started' });
  assertEq(calls.length, 1, 'one INSERT');
  assert(/INSERT INTO omai_task_events/.test(calls[0].sql), 'INTO omai_task_events');
  assert(/UTC_TIMESTAMP\(\)/.test(calls[0].sql), 'created_at UTC_TIMESTAMP');
  // Params: task_id, level (default 'info'), stage(null), message, detail_json(null)
  assertEq(calls[0].params, [50, 'info', null, 'started', null], 'default params');
}

{
  const { pool, calls } = makePool();
  await addTaskEvent(pool, 50, {
    level: 'error', stage: 'validate', message: 'oops', detail_json: { err: 'x' },
  });
  assertEq(calls[0].params[0], 50, 'task_id');
  assertEq(calls[0].params[1], 'error', 'level');
  assertEq(calls[0].params[2], 'validate', 'stage');
  assertEq(calls[0].params[3], 'oops', 'message');
  assertEq(JSON.parse(calls[0].params[4]), { err: 'x' }, 'detail_json stringified');
}

// ============================================================================
// isCancelled
// ============================================================================
console.log('\n── isCancelled ───────────────────────────────────────────');

{
  const { pool } = makePool({ selectRows: [[{ cancel_requested_at: '2026-04-10 12:00:00' }]] });
  assertEq(await isCancelled(pool, 1), true, 'cancel_requested_at set → true');
}

{
  const { pool } = makePool({ selectRows: [[{ cancel_requested_at: null }]] });
  assertEq(await isCancelled(pool, 1), false, 'null → false');
}

{
  const { pool } = makePool({ selectRows: [[]] });
  assertEq(await isCancelled(pool, 1), false, 'no row → false');
}

// ============================================================================
// findActiveTaskByScope
// ============================================================================
console.log('\n── findActiveTaskByScope ─────────────────────────────────');

// SELECT shape
{
  const { pool, calls } = makePool({ selectRows: [[]] });
  await findActiveTaskByScope(pool, 'enrichment_batch', 'church-enrichment', { id: 1 });
  const sql = calls[0].sql;
  assert(/FROM omai_tasks/.test(sql), 'FROM omai_tasks');
  assert(/task_type = \?/.test(sql), 'task_type filter');
  assert(/source_feature = \?/.test(sql), 'source_feature filter');
  assert(/status IN \('queued', 'running'\)/.test(sql), 'queued+running');
  assert(/ORDER BY created_at DESC/.test(sql), 'ORDER BY created_at DESC');
  assertEq(calls[0].params, ['enrichment_batch', 'church-enrichment'], 'two params');
}

// metadata_json as string → parsed
{
  const { pool } = makePool({
    selectRows: [[
      { id: 5, title: 'A', status: 'running', metadata_json: JSON.stringify({ church_id: 42 }) },
    ]],
  });
  const result = await findActiveTaskByScope(pool, 't', 'sf', { church_id: 42 });
  assertEq(result, { id: 5, title: 'A', status: 'running' }, 'parsed string match');
}

// metadata_json invalid string → skipped
{
  const { pool } = makePool({
    selectRows: [[
      { id: 1, title: 'bad', status: 'queued', metadata_json: '{not json' },
      { id: 2, title: 'good', status: 'running', metadata_json: JSON.stringify({ church_id: 42 }) },
    ]],
  });
  const result = await findActiveTaskByScope(pool, 't', 'sf', { church_id: 42 });
  assertEq(result?.id, 2, 'invalid JSON skipped');
}

// metadata_json null → skipped
{
  const { pool } = makePool({
    selectRows: [[
      { id: 1, title: 'no meta', status: 'queued', metadata_json: null },
    ]],
  });
  const result = await findActiveTaskByScope(pool, 't', 'sf', { church_id: 42 });
  assertEq(result, null, 'no match');
}

// normalize null/undefined/'' to null
{
  const { pool } = makePool({
    selectRows: [[
      { id: 1, title: 'm', status: 'running', metadata_json: { region: '' } },
    ]],
  });
  // Match request has null; normalized empty string also null → match
  const result = await findActiveTaskByScope(pool, 't', 'sf', { region: null });
  assertEq(result?.id, 1, "'' matches null");
}

{
  const { pool } = makePool({
    selectRows: [[
      { id: 1, title: 'm', status: 'running', metadata_json: { region: 'us', other: undefined } },
    ]],
  });
  const result = await findActiveTaskByScope(pool, 't', 'sf', { region: 'us', other: '' });
  assertEq(result?.id, 1, 'undefined matches empty string');
}

// Multiple rows: returns first match (DESC order, so newest)
{
  const { pool } = makePool({
    selectRows: [[
      { id: 10, title: 'newer', status: 'running', metadata_json: { x: 1 } },
      { id: 5, title: 'older', status: 'queued', metadata_json: { x: 1 } },
    ]],
  });
  const result = await findActiveTaskByScope(pool, 't', 'sf', { x: 1 });
  assertEq(result?.id, 10, 'returns first (newest) match');
}

// No match
{
  const { pool } = makePool({
    selectRows: [[
      { id: 1, title: 'x', status: 'running', metadata_json: { x: 2 } },
    ]],
  });
  const result = await findActiveTaskByScope(pool, 't', 'sf', { x: 1 });
  assertEq(result, null, 'no match → null');
}

// Multiple scope keys (AND semantics)
{
  const { pool } = makePool({
    selectRows: [[
      { id: 1, title: 'partial', status: 'running', metadata_json: { a: 1, b: 9 } },
      { id: 2, title: 'full', status: 'running', metadata_json: { a: 1, b: 2 } },
    ]],
  });
  const result = await findActiveTaskByScope(pool, 't', 'sf', { a: 1, b: 2 });
  assertEq(result?.id, 2, 'all keys must match');
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
