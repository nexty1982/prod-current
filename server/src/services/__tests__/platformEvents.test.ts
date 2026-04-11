#!/usr/bin/env npx tsx
/**
 * Unit tests for services/platformEvents.js (OMD-1080)
 *
 * Centralized event publishing + rule evaluation. The SUT touches:
 *   - `../config/db.getAppPool()`          — stubbed via require.cache
 *   - `./workflowEngine.evaluateWorkflowTriggers` — stubbed via require.cache
 *
 * publishPlatformEvent inserts an event and fires-and-forgets:
 *   1. evaluateRules(eventId, evt)                  [internal, uses pool]
 *   2. workflowEngine.evaluateWorkflowTriggers(...) [optional]
 * Both are awaited here by waiting one microtask.
 *
 * Coverage:
 *   - publishPlatformEvent:
 *       · validates required fields (event_type, category, source_system, title)
 *       · normalizes severity/actor_type/platform to defaults when invalid
 *       · inserts with JSON-serialized payload; null defaults
 *       · returns { id }
 *       · fires workflow trigger eval; missing workflowEngine handled
 *       · rule evaluation: matchesRule (pattern with % wildcard, category,
 *         severity_threshold, condition.source_system/platform)
 *       · cooldown: recent last_fired_at → skipped (records rule run)
 *       · count threshold: below threshold skips silently
 *       · action execute: create_alert → INSERT alert event, update last_fired_at,
 *                          record rule run success
 *       · action execute: create_task → INSERT omai_tasks + task.created event
 *       · action execute: log_only → success with no extra writes
 *       · action execute: unknown → failed rule run
 *       · rule eval error doesn't crash publish
 *   - queryEvents:
 *       · no filters → basic query; WHERE 1=1
 *       · filter stacking: platform/category/severity/church/event_type/
 *         source_ref_id/since each add a clause + param
 *       · limit/offset coerced via parseInt
 *       · event_payload JSON string parsed to object
 *   - getEventSummary: returns shaped counts with numeric coercion
 *
 * Run: npx tsx server/src/services/__tests__/platformEvents.test.ts
 */

import * as pathMod from 'path';

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

// ── Silence noise ────────────────────────────────────────────────────
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

// ── SQL-routed fake pool ────────────────────────────────────────────
type Route = { match: RegExp; respond: (params: any[], sql: string) => any };
const routes: Route[] = [];
const queryLog: Array<{ sql: string; params: any[] }> = [];
let insertIdCounter = 1000;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) return r.respond(params, sql);
    }
    // Defaults
    if (/^\s*INSERT/i.test(sql)) {
      return [{ insertId: ++insertIdCounter, affectedRows: 1 }, []];
    }
    if (/^\s*UPDATE/i.test(sql)) return [{ affectedRows: 1 }, []];
    return [[], []];
  },
};

const dbStub = { getAppPool: () => fakePool };

function stubModule(relFromSrc: string, exports: any) {
  const base = pathMod.resolve(__dirname, '..', '..', relFromSrc);
  for (const candidate of [base, base + '.js', base + '.ts']) {
    try {
      const resolved = require.resolve(candidate);
      require.cache[resolved] = {
        id: resolved,
        filename: resolved,
        loaded: true,
        exports,
      } as any;
    } catch { /* not resolvable */ }
  }
}
stubModule('config/db', dbStub);

// Stub workflowEngine so publishPlatformEvent's optional require succeeds
// without triggering real DB work.
const workflowCalls: Array<{ eventId: number; evt: any }> = [];
stubModule('services/workflowEngine', {
  evaluateWorkflowTriggers: async (eventId: number, evt: any) => {
    workflowCalls.push({ eventId, evt });
  },
});

function resetRoutes() {
  routes.length = 0;
  queryLog.length = 0;
  insertIdCounter = 1000;
  workflowCalls.length = 0;
}

// Helper: yield to the microtask queue so that fire-and-forget
// evaluateRules + workflowEngine.evaluateWorkflowTriggers have a
// chance to run before assertions.
async function flushMicrotasks() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

const {
  publishPlatformEvent,
  queryEvents,
  getEventSummary,
} = require('../platformEvents');

