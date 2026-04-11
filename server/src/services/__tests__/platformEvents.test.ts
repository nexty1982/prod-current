#!/usr/bin/env npx tsx
/**
 * Unit tests for services/platformEvents.js (OMD-990)
 *
 * Tests the three exported functions:
 *   - publishPlatformEvent: validation, normalization, INSERT params,
 *     event_payload JSON wrapping, fire-and-forget rule eval isolation
 *   - queryEvents: dynamic WHERE building, param order, JSON parse
 *   - getEventSummary: SELECT with HOUR interval, numeric casts
 *
 * The SUT also triggers rule evaluation and workflow trigger evaluation
 * as fire-and-forget tasks — we don't wait for them but ensure they
 * don't crash publishPlatformEvent.
 *
 * Run: npx tsx server/src/services/__tests__/platformEvents.test.ts
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

// ── Stub ../config/db ──────────────────────────────────────────────────
type QCall = { sql: string; params: any[] };
let qCalls: QCall[] = [];
let qRoutes: Array<{ match: RegExp; rows?: any[]; result?: any }> = [];

const pool = {
  query: async (sql: string, params: any[] = []) => {
    qCalls.push({ sql, params });
    for (const r of qRoutes) {
      if (r.match.test(sql)) {
        if (r.rows !== undefined) return [r.rows, []];
        return [r.result ?? { insertId: 999, affectedRows: 1 }, []];
      }
    }
    return [[{ insertId: 999 }], []];
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => pool },
} as any;

// Silence console for fire-and-forget errors
const origError = console.error;
const origLog = console.log;
function quiet() { console.error = () => {}; }
function loud() { console.error = origError; }

const svc = require('../platformEvents');
const { publishPlatformEvent, queryEvents, getEventSummary } = svc;

async function main() {

// ============================================================================
// publishPlatformEvent: validation
// ============================================================================
console.log('\n── publishPlatformEvent: validation ──────────────────────');

async function expectThrow(fn: () => Promise<any>, expectedMsg: string, label: string) {
  let thrown = false;
  let err: any = null;
  try { await fn(); } catch (e) { thrown = true; err = e; }
  assert(thrown, `${label}: throws`);
  if (thrown) assert(err.message.includes(expectedMsg), `${label}: message mentions "${expectedMsg}"`);
}

await expectThrow(
  () => publishPlatformEvent({ category: 'task', source_system: 'x', title: 't' }),
  'event_type', 'missing event_type'
);

await expectThrow(
  () => publishPlatformEvent({ event_type: 'x.y', source_system: 'x', title: 't' }),
  'category', 'missing category'
);

await expectThrow(
  () => publishPlatformEvent({ event_type: 'x.y', category: 'task', title: 't' }),
  'source_system', 'missing source_system'
);

await expectThrow(
  () => publishPlatformEvent({ event_type: 'x.y', category: 'task', source_system: 'x' }),
  'title', 'missing title'
);

// ============================================================================
// publishPlatformEvent: insert + defaults
// ============================================================================
console.log('\n── publishPlatformEvent: insert + defaults ───────────────');

qCalls = [];
qRoutes = [
  { match: /INSERT INTO platform_events/i, result: { insertId: 77 } },
  { match: /platform_event_rules/i, rows: [] }, // no rules to match
];

quiet();
{
  const result = await publishPlatformEvent({
    event_type: 'task.created',
    category: 'task',
    source_system: 'task_runner',
    title: 'My Task',
  });
  loud();
  assertEq(result.id, 77, 'returns insertId');

  const insert = qCalls.find(c => /INSERT INTO platform_events/i.test(c.sql));
  assert(insert !== undefined, 'INSERT called');
  if (insert) {
    assertEq(insert.params[0], 'task.created', 'event_type');
    assertEq(insert.params[1], 'task', 'category');
    assertEq(insert.params[2], 'info', 'default severity = info');
    assertEq(insert.params[3], 'task_runner', 'source_system');
    assertEq(insert.params[4], null, 'source_ref_id null');
    assertEq(insert.params[5], 'My Task', 'title');
    assertEq(insert.params[6], null, 'message null');
    assertEq(insert.params[7], null, 'event_payload null');
    assertEq(insert.params[8], 'system', 'default actor_type = system');
    assertEq(insert.params[9], null, 'actor_id null');
    assertEq(insert.params[10], null, 'actor_name null');
    assertEq(insert.params[11], null, 'church_id null');
    assertEq(insert.params[12], 'shared', 'default platform = shared');
  }
}

// ============================================================================
// publishPlatformEvent: custom fields + normalization
// ============================================================================
console.log('\n── publishPlatformEvent: normalization ───────────────────');

qCalls = [];
qRoutes = [
  { match: /INSERT INTO platform_events/i, result: { insertId: 42 } },
  { match: /platform_event_rules/i, rows: [] },
];

quiet();
{
  await publishPlatformEvent({
    event_type: 'system.alert',
    category: 'system',
    severity: 'critical',
    source_system: 'health_check',
    source_ref_id: 123,
    title: 'Disk Full',
    message: 'Disk usage at 95%',
    event_payload: { disk: '/var', usage: 95 },
    actor_type: 'worker',
    actor_id: 7,
    actor_name: 'health_worker',
    church_id: 5,
    platform: 'om',
  });
  loud();

  const insert = qCalls.find(c => /INSERT INTO platform_events/i.test(c.sql));
  if (insert) {
    assertEq(insert.params[2], 'critical', 'severity critical');
    assertEq(insert.params[4], 123, 'source_ref_id 123');
    assertEq(insert.params[6], 'Disk usage at 95%', 'message');
    assertEq(insert.params[7], JSON.stringify({ disk: '/var', usage: 95 }), 'event_payload JSON stringified');
    assertEq(insert.params[8], 'worker', 'actor_type worker');
    assertEq(insert.params[9], 7, 'actor_id 7');
    assertEq(insert.params[10], 'health_worker', 'actor_name');
    assertEq(insert.params[11], 5, 'church_id 5');
    assertEq(insert.params[12], 'om', 'platform om');
  }
}

// Invalid enums fall back to defaults
qCalls = [];
qRoutes = [
  { match: /INSERT INTO platform_events/i, result: { insertId: 99 } },
  { match: /platform_event_rules/i, rows: [] },
];
quiet();
{
  await publishPlatformEvent({
    event_type: 'x.y',
    category: 'x',
    severity: 'BOGUS' as any,
    source_system: 'x',
    title: 't',
    actor_type: 'invalid' as any,
    platform: 'nope' as any,
  });
  loud();
  const insert = qCalls.find(c => /INSERT INTO platform_events/i.test(c.sql));
  if (insert) {
    assertEq(insert.params[2], 'info', 'invalid severity → info');
    assertEq(insert.params[8], 'system', 'invalid actor_type → system');
    assertEq(insert.params[12], 'shared', 'invalid platform → shared');
  }
}

// ============================================================================
// publishPlatformEvent: fire-and-forget isolation
// ============================================================================
console.log('\n── publishPlatformEvent: error isolation ─────────────────');

// If evaluateRules throws, publishPlatformEvent still succeeds
qCalls = [];
qRoutes = [
  { match: /INSERT INTO platform_events/i, result: { insertId: 111 } },
  { match: /platform_event_rules/i, rows: [{ id: 1, is_enabled: 1, event_type_pattern: 'x.y', severity_threshold: null, condition_json: null, action_type: 'BOGUS', action_config_json: null, name: 'Bad Rule' }] },
];

quiet();
{
  const result = await publishPlatformEvent({
    event_type: 'x.y',
    category: 'task',
    source_system: 'x',
    title: 't',
  });
  loud();
  assertEq(result.id, 111, 'returns insertId even if rule fails');
}

// Wait a tick for fire-and-forget rule eval from publishPlatformEvent to flush.
await new Promise((r) => setTimeout(r, 50));

// ============================================================================
// queryEvents: no filters
// ============================================================================
console.log('\n── queryEvents: no filters ───────────────────────────────');

qCalls = [];
qRoutes = [{ match: /SELECT[\s\S]*FROM platform_events/i, rows: [
  { id: 1, event_type: 'x.y', event_payload: JSON.stringify({ a: 1 }) },
  { id: 2, event_type: 'x.z', event_payload: null },
]}];
{
  const events = await queryEvents();
  assertEq(events.length, 2, '2 events returned');
  assertEq(events[0].event_payload, { a: 1 }, 'event_payload JSON parsed');
  assertEq(events[1].event_payload, null, 'null payload preserved');
  assertEq(qCalls.length, 1, '1 query');
  const sql = qCalls[0].sql;
  assert(/ORDER BY created_at DESC/.test(sql), 'orders by created_at desc');
  assert(/LIMIT \? OFFSET \?/.test(sql), 'has LIMIT/OFFSET placeholders');
  // Default limit 50, offset 0
  const params = qCalls[0].params;
  assertEq(params[params.length - 2], 50, 'default limit 50');
  assertEq(params[params.length - 1], 0, 'default offset 0');
}

// ============================================================================
// queryEvents: with filters
// ============================================================================
console.log('\n── queryEvents: with filters ─────────────────────────────');

qCalls = [];
qRoutes = [{ match: /SELECT/i, rows: [] }];
{
  await queryEvents({
    platform: 'om',
    category: 'task',
    severity: 'critical',
    church_id: 5,
    event_type: 'task.failed',
    source_ref_id: 42,
    since: '2026-04-01',
    limit: 10,
    offset: 20,
  });
  const sql = qCalls[0].sql;
  const params = qCalls[0].params;
  assert(sql.includes('platform = ?'), 'platform filter');
  assert(sql.includes('category = ?'), 'category filter');
  assert(sql.includes('severity = ?'), 'severity filter');
  assert(sql.includes('church_id = ?'), 'church_id filter');
  assert(sql.includes('event_type = ?'), 'event_type filter');
  assert(sql.includes('source_ref_id = ?'), 'source_ref_id filter');
  assert(sql.includes('created_at >= ?'), 'since filter');
  assertEq(params[0], 'om', 'platform param first');
  assertEq(params[1], 'task', 'category param');
  assertEq(params[2], 'critical', 'severity param');
  assertEq(params[3], 5, 'church_id param');
  assertEq(params[4], 'task.failed', 'event_type param');
  assertEq(params[5], 42, 'source_ref_id param');
  assertEq(params[6], '2026-04-01', 'since param');
  assertEq(params[7], 10, 'custom limit');
  assertEq(params[8], 20, 'custom offset');
}

// ============================================================================
// queryEvents: partial filters
// ============================================================================
console.log('\n── queryEvents: partial filters ──────────────────────────');

qCalls = [];
qRoutes = [{ match: /SELECT/i, rows: [] }];
{
  await queryEvents({ platform: 'omai' });
  const sql = qCalls[0].sql;
  const params = qCalls[0].params;
  assert(sql.includes('platform = ?'), 'platform filter present');
  assert(!sql.includes('category = ?'), 'no category filter');
  assert(!sql.includes('severity = ?'), 'no severity filter');
  assertEq(params[0], 'omai', 'platform first');
  assertEq(params.length, 3, 'platform + limit + offset');
}

// ============================================================================
// getEventSummary
// ============================================================================
console.log('\n── getEventSummary ───────────────────────────────────────');

qCalls = [];
qRoutes = [{
  match: /SELECT[\s\S]*FROM platform_events[\s\S]*WHERE created_at/i,
  rows: [{
    total: '100',
    critical: '5',
    warning: '10',
    success: '20',
    task_events: '50',
    ocr_events: '15',
    system_events: '25',
    alert_events: '5',
  }],
}];
{
  const summary = await getEventSummary(24);
  assertEq(summary.period_hours, 24, 'period_hours');
  assertEq(summary.total, 100, 'total (string→number)');
  assertEq(summary.critical, 5, 'critical');
  assertEq(summary.warning, 10, 'warning');
  assertEq(summary.success, 20, 'success');
  assertEq(summary.task_events, 50, 'task_events');
  assertEq(summary.ocr_events, 15, 'ocr_events');
  assertEq(summary.system_events, 25, 'system_events');
  assertEq(summary.alert_events, 5, 'alert_events');
  assertEq(qCalls[0].params, [24], 'hours param');
}

// Default hours = 24
qCalls = [];
qRoutes = [{
  match: /SELECT/i,
  rows: [{ total: 0, critical: 0, warning: 0, success: 0, task_events: 0, ocr_events: 0, system_events: 0, alert_events: 0 }],
}];
{
  const summary = await getEventSummary();
  assertEq(summary.period_hours, 24, 'default hours = 24');
  assertEq(qCalls[0].params, [24], 'default hours param');
}

// Null counts → 0
qCalls = [];
qRoutes = [{
  match: /SELECT/i,
  rows: [{ total: null, critical: null, warning: null, success: null, task_events: null, ocr_events: null, system_events: null, alert_events: null }],
}];
{
  const summary = await getEventSummary(1);
  assertEq(summary.total, 0, 'null → 0 total');
  assertEq(summary.critical, 0, 'null → 0 critical');
  assertEq(summary.alert_events, 0, 'null → 0 alert');
}

// Custom hours
qCalls = [];
qRoutes = [{
  match: /SELECT/i,
  rows: [{ total: 1, critical: 0, warning: 0, success: 1, task_events: 1, ocr_events: 0, system_events: 0, alert_events: 0 }],
}];
{
  const summary = await getEventSummary(168);
  assertEq(summary.period_hours, 168, '168 hours');
  assertEq(qCalls[0].params, [168], 'custom hours param');
}

// Restore console
console.log = origLog;

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
