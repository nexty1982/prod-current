#!/usr/bin/env npx tsx
/**
 * Unit tests for services/platformEvents.js (OMD-1232)
 *
 * Central platform event publisher + rule engine. Append-only.
 *
 * External deps stubbed via require.cache BEFORE requiring SUT:
 *   - ../config/db (getAppPool → fake pool with regex-keyed responders)
 *   - ./workflowEngine (dynamic require inside publishPlatformEvent —
 *                       stubbed so it's loadable at that point)
 *
 * Coverage:
 *   - publishPlatformEvent:
 *       · validation: missing event_type/category/source_system/title → throws
 *       · invalid severity/actor_type/platform normalized to defaults
 *       · happy path: INSERT executed with correct params, returns {id}
 *       · event_payload JSON-encoded
 *       · rule evaluation runs in background (doesn't block return)
 *   - evaluateRules (observed via publishPlatformEvent + rule fixtures):
 *       · no rules → no extra SQL
 *       · matching rule with create_alert action → inserts alert event + updates last_fired_at + records run
 *       · matching rule with create_task action → inserts omai_task + event + records run
 *       · matching rule with log_only action → records run success
 *       · matching rule with unknown action_type → records failed run
 *       · non-matching rule skipped
 *       · cooldown active → records 'skipped' run with "Cooldown active" message
 *       · count_threshold not met → no action, no run record
 *   - matchesRule (observed):
 *       · exact event_type_pattern
 *       · LIKE pattern with %
 *       · category mismatch
 *       · severity_threshold (info < warning < critical)
 *       · condition.source_system / platform
 *   - queryEvents:
 *       · no filters → base query, limit+offset bound
 *       · all filters bind in declared order
 *       · event_payload JSON string parsed
 *   - getEventSummary:
 *       · returns normalized counts + period_hours
 *       · null values coerced to 0
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

// ── config/db stub ───────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Responder = { match: RegExp; respond: (params: any[]) => any };
let responders: Responder[] = [];
let insertIdCounter = 1000;

function nextInsertId(): number {
  return ++insertIdCounter;
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of responders) {
      if (r.match.test(sql)) return [r.respond(params)];
    }
    // Default INSERT success with auto-incremented id
    if (/^\s*INSERT/i.test(sql)) return [{ insertId: nextInsertId() }];
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };
const path = require('path');
const dbDir = path.resolve(__dirname, '..', '..', 'config');
for (const ext of ['.js', '.ts']) {
  const p = path.join(dbDir, 'db' + ext);
  require.cache[p] = { id: p, filename: p, loaded: true, exports: dbStub } as any;
}

// ── workflowEngine stub (dynamic require) ────────────────────────────
const engineStub = {
  evaluateWorkflowTriggers: async () => undefined,
};
const servicesDir = path.resolve(__dirname, '..', '..', 'services');
for (const ext of ['.js', '.ts']) {
  const p = path.join(servicesDir, 'workflowEngine' + ext);
  require.cache[p] = { id: p, filename: p, loaded: true, exports: engineStub } as any;
}

function resetState() {
  queryLog.length = 0;
  responders = [];
  insertIdCounter = 1000;
}

// Silence
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const {
  publishPlatformEvent,
  queryEvents,
  getEventSummary,
} = require('../platformEvents');

async function main() {

// ============================================================================
// publishPlatformEvent: validation
// ============================================================================
console.log('\n── publishPlatformEvent: validation ──────────────────────');

resetState();
{
  let err: Error | null = null;
  try { await publishPlatformEvent({}); } catch (e: any) { err = e; }
  assert(err !== null && /event_type/.test(err.message), 'missing event_type');
}

resetState();
{
  let err: Error | null = null;
  try { await publishPlatformEvent({ event_type: 'x' }); } catch (e: any) { err = e; }
  assert(err !== null && /category/.test(err.message), 'missing category');
}

resetState();
{
  let err: Error | null = null;
  try { await publishPlatformEvent({ event_type: 'x', category: 'c' }); } catch (e: any) { err = e; }
  assert(err !== null && /source_system/.test(err.message), 'missing source_system');
}

resetState();
{
  let err: Error | null = null;
  try {
    await publishPlatformEvent({
      event_type: 'x', category: 'c', source_system: 's',
    });
  } catch (e: any) { err = e; }
  assert(err !== null && /title/.test(err.message), 'missing title');
}

// ============================================================================
// publishPlatformEvent: happy path + INSERT params
// ============================================================================
console.log('\n── publishPlatformEvent: happy path ──────────────────────');

resetState();
responders = [
  {
    match: /INSERT INTO platform_events/,
    respond: () => ({ insertId: 777 }),
  },
  { match: /FROM platform_event_rules/, respond: () => [] },
];
{
  const out = await publishPlatformEvent({
    event_type: 'task.created',
    category: 'task',
    source_system: 'tester',
    title: 'T',
    message: 'M',
    event_payload: { foo: 'bar' },
    severity: 'warning',
    actor_type: 'user',
    actor_id: 42,
    actor_name: 'Alice',
    church_id: 7,
    platform: 'om',
    source_ref_id: 99,
  });
  assertEq(out, { id: 777 }, 'returns insert id');

  const ins = queryLog.find(q => /INSERT INTO platform_events/.test(q.sql));
  assert(ins !== undefined, 'INSERT executed');
  // Params: [event_type, category, severity, source_system, source_ref_id, title, message, payload, actor_type, actor_id, actor_name, church_id, platform]
  assertEq(ins!.params[0], 'task.created', 'event_type');
  assertEq(ins!.params[1], 'task', 'category');
  assertEq(ins!.params[2], 'warning', 'severity');
  assertEq(ins!.params[3], 'tester', 'source_system');
  assertEq(ins!.params[4], 99, 'source_ref_id');
  assertEq(ins!.params[5], 'T', 'title');
  assertEq(ins!.params[6], 'M', 'message');
  assertEq(ins!.params[7], JSON.stringify({ foo: 'bar' }), 'payload JSON');
  assertEq(ins!.params[8], 'user', 'actor_type');
  assertEq(ins!.params[9], 42, 'actor_id');
  assertEq(ins!.params[10], 'Alice', 'actor_name');
  assertEq(ins!.params[11], 7, 'church_id');
  assertEq(ins!.params[12], 'om', 'platform');
}

// Invalid enums normalized to defaults
resetState();
responders = [
  { match: /INSERT INTO platform_events/, respond: () => ({ insertId: 1 }) },
  { match: /FROM platform_event_rules/, respond: () => [] },
];
{
  await publishPlatformEvent({
    event_type: 'x', category: 'c', source_system: 's', title: 't',
    severity: 'bogus',
    actor_type: 'notvalid',
    platform: 'mars',
  });
  const ins = queryLog.find(q => /INSERT INTO platform_events/.test(q.sql));
  assertEq(ins!.params[2], 'info', 'invalid severity → info');
  assertEq(ins!.params[8], 'system', 'invalid actor_type → system');
  assertEq(ins!.params[12], 'shared', 'invalid platform → shared');
}

// Default values for optional fields
resetState();
responders = [
  { match: /INSERT INTO platform_events/, respond: () => ({ insertId: 1 }) },
  { match: /FROM platform_event_rules/, respond: () => [] },
];
{
  await publishPlatformEvent({ event_type: 'x', category: 'c', source_system: 's', title: 't' });
  const ins = queryLog.find(q => /INSERT INTO platform_events/.test(q.sql));
  assertEq(ins!.params[4], null, 'source_ref_id default null');
  assertEq(ins!.params[6], null, 'message default null');
  assertEq(ins!.params[7], null, 'payload default null');
  assertEq(ins!.params[9], null, 'actor_id default null');
  assertEq(ins!.params[10], null, 'actor_name default null');
  assertEq(ins!.params[11], null, 'church_id default null');
}

// ============================================================================
// evaluateRules: matching create_alert action
// ============================================================================
console.log('\n── evaluateRules: create_alert ───────────────────────────');

resetState();
responders = [
  { match: /INSERT INTO platform_events/, respond: () => ({ insertId: nextInsertId() }) },
  {
    match: /FROM platform_event_rules/,
    respond: () => [
      {
        id: 10,
        name: 'AlertOnCritical',
        is_enabled: 1,
        event_type_pattern: 'system.error',
        category: null,
        severity_threshold: null,
        condition_json: null,
        action_type: 'create_alert',
        action_config_json: JSON.stringify({ title: 'System Down', severity: 'critical' }),
        cooldown_seconds: 0,
        last_fired_at: null,
      },
    ],
  },
  { match: /UPDATE platform_event_rules/, respond: () => ({ affectedRows: 1 }) },
  { match: /INSERT INTO platform_event_rule_runs/, respond: () => ({ insertId: 1 }) },
];

quiet();
await publishPlatformEvent({
  event_type: 'system.error', category: 'system', source_system: 's', title: 'crash',
});
// Wait for background rule evaluation to complete
await new Promise(r => setTimeout(r, 50));
loud();

{
  // Should see: 1 original INSERT, 1 SELECT rules, (skip count-threshold since no condition), 1 alert INSERT, 1 UPDATE last_fired_at, 1 INSERT rule_runs
  const inserts = queryLog.filter(q => /INSERT INTO platform_events/.test(q.sql));
  assertEq(inserts.length, 2, '2 event inserts (original + alert)');
  const alertIns = inserts[1];
  // The alert INSERT's 3rd "?" is severity (first param), hard-coded as severity in SUT
  assertEq(alertIns.params[0], 'critical', 'alert severity');
  // Title param (3rd "?"): "System Down"
  assertEq(alertIns.params[2], 'System Down', 'alert title from config');

  const updates = queryLog.filter(q => /UPDATE platform_event_rules/.test(q.sql));
  assertEq(updates.length, 1, 'last_fired_at updated');

  const runs = queryLog.filter(q => /INSERT INTO platform_event_rule_runs/.test(q.sql));
  assertEq(runs.length, 1, 'rule run recorded');
  assertEq(runs[0].params[4], 'success', 'run status=success');
}

// ============================================================================
// evaluateRules: create_task action
// ============================================================================
console.log('\n── evaluateRules: create_task ────────────────────────────');

resetState();
responders = [
  {
    match: /FROM platform_event_rules/,
    respond: () => [
      {
        id: 20,
        name: 'TaskOnOcrFail',
        is_enabled: 1,
        event_type_pattern: 'ocr.failed',
        category: null,
        severity_threshold: null,
        condition_json: null,
        action_type: 'create_task',
        action_config_json: JSON.stringify({ title: 'Fix OCR', task_type: 'ocr_investigation' }),
        cooldown_seconds: 0,
        last_fired_at: null,
      },
    ],
  },
  { match: /UPDATE platform_event_rules/, respond: () => ({ affectedRows: 1 }) },
  { match: /INSERT INTO platform_event_rule_runs/, respond: () => ({ insertId: 1 }) },
  // SUT uses the default INSERT handler for events + omai_tasks
];

quiet();
await publishPlatformEvent({
  event_type: 'ocr.failed', category: 'ocr', source_system: 's', title: 't',
});
await new Promise(r => setTimeout(r, 50));
loud();

{
  const taskInserts = queryLog.filter(q => /INSERT INTO omai_tasks/.test(q.sql));
  assertEq(taskInserts.length, 1, '1 task created');
  assertEq(taskInserts[0].params[0], 'ocr_investigation', 'task_type from config');
  assertEq(taskInserts[0].params[1], 'Fix OCR', 'task title from config');

  const runs = queryLog.filter(q => /INSERT INTO platform_event_rule_runs/.test(q.sql));
  assertEq(runs.length, 1, 'rule run recorded');
  assertEq(runs[0].params[4], 'success', 'success');
}

// ============================================================================
// evaluateRules: log_only action
// ============================================================================
console.log('\n── evaluateRules: log_only ───────────────────────────────');

resetState();
responders = [
  {
    match: /FROM platform_event_rules/,
    respond: () => [{
      id: 30, name: 'LogOnly', is_enabled: 1,
      event_type_pattern: 'x.y', category: null, severity_threshold: null,
      condition_json: null,
      action_type: 'log_only', action_config_json: null,
      cooldown_seconds: 0, last_fired_at: null,
    }],
  },
  { match: /UPDATE platform_event_rules/, respond: () => ({}) },
  { match: /INSERT INTO platform_event_rule_runs/, respond: () => ({}) },
];

quiet();
await publishPlatformEvent({ event_type: 'x.y', category: 'c', source_system: 's', title: 't' });
await new Promise(r => setTimeout(r, 50));
loud();

{
  const runs = queryLog.filter(q => /INSERT INTO platform_event_rule_runs/.test(q.sql));
  assertEq(runs.length, 1, 'logged');
  assertEq(runs[0].params[4], 'success', 'status success');
  assertEq(runs[0].params[3], null, 'no target_ref_id');
}

// ============================================================================
// evaluateRules: unknown action_type → failed
// ============================================================================
console.log('\n── evaluateRules: unknown action ─────────────────────────');

resetState();
responders = [
  {
    match: /FROM platform_event_rules/,
    respond: () => [{
      id: 40, name: 'Unknown', is_enabled: 1,
      event_type_pattern: 'x.y', category: null, severity_threshold: null,
      condition_json: null,
      action_type: 'bogus', action_config_json: null,
      cooldown_seconds: 0, last_fired_at: null,
    }],
  },
  { match: /INSERT INTO platform_event_rule_runs/, respond: () => ({}) },
];

quiet();
await publishPlatformEvent({ event_type: 'x.y', category: 'c', source_system: 's', title: 't' });
await new Promise(r => setTimeout(r, 50));
loud();

{
  const runs = queryLog.filter(q => /INSERT INTO platform_event_rule_runs/.test(q.sql));
  assertEq(runs.length, 1, 'failed run recorded');
  assertEq(runs[0].params[4], 'failed', 'status failed');
  assert(runs[0].params[5] !== null && /Unknown action_type/.test(runs[0].params[5]), 'error message');
}

// ============================================================================
// evaluateRules: cooldown
// ============================================================================
console.log('\n── evaluateRules: cooldown ───────────────────────────────');

resetState();
responders = [
  {
    match: /FROM platform_event_rules/,
    respond: () => [{
      id: 50, name: 'CooledDown', is_enabled: 1,
      event_type_pattern: 'x.y', category: null, severity_threshold: null,
      condition_json: null,
      action_type: 'log_only', action_config_json: null,
      cooldown_seconds: 3600,
      last_fired_at: new Date().toISOString(),  // fired right now
    }],
  },
  { match: /INSERT INTO platform_event_rule_runs/, respond: () => ({}) },
];

quiet();
await publishPlatformEvent({ event_type: 'x.y', category: 'c', source_system: 's', title: 't' });
await new Promise(r => setTimeout(r, 50));
loud();

{
  const runs = queryLog.filter(q => /INSERT INTO platform_event_rule_runs/.test(q.sql));
  assertEq(runs.length, 1, 'skipped run recorded');
  assertEq(runs[0].params[4], 'skipped', 'status skipped');
  assert(/Cooldown active/.test(runs[0].params[5]), 'cooldown message');
}

// ============================================================================
// evaluateRules: count_threshold not met → no action
// ============================================================================
console.log('\n── evaluateRules: count_threshold ────────────────────────');

resetState();
responders = [
  {
    match: /FROM platform_event_rules/,
    respond: () => [{
      id: 60, name: 'Threshold', is_enabled: 1,
      event_type_pattern: 'x.y', category: null, severity_threshold: null,
      condition_json: JSON.stringify({ count_threshold: 5, time_window_seconds: 600 }),
      action_type: 'log_only', action_config_json: null,
      cooldown_seconds: 0, last_fired_at: null,
    }],
  },
  {
    match: /SELECT COUNT\(\*\) AS cnt FROM platform_events/,
    respond: () => [{ cnt: 2 }],
  },
];

quiet();
await publishPlatformEvent({ event_type: 'x.y', category: 'c', source_system: 's', title: 't' });
await new Promise(r => setTimeout(r, 50));
loud();

{
  // With threshold not met, the SUT just `continue;`s without recording
  const runs = queryLog.filter(q => /INSERT INTO platform_event_rule_runs/.test(q.sql));
  assertEq(runs.length, 0, 'no run recorded');
}

// ============================================================================
// matchesRule: LIKE pattern
// ============================================================================
console.log('\n── matchesRule: LIKE pattern ─────────────────────────────');

resetState();
responders = [
  {
    match: /FROM platform_event_rules/,
    respond: () => [{
      id: 70, name: 'Wild', is_enabled: 1,
      event_type_pattern: 'task.%',
      category: null, severity_threshold: null,
      condition_json: null,
      action_type: 'log_only', action_config_json: null,
      cooldown_seconds: 0, last_fired_at: null,
    }],
  },
  { match: /INSERT INTO platform_event_rule_runs/, respond: () => ({}) },
];

quiet();
await publishPlatformEvent({ event_type: 'task.done', category: 'task', source_system: 's', title: 't' });
await new Promise(r => setTimeout(r, 50));
loud();

{
  const runs = queryLog.filter(q => /INSERT INTO platform_event_rule_runs/.test(q.sql));
  assertEq(runs.length, 1, 'LIKE matched');
}

// Non-match
resetState();
responders = [
  {
    match: /FROM platform_event_rules/,
    respond: () => [{
      id: 71, name: 'Wild', is_enabled: 1,
      event_type_pattern: 'task.%',
      category: null, severity_threshold: null,
      condition_json: null,
      action_type: 'log_only', action_config_json: null,
      cooldown_seconds: 0, last_fired_at: null,
    }],
  },
  { match: /INSERT INTO platform_event_rule_runs/, respond: () => ({}) },
];

quiet();
await publishPlatformEvent({ event_type: 'system.error', category: 'system', source_system: 's', title: 't' });
await new Promise(r => setTimeout(r, 50));
loud();
{
  const runs = queryLog.filter(q => /INSERT INTO platform_event_rule_runs/.test(q.sql));
  assertEq(runs.length, 0, 'non-match skipped');
}

// ============================================================================
// matchesRule: severity_threshold
// ============================================================================
console.log('\n── matchesRule: severity_threshold ───────────────────────');

// Event severity=info, threshold=warning → no match
resetState();
responders = [
  {
    match: /FROM platform_event_rules/,
    respond: () => [{
      id: 80, name: 'Sev', is_enabled: 1,
      event_type_pattern: null, category: null,
      severity_threshold: 'warning',
      condition_json: null,
      action_type: 'log_only', action_config_json: null,
      cooldown_seconds: 0, last_fired_at: null,
    }],
  },
  { match: /INSERT INTO platform_event_rule_runs/, respond: () => ({}) },
];

quiet();
await publishPlatformEvent({
  event_type: 'x.y', category: 'c', source_system: 's', title: 't',
  severity: 'info',
});
await new Promise(r => setTimeout(r, 50));
loud();
{
  const runs = queryLog.filter(q => /INSERT INTO platform_event_rule_runs/.test(q.sql));
  assertEq(runs.length, 0, 'below threshold → no match');
}

// Event severity=critical, threshold=warning → match
resetState();
responders = [
  {
    match: /FROM platform_event_rules/,
    respond: () => [{
      id: 81, name: 'Sev', is_enabled: 1,
      event_type_pattern: null, category: null,
      severity_threshold: 'warning',
      condition_json: null,
      action_type: 'log_only', action_config_json: null,
      cooldown_seconds: 0, last_fired_at: null,
    }],
  },
  { match: /UPDATE platform_event_rules/, respond: () => ({}) },
  { match: /INSERT INTO platform_event_rule_runs/, respond: () => ({}) },
];
quiet();
await publishPlatformEvent({
  event_type: 'x.y', category: 'c', source_system: 's', title: 't',
  severity: 'critical',
});
await new Promise(r => setTimeout(r, 50));
loud();
{
  const runs = queryLog.filter(q => /INSERT INTO platform_event_rule_runs/.test(q.sql));
  assertEq(runs.length, 1, 'at/above threshold → match');
}

// ============================================================================
// matchesRule: category mismatch
// ============================================================================
console.log('\n── matchesRule: category mismatch ────────────────────────');

resetState();
responders = [
  {
    match: /FROM platform_event_rules/,
    respond: () => [{
      id: 90, name: 'Cat', is_enabled: 1,
      event_type_pattern: null, category: 'task',
      severity_threshold: null,
      condition_json: null,
      action_type: 'log_only', action_config_json: null,
      cooldown_seconds: 0, last_fired_at: null,
    }],
  },
  { match: /INSERT INTO platform_event_rule_runs/, respond: () => ({}) },
];
quiet();
await publishPlatformEvent({ event_type: 'x.y', category: 'system', source_system: 's', title: 't' });
await new Promise(r => setTimeout(r, 50));
loud();
{
  const runs = queryLog.filter(q => /INSERT INTO platform_event_rule_runs/.test(q.sql));
  assertEq(runs.length, 0, 'category mismatch → skipped');
}

// ============================================================================
// matchesRule: condition.source_system / platform
// ============================================================================
console.log('\n── matchesRule: condition fields ─────────────────────────');

resetState();
responders = [
  {
    match: /FROM platform_event_rules/,
    respond: () => [{
      id: 100, name: 'CondSS', is_enabled: 1,
      event_type_pattern: null, category: null,
      severity_threshold: null,
      condition_json: JSON.stringify({ source_system: 'other' }),
      action_type: 'log_only', action_config_json: null,
      cooldown_seconds: 0, last_fired_at: null,
    }],
  },
  { match: /INSERT INTO platform_event_rule_runs/, respond: () => ({}) },
];
quiet();
await publishPlatformEvent({ event_type: 'x.y', category: 'c', source_system: 's', title: 't' });
await new Promise(r => setTimeout(r, 50));
loud();
{
  const runs = queryLog.filter(q => /INSERT INTO platform_event_rule_runs/.test(q.sql));
  assertEq(runs.length, 0, 'source_system mismatch → no match');
}

// ============================================================================
// queryEvents
// ============================================================================
console.log('\n── queryEvents ───────────────────────────────────────────');

resetState();
responders = [
  {
    match: /FROM platform_events/,
    respond: () => [
      { id: 1, event_type: 'x', event_payload: JSON.stringify({ a: 1 }) },
      { id: 2, event_type: 'y', event_payload: null },
    ],
  },
];
{
  const rows = await queryEvents();
  assertEq(rows.length, 2, '2 rows');
  assertEq(rows[0].event_payload, { a: 1 }, 'string payload parsed');
  assertEq(rows[1].event_payload, null, 'null payload preserved');
  // Default limit=50, offset=0
  const sel = queryLog.find(q => /FROM platform_events/.test(q.sql));
  assertEq(sel!.params, [50, 0], 'default limit/offset');
}

// All filters
resetState();
responders = [
  { match: /FROM platform_events/, respond: () => [] },
];
await queryEvents({
  platform: 'om',
  category: 'task',
  severity: 'critical',
  church_id: 5,
  event_type: 'x',
  source_ref_id: 9,
  since: '2026-01-01',
  limit: 10,
  offset: 20,
});
{
  const sel = queryLog.find(q => /FROM platform_events/.test(q.sql));
  assertEq(
    sel!.params,
    ['om', 'task', 'critical', 5, 'x', 9, '2026-01-01', 10, 20],
    'all filter params bound'
  );
}

// ============================================================================
// getEventSummary
// ============================================================================
console.log('\n── getEventSummary ───────────────────────────────────────');

resetState();
responders = [
  {
    match: /FROM platform_events/,
    respond: () => [{
      total: '42',
      critical: '3',
      warning: '5',
      success: '10',
      task_events: '8',
      ocr_events: '7',
      system_events: '4',
      alert_events: '2',
    }],
  },
];
{
  const s = await getEventSummary(12);
  assertEq(s.period_hours, 12, 'period');
  assertEq(s.total, 42, 'total coerced to number');
  assertEq(s.critical, 3, 'critical');
  assertEq(s.warning, 5, 'warning');
  assertEq(s.success, 10, 'success');
  assertEq(s.task_events, 8, 'task');
  assertEq(s.ocr_events, 7, 'ocr');
  assertEq(s.system_events, 4, 'system');
  assertEq(s.alert_events, 2, 'alert');
  // Params: [hours]
  assertEq(queryLog[0].params, [12], 'hours bound');
}

// Nulls → 0
resetState();
responders = [
  {
    match: /FROM platform_events/,
    respond: () => [{
      total: null, critical: null, warning: null, success: null,
      task_events: null, ocr_events: null, system_events: null, alert_events: null,
    }],
  },
];
{
  const s = await getEventSummary();
  assertEq(s.period_hours, 24, 'default hours');
  assertEq(s.total, 0, 'null → 0');
  assertEq(s.alert_events, 0, 'null → 0');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

}

main().catch((e) => {
  loud();
  console.error('Unhandled:', e);
  process.exit(1);
});
