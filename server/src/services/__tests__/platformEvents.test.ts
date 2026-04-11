#!/usr/bin/env npx tsx
/**
 * Unit tests for services/platformEvents.js (OMD-1157)
 *
 * Centralized platform event publishing + rule evaluation.
 * External deps stubbed via require.cache BEFORE SUT require:
 *   - ../config/db                → getAppPool() route-dispatch fake pool
 *   - ./workflowEngine            → evaluateWorkflowTriggers observable stub
 *
 * Coverage:
 *   - publishPlatformEvent:
 *       · required field validation (event_type, category, source_system, title)
 *       · severity/actor_type/platform default when invalid
 *       · INSERT params order
 *       · event_payload serialized as JSON (null when absent)
 *       · source_ref_id/actor_id/church_id → null defaults
 *       · returns { id: insertId }
 *       · fires evaluateRules (observable)
 *       · fires evaluateWorkflowTriggers (observable)
 *       · workflowEngine not loaded → swallowed
 *   - evaluateRules (via publishPlatformEvent):
 *       · matching rule → action executed
 *       · no rules → no-op
 *       · cooldown active → recordRuleRun with 'skipped'
 *       · count_threshold not met → skipped silently
 *       · count_threshold met → executed
 *       · last_fired_at updated after success
 *       · action failure caught, recorded as 'failed'
 *   - matchesRule (indirectly):
 *       · event_type_pattern exact vs LIKE (%)
 *       · category filter
 *       · severity_threshold (info<warning<critical)
 *       · condition_json source_system / platform
 *   - executeAction:
 *       · create_alert → INSERT into platform_events with category='alert'
 *       · create_task → INSERT into omai_tasks + task.created event
 *       · log_only → no DB writes
 *       · unknown → throws (captured in rule_runs as 'failed')
 *   - queryEvents:
 *       · all filters composed
 *       · default limit=50 offset=0
 *       · JSON-string event_payload parsed into object
 *   - getEventSummary:
 *       · returns all count fields with period_hours
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

// ── require.cache stub helper ────────────────────────────────────────
function installStub(relPath: string, exports: any) {
  const tsxResolved = require.resolve(relPath);
  const jsPath = tsxResolved.replace(/\.ts$/, '.js');
  for (const p of [tsxResolved, jsPath]) {
    require.cache[p] = {
      id: p,
      filename: p,
      loaded: true,
      exports,
    } as any;
  }
}

// ── Fake pool ────────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

// Scriptable state
let eventInsertId = 1;
let alertInsertId = 2;
let taskInsertId = 3;
let rulesRows: any[] = [];
let countRow = { cnt: 0 };
let eventsRows: any[] = [];
let summaryRow: any = {
  total: 10, critical: 2, warning: 3, success: 1,
  task_events: 4, ocr_events: 5, system_events: 6, alert_events: 7,
};
let throwOnPattern: RegExp | null = null;

function resetState() {
  queryLog.length = 0;
  eventInsertId = 1;
  alertInsertId = 2;
  taskInsertId = 3;
  rulesRows = [];
  countRow = { cnt: 0 };
  eventsRows = [];
  summaryRow = {
    total: 10, critical: 2, warning: 3, success: 1,
    task_events: 4, ocr_events: 5, system_events: 6, alert_events: 7,
  };
  throwOnPattern = null;
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });

    if (throwOnPattern && throwOnPattern.test(sql)) {
      throw new Error('fake db failure');
    }

    // Order matters — more-specific patterns first.

    // UPDATE last_fired_at
    if (/UPDATE platform_event_rules SET last_fired_at/i.test(sql)) {
      return [{ affectedRows: 1 }];
    }

    // INSERT into platform_event_rule_runs
    if (/INSERT INTO platform_event_rule_runs/i.test(sql)) {
      return [{ insertId: 999 }];
    }

    // INSERT alert event (alert.created)
    if (/INSERT INTO platform_events[\s\S]*alert\.created/i.test(sql)) {
      return [{ insertId: alertInsertId }];
    }

    // INSERT task.created event (references omai_tasks)
    if (/INSERT INTO platform_events[\s\S]*task\.created/i.test(sql)) {
      return [{ insertId: 77 }];
    }

    // INSERT into omai_tasks
    if (/INSERT INTO omai_tasks/i.test(sql)) {
      return [{ insertId: taskInsertId }];
    }

    // Main publishPlatformEvent INSERT
    if (/INSERT INTO platform_events/i.test(sql)) {
      return [{ insertId: eventInsertId }];
    }

    // SELECT rules
    if (/FROM platform_event_rules WHERE is_enabled = 1/i.test(sql)) {
      return [rulesRows];
    }

    // SELECT count for threshold
    if (/SELECT COUNT\(\*\) AS cnt FROM platform_events/i.test(sql)) {
      return [[countRow]];
    }

    // SELECT events for queryEvents
    if (/FROM platform_events[\s\S]*ORDER BY created_at DESC/i.test(sql)) {
      return [eventsRows];
    }

    // getEventSummary aggregate
    if (/SELECT[\s\S]*COUNT\(\*\) AS total[\s\S]*FROM platform_events/i.test(sql)) {
      return [[summaryRow]];
    }

    return [[]];
  },
};

// ── Stubs ────────────────────────────────────────────────────────────
installStub('../../config/db', { getAppPool: () => fakePool });

// workflowEngine stub (observable)
const workflowTriggerCalls: Array<{ eventId: number; evt: any }> = [];
let workflowTriggerThrows = false;
let workflowTriggerRejects = false;
const workflowEngineStub = {
  evaluateWorkflowTriggers: async (eventId: number, evt: any) => {
    if (workflowTriggerThrows) throw new Error('sync wrap throw');
    workflowTriggerCalls.push({ eventId, evt });
    if (workflowTriggerRejects) throw new Error('async reject');
  },
};
installStub('../workflowEngine', workflowEngineStub);

// ── SUT ──────────────────────────────────────────────────────────────
const {
  publishPlatformEvent,
  queryEvents,
  getEventSummary,
} = require('../platformEvents');

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

// Give fire-and-forget callbacks a tick
const tick = () => new Promise(r => setImmediate(r));
const waitFor = async (fn: () => boolean, ms = 200) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (fn()) return;
    await tick();
  }
};

async function main() {

// ============================================================================
// publishPlatformEvent — validation
// ============================================================================
console.log('\n── publishPlatformEvent: validation ──────────────────────');

resetState();
{
  let caught: Error | null = null;
  try { await publishPlatformEvent({}); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /event_type/.test(caught!.message), 'missing event_type throws');
}

resetState();
{
  let caught: Error | null = null;
  try { await publishPlatformEvent({ event_type: 'x' }); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /category/.test(caught!.message), 'missing category throws');
}

resetState();
{
  let caught: Error | null = null;
  try { await publishPlatformEvent({ event_type: 'x', category: 'c' }); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /source_system/.test(caught!.message), 'missing source_system throws');
}

resetState();
{
  let caught: Error | null = null;
  try { await publishPlatformEvent({ event_type: 'x', category: 'c', source_system: 's' }); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /title/.test(caught!.message), 'missing title throws');
}

// ============================================================================
// publishPlatformEvent — happy path
// ============================================================================
console.log('\n── publishPlatformEvent: happy path ──────────────────────');

resetState();
eventInsertId = 555;
rulesRows = []; // no rules — isolate insert behavior
workflowTriggerCalls.length = 0;
{
  const result = await publishPlatformEvent({
    event_type: 'task.created',
    category: 'task',
    severity: 'warning',
    source_system: 'task_runner',
    source_ref_id: 42,
    title: 'Task created',
    message: 'foo',
    event_payload: { x: 1 },
    actor_type: 'agent',
    actor_id: 7,
    actor_name: 'bob',
    church_id: 46,
    platform: 'omai',
  });

  assertEq(result, { id: 555 }, 'returns {id: insertId}');

  // First query should be the INSERT
  const insert = queryLog[0];
  assert(/INSERT INTO platform_events/i.test(insert.sql), 'first query is INSERT');
  assertEq(insert.params[0], 'task.created', 'param[0] event_type');
  assertEq(insert.params[1], 'task', 'param[1] category');
  assertEq(insert.params[2], 'warning', 'param[2] severity');
  assertEq(insert.params[3], 'task_runner', 'param[3] source_system');
  assertEq(insert.params[4], 42, 'param[4] source_ref_id');
  assertEq(insert.params[5], 'Task created', 'param[5] title');
  assertEq(insert.params[6], 'foo', 'param[6] message');
  assertEq(insert.params[7], JSON.stringify({ x: 1 }), 'param[7] event_payload serialized');
  assertEq(insert.params[8], 'agent', 'param[8] actor_type');
  assertEq(insert.params[9], 7, 'param[9] actor_id');
  assertEq(insert.params[10], 'bob', 'param[10] actor_name');
  assertEq(insert.params[11], 46, 'param[11] church_id');
  assertEq(insert.params[12], 'omai', 'param[12] platform');

  // Wait for fire-and-forget
  await waitFor(() => workflowTriggerCalls.length > 0);
  assertEq(workflowTriggerCalls.length, 1, 'workflowEngine.evaluateWorkflowTriggers called');
  assertEq(workflowTriggerCalls[0].eventId, 555, 'workflowEngine got eventId');
  assertEq(workflowTriggerCalls[0].evt.event_type, 'task.created', 'workflowEngine got evt');
}

// Defaults: unknown severity/actor_type/platform → canonical defaults
resetState();
rulesRows = [];
workflowTriggerCalls.length = 0;
{
  await publishPlatformEvent({
    event_type: 'x', category: 'y', source_system: 's', title: 't',
    severity: 'bogus', actor_type: 'nope', platform: 'wat',
  });
  const insert = queryLog[0];
  assertEq(insert.params[2], 'info', 'invalid severity → info');
  assertEq(insert.params[8], 'system', 'invalid actor_type → system');
  assertEq(insert.params[12], 'shared', 'invalid platform → shared');
  assertEq(insert.params[4], null, 'missing source_ref_id → null');
  assertEq(insert.params[6], null, 'missing message → null');
  assertEq(insert.params[7], null, 'missing event_payload → null');
  assertEq(insert.params[9], null, 'missing actor_id → null');
  assertEq(insert.params[10], null, 'missing actor_name → null');
  assertEq(insert.params[11], null, 'missing church_id → null');
}

// All-valid severities round-trip
for (const sev of ['info', 'warning', 'critical', 'success']) {
  resetState();
  rulesRows = [];
  await publishPlatformEvent({
    event_type: 'x', category: 'y', source_system: 's', title: 't', severity: sev,
  });
  const mainInsert = queryLog.find(q => /INSERT INTO platform_events/i.test(q.sql))!;
  assertEq(mainInsert.params[2], sev, `sev ${sev} preserved`);
}

// workflowEngine require() throws synchronously → swallowed
resetState();
rulesRows = [];
// Temporarily replace workflowEngine with a proxy that throws on property access
const origExports = workflowEngineStub.evaluateWorkflowTriggers;
(workflowEngineStub as any).evaluateWorkflowTriggers = () => {
  throw new Error('sync wrap throw');
};
quiet();
{
  const result = await publishPlatformEvent({
    event_type: 'x', category: 'y', source_system: 's', title: 't',
  });
  loud();
  assertEq(result.id, eventInsertId, 'still returns id even if workflow engine throws sync');
}
(workflowEngineStub as any).evaluateWorkflowTriggers = origExports;

// workflowEngine returns rejected promise → swallowed via .catch
resetState();
rulesRows = [];
workflowTriggerRejects = true;
quiet();
{
  const result = await publishPlatformEvent({
    event_type: 'x', category: 'y', source_system: 's', title: 't',
  });
  await tick();
  await tick();
  loud();
  assert(result.id !== undefined, 'async workflow reject does not crash');
}
workflowTriggerRejects = false;

// ============================================================================
// Rule evaluation — matching & actions
// ============================================================================
console.log('\n── publishPlatformEvent: rule evaluation ─────────────────');

// No rules → no extra queries beyond the INSERT
resetState();
rulesRows = [];
await publishPlatformEvent({
  event_type: 'x', category: 'y', source_system: 's', title: 't',
});
await tick();
// Should have: main INSERT + SELECT rules
assert(queryLog.some(q => /FROM platform_event_rules/i.test(q.sql)), 'rules SELECT fired');
assert(
  !queryLog.some(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql)),
  'no rule-run record when no rules'
);

// Matching rule → log_only action executed
resetState();
rulesRows = [{
  id: 10,
  name: 'my rule',
  event_type_pattern: 'task.%',
  category: null,
  severity_threshold: null,
  condition_json: null,
  action_type: 'log_only',
  action_config_json: null,
  cooldown_seconds: 0,
  last_fired_at: null,
}];
await publishPlatformEvent({
  event_type: 'task.created',
  category: 'task',
  source_system: 's',
  title: 't',
});
await waitFor(() => queryLog.some(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql)));
{
  const run = queryLog.find(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql))!;
  assert(run !== undefined, 'log_only recorded run');
  assertEq(run.params[0], 10, 'rule_id');
  assertEq(run.params[2], 'log_only', 'action_taken');
  assertEq(run.params[4], 'success', 'status success');
}
assert(
  queryLog.some(q => /UPDATE platform_event_rules SET last_fired_at/i.test(q.sql)),
  'last_fired_at updated'
);

// event_type_pattern non-match → no run recorded
resetState();
rulesRows = [{
  id: 11, name: 'exact rule',
  event_type_pattern: 'task.created',
  category: null, severity_threshold: null,
  condition_json: null, action_type: 'log_only',
  action_config_json: null, cooldown_seconds: 0, last_fired_at: null,
}];
await publishPlatformEvent({
  event_type: 'task.updated', category: 'task', source_system: 's', title: 't',
});
await tick();
assert(
  !queryLog.some(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql)),
  'exact mismatch → no rule run'
);

// Category mismatch → no run
resetState();
rulesRows = [{
  id: 12, name: 'cat rule',
  event_type_pattern: null, category: 'alert',
  severity_threshold: null, condition_json: null,
  action_type: 'log_only', action_config_json: null,
  cooldown_seconds: 0, last_fired_at: null,
}];
await publishPlatformEvent({
  event_type: 'x', category: 'task', source_system: 's', title: 't',
});
await tick();
assert(
  !queryLog.some(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql)),
  'category mismatch → no rule run'
);

// Severity threshold — evt below threshold → no run
resetState();
rulesRows = [{
  id: 13, name: 'sev rule',
  event_type_pattern: null, category: null,
  severity_threshold: 'critical',
  condition_json: null, action_type: 'log_only',
  action_config_json: null, cooldown_seconds: 0, last_fired_at: null,
}];
await publishPlatformEvent({
  event_type: 'x', category: 'y', source_system: 's', title: 't', severity: 'warning',
});
await tick();
assert(
  !queryLog.some(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql)),
  'warning < critical → skipped'
);

// Severity threshold — evt at or above → run
resetState();
rulesRows = [{
  id: 14, name: 'sev rule2',
  event_type_pattern: null, category: null,
  severity_threshold: 'warning',
  condition_json: null, action_type: 'log_only',
  action_config_json: null, cooldown_seconds: 0, last_fired_at: null,
}];
await publishPlatformEvent({
  event_type: 'x', category: 'y', source_system: 's', title: 't', severity: 'critical',
});
await waitFor(() => queryLog.some(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql)));
assert(
  queryLog.some(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql)),
  'critical >= warning → fires'
);

// Cooldown active → skipped
resetState();
rulesRows = [{
  id: 15, name: 'cooldown rule',
  event_type_pattern: null, category: null, severity_threshold: null,
  condition_json: null, action_type: 'log_only',
  action_config_json: null,
  cooldown_seconds: 3600,
  last_fired_at: new Date(Date.now() - 60_000), // 1 min ago, cooldown 1h
}];
await publishPlatformEvent({
  event_type: 'x', category: 'y', source_system: 's', title: 't',
});
await waitFor(() => queryLog.some(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql)));
{
  const run = queryLog.find(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql))!;
  assertEq(run.params[4], 'skipped', 'cooldown → skipped');
  assertEq(run.params[5], 'Cooldown active', 'cooldown message');
}
assert(
  !queryLog.some(q => /UPDATE platform_event_rules SET last_fired_at/i.test(q.sql)),
  'last_fired_at not updated on cooldown skip'
);

// Cooldown expired → fires
resetState();
rulesRows = [{
  id: 16, name: 'expired cooldown',
  event_type_pattern: null, category: null, severity_threshold: null,
  condition_json: null, action_type: 'log_only',
  action_config_json: null,
  cooldown_seconds: 1,
  last_fired_at: new Date(Date.now() - 60_000), // 1 min ago, cooldown 1s
}];
await publishPlatformEvent({
  event_type: 'x', category: 'y', source_system: 's', title: 't',
});
await waitFor(() => queryLog.some(q => /UPDATE platform_event_rules SET last_fired_at/i.test(q.sql)));
{
  const run = queryLog.find(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql))!;
  assertEq(run.params[4], 'success', 'expired cooldown → success');
}

// Count threshold NOT met → skipped silently (no rule-run record)
resetState();
rulesRows = [{
  id: 17, name: 'count rule',
  event_type_pattern: null, category: null, severity_threshold: null,
  condition_json: JSON.stringify({ count_threshold: 5, time_window_seconds: 600 }),
  action_type: 'log_only', action_config_json: null,
  cooldown_seconds: 0, last_fired_at: null,
}];
countRow = { cnt: 3 };
await publishPlatformEvent({
  event_type: 'x', category: 'y', source_system: 's', title: 't',
});
await tick();
await tick();
assert(
  queryLog.some(q => /SELECT COUNT\(\*\) AS cnt/i.test(q.sql)),
  'count query fired'
);
assert(
  !queryLog.some(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql)),
  'threshold not met → no rule run'
);

// Count threshold met → fires
resetState();
rulesRows = [{
  id: 18, name: 'count rule 2',
  event_type_pattern: null, category: null, severity_threshold: null,
  condition_json: JSON.stringify({ count_threshold: 5 }),
  action_type: 'log_only', action_config_json: null,
  cooldown_seconds: 0, last_fired_at: null,
}];
countRow = { cnt: 10 };
await publishPlatformEvent({
  event_type: 'x', category: 'y', source_system: 's', title: 't',
});
await waitFor(() => queryLog.some(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql)));
{
  const run = queryLog.find(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql))!;
  assertEq(run.params[4], 'success', 'threshold met → success');
}

// ── condition_json source_system / platform ──
resetState();
rulesRows = [{
  id: 19, name: 'cond rule',
  event_type_pattern: null, category: null, severity_threshold: null,
  condition_json: JSON.stringify({ source_system: 'other_system' }),
  action_type: 'log_only', action_config_json: null,
  cooldown_seconds: 0, last_fired_at: null,
}];
await publishPlatformEvent({
  event_type: 'x', category: 'y', source_system: 's', title: 't',
});
await tick();
assert(
  !queryLog.some(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql)),
  'source_system mismatch → no rule run'
);

resetState();
rulesRows = [{
  id: 20, name: 'cond rule2',
  event_type_pattern: null, category: null, severity_threshold: null,
  condition_json: JSON.stringify({ platform: 'omai' }),
  action_type: 'log_only', action_config_json: null,
  cooldown_seconds: 0, last_fired_at: null,
}];
await publishPlatformEvent({
  event_type: 'x', category: 'y', source_system: 's', title: 't', platform: 'om',
});
await tick();
assert(
  !queryLog.some(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql)),
  'platform mismatch → no rule run'
);

// ============================================================================
// executeAction — create_alert
// ============================================================================
console.log('\n── executeAction: create_alert ───────────────────────────');

resetState();
rulesRows = [{
  id: 21, name: 'alert rule',
  event_type_pattern: null, category: null, severity_threshold: null,
  condition_json: null, action_type: 'create_alert',
  action_config_json: JSON.stringify({ title: 'Custom Alert', severity: 'warning' }),
  cooldown_seconds: 0, last_fired_at: null,
}];
alertInsertId = 888;
await publishPlatformEvent({
  event_type: 'system.down', category: 'system', source_system: 's', title: 'DB down',
});
await waitFor(() => queryLog.some(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql)));
{
  const alertInsert = queryLog.find(q => /INSERT INTO platform_events[\s\S]*alert\.created/i.test(q.sql))!;
  assert(alertInsert !== undefined, 'alert INSERT executed');
  assertEq(alertInsert.params[0], 'warning', 'config severity passed');
  assertEq(alertInsert.params[2], 'Custom Alert', 'config title passed');

  const run = queryLog.find(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql))!;
  assertEq(run.params[3], 888, 'target_ref_id = alert insertId');
  assertEq(run.params[4], 'success', 'success status');
}

// create_alert with default title/severity (no config)
resetState();
rulesRows = [{
  id: 22, name: 'default alert',
  event_type_pattern: null, category: null, severity_threshold: null,
  condition_json: null, action_type: 'create_alert',
  action_config_json: null,
  cooldown_seconds: 0, last_fired_at: null,
}];
await publishPlatformEvent({
  event_type: 'x', category: 'y', source_system: 's', title: 'Oh no',
});
await waitFor(() => queryLog.some(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql)));
{
  const alertInsert = queryLog.find(q => /INSERT INTO platform_events[\s\S]*alert\.created/i.test(q.sql))!;
  assertEq(alertInsert.params[0], 'critical', 'default severity critical');
  assertEq(alertInsert.params[2], 'Alert: Oh no', 'default title');
}

// ============================================================================
// executeAction — create_task
// ============================================================================
console.log('\n── executeAction: create_task ────────────────────────────');

resetState();
rulesRows = [{
  id: 23, name: 'task rule',
  event_type_pattern: null, category: null, severity_threshold: null,
  condition_json: null, action_type: 'create_task',
  action_config_json: JSON.stringify({ title: 'Do the thing', task_type: 'escalation' }),
  cooldown_seconds: 0, last_fired_at: null,
}];
taskInsertId = 404;
await publishPlatformEvent({
  event_type: 'x', category: 'y', source_system: 's', title: 't',
});
await waitFor(() => queryLog.some(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql)));
{
  const taskInsert = queryLog.find(q => /INSERT INTO omai_tasks/i.test(q.sql))!;
  assertEq(taskInsert.params[0], 'escalation', 'task_type from config');
  assertEq(taskInsert.params[1], 'Do the thing', 'task title from config');

  const taskEvent = queryLog.find(q => /INSERT INTO platform_events[\s\S]*task\.created/i.test(q.sql))!;
  assert(taskEvent !== undefined, 'task.created event inserted');
  assertEq(taskEvent.params[0], 404, 'event source_ref_id = task insertId');

  const run = queryLog.find(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql))!;
  assertEq(run.params[3], 404, 'rule run target_ref_id = task insertId');
}

// create_task defaults
resetState();
rulesRows = [{
  id: 24, name: 'default task',
  event_type_pattern: null, category: null, severity_threshold: null,
  condition_json: null, action_type: 'create_task',
  action_config_json: null,
  cooldown_seconds: 0, last_fired_at: null,
}];
await publishPlatformEvent({
  event_type: 'x', category: 'y', source_system: 's', title: 'Deploy failed',
});
await waitFor(() => queryLog.some(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql)));
{
  const taskInsert = queryLog.find(q => /INSERT INTO omai_tasks/i.test(q.sql))!;
  assertEq(taskInsert.params[0], 'automated', 'default task_type automated');
  assertEq(taskInsert.params[1], 'Auto-task: Deploy failed', 'default title');
}

// ============================================================================
// executeAction — unknown action_type → failed
// ============================================================================
console.log('\n── executeAction: unknown action_type ────────────────────');

resetState();
rulesRows = [{
  id: 25, name: 'bad action',
  event_type_pattern: null, category: null, severity_threshold: null,
  condition_json: null, action_type: 'nope',
  action_config_json: null,
  cooldown_seconds: 0, last_fired_at: null,
}];
quiet();
await publishPlatformEvent({
  event_type: 'x', category: 'y', source_system: 's', title: 't',
});
await waitFor(() => queryLog.some(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql)));
loud();
{
  const run = queryLog.find(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql))!;
  assertEq(run.params[2], 'nope', 'action_taken = nope');
  assertEq(run.params[4], 'failed', 'status failed');
  assert(/Unknown action_type/.test(run.params[5]), 'error message preserved');
}

// ============================================================================
// queryEvents
// ============================================================================
console.log('\n── queryEvents ────────────────────────────────────────────');

// Default params, no filters
resetState();
eventsRows = [
  { id: 1, event_type: 'task.created', category: 'task', event_payload: '{"a":1}' },
];
{
  const rows = await queryEvents();
  const q = queryLog.find(x => /FROM platform_events[\s\S]*ORDER BY created_at DESC/i.test(x.sql))!;
  assert(q !== undefined, 'SELECT fired');
  // Default limit=50 offset=0 → last two params
  const n = q.params.length;
  assertEq(q.params[n - 2], 50, 'default limit 50');
  assertEq(q.params[n - 1], 0, 'default offset 0');
  assertEq(rows.length, 1, '1 row returned');
  assertEq((rows[0] as any).event_payload, { a: 1 }, 'event_payload JSON parsed');
}

// All filters composed
resetState();
eventsRows = [];
{
  await queryEvents({
    platform: 'omai', category: 'task', severity: 'warning',
    church_id: 46, since: '2026-04-01',
    event_type: 'task.created', source_ref_id: 99,
    limit: 10, offset: 5,
  });
  const q = queryLog.find(x => /FROM platform_events[\s\S]*ORDER BY created_at DESC/i.test(x.sql))!;
  assert(/platform = \?/.test(q.sql), 'platform filter present');
  assert(/category = \?/.test(q.sql), 'category filter present');
  assert(/severity = \?/.test(q.sql), 'severity filter present');
  assert(/church_id = \?/.test(q.sql), 'church_id filter present');
  assert(/event_type = \?/.test(q.sql), 'event_type filter present');
  assert(/source_ref_id = \?/.test(q.sql), 'source_ref_id filter present');
  assert(/created_at >= \?/.test(q.sql), 'since filter present');

  // Order: platform, category, severity, church_id, event_type, source_ref_id, since, limit, offset
  assertEq(q.params[0], 'omai', 'platform param');
  assertEq(q.params[1], 'task', 'category param');
  assertEq(q.params[2], 'warning', 'severity param');
  assertEq(q.params[3], 46, 'church_id param');
  assertEq(q.params[4], 'task.created', 'event_type param');
  assertEq(q.params[5], 99, 'source_ref_id param');
  assertEq(q.params[6], '2026-04-01', 'since param');
  assertEq(q.params[7], 10, 'limit param');
  assertEq(q.params[8], 5, 'offset param');
}

// Non-string event_payload preserved as-is
resetState();
eventsRows = [{ id: 2, event_payload: { already: 'obj' } }];
{
  const rows = await queryEvents();
  assertEq((rows[0] as any).event_payload, { already: 'obj' }, 'object payload preserved');
}

// Invalid JSON payload → left as string (parse failure swallowed)
resetState();
eventsRows = [{ id: 3, event_payload: 'not json' }];
{
  const rows = await queryEvents();
  assertEq((rows[0] as any).event_payload, 'not json', 'invalid JSON left as-is');
}

// ============================================================================
// getEventSummary
// ============================================================================
console.log('\n── getEventSummary ────────────────────────────────────────');

resetState();
summaryRow = {
  total: 100, critical: 5, warning: 10, success: 3,
  task_events: 20, ocr_events: 15, system_events: 8, alert_events: 4,
};
{
  const r = await getEventSummary(12);
  assertEq(r.period_hours, 12, 'period_hours');
  assertEq(r.total, 100, 'total');
  assertEq(r.critical, 5, 'critical');
  assertEq(r.warning, 10, 'warning');
  assertEq(r.success, 3, 'success');
  assertEq(r.task_events, 20, 'task_events');
  assertEq(r.ocr_events, 15, 'ocr_events');
  assertEq(r.system_events, 8, 'system_events');
  assertEq(r.alert_events, 4, 'alert_events');
  const q = queryLog[0];
  assertEq(q.params[0], 12, 'hours param');
}

// Default hours = 24
resetState();
{
  const r = await getEventSummary();
  assertEq(r.period_hours, 24, 'default period_hours 24');
  const q = queryLog[0];
  assertEq(q.params[0], 24, 'default hours param');
}

// Null counts coerced to 0
resetState();
summaryRow = {
  total: null, critical: null, warning: null, success: null,
  task_events: null, ocr_events: null, system_events: null, alert_events: null,
};
{
  const r = await getEventSummary(1);
  assertEq(r.total, 0, 'null → 0 total');
  assertEq(r.critical, 0, 'null → 0 critical');
  assertEq(r.warning, 0, 'null → 0 warning');
  assertEq(r.success, 0, 'null → 0 success');
  assertEq(r.task_events, 0, 'null → 0 task_events');
  assertEq(r.ocr_events, 0, 'null → 0 ocr_events');
  assertEq(r.system_events, 0, 'null → 0 system_events');
  assertEq(r.alert_events, 0, 'null → 0 alert_events');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => {
  loud();
  console.error('Unhandled:', e);
  process.exit(1);
});
