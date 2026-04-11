#!/usr/bin/env npx tsx
/**
 * Unit tests for services/platformEvents.js (OMD-1054)
 *
 * Centralized platform event publishing + rule evaluation.
 * Only `../config/db` is external; we stub it via require.cache BEFORE
 * requiring the SUT. `./workflowEngine` is also optionally required
 * inside the fire-and-forget block; we stub it as a no-op so it's silent.
 *
 * publishPlatformEvent triggers `evaluateRules` (fire-and-forget), which
 * issues additional queries. We let the microtask queue flush with a
 * `setImmediate` await so the rule-SELECT lands in the query log.
 *
 * Coverage:
 *   - publishPlatformEvent:
 *       · missing event_type/category/source_system/title → throws
 *       · valid call → returns { id }, issues INSERT with parameterized columns
 *       · severity/actor_type/platform fall back to defaults on invalid
 *       · event_payload JSON-stringified
 *       · null defaulting for optional numeric/text fields
 *   - queryEvents:
 *       · no filters → base SELECT
 *       · each filter appends AND clause + param
 *       · limit/offset appended at end
 *       · JSON payload string parsed on result rows
 *   - getEventSummary:
 *       · default 24 hours
 *       · custom hours param
 *       · numeric coercion (Number(null) fallback)
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

// ── SQL-routed fake pool ──────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Route = { match: RegExp; respond?: (params: any[]) => any; rows?: any };
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        const out = r.respond ? r.respond(params) : r.rows;
        return [out];
      }
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true, exports: dbStub,
} as any;

// Stub workflowEngine so the optional require() in publishPlatformEvent is a no-op
const weStub = { evaluateWorkflowTriggers: async () => {} };
try {
  const wePath = require.resolve('../workflowEngine');
  require.cache[wePath] = { id: wePath, filename: wePath, loaded: true, exports: weStub } as any;
} catch {
  // Module doesn't exist — that's fine, the require() inside publishPlatformEvent
  // is in a try/catch and will silently skip.
}

// Silence console noise
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const { publishPlatformEvent, queryEvents, getEventSummary } = require('../platformEvents');

function reset() { queryLog.length = 0; routes = []; }

// Let fire-and-forget rule evaluation finish
function flush(): Promise<void> {
  return new Promise(r => setImmediate(r));
}

async function main() {

// ============================================================================
// publishPlatformEvent — validation
// ============================================================================
console.log('\n── publishPlatformEvent: validation ──────────────────────');

{
  reset();
  let caught: any = null;
  try { await publishPlatformEvent({ category: 'task', source_system: 's', title: 't' }); }
  catch (e) { caught = e; }
  assert(caught instanceof Error, 'missing event_type throws');
  assert(/event_type/.test(caught.message), 'error mentions event_type');
}

{
  reset();
  let caught: any = null;
  try { await publishPlatformEvent({ event_type: 'x', source_system: 's', title: 't' }); }
  catch (e) { caught = e; }
  assert(/category/.test(caught.message), 'missing category throws');
}

{
  reset();
  let caught: any = null;
  try { await publishPlatformEvent({ event_type: 'x', category: 'task', title: 't' }); }
  catch (e) { caught = e; }
  assert(/source_system/.test(caught.message), 'missing source_system throws');
}

{
  reset();
  let caught: any = null;
  try { await publishPlatformEvent({ event_type: 'x', category: 'task', source_system: 's' }); }
  catch (e) { caught = e; }
  assert(/title/.test(caught.message), 'missing title throws');
}

// ============================================================================
// publishPlatformEvent — happy path
// ============================================================================
console.log('\n── publishPlatformEvent: happy path ──────────────────────');

{
  reset();
  routes.push({
    match: /INSERT INTO platform_events/,
    respond: () => ({ insertId: 777 }),
  });
  // Rule SELECT returns no rules (silence rule evaluation)
  routes.push({ match: /FROM platform_event_rules/, rows: [] });

  const r = await publishPlatformEvent({
    event_type: 'task.created',
    category: 'task',
    severity: 'warning',
    source_system: 'task_runner',
    source_ref_id: 42,
    title: 'New task',
    message: 'A task was created',
    event_payload: { task_id: 42, priority: 'high' },
    actor_type: 'agent',
    actor_id: 7,
    actor_name: 'claude_cli',
    church_id: 46,
    platform: 'om',
  });
  assertEq(r, { id: 777 }, 'returns { id: insertId }');

  const insert = queryLog.find(q => /INSERT INTO platform_events/.test(q.sql));
  assert(insert !== undefined, 'INSERT issued');
  // Positional params order
  assertEq(insert!.params[0], 'task.created', 'event_type');
  assertEq(insert!.params[1], 'task', 'category');
  assertEq(insert!.params[2], 'warning', 'severity kept');
  assertEq(insert!.params[3], 'task_runner', 'source_system');
  assertEq(insert!.params[4], 42, 'source_ref_id');
  assertEq(insert!.params[5], 'New task', 'title');
  assertEq(insert!.params[6], 'A task was created', 'message');
  assertEq(insert!.params[7], JSON.stringify({ task_id: 42, priority: 'high' }), 'payload JSON');
  assertEq(insert!.params[8], 'agent', 'actor_type kept');
  assertEq(insert!.params[9], 7, 'actor_id');
  assertEq(insert!.params[10], 'claude_cli', 'actor_name');
  assertEq(insert!.params[11], 46, 'church_id');
  assertEq(insert!.params[12], 'om', 'platform kept');

  await flush();
  quiet();
  // Rule eval SELECT should have fired
  const ruleSelect = queryLog.find(q => /FROM platform_event_rules/.test(q.sql));
  loud();
  assert(ruleSelect !== undefined, 'rule SELECT fired');
}

// ============================================================================
// publishPlatformEvent — defaults for invalid enum values
// ============================================================================
console.log('\n── publishPlatformEvent: enum defaults ───────────────────');

{
  reset();
  routes.push({ match: /INSERT INTO platform_events/, respond: () => ({ insertId: 1 }) });
  routes.push({ match: /FROM platform_event_rules/, rows: [] });

  // Invalid enums all fall back to defaults
  await publishPlatformEvent({
    event_type: 'x',
    category: 'c',
    source_system: 's',
    title: 't',
    severity: 'bogus',
    actor_type: 'hacker',
    platform: 'moon',
  });

  const insert = queryLog.find(q => /INSERT INTO platform_events/.test(q.sql));
  assertEq(insert!.params[2], 'info', 'invalid severity → info');
  assertEq(insert!.params[8], 'system', 'invalid actor_type → system');
  assertEq(insert!.params[12], 'shared', 'invalid platform → shared');
  await flush();
}

// Valid severities accepted
{
  reset();
  routes.push({ match: /INSERT INTO platform_events/, respond: () => ({ insertId: 1 }) });
  routes.push({ match: /FROM platform_event_rules/, rows: [] });
  await publishPlatformEvent({
    event_type: 'x', category: 'c', source_system: 's', title: 't', severity: 'critical',
  });
  const insert = queryLog.find(q => /INSERT INTO platform_events/.test(q.sql));
  assertEq(insert!.params[2], 'critical', 'critical accepted');
  await flush();
}

{
  reset();
  routes.push({ match: /INSERT INTO platform_events/, respond: () => ({ insertId: 1 }) });
  routes.push({ match: /FROM platform_event_rules/, rows: [] });
  await publishPlatformEvent({
    event_type: 'x', category: 'c', source_system: 's', title: 't', severity: 'success',
  });
  const insert = queryLog.find(q => /INSERT INTO platform_events/.test(q.sql));
  assertEq(insert!.params[2], 'success', 'success accepted');
  await flush();
}

// Valid actor_type + platform
{
  reset();
  routes.push({ match: /INSERT INTO platform_events/, respond: () => ({ insertId: 1 }) });
  routes.push({ match: /FROM platform_event_rules/, rows: [] });
  await publishPlatformEvent({
    event_type: 'x', category: 'c', source_system: 's', title: 't',
    actor_type: 'worker', platform: 'omai',
  });
  const insert = queryLog.find(q => /INSERT INTO platform_events/.test(q.sql));
  assertEq(insert!.params[8], 'worker', 'worker accepted');
  assertEq(insert!.params[12], 'omai', 'omai accepted');
  await flush();
}

// ============================================================================
// publishPlatformEvent — optional fields default to null
// ============================================================================
console.log('\n── publishPlatformEvent: null defaulting ─────────────────');

{
  reset();
  routes.push({ match: /INSERT INTO platform_events/, respond: () => ({ insertId: 99 }) });
  routes.push({ match: /FROM platform_event_rules/, rows: [] });

  // Minimal required fields only
  await publishPlatformEvent({
    event_type: 'a.b', category: 'system', source_system: 'test', title: 'Hi',
  });

  const insert = queryLog.find(q => /INSERT INTO platform_events/.test(q.sql));
  assertEq(insert!.params[4], null, 'source_ref_id null');
  assertEq(insert!.params[6], null, 'message null');
  assertEq(insert!.params[7], null, 'event_payload null');
  assertEq(insert!.params[9], null, 'actor_id null');
  assertEq(insert!.params[10], null, 'actor_name null');
  assertEq(insert!.params[11], null, 'church_id null');
  // Default enums
  assertEq(insert!.params[2], 'info', 'default severity info');
  assertEq(insert!.params[8], 'system', 'default actor_type system');
  assertEq(insert!.params[12], 'shared', 'default platform shared');
  await flush();
}

// ============================================================================
// queryEvents — no filters
// ============================================================================
console.log('\n── queryEvents: no filters ───────────────────────────────');

{
  reset();
  routes.push({
    match: /FROM platform_events/,
    rows: [
      { id: 1, event_type: 'a', category: 'task', event_payload: '{"k":"v"}', created_at: '2026-04-10T00:00:00Z' },
      { id: 2, event_type: 'b', category: 'task', event_payload: null, created_at: '2026-04-10T00:00:01Z' },
    ],
  });
  const rows = await queryEvents();
  assertEq(rows.length, 2, '2 rows');
  assertEq(rows[0].event_payload, { k: 'v' }, 'payload parsed from string');
  assertEq(rows[1].event_payload, null, 'null payload untouched');

  const q = queryLog[0];
  assert(/WHERE 1=1/.test(q.sql), 'WHERE 1=1 base');
  assert(/ORDER BY created_at DESC/.test(q.sql), 'order DESC');
  assert(/LIMIT \? OFFSET \?/.test(q.sql), 'limit+offset');
  // Default limit 50, offset 0
  assertEq(q.params[q.params.length - 2], 50, 'default limit 50');
  assertEq(q.params[q.params.length - 1], 0, 'default offset 0');
}

// ============================================================================
// queryEvents — filter composition
// ============================================================================
console.log('\n── queryEvents: filters ──────────────────────────────────');

{
  reset();
  routes.push({ match: /FROM platform_events/, rows: [] });
  await queryEvents({
    platform: 'om',
    category: 'alert',
    severity: 'critical',
    church_id: 46,
    event_type: 'task.created',
    source_ref_id: 5,
    since: '2026-04-01',
    limit: 10,
    offset: 20,
  });
  const q = queryLog[0];
  assert(q.sql.includes('AND platform = ?'), 'platform filter');
  assert(q.sql.includes('AND category = ?'), 'category filter');
  assert(q.sql.includes('AND severity = ?'), 'severity filter');
  assert(q.sql.includes('AND church_id = ?'), 'church_id filter');
  assert(q.sql.includes('AND event_type = ?'), 'event_type filter');
  assert(q.sql.includes('AND source_ref_id = ?'), 'source_ref_id filter');
  assert(q.sql.includes('AND created_at >= ?'), 'since filter');
  // Params order: platform, category, severity, church_id, event_type, source_ref_id, since, limit, offset
  assertEq(q.params[0], 'om', 'platform param');
  assertEq(q.params[1], 'alert', 'category param');
  assertEq(q.params[2], 'critical', 'severity param');
  assertEq(q.params[3], 46, 'church_id param');
  assertEq(q.params[4], 'task.created', 'event_type param');
  assertEq(q.params[5], 5, 'source_ref_id param');
  assertEq(q.params[6], '2026-04-01', 'since param');
  assertEq(q.params[7], 10, 'limit param');
  assertEq(q.params[8], 20, 'offset param');
}

// Partial filters
{
  reset();
  routes.push({ match: /FROM platform_events/, rows: [] });
  await queryEvents({ category: 'task' });
  const q = queryLog[0];
  assert(q.sql.includes('AND category = ?'), 'only category filter');
  assert(!q.sql.includes('AND platform = ?'), 'no platform filter');
  assertEq(q.params[0], 'task', 'first param is category');
}

// Malformed JSON payload stays as string
{
  reset();
  routes.push({
    match: /FROM platform_events/,
    rows: [{ id: 1, event_payload: '{invalid' }],
  });
  const rows = await queryEvents();
  assertEq(rows[0].event_payload, '{invalid', 'malformed JSON untouched');
}

// Non-string payload (already an object) untouched
{
  reset();
  routes.push({
    match: /FROM platform_events/,
    rows: [{ id: 1, event_payload: { already: 'object' } }],
  });
  const rows = await queryEvents();
  assertEq(rows[0].event_payload, { already: 'object' }, 'object payload untouched');
}

// ============================================================================
// getEventSummary
// ============================================================================
console.log('\n── getEventSummary ───────────────────────────────────────');

{
  reset();
  routes.push({
    match: /FROM platform_events/,
    rows: [{
      total: 100, critical: 5, warning: 15, success: 80,
      task_events: 30, ocr_events: 20, system_events: 40, alert_events: 10,
    }],
  });
  const s = await getEventSummary();
  assertEq(s.period_hours, 24, 'default 24 hours');
  assertEq(s.total, 100, 'total');
  assertEq(s.critical, 5, 'critical');
  assertEq(s.warning, 15, 'warning');
  assertEq(s.success, 80, 'success');
  assertEq(s.task_events, 30, 'task');
  assertEq(s.ocr_events, 20, 'ocr');
  assertEq(s.system_events, 40, 'system');
  assertEq(s.alert_events, 10, 'alert');

  const q = queryLog[0];
  assertEq(q.params[0], 24, 'hours param 24');
}

// Custom hours
{
  reset();
  routes.push({
    match: /FROM platform_events/,
    rows: [{ total: 5, critical: 0, warning: 0, success: 5, task_events: 0, ocr_events: 0, system_events: 0, alert_events: 0 }],
  });
  const s = await getEventSummary(72);
  assertEq(s.period_hours, 72, 'period_hours reflects input');
  assertEq(queryLog[0].params[0], 72, 'hours param 72');
}

// Nulls coerced to 0
{
  reset();
  routes.push({
    match: /FROM platform_events/,
    rows: [{ total: null, critical: null, warning: null, success: null,
             task_events: null, ocr_events: null, system_events: null, alert_events: null }],
  });
  const s = await getEventSummary();
  assertEq(s.total, 0, 'null total → 0');
  assertEq(s.critical, 0, 'null critical → 0');
  assertEq(s.warning, 0, 'null warning → 0');
  assertEq(s.success, 0, 'null success → 0');
  assertEq(s.task_events, 0, 'null task → 0');
}

// String values coerced to numbers (MySQL SUM() sometimes returns strings)
{
  reset();
  routes.push({
    match: /FROM platform_events/,
    rows: [{ total: '50', critical: '2', warning: '10', success: '38',
             task_events: '20', ocr_events: '10', system_events: '15', alert_events: '5' }],
  });
  const s = await getEventSummary();
  assertEq(s.total, 50, 'string "50" → 50');
  assertEq(s.critical, 2, 'string "2" → 2');
  assertEq(typeof s.total, 'number', 'type is number');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main()

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