async function main() {

  // ========================================================================
  // publishPlatformEvent: validation
  // ========================================================================
  console.log('\n── publishPlatformEvent: validation ──────────────────────');

  {
    let err: Error | null = null;
    try { await publishPlatformEvent({ category: 'c', source_system: 's', title: 't' }); }
    catch (e: any) { err = e; }
    assert(err !== null, 'missing event_type throws');
    assert(err?.message.includes('event_type'), 'msg mentions event_type');
  }
  {
    let err: Error | null = null;
    try { await publishPlatformEvent({ event_type: 'e', source_system: 's', title: 't' }); }
    catch (e: any) { err = e; }
    assert(err?.message.includes('category'), 'missing category');
  }
  {
    let err: Error | null = null;
    try { await publishPlatformEvent({ event_type: 'e', category: 'c', title: 't' }); }
    catch (e: any) { err = e; }
    assert(err?.message.includes('source_system'), 'missing source_system');
  }
  {
    let err: Error | null = null;
    try { await publishPlatformEvent({ event_type: 'e', category: 'c', source_system: 's' }); }
    catch (e: any) { err = e; }
    assert(err?.message.includes('title'), 'missing title');
  }

  // ========================================================================
  // publishPlatformEvent: happy path + defaults
  // ========================================================================
  console.log('\n── publishPlatformEvent: happy path ──────────────────────');

  {
    resetRoutes();
    // Empty rules list → no rule evaluation
    routes.push({
      match: /FROM platform_event_rules WHERE is_enabled = 1/i,
      respond: () => [[], []],
    });

    const r = await publishPlatformEvent({
      event_type: 'task.created',
      category: 'task',
      source_system: 'task_runner',
      title: 'New task created',
      event_payload: { task_id: 42 },
    });

    await flushMicrotasks();

    assertEq(typeof r.id, 'number', 'returns id');
    assert(r.id > 0, 'id > 0');

    const inserts = queryLog.filter(q => /INSERT INTO platform_events/i.test(q.sql));
    assertEq(inserts.length, 1, '1 INSERT into platform_events');
    const p = inserts[0].params;
    assertEq(p[0], 'task.created', 'event_type');
    assertEq(p[1], 'task', 'category');
    assertEq(p[2], 'info', 'default severity = info');
    assertEq(p[3], 'task_runner', 'source_system');
    assertEq(p[4], null, 'source_ref_id null');
    assertEq(p[5], 'New task created', 'title');
    assertEq(p[6], null, 'message null default');
    assertEq(p[7], JSON.stringify({ task_id: 42 }), 'payload JSON');
    assertEq(p[8], 'system', 'default actor_type');
    assertEq(p[11], null, 'church_id null');
    assertEq(p[12], 'shared', 'default platform');

    // Workflow engine trigger fired
    assertEq(workflowCalls.length, 1, 'workflow trigger called');
    assertEq(workflowCalls[0].eventId, r.id, 'correct eventId');
  }

  // ========================================================================
  // publishPlatformEvent: invalid enums coerced to defaults
  // ========================================================================
  console.log('\n── publishPlatformEvent: enum defaults ───────────────────');

  {
    resetRoutes();
    routes.push({
      match: /FROM platform_event_rules WHERE is_enabled = 1/i,
      respond: () => [[], []],
    });

    await publishPlatformEvent({
      event_type: 'e', category: 'c', source_system: 's', title: 't',
      severity: 'bogus',
      actor_type: 'ghost',
      platform: 'mars',
    });

    await flushMicrotasks();

    const inserts = queryLog.filter(q => /INSERT INTO platform_events/i.test(q.sql));
    const p = inserts[0].params;
    assertEq(p[2], 'info', 'bogus severity → info');
    assertEq(p[8], 'system', 'ghost actor_type → system');
    assertEq(p[12], 'shared', 'mars platform → shared');
  }

  // Valid enums preserved
  {
    resetRoutes();
    routes.push({
      match: /FROM platform_event_rules WHERE is_enabled = 1/i,
      respond: () => [[], []],
    });
    await publishPlatformEvent({
      event_type: 'e', category: 'c', source_system: 's', title: 't',
      severity: 'critical',
      actor_type: 'user',
      actor_id: 42,
      actor_name: 'alice',
      church_id: 5,
      source_ref_id: 99,
      message: 'hi',
      platform: 'omai',
    });
    await flushMicrotasks();
    const p = queryLog.filter(q => /INSERT INTO platform_events/i.test(q.sql))[0].params;
    assertEq(p[2], 'critical', 'critical preserved');
    assertEq(p[4], 99, 'source_ref_id carried');
    assertEq(p[6], 'hi', 'message carried');
    assertEq(p[8], 'user', 'user actor_type');
    assertEq(p[9], 42, 'actor_id');
    assertEq(p[10], 'alice', 'actor_name');
    assertEq(p[11], 5, 'church_id');
    assertEq(p[12], 'omai', 'omai platform');
  }

  // ========================================================================
  // Rule evaluation: matchesRule — event_type pattern exact + wildcard
  // ========================================================================
  console.log('\n── rules: matchesRule pattern ────────────────────────────');

  // Exact match → rule fires
  {
    resetRoutes();
    routes.push({
      match: /FROM platform_event_rules WHERE is_enabled = 1/i,
      respond: () => [[{
        id: 1,
        name: 'Exact match',
        event_type_pattern: 'task.failed',
        category: null,
        severity_threshold: null,
        condition_json: null,
        cooldown_seconds: 0,
        last_fired_at: null,
        action_type: 'log_only',
        action_config_json: null,
      }], []],
    });
    await publishPlatformEvent({
      event_type: 'task.failed', category: 'task', source_system: 's', title: 't',
    });
    await flushMicrotasks();
    // log_only should have recorded a successful rule run
    const runs = queryLog.filter(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql));
    assertEq(runs.length, 1, '1 rule run');
    assertEq(runs[0].params[4], 'success', 'success status');
    // last_fired_at updated
    const updates = queryLog.filter(q => /UPDATE platform_event_rules SET last_fired_at/i.test(q.sql));
    assertEq(updates.length, 1, 'last_fired_at updated');
  }

  // Mismatch → no rule run
  {
    resetRoutes();
    routes.push({
      match: /FROM platform_event_rules WHERE is_enabled = 1/i,
      respond: () => [[{
        id: 2,
        event_type_pattern: 'task.failed',
        category: null,
        severity_threshold: null,
        condition_json: null,
        cooldown_seconds: 0,
        last_fired_at: null,
        action_type: 'log_only',
      }], []],
    });
    await publishPlatformEvent({
      event_type: 'task.succeeded', category: 'task', source_system: 's', title: 't',
    });
    await flushMicrotasks();
    const runs = queryLog.filter(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql));
    assertEq(runs.length, 0, 'no rule runs');
  }

  // Wildcard pattern → matches via regex
  {
    resetRoutes();
    routes.push({
      match: /FROM platform_event_rules WHERE is_enabled = 1/i,
      respond: () => [[{
        id: 3,
        event_type_pattern: 'task.%',
        category: null,
        severity_threshold: null,
        condition_json: null,
        cooldown_seconds: 0,
        last_fired_at: null,
        action_type: 'log_only',
      }], []],
    });
    await publishPlatformEvent({
      event_type: 'task.started', category: 'task', source_system: 's', title: 't',
    });
    await flushMicrotasks();
    const runs = queryLog.filter(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql));
    assertEq(runs.length, 1, 'wildcard matches');
  }

  // ========================================================================
  // Rule evaluation: category, severity_threshold, condition filters
  // ========================================================================
  console.log('\n── rules: filters ────────────────────────────────────────');

  // Category mismatch
  {
    resetRoutes();
    routes.push({
      match: /FROM platform_event_rules WHERE is_enabled = 1/i,
      respond: () => [[{
        id: 10,
        event_type_pattern: null,
        category: 'system',
        severity_threshold: null,
        condition_json: null,
        cooldown_seconds: 0,
        last_fired_at: null,
        action_type: 'log_only',
      }], []],
    });
    await publishPlatformEvent({
      event_type: 'x', category: 'task', source_system: 's', title: 't',
    });
    await flushMicrotasks();
    assertEq(
      queryLog.filter(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql)).length,
      0,
      'category mismatch: no run',
    );
  }

  // Severity threshold — info below warning
  {
    resetRoutes();
    routes.push({
      match: /FROM platform_event_rules WHERE is_enabled = 1/i,
      respond: () => [[{
        id: 11,
        event_type_pattern: null,
        category: null,
        severity_threshold: 'warning',
        condition_json: null,
        cooldown_seconds: 0,
        last_fired_at: null,
        action_type: 'log_only',
      }], []],
    });
    await publishPlatformEvent({
      event_type: 'x', category: 'c', source_system: 's', title: 't', severity: 'info',
    });
    await flushMicrotasks();
    assertEq(
      queryLog.filter(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql)).length,
      0,
      'info < warning: skip',
    );
  }

  // Severity threshold — critical passes
  {
    resetRoutes();
    routes.push({
      match: /FROM platform_event_rules WHERE is_enabled = 1/i,
      respond: () => [[{
        id: 12,
        event_type_pattern: null,
        category: null,
        severity_threshold: 'warning',
        condition_json: null,
        cooldown_seconds: 0,
        last_fired_at: null,
        action_type: 'log_only',
      }], []],
    });
    await publishPlatformEvent({
      event_type: 'x', category: 'c', source_system: 's', title: 't', severity: 'critical',
    });
    await flushMicrotasks();
    assertEq(
      queryLog.filter(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql)).length,
      1,
      'critical >= warning: fire',
    );
  }

  // condition.source_system filter
  {
    resetRoutes();
    routes.push({
      match: /FROM platform_event_rules WHERE is_enabled = 1/i,
      respond: () => [[{
        id: 13,
        event_type_pattern: null,
        category: null,
        severity_threshold: null,
        condition_json: JSON.stringify({ source_system: 'task_runner' }),
        cooldown_seconds: 0,
        last_fired_at: null,
        action_type: 'log_only',
      }], []],
    });
    // Matching
    await publishPlatformEvent({
      event_type: 'x', category: 'c', source_system: 'task_runner', title: 't',
    });
    await flushMicrotasks();
    assertEq(
      queryLog.filter(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql)).length,
      1,
      'matching source_system fires',
    );
  }
  // Non-matching
  {
    resetRoutes();
    routes.push({
      match: /FROM platform_event_rules WHERE is_enabled = 1/i,
      respond: () => [[{
        id: 14,
        event_type_pattern: null,
        category: null,
        severity_threshold: null,
        condition_json: JSON.stringify({ source_system: 'task_runner' }),
        cooldown_seconds: 0,
        last_fired_at: null,
        action_type: 'log_only',
      }], []],
    });
    await publishPlatformEvent({
      event_type: 'x', category: 'c', source_system: 'other', title: 't',
    });
    await flushMicrotasks();
    assertEq(
      queryLog.filter(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql)).length,
      0,
      'non-matching source_system skipped',
    );
  }

  // ========================================================================
  // Rule evaluation: cooldown
  // ========================================================================
  console.log('\n── rules: cooldown ───────────────────────────────────────');

  {
    resetRoutes();
    // last_fired_at 30s ago with cooldown 60s → skipped
    const recent = new Date(Date.now() - 30 * 1000).toISOString();
    routes.push({
      match: /FROM platform_event_rules WHERE is_enabled = 1/i,
      respond: () => [[{
        id: 20,
        event_type_pattern: null,
        category: null,
        severity_threshold: null,
        condition_json: null,
        cooldown_seconds: 60,
        last_fired_at: recent,
        action_type: 'log_only',
      }], []],
    });
    await publishPlatformEvent({
      event_type: 'x', category: 'c', source_system: 's', title: 't',
    });
    await flushMicrotasks();
    const runs = queryLog.filter(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql));
    assertEq(runs.length, 1, '1 run recorded');
    assertEq(runs[0].params[4], 'skipped', 'skipped status');
    assertEq(runs[0].params[5], 'Cooldown active', 'cooldown message');
    // No last_fired_at UPDATE
    assertEq(
      queryLog.filter(q => /UPDATE platform_event_rules SET last_fired_at/i.test(q.sql)).length,
      0,
      'no update during cooldown',
    );
  }

  // Cooldown elapsed → fires normally
  {
    resetRoutes();
    const old = new Date(Date.now() - 120 * 1000).toISOString();
    routes.push({
      match: /FROM platform_event_rules WHERE is_enabled = 1/i,
      respond: () => [[{
        id: 21,
        event_type_pattern: null,
        category: null,
        severity_threshold: null,
        condition_json: null,
        cooldown_seconds: 60,
        last_fired_at: old,
        action_type: 'log_only',
      }], []],
    });
    await publishPlatformEvent({
      event_type: 'x', category: 'c', source_system: 's', title: 't',
    });
    await flushMicrotasks();
    const runs = queryLog.filter(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql));
    assertEq(runs[0].params[4], 'success', 'success after cooldown elapsed');
  }

  // ========================================================================
  // Rule evaluation: count_threshold
  // ========================================================================
  console.log('\n── rules: count threshold ────────────────────────────────');

  // Below threshold → silently skipped (no rule run recorded)
  {
    resetRoutes();
    routes.push({
      match: /FROM platform_event_rules WHERE is_enabled = 1/i,
      respond: () => [[{
        id: 30,
        event_type_pattern: null,
        category: null,
        severity_threshold: null,
        condition_json: JSON.stringify({ count_threshold: 5, time_window_seconds: 300 }),
        cooldown_seconds: 0,
        last_fired_at: null,
        action_type: 'log_only',
      }], []],
    });
    routes.push({
      match: /SELECT COUNT\(\*\) AS cnt FROM platform_events/i,
      respond: () => [[{ cnt: 2 }], []],
    });
    await publishPlatformEvent({
      event_type: 'task.failed', category: 'c', source_system: 's', title: 't',
    });
    await flushMicrotasks();
    assertEq(
      queryLog.filter(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql)).length,
      0,
      'below count: no rule run',
    );
  }

  // Above threshold → fires
  {
    resetRoutes();
    routes.push({
      match: /FROM platform_event_rules WHERE is_enabled = 1/i,
      respond: () => [[{
        id: 31,
        event_type_pattern: null,
        category: null,
        severity_threshold: null,
        condition_json: JSON.stringify({ count_threshold: 5 }),
        cooldown_seconds: 0,
        last_fired_at: null,
        action_type: 'log_only',
      }], []],
    });
    routes.push({
      match: /SELECT COUNT\(\*\) AS cnt FROM platform_events/i,
      respond: () => [[{ cnt: 10 }], []],
    });
    await publishPlatformEvent({
      event_type: 'task.failed', category: 'c', source_system: 's', title: 't',
    });
    await flushMicrotasks();
    assertEq(
      queryLog.filter(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql)).length,
      1,
      'above count: fires',
    );
  }

  // ========================================================================
  // Action: create_alert
  // ========================================================================
  console.log('\n── action: create_alert ──────────────────────────────────');

  {
    resetRoutes();
    routes.push({
      match: /FROM platform_event_rules WHERE is_enabled = 1/i,
      respond: () => [[{
        id: 40,
        name: 'AlertRule',
        event_type_pattern: null,
        category: null,
        severity_threshold: null,
        condition_json: null,
        cooldown_seconds: 0,
        last_fired_at: null,
        action_type: 'create_alert',
        action_config_json: JSON.stringify({ title: 'Custom Alert', severity: 'warning' }),
      }], []],
    });
    await publishPlatformEvent({
      event_type: 'x', category: 'c', source_system: 's', title: 'orig',
    });
    await flushMicrotasks();
    // 2 INSERTs into platform_events: the original + the alert
    const inserts = queryLog.filter(q => /INSERT INTO platform_events/i.test(q.sql));
    assertEq(inserts.length, 2, '2 platform_event inserts');
    // Second one has "alert.created"
    assert(inserts[1].sql.includes('alert.created'), 'alert.created event');
    assertEq(inserts[1].params[0], 'warning', 'custom severity');
    assertEq(inserts[1].params[2], 'Custom Alert', 'custom title');
    // Rule run recorded success
    const runs = queryLog.filter(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql));
    assertEq(runs[0].params[4], 'success', 'rule run success');
    assertEq(runs[0].params[2], 'create_alert', 'action_taken');
  }

  // Default title/severity when config missing
  {
    resetRoutes();
    routes.push({
      match: /FROM platform_event_rules WHERE is_enabled = 1/i,
      respond: () => [[{
        id: 41,
        name: 'AlertRule2',
        event_type_pattern: null,
        category: null,
        severity_threshold: null,
        condition_json: null,
        cooldown_seconds: 0,
        last_fired_at: null,
        action_type: 'create_alert',
        action_config_json: null,
      }], []],
    });
    await publishPlatformEvent({
      event_type: 'x', category: 'c', source_system: 's', title: 'Boom',
    });
    await flushMicrotasks();
    const inserts = queryLog.filter(q => /INSERT INTO platform_events/i.test(q.sql));
    assertEq(inserts[1].params[0], 'critical', 'default severity critical');
    assertEq(inserts[1].params[2], 'Alert: Boom', 'default title template');
  }

  // ========================================================================
  // Action: create_task
  // ========================================================================
  console.log('\n── action: create_task ───────────────────────────────────');

  {
    resetRoutes();
    routes.push({
      match: /FROM platform_event_rules WHERE is_enabled = 1/i,
      respond: () => [[{
        id: 50,
        name: 'TaskRule',
        event_type_pattern: null,
        category: null,
        severity_threshold: null,
        condition_json: null,
        cooldown_seconds: 0,
        last_fired_at: null,
        action_type: 'create_task',
        action_config_json: JSON.stringify({ title: 'AutoTask', task_type: 'cleanup' }),
      }], []],
    });
    await publishPlatformEvent({
      event_type: 'x', category: 'c', source_system: 's', title: 'Trigger',
    });
    await flushMicrotasks();
    // Expected inserts: original event, omai_tasks, task.created event
    const taskInserts = queryLog.filter(q => /INSERT INTO omai_tasks/i.test(q.sql));
    assertEq(taskInserts.length, 1, 'omai_tasks insert');
    assertEq(taskInserts[0].params[0], 'cleanup', 'task_type');
    assertEq(taskInserts[0].params[1], 'AutoTask', 'task title');
    const taskCreatedInserts = queryLog
      .filter(q => /INSERT INTO platform_events/i.test(q.sql))
      .filter(q => q.sql.includes('task.created'));
    assertEq(taskCreatedInserts.length, 1, 'task.created event emitted');
    // Rule run recorded success
    const runs = queryLog.filter(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql));
    assertEq(runs[0].params[4], 'success', 'rule run success');
  }

  // Default task fields when config missing
  {
    resetRoutes();
    routes.push({
      match: /FROM platform_event_rules WHERE is_enabled = 1/i,
      respond: () => [[{
        id: 51,
        name: 'TaskRule2',
        event_type_pattern: null,
        category: null,
        severity_threshold: null,
        condition_json: null,
        cooldown_seconds: 0,
        last_fired_at: null,
        action_type: 'create_task',
        action_config_json: null,
      }], []],
    });
    await publishPlatformEvent({
      event_type: 'x', category: 'c', source_system: 's', title: 'Raw',
    });
    await flushMicrotasks();
    const taskInserts = queryLog.filter(q => /INSERT INTO omai_tasks/i.test(q.sql));
    assertEq(taskInserts[0].params[0], 'automated', 'default task_type');
    assertEq(taskInserts[0].params[1], 'Auto-task: Raw', 'default title template');
  }

  // ========================================================================
  // Action: unknown → failed rule run
  // ========================================================================
  console.log('\n── action: unknown ───────────────────────────────────────');

  {
    resetRoutes();
    routes.push({
      match: /FROM platform_event_rules WHERE is_enabled = 1/i,
      respond: () => [[{
        id: 60,
        name: 'Bogus',
        event_type_pattern: null,
        category: null,
        severity_threshold: null,
        condition_json: null,
        cooldown_seconds: 0,
        last_fired_at: null,
        action_type: 'weird_action',
        action_config_json: null,
      }], []],
    });
    await publishPlatformEvent({
      event_type: 'x', category: 'c', source_system: 's', title: 't',
    });
    await flushMicrotasks();
    const runs = queryLog.filter(q => /INSERT INTO platform_event_rule_runs/i.test(q.sql));
    assertEq(runs.length, 1, '1 rule run');
    assertEq(runs[0].params[4], 'failed', 'failed status');
    assertEq(runs[0].params[2], 'weird_action', 'action_taken preserved');
  }

  // ========================================================================
  // queryEvents: no filters
  // ========================================================================
  console.log('\n── queryEvents: no filters ───────────────────────────────');

  {
    resetRoutes();
    routes.push({
      match: /FROM platform_events WHERE 1=1/i,
      respond: (params) => [[
        { id: 1, event_type: 'x', event_payload: '{"a":1}', created_at: '2026-04-11T10:00:00Z' },
        { id: 2, event_type: 'y', event_payload: null, created_at: '2026-04-11T09:00:00Z' },
      ], []],
    });
    const rows = await queryEvents();
    assertEq(rows.length, 2, '2 rows');
    assertEq(rows[0].event_payload, { a: 1 } as any, 'JSON string parsed');
    assertEq(rows[1].event_payload, null, 'null preserved');
    // Default limit/offset
    const q = queryLog[queryLog.length - 1];
    assertEq(q.params[q.params.length - 2], 50, 'default limit');
    assertEq(q.params[q.params.length - 1], 0, 'default offset');
  }

  // ========================================================================
  // queryEvents: filter composition
  // ========================================================================
  console.log('\n── queryEvents: filters ──────────────────────────────────');

  {
    resetRoutes();
    routes.push({
      match: /FROM platform_events WHERE/i,
      respond: () => [[], []],
    });
    await queryEvents({
      platform: 'omai',
      category: 'task',
      severity: 'critical',
      church_id: 5,
      event_type: 'task.failed',
      source_ref_id: 99,
      since: '2026-04-10T00:00:00Z',
      limit: '10',
      offset: '20',
    });
    const q = queryLog[queryLog.length - 1];
    assert(q.sql.includes('platform = ?'), 'platform clause');
    assert(q.sql.includes('category = ?'), 'category clause');
    assert(q.sql.includes('severity = ?'), 'severity clause');
    assert(q.sql.includes('church_id = ?'), 'church_id clause');
    assert(q.sql.includes('event_type = ?'), 'event_type clause');
    assert(q.sql.includes('source_ref_id = ?'), 'source_ref_id clause');
    assert(q.sql.includes('created_at >= ?'), 'since clause');
    assertEq(q.params[0], 'omai', 'platform param');
    assertEq(q.params[1], 'task', 'category param');
    assertEq(q.params[2], 'critical', 'severity param');
    assertEq(q.params[3], 5, 'church_id param');
    assertEq(q.params[4], 'task.failed', 'event_type param');
    assertEq(q.params[5], 99, 'source_ref_id param');
    assertEq(q.params[6], '2026-04-10T00:00:00Z', 'since param');
    assertEq(q.params[7], 10, 'limit parseInt');
    assertEq(q.params[8], 20, 'offset parseInt');
  }

  // Invalid JSON in payload → preserved as string (try/catch swallows)
  {
    resetRoutes();
    routes.push({
      match: /FROM platform_events WHERE/i,
      respond: () => [[
        { id: 3, event_payload: 'not json' },
      ], []],
    });
    const rows = await queryEvents();
    assertEq(rows[0].event_payload, 'not json', 'invalid JSON preserved');
  }

  // ========================================================================
  // getEventSummary
  // ========================================================================
  console.log('\n── getEventSummary ───────────────────────────────────────');

  {
    resetRoutes();
    routes.push({
      match: /SELECT[\s\S]*FROM platform_events/i,
      respond: () => [[{
        total: '100',
        critical: '5',
        warning: '10',
        success: '80',
        task_events: '30',
        ocr_events: '20',
        system_events: '5',
        alert_events: '2',
      }], []],
    });
    const r = await getEventSummary(48);
    assertEq(r.period_hours, 48, 'period_hours');
    assertEq(r.total, 100, 'total coerced');
    assertEq(r.critical, 5, 'critical');
    assertEq(r.warning, 10, 'warning');
    assertEq(r.task_events, 30, 'task_events');
    assertEq(r.alert_events, 2, 'alert_events');
    // Param is hours value
    const q = queryLog[queryLog.length - 1];
    assertEq(q.params[0], 48, 'hours param');
  }

  // Default hours = 24
  {
    resetRoutes();
    routes.push({
      match: /FROM platform_events/i,
      respond: () => [[{ total: 0, critical: null, warning: null, success: null, task_events: null, ocr_events: null, system_events: null, alert_events: null }], []],
    });
    const r = await getEventSummary();
    assertEq(r.period_hours, 24, 'default 24h');
    assertEq(r.total, 0, '0 total');
    assertEq(r.critical, 0, 'null → 0');
  }

  // ========================================================================
  // publish: rule evaluation error does not crash publish
  // ========================================================================
  console.log('\n── publish: rule eval errors non-fatal ───────────────────');

  {
    resetRoutes();
    routes.push({
      match: /FROM platform_event_rules WHERE is_enabled = 1/i,
      respond: () => { throw new Error('rules query failed'); },
    });
    quiet();
    const r = await publishPlatformEvent({
      event_type: 'x', category: 'c', source_system: 's', title: 't',
    });
    await flushMicrotasks();
    loud();
    assert(typeof r.id === 'number', 'publish still returns id');
  }

  // ========================================================================
  // Summary
  // ========================================================================
  console.log(`\n──────────────────────────────────────────────────────────`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  loud();
  console.error('Unhandled:', e);
  process.exit(1);
});
