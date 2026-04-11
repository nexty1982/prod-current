#!/usr/bin/env npx tsx
/**
 * Unit tests for services/platformEvents.js (OMD-1203)
 *
 * Centralized event publishing + (fire-and-forget) rule evaluation.
 * Deps: config/db, workflowEngine (optional require).
 *
 * Strategy: stub db-compat with a regex-dispatch fake pool; stub
 * workflowEngine via require.cache so the optional require inside
 * publishPlatformEvent resolves cleanly.
 *
 * Coverage:
 *   - publishPlatformEvent:
 *       · required-field validation (event_type/category/source_system/title)
 *       · enum defaults (severity/actor_type/platform → defaults when invalid)
 *       · valid enum values preserved
 *       · event_payload JSON.stringify (+ null when absent)
 *       · optional FK fields default to null
 *       · returns { id: insertId }
 *       · rule evaluation fire-and-forget (does not crash on rule query error)
 *   - queryEvents:
 *       · no filters → WHERE 1=1
 *       · each filter adds clause + param
 *       · multi-filter composition in order
 *       · limit/offset default + explicit
 *       · event_payload JSON parsed; invalid JSON passes through
 *   - getEventSummary:
 *       · default hours = 24
 *       · Number coercion; null/missing → 0
 *       · returns full summary shape
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

// ── Fake pool ────────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Responder = { match: RegExp; respond: (params: any[]) => any };
let responders: Responder[] = [];
let nextInsertId = 1;

function runQuery(sql: string, params: any[] = []) {
  queryLog.push({ sql, params });
  for (const r of responders) {
    if (r.match.test(sql)) return Promise.resolve(r.respond(params));
  }
  // Default: behave like a benign "no rows / affectedRows=0"
  return Promise.resolve([[]]);
}

const fakePool = { query: runQuery };

const dbCompatPath = require.resolve('../../config/db');
require.cache[dbCompatPath] = {
  id: dbCompatPath,
  filename: dbCompatPath,
  loaded: true,
  exports: {
    getAppPool: () => fakePool,
    getTenantPool: () => fakePool,
  },
} as any;

// workflowEngine stub — avoid real module side effects when publishPlatformEvent
// calls `require('./workflowEngine')` inside its try-block.
try {
  const wePath = require.resolve('../workflowEngine');
  require.cache[wePath] = {
    id: wePath,
    filename: wePath,
    loaded: true,
    exports: { evaluateWorkflowTriggers: async () => {} },
  } as any;
} catch {
  // workflowEngine may not be resolvable — the SUT's try/catch handles that
}

function reset() {
  queryLog.length = 0;
  responders = [
    // Default: rules query returns empty so fire-and-forget evaluateRules
    // walks away cleanly.
    { match: /FROM platform_event_rules WHERE is_enabled = 1/, respond: () => [[]] },
  ];
  nextInsertId = 1;
}

// Silence
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

// Let fire-and-forget work drain
async function flushMicroTasks() {
  await new Promise(r => setImmediate(r));
  await new Promise(r => setImmediate(r));
}

const svc = require('../platformEvents');

async function main() {

// ============================================================================
// publishPlatformEvent — required-field validation
// ============================================================================
console.log('\n── publishPlatformEvent: validation ─────────────────────');

for (const missing of ['event_type', 'category', 'source_system', 'title']) {
  reset();
  const base: any = { event_type: 'x', category: 'y', source_system: 's', title: 't' };
  delete base[missing];
  let caught: any = null;
  try { await svc.publishPlatformEvent(base); } catch (e) { caught = e; }
  assert(caught !== null, `missing ${missing} throws`);
  assert(caught && caught.message.includes(`${missing} is required`), `error mentions ${missing}`);
  assertEq(queryLog.length, 0, `no SQL issued when ${missing} missing`);
}

// ============================================================================
// publishPlatformEvent — happy path, defaults, JSON serialization
// ============================================================================
console.log('\n── publishPlatformEvent: happy path w/ defaults ─────────');

reset();
responders = [
  { match: /INSERT INTO platform_events/, respond: () => [{ insertId: 42 }] },
  { match: /FROM platform_event_rules/, respond: () => [[]] },
];
quiet();
{
  const r = await svc.publishPlatformEvent({
    event_type: 'task.created',
    category: 'task',
    source_system: 'task_runner',
    title: 'New task',
    // severity/actor_type/platform omitted → defaults
    // message/event_payload/actor fields omitted → nulls
  });
  loud();
  await flushMicroTasks();

  assertEq(r, { id: 42 }, 'returns insert id');

  // Find the INSERT call (order within queryLog is deterministic: insert first,
  // then async rule query; but we look by pattern to be safe)
  const insertCall = queryLog.find(q => /INSERT INTO platform_events/.test(q.sql));
  assert(insertCall !== undefined, 'insert call made');
  const p = insertCall!.params;
  assertEq(p[0], 'task.created', 'event_type');
  assertEq(p[1], 'task', 'category');
  assertEq(p[2], 'info', 'severity default');
  assertEq(p[3], 'task_runner', 'source_system');
  assertEq(p[4], null, 'source_ref_id null default');
  assertEq(p[5], 'New task', 'title');
  assertEq(p[6], null, 'message null default');
  assertEq(p[7], null, 'event_payload null');
  assertEq(p[8], 'system', 'actor_type default');
  assertEq(p[9], null, 'actor_id null');
  assertEq(p[10], null, 'actor_name null');
  assertEq(p[11], null, 'church_id null');
  assertEq(p[12], 'shared', 'platform default');
}

console.log('\n── publishPlatformEvent: invalid enums → defaults ───────');

reset();
responders = [
  { match: /INSERT INTO platform_events/, respond: () => [{ insertId: 1 }] },
  { match: /FROM platform_event_rules/, respond: () => [[]] },
];
quiet();
{
  await svc.publishPlatformEvent({
    event_type: 'e', category: 'c', source_system: 's', title: 't',
    severity: 'bogus', actor_type: 'alien', platform: 'mars',
  });
  loud();
  await flushMicroTasks();
  const insertCall = queryLog.find(q => /INSERT INTO platform_events/.test(q.sql));
  const p = insertCall!.params;
  assertEq(p[2], 'info', 'bogus severity → info');
  assertEq(p[8], 'system', 'bogus actor_type → system');
  assertEq(p[12], 'shared', 'bogus platform → shared');
}

console.log('\n── publishPlatformEvent: valid enums preserved ──────────');

reset();
responders = [
  { match: /INSERT INTO platform_events/, respond: () => [{ insertId: 2 }] },
  { match: /FROM platform_event_rules/, respond: () => [[]] },
];
quiet();
{
  await svc.publishPlatformEvent({
    event_type: 'e', category: 'c', source_system: 's', title: 't',
    severity: 'critical', actor_type: 'agent', platform: 'omai',
  });
  loud();
  await flushMicroTasks();
  const insertCall = queryLog.find(q => /INSERT INTO platform_events/.test(q.sql));
  const p = insertCall!.params;
  assertEq(p[2], 'critical', 'severity preserved');
  assertEq(p[8], 'agent', 'actor_type preserved');
  assertEq(p[12], 'omai', 'platform preserved');
}

console.log('\n── publishPlatformEvent: event_payload JSON ─────────────');

reset();
responders = [
  { match: /INSERT INTO platform_events/, respond: () => [{ insertId: 3 }] },
  { match: /FROM platform_event_rules/, respond: () => [[]] },
];
quiet();
{
  const payload = { foo: 'bar', nested: { n: 1 } };
  await svc.publishPlatformEvent({
    event_type: 'e', category: 'c', source_system: 's', title: 't',
    event_payload: payload,
    source_ref_id: 99,
    actor_id: 5,
    actor_name: 'admin',
    church_id: 46,
    message: 'hello',
  });
  loud();
  await flushMicroTasks();
  const insertCall = queryLog.find(q => /INSERT INTO platform_events/.test(q.sql));
  const p = insertCall!.params;
  assertEq(p[4], 99, 'source_ref_id');
  assertEq(p[6], 'hello', 'message');
  assertEq(p[7], JSON.stringify(payload), 'event_payload stringified');
  assertEq(p[9], 5, 'actor_id');
  assertEq(p[10], 'admin', 'actor_name');
  assertEq(p[11], 46, 'church_id');
}

// ============================================================================
// publishPlatformEvent — rule evaluation fire-and-forget does not crash
// ============================================================================
console.log('\n── publishPlatformEvent: rule eval swallowed ────────────');

reset();
responders = [
  { match: /INSERT INTO platform_events/, respond: () => [{ insertId: 50 }] },
  // Rule fetch itself throws
  { match: /FROM platform_event_rules/, respond: () => { throw new Error('rule-fetch-boom'); } },
];
quiet();
{
  const r = await svc.publishPlatformEvent({
    event_type: 'e', category: 'c', source_system: 's', title: 't',
  });
  loud();
  await flushMicroTasks();
  assertEq(r, { id: 50 }, 'publish still returns id');
  // No throw reached this assertion → rule eval error was swallowed
  assert(true, 'rule eval error did not crash caller');
}

// ============================================================================
// queryEvents
// ============================================================================
console.log('\n── queryEvents: no filters ──────────────────────────────');

reset();
responders = [
  { match: /FROM platform_events/, respond: () => [[
    { id: 1, event_payload: '{"a":1}' },
    { id: 2, event_payload: 'not-json' },
    { id: 3, event_payload: null },
  ]] },
];
{
  const rows = await svc.queryEvents();
  assertEq(rows.length, 3, '3 rows');
  assertEq(rows[0].event_payload, { a: 1 }, 'valid JSON parsed');
  assertEq(rows[1].event_payload, 'not-json', 'invalid JSON passes through');
  assertEq(rows[2].event_payload, null, 'null stays null');
  const sql = queryLog[0].sql;
  assert(/WHERE 1=1/.test(sql), 'WHERE 1=1');
  assert(/ORDER BY created_at DESC/.test(sql), 'DESC order');
  assert(/LIMIT \? OFFSET \?/.test(sql), 'LIMIT/OFFSET');
  assertEq(queryLog[0].params, [50, 0], 'default limit=50 offset=0');
}

console.log('\n── queryEvents: single filter ───────────────────────────');

for (const [key, val, fragment] of [
  ['platform', 'omai', 'platform = ?'],
  ['category', 'task', 'category = ?'],
  ['severity', 'warning', 'severity = ?'],
  ['church_id', 46, 'church_id = ?'],
  ['event_type', 'task.created', 'event_type = ?'],
  ['source_ref_id', 123, 'source_ref_id = ?'],
  ['since', '2026-01-01', 'created_at >= ?'],
] as const) {
  reset();
  responders = [{ match: /FROM platform_events/, respond: () => [[]] }];
  await svc.queryEvents({ [key]: val });
  assert(new RegExp(fragment).test(queryLog[0].sql), `${key}: SQL has "${fragment}"`);
  assertEq(queryLog[0].params[0], val, `${key}: first param`);
  assertEq(queryLog[0].params[queryLog[0].params.length - 2], 50, `${key}: limit tail`);
}

console.log('\n── queryEvents: multi-filter composition ────────────────');

reset();
responders = [{ match: /FROM platform_events/, respond: () => [[]] }];
{
  await svc.queryEvents({ platform: 'omai', category: 'task', severity: 'critical', limit: 10, offset: 5 });
  const sql = queryLog[0].sql;
  assert(/platform = \?/.test(sql), 'platform');
  assert(/category = \?/.test(sql), 'category');
  assert(/severity = \?/.test(sql), 'severity');
  // params order: [platform, category, severity, limit, offset]
  assertEq(queryLog[0].params, ['omai', 'task', 'critical', 10, 5], 'params in order');
}

console.log('\n── queryEvents: limit/offset parseInt ───────────────────');

reset();
responders = [{ match: /FROM platform_events/, respond: () => [[]] }];
{
  await svc.queryEvents({ limit: '25' as any, offset: '7' as any });
  // parseInt should coerce strings to numbers
  assertEq(queryLog[0].params, [25, 7], 'parseInt coerced');
}

// ============================================================================
// getEventSummary
// ============================================================================
console.log('\n── getEventSummary: default hours ───────────────────────');

reset();
responders = [
  { match: /FROM platform_events\s+WHERE created_at >=/, respond: () => [[
    { total: '10', critical: '2', warning: '3', success: '4',
      task_events: '1', ocr_events: '2', system_events: '3', alert_events: '4' },
  ]] },
];
{
  const r = await svc.getEventSummary();
  assertEq(r.period_hours, 24, 'default 24h');
  assertEq(r.total, 10, 'total coerced to Number');
  assertEq(r.critical, 2, 'critical');
  assertEq(r.warning, 3, 'warning');
  assertEq(r.success, 4, 'success');
  assertEq(r.task_events, 1, 'task_events');
  assertEq(r.ocr_events, 2, 'ocr_events');
  assertEq(r.system_events, 3, 'system_events');
  assertEq(r.alert_events, 4, 'alert_events');
  assertEq(queryLog[0].params, [24], 'hours param');
}

console.log('\n── getEventSummary: explicit hours ──────────────────────');

reset();
responders = [
  { match: /FROM platform_events\s+WHERE created_at >=/, respond: () => [[
    { total: null, critical: null, warning: null, success: null,
      task_events: null, ocr_events: null, system_events: null, alert_events: null },
  ]] },
];
{
  const r = await svc.getEventSummary(72);
  assertEq(r.period_hours, 72, '72h passed through');
  assertEq(r.total, 0, 'null → 0');
  assertEq(r.critical, 0, 'null critical → 0');
  assertEq(queryLog[0].params, [72], '72 hours param');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
