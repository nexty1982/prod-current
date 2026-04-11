#!/usr/bin/env npx tsx
/**
 * Unit tests for services/platformEvents.js (OMD-1004)
 *
 * Covers:
 *   - publishPlatformEvent
 *       validation: event_type, category, source_system, title required
 *       defaults: severity, actor_type, platform
 *       INSERT params, returns {id}
 *       fire-and-forget rule evaluation (awaited via setTimeout flush)
 *   - matchesRule (indirectly via publishPlatformEvent → evaluateRules)
 *       event_type_pattern exact / LIKE, category, severity_threshold,
 *       condition.source_system / platform
 *   - executeAction branches
 *       create_alert  → INSERTs into platform_events (alert)
 *       create_task   → INSERTs into omai_tasks + platform_events
 *       log_only      → no side-effect insert
 *       unknown       → recorded as failed rule run
 *   - Cooldown: recent last_fired_at → skipped rule run
 *   - queryEvents  filters, default limit, JSON parsing
 *   - getEventSummary  shape + number coercion
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

// ── SQL-routed fake pool ──────────────────────────────────────────────────
type Call = { sql: string; params: any[] };
const queryCalls: Call[] = [];

function resetCalls() { queryCalls.length = 0; }

// Custom handler slot for stateful tests
let queryHandler: ((sql: string, params: any[]) => Promise<[any, any]>) | null = null;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryCalls.push({ sql, params });
    if (queryHandler) return queryHandler(sql, params);
    return [[], {}] as any;
  },
};

// ── Stub ../config/db BEFORE requiring SUT ───────────────────────────────
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

// ── Stub workflowEngine to prevent real require ──────────────────────────
const wfPath = require.resolve('../workflowEngine');
require.cache[wfPath] = {
  id: wfPath,
  filename: wfPath,
  loaded: true,
  exports: {
    evaluateWorkflowTriggers: async () => { /* no-op */ },
  },
} as any;

const svc = require('../platformEvents');
const { publishPlatformEvent, queryEvents, getEventSummary } = svc;

// Silence console for error logs from SUT
const origError = console.error;
function quiet() { console.error = () => {}; }
function loud() { console.error = origError; }

// Helper to wait for fire-and-forget async work
const flush = () => new Promise((r) => setTimeout(r, 20));

