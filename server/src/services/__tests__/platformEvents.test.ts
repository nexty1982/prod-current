#!/usr/bin/env npx tsx
/**
 * Unit tests for services/platformEvents.js (OMD-1179)
 *
 * Stubs ../config/db (getAppPool) with a route-dispatch fake pool and
 * ./workflowEngine with a scriptable evaluateWorkflowTriggers.
 *
 * Coverage:
 *   - publishPlatformEvent:
 *       · required-field validation (event_type, category, source_system, title)
 *       · severity/actor_type/platform normalization (invalid → defaults)
 *       · INSERT params (payload JSON-stringified, nulls preserved)
 *       · returns { id }
 *       · fires workflowEngine.evaluateWorkflowTriggers (swallowed on error)
 *   - evaluateRules (via publish + microtask settle):
 *       · matchesRule filter
 *       · cooldown check → 'skipped' rule run
 *       · count_threshold check (below → silent skip, at/above → executes)
 *       · executeAction success path → UPDATE last_fired_at + recordRuleRun success
 *       · executeAction throws → recordRuleRun failed
 *   - matchesRule (via rules):
 *       · event_type_pattern exact / LIKE '%' / miss
 *       · category mismatch
 *       · severity threshold (info < warning < critical)
 *       · condition_json source_system / platform
 *   - executeAction:
 *       · create_alert (config defaults + overrides)
 *       · create_task (omai_tasks INSERT + child task.created event)
 *       · log_only
 *       · unknown action_type → throws
 *   - queryEvents:
 *       · no filters → default limit/offset
 *       · each individual filter
 *       · combined filters + pagination
 *       · event_payload JSON string → parsed object
 *       · event_payload already object → passthrough
 *   - getEventSummary:
 *       · default 24h
 *       · custom hours
 *       · null aggregates → coerced to 0
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

// ── Fake pool ──────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

// Scriptable state
let rulesRows: any[] = [];
let insertIdCounter = 1000;
let publishInsertId = 5000;
let countResult = 0;
let alertInsertId = 7000;
let taskInsertId = 8000;
let queryEventsRows: any[] = [];
let summaryRows: any[] = [];
let throwOnPattern: RegExp | null = null;
let throwOnExecuteAction = false;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });

    if (throwOnPattern && throwOnPattern.test(sql)) {
      throw new Error('fake db failure');
    }

    // platform_event_rules SELECT
    if (/FROM platform_event_rules WHERE is_enabled = 1/i.test(sql)) {
      return [rulesRows];
    }

    // COUNT(*) for count_threshold
    if (/SELECT COUNT\(\*\) AS cnt FROM platform_events/i.test(sql)) {
      return [[{ cnt: countResult }]];
    }

    // UPDATE last_fired_at
    if (/UPDATE platform_event_rules SET last_fired_at/i.test(sql)) {
      return [{ affectedRows: 1 }];
    }

    // recordRuleRun INSERT
    if (/INSERT INTO platform_event_rule_runs/i.test(sql)) {
      return [{ insertId: ++insertIdCounter }];
    }

    // executeAction throw simulation (for create_alert / create_task / log_only)
    // By default they succeed; throwOnExecuteAction short-circuits them
    if (throwOnExecuteAction && /INSERT INTO platform_events/i.test(sql) && /alert\.created/.test(sql)) {
      throw new Error('action failed');
    }

    // create_alert INSERT (second branch of INSERT INTO platform_events — the child event)
    if (/INSERT INTO platform_events/i.test(sql) && /alert\.created/.test(sql)) {
      return [{ insertId: alertInsertId }];
    }

    // create_task INSERT into omai_tasks
    if (/INSERT INTO omai_tasks/i.test(sql)) {
      return [{ insertId: taskInsertId }];
    }

    // create_task child task.created event
    if (/INSERT INTO platform_events/i.test(sql) && /task\.created/.test(sql)) {
      return [{ insertId: ++insertIdCounter }];
    }

    // publish INSERT (generic platform_events insert)
    if (/INSERT INTO platform_events/i.test(sql)) {
      return [{ insertId: publishInsertId }];
    }

    // queryEvents SELECT
    if (/FROM platform_events WHERE 1=1/i.test(sql) || /FROM platform_events WHERE/i.test(sql)) {
      return [queryEventsRows];
    }

    // getEventSummary SELECT
    if (/SELECT[\s\S]*COUNT\(\*\) AS total/i.test(sql)) {
      return [summaryRows];
    }

    return [[]];
  },
};

function resetState() {
  queryLog.length = 0;
  rulesRows = [];
  insertIdCounter = 1000;
  publishInsertId = 5000;
  countResult = 0;
  alertInsertId = 7000;
  taskInsertId = 8000;
  queryEventsRows = [];
  summaryRows = [];
  throwOnPattern = null;
  throwOnExecuteAction = false;
}

// ── Silence console ────────────────────────────────────────────
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

// ── Stub ../config/db ──────────────────────────────────────────
const dbStub = { getAppPool: () => fakePool };
try {
  const dbJs = require.resolve('../../config/db');
  require.cache[dbJs] = {
    id: dbJs, filename: dbJs, loaded: true, exports: dbStub,
  } as any;
} catch {}

// ── Stub ./workflowEngine ──────────────────────────────────────
let workflowTriggerCalls: Array<{ eventId: number; evt: any }> = [];
let workflowThrows = false;
const workflowStub = {
  evaluateWorkflowTriggers: async (eventId: number, evt: any) => {
    workflowTriggerCalls.push({ eventId, evt });
    if (workflowThrows) throw new Error('workflow trigger failed');
    return { matched: 0 };
  },
};
try {
  const wfJs = require.resolve('../workflowEngine');
  require.cache[wfJs] = {
    id: wfJs, filename: wfJs, loaded: true, exports: workflowStub,
  } as any;
} catch {}

// ── Micro-task settle helper ───────────────────────────────────
async function settle() {
  // Flush fire-and-forget promises scheduled inside publishPlatformEvent
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setImmediate(r));
  }
}

const {
  publishPlatformEvent,
  queryEvents,
  getEventSummary,
} = require('../platformEvents');

async function main() {

// ============================================================================
// publishPlatformEvent — validation
// ============================================================================
console.log('\n── publishPlatformEvent: validation ──────────────────────');

resetState();
{
  const bases = [
    { skip: 'event_type', msg: 'event_type is required' },
    { skip: 'category', msg: 'category is required' },
    { skip: 'source_system', msg: 'source_system is required' },
    { skip: 'title', msg: 'title is required' },
  ];
  for (const b of bases) {
    const evt: any = {
      event_type: 'x.y', category: 'system',
      source_system: 'test', title: 'T',
    };
    delete evt[b.skip];
    let caught: Error | null = null;
    try { await publishPlatformEvent(evt); }
    catch (e: any) { caught = e; }
    assert(caught !== null, `missing ${b.skip} throws`);
    assert(caught !== null && caught.message === b.msg, `error message: ${b.msg}`);
  }
}

// ============================================================================
// publishPlatformEvent — happy path
// ============================================================================
console.log('\n── publishPlatformEvent: happy path ──────────────────────');

resetState();
workflowTriggerCalls = [];
publishInsertId = 5555;
{
  const evt = {
    event_type: 'task.created',
    category: 'task',
    severity: 'warning',
    source_system: 'task_runner',
    source_ref_id: 42,
    title: 'New task',
    message: 'details',
    event_payload: { foo: 'bar' },
    actor_type: 'agent',
    actor_id: 7,
    actor_name: 'claude',
    church_id: 46,
    platform: 'om',
  };
  const result = await publishPlatformEvent(evt);
  await settle();
  assertEq(result.id, 5555, 'returns inserted id');

  const ins = queryLog.find(c => /INSERT INTO platform_events/i.test(c.sql) && !/alert\.created/.test(c.sql) && !/task\.created/.test(c.sql));
  assert(!!ins, 'platform_events INSERT executed');
  assertEq(ins!.params[0], 'task.created', 'param[0] event_type');
  assertEq(ins!.params[1], 'task', 'param[1] category');
  assertEq(ins!.params[2], 'warning', 'param[2] severity');
  assertEq(ins!.params[3], 'task_runner', 'param[3] source_system');
  assertEq(ins!.params[4], 42, 'param[4] source_ref_id');
  assertEq(ins!.params[5], 'New task', 'param[5] title');
  assertEq(ins!.params[6], 'details', 'param[6] message');
  assertEq(ins!.params[7], JSON.stringify({ foo: 'bar' }), 'param[7] event_payload JSON');
  assertEq(ins!.params[8], 'agent', 'param[8] actor_type');
  assertEq(ins!.params[9], 7, 'param[9] actor_id');
  assertEq(ins!.params[10], 'claude', 'param[10] actor_name');
  assertEq(ins!.params[11], 46, 'param[11] church_id');
  assertEq(ins!.params[12], 'om', 'param[12] platform');

  // workflow trigger fired
  assertEq(workflowTriggerCalls.length, 1, 'workflow trigger called once');
  assertEq(workflowTriggerCalls[0].eventId, 5555, 'workflow gets eventId');
}

// Minimal evt — defaults applied
resetState();
workflowTriggerCalls = [];
{
  const result = await publishPlatformEvent({
    event_type: 'x.y', category: 'system',
    source_system: 't', title: 'T',
  });
  await settle();
  const ins = queryLog[0];
  assertEq(ins.params[2], 'info', 'default severity = info');
  assertEq(ins.params[8], 'system', 'default actor_type = system');
  assertEq(ins.params[12], 'shared', 'default platform = shared');
  assertEq(ins.params[4], null, 'null source_ref_id');
  assertEq(ins.params[6], null, 'null message');
  assertEq(ins.params[7], null, 'null event_payload');
  assertEq(ins.params[9], null, 'null actor_id');
  assertEq(ins.params[10], null, 'null actor_name');
  assertEq(ins.params[11], null, 'null church_id');
  assert(typeof result.id === 'number', 'returns numeric id');
}

// Invalid enums → coerced to default
resetState();
quiet();
{
  await publishPlatformEvent({
    event_type: 'x.y', category: 'c',
    source_system: 's', title: 'T',
    severity: 'BOGUS', actor_type: 'BOGUS', platform: 'BOGUS',
  });
  await settle();
  loud();
  const ins = queryLog[0];
  assertEq(ins.params[2], 'info', 'bogus severity → info');
  assertEq(ins.params[8], 'system', 'bogus actor_type → system');
  assertEq(ins.params[12], 'shared', 'bogus platform → shared');
}

// Workflow engine throws → swallowed
resetState();
workflowThrows = true;
quiet();
{
  const result = await publishPlatformEvent({
    event_type: 'x.y', category: 'c',
    source_system: 's', title: 'T',
  });
  await settle();
  loud();
  assert(typeof result.id === 'number', 'publish succeeds even if workflow throws');
}
workflowThrows = false;

// ============================================================================
// evaluateRules — matchesRule filtering
// ============================================================================
console.log('\n── evaluateRules: matchesRule filtering ──────────────────');

// event_type_pattern exact match vs miss
resetState();
rulesRows = [
  { id: 1, event_type_pattern: 'task.created', category: null,
    severity_threshold: null, condition_json: null, action_type: 'log_only',
    action_config_json: null, cooldown_seconds: 0, last_fired_at: null, name: 'r1' },
  { id: 2, event_type_pattern: 'nomatch', category: null,
    severity_threshold: null, condition_json: null, action_type: 'log_only',
    action_config_json: null, cooldown_seconds: 0, last_fired_at: null, name: 'r2' },
];
quiet();
{
  await publishPlatformEvent({
    event_type: 'task.created', category: 'task',
    source_system: 's', title: 'T',
  });
  await settle();
  loud();
  // Rule 1 fires → UPDATE last_fired_at and recordRuleRun('success')
  const updates = queryLog.filter(c => /UPDATE platform_event_rules SET last_fired_at/i.test(c.sql));
  assertEq(updates.length, 1, 'exactly one rule fired (rule 1)');
  assertEq(updates[0].params[0], 1, 'rule 1 updated');
  const runs = queryLog.filter(c => /INSERT INTO platform_event_rule_runs/i.test(c.sql));
  assertEq(runs.length, 1, 'one rule run recorded');
  assertEq(runs[0].params[4], 'success', 'success status');
}

// LIKE pattern match
resetState();
rulesRows = [
  { id: 1, event_type_pattern: 'task.%', category: null,
    severity_threshold: null, condition_json: null, action_type: 'log_only',
    action_config_json: null, cooldown_seconds: 0, last_fired_at: null, name: 'like-rule' },
];
quiet();
{
  await publishPlatformEvent({
    event_type: 'task.updated', category: 'task',
    source_system: 's', title: 'T',
  });
  await settle();
  loud();
  const updates = queryLog.filter(c => /UPDATE platform_event_rules SET last_fired_at/i.test(c.sql));
  assertEq(updates.length, 1, 'LIKE task.% matched task.updated');
}

// LIKE pattern miss
resetState();
rulesRows = [
  { id: 1, event_type_pattern: 'task.%', category: null,
    severity_threshold: null, condition_json: null, action_type: 'log_only',
    action_config_json: null, cooldown_seconds: 0, last_fired_at: null, name: 'like-rule' },
];
quiet();
{
  await publishPlatformEvent({
    event_type: 'ocr.completed', category: 'ocr',
    source_system: 's', title: 'T',
  });
  await settle();
  loud();
  const updates = queryLog.filter(c => /UPDATE platform_event_rules SET last_fired_at/i.test(c.sql));
  assertEq(updates.length, 0, 'LIKE task.% did not match ocr.completed');
}

// Category mismatch
resetState();
rulesRows = [
  { id: 1, event_type_pattern: null, category: 'alert',
    severity_threshold: null, condition_json: null, action_type: 'log_only',
    action_config_json: null, cooldown_seconds: 0, last_fired_at: null, name: 'cat' },
];
quiet();
{
  await publishPlatformEvent({
    event_type: 'x.y', category: 'task',
    source_system: 's', title: 'T',
  });
  await settle();
  loud();
  const updates = queryLog.filter(c => /UPDATE platform_event_rules SET last_fired_at/i.test(c.sql));
  assertEq(updates.length, 0, 'category mismatch → no fire');
}

// Severity threshold: info event vs warning threshold → skipped
resetState();
rulesRows = [
  { id: 1, event_type_pattern: null, category: null,
    severity_threshold: 'warning', condition_json: null, action_type: 'log_only',
    action_config_json: null, cooldown_seconds: 0, last_fired_at: null, name: 'sev' },
];
quiet();
{
  await publishPlatformEvent({
    event_type: 'x.y', category: 'c',
    severity: 'info',
    source_system: 's', title: 'T',
  });
  await settle();
  loud();
  const updates = queryLog.filter(c => /UPDATE platform_event_rules SET last_fired_at/i.test(c.sql));
  assertEq(updates.length, 0, 'info < warning → skip');
}

// Severity threshold: critical event vs warning threshold → fires
resetState();
rulesRows = [
  { id: 1, event_type_pattern: null, category: null,
    severity_threshold: 'warning', condition_json: null, action_type: 'log_only',
    action_config_json: null, cooldown_seconds: 0, last_fired_at: null, name: 'sev' },
];
quiet();
{
  await publishPlatformEvent({
    event_type: 'x.y', category: 'c',
    severity: 'critical',
    source_system: 's', title: 'T',
  });
  await settle();
  loud();
  const updates = queryLog.filter(c => /UPDATE platform_event_rules SET last_fired_at/i.test(c.sql));
  assertEq(updates.length, 1, 'critical >= warning → fire');
}

// condition_json source_system
resetState();
rulesRows = [
  { id: 1, event_type_pattern: null, category: null,
    severity_threshold: null,
    condition_json: JSON.stringify({ source_system: 'ocr_worker' }),
    action_type: 'log_only', action_config_json: null,
    cooldown_seconds: 0, last_fired_at: null, name: 'src' },
];
quiet();
{
  // Wrong source → skip
  await publishPlatformEvent({
    event_type: 'x.y', category: 'c',
    source_system: 'other', title: 'T',
  });
  await settle();
  loud();
  let updates = queryLog.filter(c => /UPDATE platform_event_rules SET last_fired_at/i.test(c.sql));
  assertEq(updates.length, 0, 'condition.source_system mismatch skip');
}
resetState();
rulesRows = [
  { id: 1, event_type_pattern: null, category: null,
    severity_threshold: null,
    condition_json: JSON.stringify({ source_system: 'ocr_worker' }),
    action_type: 'log_only', action_config_json: null,
    cooldown_seconds: 0, last_fired_at: null, name: 'src' },
];
quiet();
{
  await publishPlatformEvent({
    event_type: 'x.y', category: 'c',
    source_system: 'ocr_worker', title: 'T',
  });
  await settle();
  loud();
  let updates = queryLog.filter(c => /UPDATE platform_event_rules SET last_fired_at/i.test(c.sql));
  assertEq(updates.length, 1, 'condition.source_system match → fire');
}

// condition_json platform
resetState();
rulesRows = [
  { id: 1, event_type_pattern: null, category: null,
    severity_threshold: null,
    condition_json: JSON.stringify({ platform: 'omai' }),
    action_type: 'log_only', action_config_json: null,
    cooldown_seconds: 0, last_fired_at: null, name: 'plat' },
];
quiet();
{
  await publishPlatformEvent({
    event_type: 'x.y', category: 'c',
    source_system: 's', title: 'T', platform: 'om',
  });
  await settle();
  loud();
  const updates = queryLog.filter(c => /UPDATE platform_event_rules SET last_fired_at/i.test(c.sql));
  assertEq(updates.length, 0, 'condition.platform mismatch skip');
}

// ============================================================================
// evaluateRules — cooldown
// ============================================================================
console.log('\n── evaluateRules: cooldown ───────────────────────────────');

resetState();
// last_fired_at 1 second ago, cooldown 60s → skip
rulesRows = [
  { id: 1, event_type_pattern: null, category: null,
    severity_threshold: null, condition_json: null,
    action_type: 'log_only', action_config_json: null,
    cooldown_seconds: 60, last_fired_at: new Date(Date.now() - 1000), name: 'cd' },
];
quiet();
{
  await publishPlatformEvent({
    event_type: 'x.y', category: 'c',
    source_system: 's', title: 'T',
  });
  await settle();
  loud();
  const updates = queryLog.filter(c => /UPDATE platform_event_rules SET last_fired_at/i.test(c.sql));
  assertEq(updates.length, 0, 'within cooldown → no update');
  const runs = queryLog.filter(c => /INSERT INTO platform_event_rule_runs/i.test(c.sql));
  assertEq(runs.length, 1, 'one skipped run recorded');
  assertEq(runs[0].params[4], 'skipped', 'status = skipped');
  assertEq(runs[0].params[5], 'Cooldown active', 'reason');
}

// Cooldown elapsed → fire
resetState();
rulesRows = [
  { id: 1, event_type_pattern: null, category: null,
    severity_threshold: null, condition_json: null,
    action_type: 'log_only', action_config_json: null,
    cooldown_seconds: 60, last_fired_at: new Date(Date.now() - 120_000), name: 'cd' },
];
quiet();
{
  await publishPlatformEvent({
    event_type: 'x.y', category: 'c',
    source_system: 's', title: 'T',
  });
  await settle();
  loud();
  const updates = queryLog.filter(c => /UPDATE platform_event_rules SET last_fired_at/i.test(c.sql));
  assertEq(updates.length, 1, 'cooldown elapsed → fire');
}

// ============================================================================
// evaluateRules — count_threshold
// ============================================================================
console.log('\n── evaluateRules: count_threshold ────────────────────────');

resetState();
rulesRows = [
  { id: 1, event_type_pattern: null, category: null,
    severity_threshold: null,
    condition_json: JSON.stringify({ count_threshold: 5, time_window_seconds: 900 }),
    action_type: 'log_only', action_config_json: null,
    cooldown_seconds: 0, last_fired_at: null, name: 'ct' },
];
countResult = 3;  // below threshold
quiet();
{
  await publishPlatformEvent({
    event_type: 'x.y', category: 'c',
    source_system: 's', title: 'T',
  });
  await settle();
  loud();
  const updates = queryLog.filter(c => /UPDATE platform_event_rules SET last_fired_at/i.test(c.sql));
  assertEq(updates.length, 0, 'count below threshold → silent skip');
  const runs = queryLog.filter(c => /INSERT INTO platform_event_rule_runs/i.test(c.sql));
  assertEq(runs.length, 0, 'no rule run for silent skip');
}

// At threshold → fires
resetState();
rulesRows = [
  { id: 1, event_type_pattern: null, category: null,
    severity_threshold: null,
    condition_json: JSON.stringify({ count_threshold: 5 }),
    action_type: 'log_only', action_config_json: null,
    cooldown_seconds: 0, last_fired_at: null, name: 'ct' },
];
countResult = 5;
quiet();
{
  await publishPlatformEvent({
    event_type: 'x.y', category: 'c',
    source_system: 's', title: 'T',
  });
  await settle();
  loud();
  const updates = queryLog.filter(c => /UPDATE platform_event_rules SET last_fired_at/i.test(c.sql));
  assertEq(updates.length, 1, 'count >= threshold → fire');
  // COUNT query used default time window (900)
  const countQ = queryLog.find(c => /SELECT COUNT\(\*\) AS cnt/i.test(c.sql));
  assertEq(countQ!.params[0], 'x.y', 'count query uses event_type');
  assertEq(countQ!.params[1], 900, 'default time_window_seconds = 900');
}

// ============================================================================
// executeAction — create_alert
// ============================================================================
console.log('\n── executeAction: create_alert ───────────────────────────');

resetState();
rulesRows = [
  { id: 10, event_type_pattern: null, category: null,
    severity_threshold: null, condition_json: null,
    action_type: 'create_alert',
    action_config_json: JSON.stringify({ title: 'Custom Alert', severity: 'warning' }),
    cooldown_seconds: 0, last_fired_at: null, name: 'alerter' },
];
alertInsertId = 9999;
quiet();
{
  await publishPlatformEvent({
    event_type: 'x.y', category: 'c',
    source_system: 's', title: 'T', platform: 'omai',
  });
  await settle();
  loud();
  const alertIns = queryLog.find(c => /INSERT INTO platform_events/i.test(c.sql) && /alert\.created/.test(c.sql));
  assert(!!alertIns, 'alert INSERT executed');
  assertEq(alertIns!.params[0], 'warning', 'config severity override');
  assertEq(alertIns!.params[2], 'Custom Alert', 'config title override');
  assertEq(alertIns!.params[5], 'omai', 'platform carried through');

  const runs = queryLog.filter(c => /INSERT INTO platform_event_rule_runs/i.test(c.sql));
  assertEq(runs.length, 1, 'one run recorded');
  assertEq(runs[0].params[3], 9999, 'target_ref_id = alert insertId');
  assertEq(runs[0].params[4], 'success', 'status = success');
}

// Defaults when config omitted
resetState();
rulesRows = [
  { id: 11, event_type_pattern: null, category: null,
    severity_threshold: null, condition_json: null,
    action_type: 'create_alert', action_config_json: null,
    cooldown_seconds: 0, last_fired_at: null, name: 'alerter2' },
];
quiet();
{
  await publishPlatformEvent({
    event_type: 'x.y', category: 'c',
    source_system: 's', title: 'BaseTitle',
  });
  await settle();
  loud();
  const alertIns = queryLog.find(c => /INSERT INTO platform_events/i.test(c.sql) && /alert\.created/.test(c.sql));
  assertEq(alertIns!.params[0], 'critical', 'default severity = critical');
  assertEq(alertIns!.params[2], 'Alert: BaseTitle', 'default title prefix');
  assertEq(alertIns!.params[5], 'shared', 'default platform = shared');
}

// ============================================================================
// executeAction — create_task
// ============================================================================
console.log('\n── executeAction: create_task ────────────────────────────');

resetState();
rulesRows = [
  { id: 20, event_type_pattern: null, category: null,
    severity_threshold: null, condition_json: null,
    action_type: 'create_task',
    action_config_json: JSON.stringify({ title: 'Fix this', task_type: 'bugfix' }),
    cooldown_seconds: 0, last_fired_at: null, name: 'tasker' },
];
taskInsertId = 8888;
quiet();
{
  await publishPlatformEvent({
    event_type: 'x.y', category: 'c',
    source_system: 's', title: 'T',
  });
  await settle();
  loud();
  const taskIns = queryLog.find(c => /INSERT INTO omai_tasks/i.test(c.sql));
  assert(!!taskIns, 'omai_tasks INSERT executed');
  assertEq(taskIns!.params[0], 'bugfix', 'task_type from config');
  assertEq(taskIns!.params[1], 'Fix this', 'task title from config');

  const childEvent = queryLog.find(c => /INSERT INTO platform_events/i.test(c.sql) && /task\.created/.test(c.sql));
  assert(!!childEvent, 'child task.created event published');
  assertEq(childEvent!.params[0], 8888, 'child event refs task insertId');

  const runs = queryLog.filter(c => /INSERT INTO platform_event_rule_runs/i.test(c.sql));
  assertEq(runs[0].params[3], 8888, 'target_ref_id = task insertId');
}

// Defaults
resetState();
rulesRows = [
  { id: 21, event_type_pattern: null, category: null,
    severity_threshold: null, condition_json: null,
    action_type: 'create_task', action_config_json: null,
    cooldown_seconds: 0, last_fired_at: null, name: 'tasker2' },
];
quiet();
{
  await publishPlatformEvent({
    event_type: 'x.y', category: 'c',
    source_system: 's', title: 'Origin',
  });
  await settle();
  loud();
  const taskIns = queryLog.find(c => /INSERT INTO omai_tasks/i.test(c.sql));
  assertEq(taskIns!.params[0], 'automated', 'default task_type = automated');
  assertEq(taskIns!.params[1], 'Auto-task: Origin', 'default title prefix');
}

// ============================================================================
// executeAction — log_only
// ============================================================================
console.log('\n── executeAction: log_only ───────────────────────────────');

resetState();
rulesRows = [
  { id: 30, event_type_pattern: null, category: null,
    severity_threshold: null, condition_json: null,
    action_type: 'log_only', action_config_json: null,
    cooldown_seconds: 0, last_fired_at: null, name: 'logger' },
];
quiet();
{
  await publishPlatformEvent({
    event_type: 'x.y', category: 'c',
    source_system: 's', title: 'T',
  });
  await settle();
  loud();
  const runs = queryLog.filter(c => /INSERT INTO platform_event_rule_runs/i.test(c.sql));
  assertEq(runs.length, 1, 'log_only records a run');
  assertEq(runs[0].params[2], 'log_only', 'action_taken = log_only');
  assertEq(runs[0].params[3], null, 'null target_ref_id');
  assertEq(runs[0].params[4], 'success', 'success status');
  assertEq(runs[0].params[5], 'Logged: logger', 'message includes rule name');
}

// ============================================================================
// executeAction — unknown type → recordRuleRun failed
// ============================================================================
console.log('\n── executeAction: unknown action_type ────────────────────');

resetState();
rulesRows = [
  { id: 40, event_type_pattern: null, category: null,
    severity_threshold: null, condition_json: null,
    action_type: 'bogus_action', action_config_json: null,
    cooldown_seconds: 0, last_fired_at: null, name: 'bogus' },
];
quiet();
{
  await publishPlatformEvent({
    event_type: 'x.y', category: 'c',
    source_system: 's', title: 'T',
  });
  await settle();
  loud();
  const runs = queryLog.filter(c => /INSERT INTO platform_event_rule_runs/i.test(c.sql));
  assertEq(runs.length, 1, 'failed run recorded');
  assertEq(runs[0].params[4], 'failed', 'status = failed');
  assert((runs[0].params[5] as string).includes('Unknown action_type'), 'error msg preserved');
  assertEq(runs[0].params[2], 'bogus_action', 'action_taken = bogus_action');
}

// ============================================================================
// queryEvents
// ============================================================================
console.log('\n── queryEvents ───────────────────────────────────────────');

// No filters → defaults
resetState();
queryEventsRows = [
  { id: 1, event_type: 'x.y', event_payload: '{"k":"v"}' },
];
{
  const rows = await queryEvents();
  assertEq(rows.length, 1, '1 row');
  assertEq(rows[0].event_payload, { k: 'v' } as any, 'JSON string parsed');
  const q = queryLog.find(c => /FROM platform_events/i.test(c.sql));
  assert(!!q, 'query executed');
  // params end with [limit, offset]
  assertEq(q!.params[q!.params.length - 2], 50, 'default limit 50');
  assertEq(q!.params[q!.params.length - 1], 0, 'default offset 0');
}

// event_payload as object passes through
resetState();
queryEventsRows = [
  { id: 2, event_type: 'x.y', event_payload: { already: 'obj' } },
];
{
  const rows = await queryEvents();
  assertEq(rows[0].event_payload, { already: 'obj' } as any, 'object payload unchanged');
}

// Each filter
resetState();
queryEventsRows = [];
{
  await queryEvents({
    platform: 'omai', category: 'task', severity: 'warning',
    church_id: 46, event_type: 'task.created', source_ref_id: 99,
    since: '2026-04-01', limit: 20, offset: 10,
  });
  const q = queryLog[0];
  // params: platform, category, severity, church_id, event_type, source_ref_id, since, limit, offset
  assertEq(q.params, ['omai', 'task', 'warning', 46, 'task.created', 99, '2026-04-01', 20, 10], 'all filters');
  assert(/AND platform = \?/.test(q.sql), 'platform clause');
  assert(/AND category = \?/.test(q.sql), 'category clause');
  assert(/AND severity = \?/.test(q.sql), 'severity clause');
  assert(/AND church_id = \?/.test(q.sql), 'church_id clause');
  assert(/AND event_type = \?/.test(q.sql), 'event_type clause');
  assert(/AND source_ref_id = \?/.test(q.sql), 'source_ref_id clause');
  assert(/AND created_at >= \?/.test(q.sql), 'since clause');
  assert(/LIMIT \? OFFSET \?/.test(q.sql), 'limit/offset');
}

// ============================================================================
// getEventSummary
// ============================================================================
console.log('\n── getEventSummary ───────────────────────────────────────');

resetState();
summaryRows = [{
  total: 100, critical: 5, warning: 10, success: 20,
  task_events: 30, ocr_events: 15, system_events: 25, alert_events: 5,
}];
{
  const s = await getEventSummary();
  assertEq(s.period_hours, 24, 'default 24 hours');
  assertEq(s.total, 100, 'total');
  assertEq(s.critical, 5, 'critical');
  assertEq(s.warning, 10, 'warning');
  assertEq(s.success, 20, 'success');
  assertEq(s.task_events, 30, 'task_events');
  assertEq(s.ocr_events, 15, 'ocr_events');
  assertEq(s.system_events, 25, 'system_events');
  assertEq(s.alert_events, 5, 'alert_events');
  const q = queryLog[0];
  assertEq(q.params[0], 24, 'query param = 24');
}

// Custom hours
resetState();
summaryRows = [{
  total: 5, critical: 0, warning: 0, success: 5,
  task_events: 0, ocr_events: 0, system_events: 0, alert_events: 0,
}];
{
  const s = await getEventSummary(72);
  assertEq(s.period_hours, 72, 'custom hours');
  const q = queryLog[0];
  assertEq(q.params[0], 72, 'query param = 72');
}

// Null aggregates → coerced to 0
resetState();
summaryRows = [{
  total: null, critical: null, warning: null, success: null,
  task_events: null, ocr_events: null, system_events: null, alert_events: null,
}];
{
  const s = await getEventSummary();
  assertEq(s.total, 0, 'null total → 0');
  assertEq(s.critical, 0, 'null critical → 0');
  assertEq(s.warning, 0, 'null warning → 0');
  assertEq(s.success, 0, 'null success → 0');
  assertEq(s.task_events, 0, 'null task_events → 0');
  assertEq(s.ocr_events, 0, 'null ocr_events → 0');
  assertEq(s.system_events, 0, 'null system_events → 0');
  assertEq(s.alert_events, 0, 'null alert_events → 0');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

}

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