async function main() {

// ============================================================================
// publishPlatformEvent: validation
// ============================================================================
console.log('\n── publishPlatformEvent: validation ──────────────────────');

{
  let caught: Error | null = null;
  try { await publishPlatformEvent({} as any); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws without event_type');
  assert(caught !== null && caught.message.includes('event_type'), 'error mentions event_type');
}

{
  let caught: Error | null = null;
  try {
    await publishPlatformEvent({ event_type: 'x' } as any);
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws without category');
}

{
  let caught: Error | null = null;
  try {
    await publishPlatformEvent({ event_type: 'x', category: 'c' } as any);
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws without source_system');
}

{
  let caught: Error | null = null;
  try {
    await publishPlatformEvent({
      event_type: 'x', category: 'c', source_system: 's',
    } as any);
  } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws without title');
}

// ============================================================================
// publishPlatformEvent: defaults and INSERT
// ============================================================================
console.log('\n── publishPlatformEvent: INSERT ──────────────────────────');

resetCalls();
queryHandler = async (sql: string, params: any[]) => {
  if (/INSERT INTO platform_events/i.test(sql)) {
    return [{ insertId: 42 }, {}] as any;
  }
  if (/SELECT \* FROM platform_event_rules/i.test(sql)) {
    return [[], {}] as any;
  }
  return [[], {}] as any;
};

{
  const r = await publishPlatformEvent({
    event_type: 'task.created',
    category: 'task',
    source_system: 'task_runner',
    title: 'Task created',
    event_payload: { foo: 'bar' },
  });
  assertEq(r.id, 42, 'returns insertId');

  const insertCall = queryCalls.find(c => /INSERT INTO platform_events/i.test(c.sql));
  assert(insertCall !== undefined, 'INSERT executed');
  assertEq(insertCall!.params[0], 'task.created', 'event_type bound');
  assertEq(insertCall!.params[2], 'info', 'default severity = info');
  assertEq(insertCall!.params[7], JSON.stringify({ foo: 'bar' }), 'payload serialized');
  assertEq(insertCall!.params[8], 'system', 'default actor_type = system');
  assertEq(insertCall!.params[12], 'shared', 'default platform = shared');
}

// Invalid enum values → normalize to defaults
resetCalls();
{
  await publishPlatformEvent({
    event_type: 'x',
    category: 'c',
    source_system: 's',
    title: 't',
    severity: 'nonsense',
    actor_type: 'bogus',
    platform: 'invalid',
  } as any);
  const insertCall = queryCalls.find(c => /INSERT INTO platform_events/i.test(c.sql));
  assertEq(insertCall!.params[2], 'info', 'invalid severity → info');
  assertEq(insertCall!.params[8], 'system', 'invalid actor_type → system');
  assertEq(insertCall!.params[12], 'shared', 'invalid platform → shared');
}

// Valid enum values preserved
resetCalls();
{
  await publishPlatformEvent({
    event_type: 'x', category: 'c', source_system: 's', title: 't',
    severity: 'critical', actor_type: 'worker', platform: 'omai',
  });
  const insertCall = queryCalls.find(c => /INSERT INTO platform_events/i.test(c.sql));
  assertEq(insertCall!.params[2], 'critical', 'critical preserved');
  assertEq(insertCall!.params[8], 'worker', 'worker preserved');
  assertEq(insertCall!.params[12], 'omai', 'omai preserved');
}

// Null payload handled
resetCalls();
{
  await publishPlatformEvent({
    event_type: 'x', category: 'c', source_system: 's', title: 't',
  });
  const insertCall = queryCalls.find(c => /INSERT INTO platform_events/i.test(c.sql));
  assertEq(insertCall!.params[7], null, 'no payload → null');
}

// ============================================================================
// Rule evaluation: no matching rules
// ============================================================================
console.log('\n── Rules: no matches ─────────────────────────────────────');

resetCalls();
let ruleRunsRecorded = 0;
queryHandler = async (sql: string, params: any[]) => {
  if (/INSERT INTO platform_events/i.test(sql)) return [{ insertId: 1 }, {}] as any;
  if (/SELECT \* FROM platform_event_rules WHERE is_enabled/i.test(sql)) {
    return [[], {}] as any; // no rules
  }
  if (/INSERT INTO platform_event_rule_runs/i.test(sql)) {
    ruleRunsRecorded++;
    return [{}, {}] as any;
  }
  return [[], {}] as any;
};
{
  await publishPlatformEvent({
    event_type: 'noop.event', category: 'noop', source_system: 's', title: 't',
  });
  await flush();
  assertEq(ruleRunsRecorded, 0, 'no rule runs when no rules');
}

// ============================================================================
// Rule eval: matching exact event_type_pattern → create_alert
// ============================================================================
console.log('\n── Rules: create_alert ───────────────────────────────────');

resetCalls();
let alertInserted = false;
let updateLastFired = false;
const ruleRunParams: any[][] = [];
queryHandler = async (sql: string, params: any[]) => {
  if (/INSERT INTO platform_events[\s\S]*'alert\.created', 'alert'/i.test(sql)) {
    alertInserted = true;
    return [{ insertId: 101 }, {}] as any;
  }
  if (/INSERT INTO platform_events/i.test(sql)) {
    return [{ insertId: 1 }, {}] as any;
  }
  if (/SELECT \* FROM platform_event_rules WHERE is_enabled/i.test(sql)) {
    return [[{
      id: 10, name: 'Critical Alert Rule',
      event_type_pattern: 'system.failed',
      category: null,
      severity_threshold: null,
      condition_json: null,
      action_type: 'create_alert',
      action_config_json: JSON.stringify({ title: 'System Failed!', severity: 'critical' }),
      last_fired_at: null,
      cooldown_seconds: 0,
      is_enabled: 1,
    }], {}] as any;
  }
  if (/UPDATE platform_event_rules SET last_fired_at/i.test(sql)) {
    updateLastFired = true;
    return [{}, {}] as any;
  }
  if (/INSERT INTO platform_event_rule_runs/i.test(sql)) {
    ruleRunParams.push(params);
    return [{}, {}] as any;
  }
  return [[], {}] as any;
};
{
  await publishPlatformEvent({
    event_type: 'system.failed',
    category: 'system',
    source_system: 'health_check',
    title: 'System failed',
    severity: 'critical',
  });
  await flush();
  assert(alertInserted, 'create_alert inserted alert event');
  assert(updateLastFired, 'last_fired_at updated');
  assertEq(ruleRunParams.length, 1, '1 rule run recorded');
  assertEq(ruleRunParams[0][4], 'success', 'rule run status = success');
  assert(String(ruleRunParams[0][5]).includes('System Failed!'), 'rule run message');
}

// ============================================================================
// Rule eval: LIKE pattern matches → create_task
// ============================================================================
console.log('\n── Rules: LIKE pattern create_task ───────────────────────');

resetCalls();
let taskInserted = false;
let taskEventPublished = false;
queryHandler = async (sql: string, params: any[]) => {
  if (/INSERT INTO omai_tasks/i.test(sql)) {
    taskInserted = true;
    return [{ insertId: 200 }, {}] as any;
  }
  if (/'task\.created'/i.test(sql)) {
    taskEventPublished = true;
    return [{ insertId: 201 }, {}] as any;
  }
  if (/INSERT INTO platform_events/i.test(sql)) {
    return [{ insertId: 1 }, {}] as any;
  }
  if (/SELECT \* FROM platform_event_rules WHERE is_enabled/i.test(sql)) {
    return [[{
      id: 11, name: 'OCR Completion Task',
      event_type_pattern: 'ocr.%',
      category: 'ocr',
      severity_threshold: null,
      condition_json: null,
      action_type: 'create_task',
      action_config_json: JSON.stringify({ title: 'OCR Review', task_type: 'ocr_review' }),
      last_fired_at: null,
      cooldown_seconds: 0,
    }], {}] as any;
  }
  if (/UPDATE platform_event_rules/i.test(sql)) return [{}, {}] as any;
  if (/INSERT INTO platform_event_rule_runs/i.test(sql)) return [{}, {}] as any;
  return [[], {}] as any;
};
{
  await publishPlatformEvent({
    event_type: 'ocr.completed',
    category: 'ocr',
    source_system: 'ocr_worker',
    title: 'OCR done',
  });
  await flush();
  assert(taskInserted, 'task inserted via create_task');
  assert(taskEventPublished, 'task.created event published');
}

// ============================================================================
// Rule eval: log_only
// ============================================================================
console.log('\n── Rules: log_only ───────────────────────────────────────');

resetCalls();
const runs: any[][] = [];
queryHandler = async (sql: string, params: any[]) => {
  if (/INSERT INTO platform_events/i.test(sql)) return [{ insertId: 1 }, {}] as any;
  if (/SELECT \* FROM platform_event_rules WHERE is_enabled/i.test(sql)) {
    return [[{
      id: 12, name: 'LogThis',
      event_type_pattern: 'info.event',
      category: null, severity_threshold: null, condition_json: null,
      action_type: 'log_only',
      action_config_json: null,
      last_fired_at: null, cooldown_seconds: 0,
    }], {}] as any;
  }
  if (/UPDATE platform_event_rules/i.test(sql)) return [{}, {}] as any;
  if (/INSERT INTO platform_event_rule_runs/i.test(sql)) {
    runs.push(params);
    return [{}, {}] as any;
  }
  return [[], {}] as any;
};
{
  await publishPlatformEvent({
    event_type: 'info.event', category: 'info', source_system: 's', title: 't',
  });
  await flush();
  assertEq(runs.length, 1, 'rule run recorded for log_only');
  assertEq(runs[0][4], 'success', 'status = success');
}

// ============================================================================
// Rule eval: unknown action type → failed rule run
// ============================================================================
console.log('\n── Rules: unknown action ─────────────────────────────────');

resetCalls();
const failedRuns: any[][] = [];
quiet();
queryHandler = async (sql: string, params: any[]) => {
  if (/INSERT INTO platform_events/i.test(sql)) return [{ insertId: 1 }, {}] as any;
  if (/SELECT \* FROM platform_event_rules WHERE is_enabled/i.test(sql)) {
    return [[{
      id: 13, name: 'Unknown',
      event_type_pattern: 'x.y',
      category: null, severity_threshold: null, condition_json: null,
      action_type: 'bogus_action',
      action_config_json: null,
      last_fired_at: null, cooldown_seconds: 0,
    }], {}] as any;
  }
  if (/INSERT INTO platform_event_rule_runs/i.test(sql)) {
    failedRuns.push(params);
    return [{}, {}] as any;
  }
  return [[], {}] as any;
};
{
  await publishPlatformEvent({
    event_type: 'x.y', category: 'c', source_system: 's', title: 't',
  });
  await flush();
  assertEq(failedRuns.length, 1, '1 rule run recorded');
  assertEq(failedRuns[0][4], 'failed', 'status = failed');
  assert(String(failedRuns[0][5]).includes('bogus_action'), 'error mentions unknown type');
}
loud();

// ============================================================================
// Rule eval: cooldown active → skipped
// ============================================================================
console.log('\n── Rules: cooldown ───────────────────────────────────────');

resetCalls();
const cooldownRuns: any[][] = [];
queryHandler = async (sql: string, params: any[]) => {
  if (/INSERT INTO platform_events/i.test(sql)) return [{ insertId: 1 }, {}] as any;
  if (/SELECT \* FROM platform_event_rules WHERE is_enabled/i.test(sql)) {
    return [[{
      id: 14, name: 'CoolRule',
      event_type_pattern: 'x',
      category: null, severity_threshold: null, condition_json: null,
      action_type: 'log_only',
      action_config_json: null,
      last_fired_at: new Date().toISOString(), // just now
      cooldown_seconds: 3600, // 1 hour cooldown
    }], {}] as any;
  }
  if (/INSERT INTO platform_event_rule_runs/i.test(sql)) {
    cooldownRuns.push(params);
    return [{}, {}] as any;
  }
  return [[], {}] as any;
};
{
  await publishPlatformEvent({
    event_type: 'x', category: 'c', source_system: 's', title: 't',
  });
  await flush();
  assertEq(cooldownRuns.length, 1, 'rule run recorded');
  assertEq(cooldownRuns[0][4], 'skipped', 'status = skipped');
  assert(String(cooldownRuns[0][5]).includes('Cooldown'), 'reason = cooldown');
}

// ============================================================================
// Rule eval: category filter excludes
// ============================================================================
console.log('\n── Rules: category filter ────────────────────────────────');

resetCalls();
let logOnlyFired = false;
queryHandler = async (sql: string, params: any[]) => {
  if (/INSERT INTO platform_events/i.test(sql)) return [{ insertId: 1 }, {}] as any;
  if (/SELECT \* FROM platform_event_rules WHERE is_enabled/i.test(sql)) {
    return [[{
      id: 15, name: 'OnlyTask',
      event_type_pattern: null, // any type
      category: 'task',          // but only task category
      severity_threshold: null, condition_json: null,
      action_type: 'log_only',
      action_config_json: null,
      last_fired_at: null, cooldown_seconds: 0,
    }], {}] as any;
  }
  if (/INSERT INTO platform_event_rule_runs/i.test(sql)) {
    logOnlyFired = true;
    return [{}, {}] as any;
  }
  if (/UPDATE platform_event_rules/i.test(sql)) return [{}, {}] as any;
  return [[], {}] as any;
};
{
  await publishPlatformEvent({
    event_type: 'anything',
    category: 'system', // doesn't match 'task'
    source_system: 's', title: 't',
  });
  await flush();
  assertEq(logOnlyFired, false, 'rule skipped on category mismatch');
}

// ============================================================================
// Rule eval: severity threshold gate
// ============================================================================
console.log('\n── Rules: severity threshold ─────────────────────────────');

resetCalls();
let thresholdFired = false;
queryHandler = async (sql: string, params: any[]) => {
  if (/INSERT INTO platform_events/i.test(sql)) return [{ insertId: 1 }, {}] as any;
  if (/SELECT \* FROM platform_event_rules WHERE is_enabled/i.test(sql)) {
    return [[{
      id: 16, name: 'CriticalOnly',
      event_type_pattern: null, category: null,
      severity_threshold: 'critical', // only critical passes
      condition_json: null,
      action_type: 'log_only',
      action_config_json: null,
      last_fired_at: null, cooldown_seconds: 0,
    }], {}] as any;
  }
  if (/INSERT INTO platform_event_rule_runs/i.test(sql)) {
    thresholdFired = true;
    return [{}, {}] as any;
  }
  if (/UPDATE platform_event_rules/i.test(sql)) return [{}, {}] as any;
  return [[], {}] as any;
};
{
  // warning level does NOT reach critical threshold
  await publishPlatformEvent({
    event_type: 'x', category: 'c', source_system: 's', title: 't',
    severity: 'warning',
  });
  await flush();
  assertEq(thresholdFired, false, 'warning below critical → skipped');
}

resetCalls();
thresholdFired = false;
{
  // critical passes
  await publishPlatformEvent({
    event_type: 'x', category: 'c', source_system: 's', title: 't',
    severity: 'critical',
  });
  await flush();
  assertEq(thresholdFired, true, 'critical meets critical → fired');
}

// ============================================================================
// Rule eval: count_threshold gate
// ============================================================================
console.log('\n── Rules: count_threshold ────────────────────────────────');

resetCalls();
let thresholdTriggered = false;
let countQueried = false;
let currentCount = 2; // below threshold
queryHandler = async (sql: string, params: any[]) => {
  if (/INSERT INTO platform_events/i.test(sql)) return [{ insertId: 1 }, {}] as any;
  if (/SELECT \* FROM platform_event_rules WHERE is_enabled/i.test(sql)) {
    return [[{
      id: 17, name: 'Spam',
      event_type_pattern: 'spam.event',
      category: null, severity_threshold: null,
      condition_json: JSON.stringify({ count_threshold: 5, time_window_seconds: 600 }),
      action_type: 'log_only',
      action_config_json: null,
      last_fired_at: null, cooldown_seconds: 0,
    }], {}] as any;
  }
  if (/SELECT COUNT\(\*\) AS cnt FROM platform_events/i.test(sql)) {
    countQueried = true;
    return [[{ cnt: currentCount }], {}] as any;
  }
  if (/INSERT INTO platform_event_rule_runs/i.test(sql)) {
    thresholdTriggered = true;
    return [{}, {}] as any;
  }
  if (/UPDATE platform_event_rules/i.test(sql)) return [{}, {}] as any;
  return [[], {}] as any;
};
{
  await publishPlatformEvent({
    event_type: 'spam.event', category: 'c', source_system: 's', title: 't',
  });
  await flush();
  assertEq(countQueried, true, 'count query executed');
  assertEq(thresholdTriggered, false, 'count < threshold → not triggered');
}

// Now with count >= threshold
resetCalls();
thresholdTriggered = false;
currentCount = 10;
{
  await publishPlatformEvent({
    event_type: 'spam.event', category: 'c', source_system: 's', title: 't',
  });
  await flush();
  assertEq(thresholdTriggered, true, 'count ≥ threshold → fired');
}

// ============================================================================
// queryEvents
// ============================================================================
console.log('\n── queryEvents ───────────────────────────────────────────');

resetCalls();
queryHandler = async (sql: string, params: any[]) => {
  if (/FROM platform_events/i.test(sql) && /ORDER BY created_at DESC/i.test(sql)) {
    return [[
      { id: 1, event_type: 'a', event_payload: JSON.stringify({ x: 1 }), created_at: '2026-04-10T12:00:00Z' },
      { id: 2, event_type: 'b', event_payload: null, created_at: '2026-04-10T11:00:00Z' },
      { id: 3, event_type: 'c', event_payload: '{bad json', created_at: '2026-04-10T10:00:00Z' },
    ], {}] as any;
  }
  return [[], {}] as any;
};

{
  const r = await queryEvents({ platform: 'omai', category: 'task', limit: 10 });
  assertEq(r.length, 3, '3 rows returned');
  assertEq(r[0].event_payload, { x: 1 }, 'JSON payload parsed');
  assertEq(r[1].event_payload, null, 'null payload untouched');
  assertEq(r[2].event_payload, '{bad json', 'malformed → left as-is');

  const q = queryCalls[0];
  assert(q.sql.includes('platform = ?'), 'platform filter added');
  assert(q.sql.includes('category = ?'), 'category filter added');
  assertEq(q.params[0], 'omai', 'platform param');
  assertEq(q.params[1], 'task', 'category param');
  assertEq(q.params[2], 10, 'limit param');
  assertEq(q.params[3], 0, 'default offset');
}

resetCalls();
{
  await queryEvents({
    severity: 'critical', church_id: 5, event_type: 'x.y',
    source_ref_id: 99, since: '2026-04-01', offset: 100,
  });
  const q = queryCalls[0];
  assert(q.sql.includes('severity = ?'), 'severity filter');
  assert(q.sql.includes('church_id = ?'), 'church_id filter');
  assert(q.sql.includes('event_type = ?'), 'event_type filter');
  assert(q.sql.includes('source_ref_id = ?'), 'source_ref_id filter');
  assert(q.sql.includes('created_at >= ?'), 'since filter');
  // Last two params: limit, offset
  assertEq(q.params[q.params.length - 1], 100, 'offset = 100');
  assertEq(q.params[q.params.length - 2], 50, 'default limit = 50');
}

// Empty filters → defaults
resetCalls();
{
  await queryEvents();
  const q = queryCalls[0];
  assertEq(q.params.length, 2, 'only limit+offset when no filters');
  assertEq(q.params[0], 50, 'default limit');
  assertEq(q.params[1], 0, 'default offset');
}

// ============================================================================
// getEventSummary
// ============================================================================
console.log('\n── getEventSummary ───────────────────────────────────────');

resetCalls();
queryHandler = async (sql: string, params: any[]) => {
  if (/COUNT\(\*\) AS total[\s\S]*FROM platform_events/i.test(sql)) {
    return [[{
      total: 50, critical: 5, warning: 10, success: 20,
      task_events: 15, ocr_events: 5, system_events: 8, alert_events: 5,
    }], {}] as any;
  }
  return [[], {}] as any;
};
{
  const r = await getEventSummary(12);
  assertEq(r.period_hours, 12, 'period_hours');
  assertEq(r.total, 50, 'total');
  assertEq(r.critical, 5, 'critical');
  assertEq(r.warning, 10, 'warning');
  assertEq(r.success, 20, 'success');
  assertEq(r.task_events, 15, 'task_events');
  assertEq(queryCalls[0].params[0], 12, 'hours bound');
}

// Default hours = 24, null counts → 0
resetCalls();
queryHandler = async (sql: string, params: any[]) => {
  return [[{
    total: null, critical: null, warning: null, success: null,
    task_events: null, ocr_events: null, system_events: null, alert_events: null,
  }], {}] as any;
};
{
  const r = await getEventSummary();
  assertEq(r.period_hours, 24, 'default 24');
  assertEq(r.total, 0, 'null → 0');
  assertEq(r.critical, 0, 'null critical → 0');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main()

main().catch((e) => {
  loud();
  console.error('Unhandled test error:', e);
  process.exit(1);
});
