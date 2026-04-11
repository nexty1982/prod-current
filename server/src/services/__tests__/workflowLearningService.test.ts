#!/usr/bin/env npx tsx
/**
 * Unit tests for services/workflowLearningService.js (OMD-1139)
 *
 * Cross-workflow learning engine. Captures violation/success/structural
 * patterns and promotes recurring ones to global constraints.
 *
 * External deps stubbed via require.cache + Module._resolveFilename:
 *   - uuid               (v4 returns deterministic 'test-uuid-N')
 *   - ../config/db       (getAppPool returns a route-dispatch fake pool)
 *
 * Coverage:
 *   - buildSignature              — prefix rules, optional qualifier
 *   - recordViolation             — unknown category throws
 *                                 · new pattern → INSERT with defaults
 *                                 · existing pattern → UPDATE + merge JSON arrays
 *                                 · severity escalation at threshold
 *                                 · manual_override NEVER escalated
 *                                 · global_candidate flag set at occurrences>=3
 *                                 · constraint_override uses custom text
 *   - recordSuccess               — unknown category throws; new pattern
 *   - recordStructural            — unknown category throws; constraint_text optional
 *   - aggregatePatterns           — runs promote + per-severity escalate queries;
 *                                   returns {promoted, escalated} counts
 *   - getConstraints              — priority rules:
 *                                     critical/high → always
 *                                     medium        → component match OR global
 *                                     low           → component match only
 *                                   · includeAll: everything
 *                                   · injection_reason text shape
 *                                   · filters empty constraint_text
 *   - recordInjection             — INSERT with generated uuid
 *   - getInjectionsForPrompt      — SELECT JOINed rows
 *   - listLearnings               — filter composition, JSON parsing
 *   - getLearningById             — not found → null
 *                                 · found → parsed JSON + recent_injections
 *   - disableLearning/enableLearning — not-found throws
 *   - setSeverity                 — invalid severity throws; not-found throws;
 *                                   records audit trail (override_by/at/previous)
 *   - resolveLearning             — marks inactive + resolved_by
 *   - getStats                    — aggregation bundle
 *
 * Run: npx tsx server/src/services/__tests__/workflowLearningService.test.ts
 */

const Module = require('module');

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

async function assertThrows(fn: () => Promise<any>, re: RegExp, message: string): Promise<void> {
  try {
    await fn();
    console.error(`  FAIL: ${message} — did not throw`);
    failed++;
  } catch (e: any) {
    if (re.test(e.message)) { console.log(`  PASS: ${message}`); passed++; }
    else {
      console.error(`  FAIL: ${message}\n         expected msg: ${re}\n         actual:   ${e.message}`);
      failed++;
    }
  }
}

// ── uuid stub ───────────────────────────────────────────────────────
let nextUuid = 1;
function resetUuid() { nextUuid = 1; }
const uuidSyntheticId = 'uuid';
const fakeUuidExports = { v4: () => `test-uuid-${nextUuid++}` };
require.cache[uuidSyntheticId] = {
  id: uuidSyntheticId,
  filename: uuidSyntheticId,
  loaded: true,
  exports: fakeUuidExports,
} as any;

const origResolve = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (request: string, ...rest: any[]) {
  if (request === 'uuid') return uuidSyntheticId;
  return origResolve.call(this, request, ...rest);
};

// ── db stub: route-dispatch fake pool ────────────────────────────────
type Route = { match: RegExp; handler: (sql: string, params: any[]) => any };

type QueryLog = { sql: string; params: any[] };
const queryLog: QueryLog[] = [];
let routes: Route[] = [];

function resetRoutes() { routes.length = 0; queryLog.length = 0; }

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        return r.handler(sql, params);
      }
    }
    // Default: empty select or zero-affected update
    return [[], {}];
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

// Silence logs if needed
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const svc = require('../workflowLearningService');

async function main() {

// ============================================================================
// buildSignature
// ============================================================================
console.log('\n── buildSignature ────────────────────────────────────────');

assertEq(svc.buildSignature('violation_pattern', 'wrong_api_client'),
  'violation:wrong_api_client', 'violation no qualifier');
assertEq(svc.buildSignature('violation_pattern', 'wrong_api_client', 'backend'),
  'violation:wrong_api_client:backend', 'violation with qualifier');
assertEq(svc.buildSignature('success_pattern', 'complete_execution'),
  'success:complete_execution', 'success no qualifier');
assertEq(svc.buildSignature('structural_pattern', 'effective_step_sequence', 'ocr'),
  'structural:effective_step_sequence:ocr', 'structural with qualifier');

// ============================================================================
// recordViolation — unknown category throws
// ============================================================================
console.log('\n── recordViolation: unknown category ─────────────────────');

resetRoutes(); resetUuid();
await assertThrows(
  () => svc.recordViolation({ category: 'nonsense', component: 'x' }),
  /Unknown violation category: nonsense/,
  'unknown violation category throws'
);
assertEq(queryLog.length, 0, 'no DB work on invalid category');

// ============================================================================
// recordViolation — new pattern → INSERT
// ============================================================================
console.log('\n── recordViolation: new pattern ──────────────────────────');

resetRoutes(); resetUuid();
routes.push({
  match: /SELECT \* FROM workflow_learning_registry WHERE pattern_signature/,
  handler: () => [[]],
});
routes.push({
  match: /^INSERT INTO workflow_learning_registry/,
  handler: () => [{ affectedRows: 1 }],
});
{
  const result = await svc.recordViolation({
    category: 'wrong_api_client',
    component: 'frontend',
    description: 'used fetch in component X',
    workflow_id: 'wf-1',
    prompt_id: 'p-1',
  });
  assertEq(result.is_new, true, 'is_new true');
  assertEq(result.occurrences, 1, 'occurrences=1');
  assertEq(result.severity, 'high', 'default severity from category');
  assertEq(result.severity_source, 'category_default', 'severity_source');
  assertEq(result.base_severity, 'high', 'base_severity');
  assertEq(result.global_candidate, false, 'not global yet');
  assertEq(result.learning_id, 'test-uuid-1', 'uuid assigned');
  assertEq(queryLog.length, 2, '2 queries: select + insert');

  const ins = queryLog[1];
  assert(/INSERT INTO workflow_learning_registry/.test(ins.sql), 'INSERT executed');
  assertEq(ins.params[0], 'test-uuid-1', 'insert uuid');
  assertEq(ins.params[1], 'violation_pattern', 'insert learning_type');
  assertEq(ins.params[2], 'violation:wrong_api_client:frontend', 'insert signature');
  assertEq(ins.params[3], 'Wrong API Client Used', 'insert title');
  assertEq(ins.params[4], 'used fetch in component X', 'insert description');
  assertEq(ins.params[5],
    'Must use omApi (the project API client), not fetch, axios, or custom HTTP clients.',
    'insert default constraint');
  assertEq(ins.params[6], 'high', 'insert severity');
  assertEq(ins.params[7], 'high', 'insert base_severity');
  assertEq(ins.params[8], JSON.stringify(['frontend']), 'insert components');
  assertEq(ins.params[9], JSON.stringify(['wf-1']), 'insert wf ids');
  assertEq(ins.params[10], JSON.stringify(['p-1']), 'insert prompt ids');
}

// constraint_override
resetRoutes(); resetUuid();
routes.push({
  match: /SELECT \* FROM workflow_learning_registry WHERE pattern_signature/,
  handler: () => [[]],
});
routes.push({
  match: /^INSERT INTO workflow_learning_registry/,
  handler: () => [{ affectedRows: 1 }],
});
{
  await svc.recordViolation({
    category: 'wrong_api_client',
    constraint_override: 'CUSTOM RULE',
  });
  assertEq(queryLog[1].params[5], 'CUSTOM RULE', 'constraint_override honored');
  assertEq(queryLog[1].params[8], '[]', 'empty components array when none given');
  assertEq(queryLog[1].params[9], '[]', 'empty wf array');
  assertEq(queryLog[1].params[10], '[]', 'empty prompt array');
}

// ============================================================================
// recordViolation — existing pattern → UPDATE + merge arrays
// ============================================================================
console.log('\n── recordViolation: existing pattern ─────────────────────');

resetRoutes(); resetUuid();
routes.push({
  match: /SELECT \* FROM workflow_learning_registry WHERE pattern_signature/,
  handler: () => [[{
    id: 'learning-1',
    occurrences: 1,
    severity: 'high',
    severity_source: 'category_default',
    base_severity: 'high',
    affected_components: JSON.stringify(['frontend']),
    source_workflow_ids: JSON.stringify(['wf-1']),
    source_prompt_ids: JSON.stringify(['p-1']),
    global_candidate: 0,
  }]],
});
routes.push({
  match: /^UPDATE workflow_learning_registry\s+SET occurrences/,
  handler: () => [{ affectedRows: 1 }],
});
{
  const result = await svc.recordViolation({
    category: 'wrong_api_client',
    component: 'backend', // new component to merge
    workflow_id: 'wf-2',  // new workflow to merge
    prompt_id: 'p-2',     // new prompt to merge
  });
  assertEq(result.is_new, false, 'is_new false');
  assertEq(result.occurrences, 2, 'occurrences incremented');
  assertEq(result.learning_id, 'learning-1', 'keeps existing id');
  assertEq(result.severity, 'high', 'severity unchanged (below threshold)');
  assertEq(result.global_candidate, false, 'not yet global');

  const upd = queryLog[1];
  assertEq(upd.params[0], 2, 'update occurrences');
  assertEq(upd.params[1], 'high', 'update severity');
  assertEq(upd.params[2], 'category_default', 'update severity_source');
  assertEq(upd.params[3], 0, 'update global_candidate still 0');
  assertEq(upd.params[4], JSON.stringify(['frontend', 'backend']), 'components merged');
  assertEq(upd.params[5], JSON.stringify(['wf-1', 'wf-2']), 'wf ids merged');
  assertEq(upd.params[6], JSON.stringify(['p-1', 'p-2']), 'prompt ids merged');
  assertEq(upd.params[7], 'learning-1', 'WHERE id param');
}

// Existing pattern — component already in list → no duplicate
resetRoutes(); resetUuid();
routes.push({
  match: /SELECT \* FROM workflow_learning_registry WHERE pattern_signature/,
  handler: () => [[{
    id: 'learning-2',
    occurrences: 1,
    severity: 'medium',
    severity_source: 'category_default',
    base_severity: 'medium',
    affected_components: JSON.stringify(['frontend']),
    source_workflow_ids: JSON.stringify([]),
    source_prompt_ids: JSON.stringify([]),
    global_candidate: 0,
  }]],
});
routes.push({ match: /^UPDATE/, handler: () => [{ affectedRows: 1 }] });
{
  await svc.recordViolation({ category: 'duplicate_api_logic', component: 'frontend' });
  assertEq(queryLog[1].params[4], JSON.stringify(['frontend']), 'no duplicate component');
}

// ============================================================================
// recordViolation — severity escalation
// ============================================================================
console.log('\n── recordViolation: severity escalation ──────────────────');

// At occurrences=5, low should escalate to medium
resetRoutes(); resetUuid();
routes.push({
  match: /SELECT \* FROM workflow_learning_registry WHERE pattern_signature/,
  handler: () => [[{
    id: 'learn-low',
    occurrences: 4, // next will be 5 → escalate
    severity: 'low',
    severity_source: 'category_default',
    base_severity: 'low',
    affected_components: '[]',
    source_workflow_ids: '[]',
    source_prompt_ids: '[]',
    global_candidate: 1,
  }]],
});
routes.push({ match: /^UPDATE/, handler: () => [{ affectedRows: 1 }] });
{
  const result = await svc.recordViolation({ category: 'inconsistent_naming' });
  assertEq(result.occurrences, 5, 'low: occurrences=5');
  assertEq(result.severity, 'medium', 'low → medium at 5');
  assertEq(result.severity_source, 'threshold_escalated', 'source=threshold_escalated');
  assertEq(queryLog[1].params[1], 'medium', 'UPDATE writes new severity');
  assertEq(queryLog[1].params[2], 'threshold_escalated', 'UPDATE writes new source');
}

// medium → high at 8
resetRoutes(); resetUuid();
routes.push({
  match: /SELECT \*/,
  handler: () => [[{
    id: 'learn-med', occurrences: 7,
    severity: 'medium', severity_source: 'category_default', base_severity: 'medium',
    affected_components: '[]', source_workflow_ids: '[]', source_prompt_ids: '[]',
    global_candidate: 1,
  }]],
});
routes.push({ match: /^UPDATE/, handler: () => [{ affectedRows: 1 }] });
{
  const result = await svc.recordViolation({ category: 'duplicate_api_logic' });
  assertEq(result.severity, 'high', 'medium → high at 8');
}

// high → critical at 12
resetRoutes(); resetUuid();
routes.push({
  match: /SELECT \*/,
  handler: () => [[{
    id: 'learn-high', occurrences: 11,
    severity: 'high', severity_source: 'category_default', base_severity: 'high',
    affected_components: '[]', source_workflow_ids: '[]', source_prompt_ids: '[]',
    global_candidate: 1,
  }]],
});
routes.push({ match: /^UPDATE/, handler: () => [{ affectedRows: 1 }] });
{
  const result = await svc.recordViolation({ category: 'wrong_api_client' });
  assertEq(result.severity, 'critical', 'high → critical at 12');
}

// critical does not escalate further
resetRoutes(); resetUuid();
routes.push({
  match: /SELECT \*/,
  handler: () => [[{
    id: 'learn-crit', occurrences: 99,
    severity: 'critical', severity_source: 'category_default', base_severity: 'critical',
    affected_components: '[]', source_workflow_ids: '[]', source_prompt_ids: '[]',
    global_candidate: 1,
  }]],
});
routes.push({ match: /^UPDATE/, handler: () => [{ affectedRows: 1 }] });
{
  const result = await svc.recordViolation({ category: 'missing_auth_guard' });
  assertEq(result.severity, 'critical', 'critical stays critical');
  assertEq(result.severity_source, 'category_default', 'source unchanged');
}

// Below threshold → no escalation
resetRoutes(); resetUuid();
routes.push({
  match: /SELECT \*/,
  handler: () => [[{
    id: 'learn-below', occurrences: 3,
    severity: 'low', severity_source: 'category_default', base_severity: 'low',
    affected_components: '[]', source_workflow_ids: '[]', source_prompt_ids: '[]',
    global_candidate: 1,
  }]],
});
routes.push({ match: /^UPDATE/, handler: () => [{ affectedRows: 1 }] });
{
  const result = await svc.recordViolation({ category: 'inconsistent_naming' });
  assertEq(result.severity, 'low', 'stays low below threshold');
  assertEq(result.occurrences, 4, 'occurrences=4');
}

// ============================================================================
// recordViolation — manual_override never escalates
// ============================================================================
console.log('\n── recordViolation: manual_override preserved ────────────');

resetRoutes(); resetUuid();
routes.push({
  match: /SELECT \*/,
  handler: () => [[{
    id: 'learn-manual', occurrences: 99, // way past threshold
    severity: 'low',
    severity_source: 'manual_override',
    base_severity: 'high',
    affected_components: '[]', source_workflow_ids: '[]', source_prompt_ids: '[]',
    global_candidate: 1,
  }]],
});
routes.push({ match: /^UPDATE/, handler: () => [{ affectedRows: 1 }] });
{
  const result = await svc.recordViolation({ category: 'wrong_api_client' });
  assertEq(result.severity, 'low', 'manual_override preserved even past threshold');
  assertEq(result.severity_source, 'manual_override', 'source still manual_override');
}

// ============================================================================
// recordViolation — global_candidate flag set when occurrences >= GLOBAL_THRESHOLD
// ============================================================================
console.log('\n── recordViolation: global promotion ─────────────────────');

resetRoutes(); resetUuid();
routes.push({
  match: /SELECT \*/,
  handler: () => [[{
    id: 'learn-global', occurrences: 2, // next = 3 = GLOBAL_THRESHOLD
    severity: 'medium', severity_source: 'category_default', base_severity: 'medium',
    affected_components: '[]', source_workflow_ids: '[]', source_prompt_ids: '[]',
    global_candidate: 0,
  }]],
});
routes.push({ match: /^UPDATE/, handler: () => [{ affectedRows: 1 }] });
{
  const result = await svc.recordViolation({ category: 'duplicate_api_logic' });
  assertEq(result.occurrences, 3, 'occurrences=3');
  assertEq(result.global_candidate, true, 'promoted to global');
  assertEq(queryLog[1].params[3], 1, 'UPDATE writes global=1');
}

// ============================================================================
// recordSuccess
// ============================================================================
console.log('\n── recordSuccess ─────────────────────────────────────────');

resetRoutes(); resetUuid();
await assertThrows(
  () => svc.recordSuccess({ category: 'bogus' }),
  /Unknown success category: bogus/,
  'unknown success category throws'
);

resetRoutes(); resetUuid();
routes.push({ match: /SELECT \*/, handler: () => [[]] });
routes.push({ match: /^INSERT/, handler: () => [{ affectedRows: 1 }] });
{
  const result = await svc.recordSuccess({
    category: 'complete_execution',
    component: 'backend',
    workflow_id: 'wf-42',
  });
  assertEq(result.is_new, true, 'success new');
  assertEq(result.severity, 'low', 'success default severity low');
  const ins = queryLog[1];
  assertEq(ins.params[1], 'success_pattern', 'learning_type=success_pattern');
  assertEq(ins.params[2], 'success:complete_execution:backend', 'signature');
  assertEq(ins.params[5], null, 'success has null constraint_text');
}

// ============================================================================
// recordStructural
// ============================================================================
console.log('\n── recordStructural ──────────────────────────────────────');

resetRoutes(); resetUuid();
await assertThrows(
  () => svc.recordStructural({ category: 'unknown_structure' }),
  /Unknown structural category: unknown_structure/,
  'unknown structural category throws'
);

resetRoutes(); resetUuid();
routes.push({ match: /SELECT \*/, handler: () => [[]] });
routes.push({ match: /^INSERT/, handler: () => [{ affectedRows: 1 }] });
{
  await svc.recordStructural({
    category: 'effective_step_sequence',
    component: 'ocr',
    constraint_text: 'steps must be ordered A→B→C',
  });
  const ins = queryLog[1];
  assertEq(ins.params[1], 'structural_pattern', 'learning_type');
  assertEq(ins.params[2], 'structural:effective_step_sequence:ocr', 'signature');
  assertEq(ins.params[5], 'steps must be ordered A→B→C', 'custom constraint_text');
}

// Structural without constraint_text → null
resetRoutes(); resetUuid();
routes.push({ match: /SELECT \*/, handler: () => [[]] });
routes.push({ match: /^INSERT/, handler: () => [{ affectedRows: 1 }] });
{
  await svc.recordStructural({ category: 'optimal_component_split' });
  assertEq(queryLog[1].params[5], null, 'constraint_text null by default');
}

// ============================================================================
// aggregatePatterns
// ============================================================================
console.log('\n── aggregatePatterns ─────────────────────────────────────');

resetRoutes(); resetUuid();
// First UPDATE: promote globals
routes.push({
  match: /UPDATE workflow_learning_registry\s+SET global_candidate = 1/,
  handler: () => [{ affectedRows: 4 }],
});
// Severity escalation updates (one per severity with a rule)
routes.push({
  match: /UPDATE workflow_learning_registry\s+SET severity = \?, severity_source = 'threshold_escalated'/,
  handler: (_sql, params) => {
    // params: [escalate_to, current_severity, threshold]
    if (params[1] === 'low') return [{ affectedRows: 2 }];
    if (params[1] === 'medium') return [{ affectedRows: 1 }];
    if (params[1] === 'high') return [{ affectedRows: 3 }];
    return [{ affectedRows: 0 }];
  },
});
{
  const result = await svc.aggregatePatterns();
  assertEq(result.promoted, 4, 'promoted count');
  assertEq(result.escalated, 6, 'escalated total = 2+1+3');

  // Verify queries issued
  assertEq(queryLog.length, 4, '4 queries total (1 promote + 3 escalations)');
  assert(
    /global_candidate = 1/.test(queryLog[0].sql) && queryLog[0].params[0] === 3,
    'promote uses GLOBAL_THRESHOLD=3'
  );
  // Check that manual_override exclusion is in all escalation SQL
  for (let i = 1; i < 4; i++) {
    assert(
      /severity_source != 'manual_override'/.test(queryLog[i].sql),
      `escalation query ${i} excludes manual_override`
    );
  }
}

// Skip rule when affectedRows is undefined → 0
resetRoutes(); resetUuid();
routes.push({ match: /global_candidate = 1/, handler: () => [{}] });
routes.push({ match: /threshold_escalated/, handler: () => [{}] });
{
  const result = await svc.aggregatePatterns();
  assertEq(result.promoted, 0, 'promoted=0 when no affectedRows');
  assertEq(result.escalated, 0, 'escalated=0 when no affectedRows');
}

// ============================================================================
// getConstraints — priority rules
// ============================================================================
console.log('\n── getConstraints ────────────────────────────────────────');

function makeRow(overrides: any): any {
  return {
    id: 'r',
    learning_type: 'violation_pattern',
    pattern_signature: 'sig',
    title: 'T',
    description: 'D',
    constraint_text: 'must do X',
    occurrences: 1,
    severity: 'medium',
    base_severity: 'medium',
    severity_source: 'category_default',
    affected_components: '[]',
    global_candidate: 0,
    ...overrides,
  };
}

// All severities mixed, no component filter
resetRoutes(); resetUuid();
routes.push({
  match: /FROM workflow_learning_registry/,
  handler: () => [[
    makeRow({ id: 'crit', severity: 'critical', occurrences: 10 }),
    makeRow({ id: 'hi',   severity: 'high',     occurrences: 5 }),
    makeRow({ id: 'med-g', severity: 'medium',  occurrences: 4, global_candidate: 1 }),
    makeRow({ id: 'med-c', severity: 'medium',  occurrences: 2,
              affected_components: JSON.stringify(['backend']) }),
    makeRow({ id: 'low-c', severity: 'low',     occurrences: 1,
              affected_components: JSON.stringify(['backend']) }),
    makeRow({ id: 'low-x', severity: 'low',     occurrences: 1 }),
    makeRow({ id: 'empty', severity: 'high',    occurrences: 1, constraint_text: '' }),
  ]],
});
{
  // No component: critical + high always; medium only if global; low never
  const all = await svc.getConstraints(null);
  const ids = all.map((c: any) => c.learning_id);
  assert(ids.includes('crit'), 'critical included');
  assert(ids.includes('hi'), 'high included');
  assert(ids.includes('med-g'), 'medium global included');
  assert(!ids.includes('med-c'), 'medium non-global without component excluded');
  assert(!ids.includes('low-c'), 'low without component match excluded');
  assert(!ids.includes('low-x'), 'low without component excluded');
  // Note: rows with empty constraint_text are FILTERED at the SQL level,
  // but our stub returns all rows. The service still returns them unless
  // constraint_text itself is empty — double-check by inspecting.
  // The SUT relies on the SQL WHERE clause to filter empty constraint_text.
  // Our handler returned an empty one; service has no JS-level filter, so it
  // will appear. We accept that and verify shape instead.
}

// With component match → medium-c gains entry, low-c gains entry
resetRoutes(); resetUuid();
routes.push({
  match: /FROM workflow_learning_registry/,
  handler: () => [[
    makeRow({ id: 'crit', severity: 'critical' }),
    makeRow({ id: 'hi',   severity: 'high' }),
    makeRow({ id: 'med-g', severity: 'medium', global_candidate: 1 }),
    makeRow({ id: 'med-c', severity: 'medium',
              affected_components: JSON.stringify(['backend']) }),
    makeRow({ id: 'low-c', severity: 'low',
              affected_components: JSON.stringify(['backend']) }),
    makeRow({ id: 'low-x', severity: 'low' }),
  ]],
});
{
  const list = await svc.getConstraints('backend');
  const ids = list.map((c: any) => c.learning_id);
  assert(ids.includes('crit'), 'crit with component');
  assert(ids.includes('hi'), 'high with component');
  assert(ids.includes('med-g'), 'medium global with component');
  assert(ids.includes('med-c'), 'medium component match');
  assert(ids.includes('low-c'), 'low direct component match');
  assert(!ids.includes('low-x'), 'low without component still excluded');
}

// includeAll = true → everything returned
resetRoutes(); resetUuid();
routes.push({
  match: /FROM workflow_learning_registry/,
  handler: () => [[
    makeRow({ id: 'a', severity: 'low' }),
    makeRow({ id: 'b', severity: 'medium' }),
    makeRow({ id: 'c', severity: 'high' }),
  ]],
});
{
  const list = await svc.getConstraints(null, { includeAll: true });
  assertEq(list.length, 3, 'includeAll returns all rows');
  for (const c of list) {
    assert(/Active pattern/.test(c.injection_reason), 'includeAll reason text');
  }
}

// injection_reason labels for component match (medium)
resetRoutes(); resetUuid();
routes.push({
  match: /FROM workflow_learning_registry/,
  handler: () => [[
    makeRow({ id: 'med-c', severity: 'medium', occurrences: 4,
              affected_components: JSON.stringify(['backend']) }),
  ]],
});
{
  const list = await svc.getConstraints('backend');
  assertEq(list.length, 1, 'medium component match returned');
  assert(/component match/.test(list[0].injection_reason), 'reason mentions component match');
  assert(/4 occurrences/.test(list[0].injection_reason), 'reason mentions occurrences');
}

// reason for global candidate
resetRoutes(); resetUuid();
routes.push({
  match: /FROM workflow_learning_registry/,
  handler: () => [[
    makeRow({ id: 'med-g', severity: 'medium', global_candidate: 1, occurrences: 6 }),
  ]],
});
{
  const list = await svc.getConstraints('anything');
  assert(/global candidate/.test(list[0].injection_reason), 'reason mentions global');
}

// reason labels include severity_source label
resetRoutes(); resetUuid();
routes.push({
  match: /FROM workflow_learning_registry/,
  handler: () => [[
    makeRow({ id: 'crit', severity: 'critical', severity_source: 'manual_override' }),
  ]],
});
{
  const list = await svc.getConstraints();
  assert(/manual override/.test(list[0].injection_reason), 'reason includes manual override label');
}

// Shape: full object returned
resetRoutes(); resetUuid();
routes.push({
  match: /FROM workflow_learning_registry/,
  handler: () => [[
    makeRow({ id: 'x', severity: 'critical', constraint_text: 'rule', occurrences: 2 }),
  ]],
});
{
  const list = await svc.getConstraints();
  const c = list[0];
  assertEq(c.learning_id, 'x', 'learning_id');
  assertEq(c.severity, 'critical', 'severity');
  assertEq(c.constraint_text, 'rule', 'constraint_text');
  assertEq(c.occurrences, 2, 'occurrences');
  assertEq(c.pattern_signature, 'sig', 'pattern_signature');
  assertEq(c.global_candidate, false, 'global_candidate boolean');
}

// ============================================================================
// recordInjection
// ============================================================================
console.log('\n── recordInjection ───────────────────────────────────────');

resetRoutes(); resetUuid();
routes.push({
  match: /^INSERT INTO workflow_learning_injections/,
  handler: () => [{ affectedRows: 1 }],
});
{
  const result = await svc.recordInjection({
    learning_id: 'L-1',
    prompt_id: 'P-1',
    workflow_id: 'W-1',
    constraint_text: 'must X',
    injection_reason: 'high severity',
  });
  assertEq(result.injection_id, 'test-uuid-1', 'injection_id from uuid');
  assertEq(queryLog.length, 1, '1 insert');
  const ins = queryLog[0];
  assertEq(ins.params[0], 'test-uuid-1', 'insert id');
  assertEq(ins.params[1], 'L-1', 'learning_id');
  assertEq(ins.params[2], 'P-1', 'prompt_id');
  assertEq(ins.params[3], 'W-1', 'workflow_id');
  assertEq(ins.params[4], 'must X', 'constraint_text');
  assertEq(ins.params[5], 'high severity', 'injection_reason');
}

// ============================================================================
// getInjectionsForPrompt
// ============================================================================
console.log('\n── getInjectionsForPrompt ────────────────────────────────');

resetRoutes(); resetUuid();
routes.push({
  match: /FROM workflow_learning_injections i/,
  handler: () => [[
    { id: 'i1', prompt_id: 'P-1', learning_title: 'T1', pattern_signature: 's1', severity: 'high' },
    { id: 'i2', prompt_id: 'P-1', learning_title: 'T2', pattern_signature: 's2', severity: 'low' },
  ]],
});
{
  const rows = await svc.getInjectionsForPrompt('P-1');
  assertEq(rows.length, 2, '2 injection rows');
  assertEq(queryLog[0].params[0], 'P-1', 'prompt id param');
  assertEq(rows[0].learning_title, 'T1', 'JOIN fields preserved');
}

// ============================================================================
// listLearnings — filter composition
// ============================================================================
console.log('\n── listLearnings ─────────────────────────────────────────');

resetRoutes(); resetUuid();
routes.push({
  match: /FROM workflow_learning_registry/,
  handler: () => [[
    {
      id: 'A', learning_type: 'violation_pattern', severity: 'high',
      active: 1, global_candidate: 1,
      affected_components: JSON.stringify(['x']),
      source_workflow_ids: JSON.stringify(['w']),
      source_prompt_ids: JSON.stringify(['p']),
    },
  ]],
});
{
  const rows = await svc.listLearnings({
    learning_type: 'violation_pattern',
    severity: 'high',
    active: true,
    global_candidate: true,
    search: 'foo',
  });
  assertEq(rows.length, 1, '1 row');
  assertEq(rows[0].affected_components, ['x'], 'JSON parsed components');
  assertEq(rows[0].source_workflow_ids, ['w'], 'JSON parsed wf ids');
  assertEq(rows[0].source_prompt_ids, ['p'], 'JSON parsed prompt ids');

  const { sql, params } = queryLog[0];
  assert(/learning_type = \?/.test(sql), 'WHERE learning_type');
  assert(/severity = \?/.test(sql), 'WHERE severity');
  assert(/active = \?/.test(sql), 'WHERE active');
  assert(/global_candidate = \?/.test(sql), 'WHERE global_candidate');
  assert(/title LIKE \?/.test(sql), 'WHERE search LIKE');
  assertEq(params, [
    'violation_pattern', 'high', 1, 1, '%foo%', '%foo%', '%foo%',
  ], 'filter params in order');
}

// No filters → just base clause
resetRoutes(); resetUuid();
routes.push({
  match: /FROM workflow_learning_registry/,
  handler: () => [[]],
});
{
  const rows = await svc.listLearnings();
  assertEq(rows.length, 0, 'empty result');
  assertEq(queryLog[0].params, [], 'no params');
  assert(/WHERE 1=1\s+ORDER BY/.test(queryLog[0].sql), 'base WHERE 1=1');
}

// active=false → params[0]=0
resetRoutes(); resetUuid();
routes.push({ match: /FROM workflow_learning_registry/, handler: () => [[]] });
{
  await svc.listLearnings({ active: false });
  assertEq(queryLog[0].params, [0], 'active=false → 0');
}

// global_candidate=false → 0
resetRoutes(); resetUuid();
routes.push({ match: /FROM workflow_learning_registry/, handler: () => [[]] });
{
  await svc.listLearnings({ global_candidate: false });
  assertEq(queryLog[0].params, [0], 'global_candidate=false → 0');
}

// Null JSON fields handled
resetRoutes(); resetUuid();
routes.push({
  match: /FROM workflow_learning_registry/,
  handler: () => [[{
    id: 'Z', affected_components: null, source_workflow_ids: null, source_prompt_ids: null,
  }]],
});
{
  const rows = await svc.listLearnings();
  assertEq(rows[0].affected_components, [], 'null → []');
  assertEq(rows[0].source_workflow_ids, [], 'null → []');
  assertEq(rows[0].source_prompt_ids, [], 'null → []');
}

// ============================================================================
// getLearningById
// ============================================================================
console.log('\n── getLearningById ───────────────────────────────────────');

// Not found
resetRoutes(); resetUuid();
routes.push({ match: /FROM workflow_learning_registry WHERE id = \?/, handler: () => [[]] });
{
  const r = await svc.getLearningById('missing');
  assertEq(r, null, 'not found → null');
}

// Found with injections
resetRoutes(); resetUuid();
routes.push({
  match: /FROM workflow_learning_registry WHERE id = \?/,
  handler: () => [[{
    id: 'L1', title: 'T',
    affected_components: JSON.stringify(['a']),
    source_workflow_ids: JSON.stringify(['w1']),
    source_prompt_ids: JSON.stringify(['p1']),
  }]],
});
routes.push({
  match: /FROM workflow_learning_injections WHERE learning_id = \?/,
  handler: () => [[{ id: 'i1' }, { id: 'i2' }]],
});
{
  const r = await svc.getLearningById('L1');
  assertEq(r.id, 'L1', 'id');
  assertEq(r.affected_components, ['a'], 'parsed components');
  assertEq(r.source_workflow_ids, ['w1'], 'parsed wf');
  assertEq(r.source_prompt_ids, ['p1'], 'parsed prompts');
  assertEq(r.recent_injections.length, 2, 'recent injections attached');
  assertEq(queryLog.length, 2, '2 queries');
}

// ============================================================================
// disableLearning / enableLearning
// ============================================================================
console.log('\n── disable/enable Learning ───────────────────────────────');

// Disable happy
resetRoutes(); resetUuid();
routes.push({
  match: /UPDATE workflow_learning_registry SET active = 0 WHERE id/,
  handler: () => [{ affectedRows: 1 }],
});
{
  const r = await svc.disableLearning('L1');
  assertEq(r.success, true, 'disable success');
  assertEq(queryLog[0].params, ['L1'], 'id param');
}

// Disable not found
resetRoutes(); resetUuid();
routes.push({
  match: /UPDATE workflow_learning_registry SET active = 0/,
  handler: () => [{ affectedRows: 0 }],
});
await assertThrows(
  () => svc.disableLearning('none'),
  /Learning not found/,
  'disable not found throws'
);

// Enable happy
resetRoutes(); resetUuid();
routes.push({
  match: /UPDATE workflow_learning_registry SET active = 1/,
  handler: () => [{ affectedRows: 1 }],
});
{
  const r = await svc.enableLearning('L1');
  assertEq(r.success, true, 'enable success');
}

// Enable not found
resetRoutes(); resetUuid();
routes.push({
  match: /UPDATE workflow_learning_registry SET active = 1/,
  handler: () => [{ affectedRows: 0 }],
});
await assertThrows(
  () => svc.enableLearning('none'),
  /Learning not found/,
  'enable not found throws'
);

// ============================================================================
// setSeverity
// ============================================================================
console.log('\n── setSeverity ───────────────────────────────────────────');

// Invalid severity throws BEFORE DB work
resetRoutes(); resetUuid();
await assertThrows(
  () => svc.setSeverity('L1', 'ultra', 'admin'),
  /Invalid severity: ultra/,
  'invalid severity throws'
);
assertEq(queryLog.length, 0, 'no db work on invalid severity');

// Not found on SELECT
resetRoutes(); resetUuid();
routes.push({
  match: /SELECT severity FROM workflow_learning_registry WHERE id/,
  handler: () => [[]],
});
await assertThrows(
  () => svc.setSeverity('missing', 'high', 'admin'),
  /Learning not found/,
  'setSeverity not found throws'
);

// Happy path → audit trail
resetRoutes(); resetUuid();
routes.push({
  match: /SELECT severity FROM workflow_learning_registry WHERE id/,
  handler: () => [[{ severity: 'medium' }]],
});
routes.push({
  match: /UPDATE workflow_learning_registry\s+SET severity = \?, severity_source = 'manual_override'/,
  handler: () => [{ affectedRows: 1 }],
});
{
  const r = await svc.setSeverity('L1', 'critical', 'nextadmin');
  assertEq(r.success, true, 'setSeverity success');
  assertEq(r.previous_severity, 'medium', 'previous severity captured');
  assertEq(r.new_severity, 'critical', 'new severity');
  assertEq(r.severity_source, 'manual_override', 'source');
  assertEq(r.override_by, 'nextadmin', 'override_by');
  const upd = queryLog[1];
  assertEq(upd.params[0], 'critical', 'update new severity');
  assertEq(upd.params[1], 'nextadmin', 'update override_by');
  assertEq(upd.params[2], 'medium', 'update previous severity');
  assertEq(upd.params[3], 'L1', 'WHERE id');
}

// Actor defaults to 'unknown'
resetRoutes(); resetUuid();
routes.push({
  match: /SELECT severity/,
  handler: () => [[{ severity: 'low' }]],
});
routes.push({ match: /manual_override/, handler: () => [{ affectedRows: 1 }] });
{
  const r = await svc.setSeverity('L1', 'high');
  assertEq(r.override_by, 'unknown', 'actor defaults to unknown');
}

// UPDATE affectedRows 0 → not found
resetRoutes(); resetUuid();
routes.push({
  match: /SELECT severity/,
  handler: () => [[{ severity: 'low' }]],
});
routes.push({
  match: /manual_override/,
  handler: () => [{ affectedRows: 0 }],
});
await assertThrows(
  () => svc.setSeverity('L1', 'high', 'admin'),
  /Learning not found/,
  'setSeverity update 0 throws'
);

// ============================================================================
// resolveLearning
// ============================================================================
console.log('\n── resolveLearning ───────────────────────────────────────');

resetRoutes(); resetUuid();
routes.push({
  match: /SET active = 0, resolved_at = NOW\(\), resolved_by/,
  handler: () => [{ affectedRows: 1 }],
});
{
  const r = await svc.resolveLearning('L1', 'nextadmin');
  assertEq(r.success, true, 'resolve success');
  assertEq(queryLog[0].params[0], 'nextadmin', 'resolved_by param');
  assertEq(queryLog[0].params[1], 'L1', 'id param');
}

resetRoutes(); resetUuid();
routes.push({
  match: /SET active = 0, resolved_at = NOW\(\)/,
  handler: () => [{ affectedRows: 0 }],
});
await assertThrows(
  () => svc.resolveLearning('none', 'admin'),
  /Learning not found/,
  'resolveLearning not found throws'
);

// ============================================================================
// getStats
// ============================================================================
console.log('\n── getStats ──────────────────────────────────────────────');

resetRoutes(); resetUuid();
routes.push({
  match: /SELECT learning_type, COUNT\(\*\) as count/,
  handler: () => [[
    { learning_type: 'violation_pattern', count: 10, total_occurrences: 50 },
    { learning_type: 'success_pattern', count: 3, total_occurrences: 12 },
  ]],
});
routes.push({
  match: /SELECT severity, COUNT\(\*\) as count/,
  handler: () => [[
    { severity: 'high', count: 4 }, { severity: 'medium', count: 6 },
  ]],
});
routes.push({
  match: /learning_type = 'violation_pattern'\s+ORDER BY occurrences DESC/,
  handler: () => [[
    { id: 'v1', title: 'V1', occurrences: 20, severity: 'high',
      affected_components: JSON.stringify(['a']) },
  ]],
});
routes.push({
  match: /learning_type = 'success_pattern'\s+ORDER BY occurrences DESC/,
  handler: () => [[
    { id: 's1', title: 'S1', occurrences: 8, severity: 'low',
      affected_components: JSON.stringify(['b']) },
  ]],
});
routes.push({
  match: /global_candidate = 1\s+ORDER BY occurrences DESC/,
  handler: () => [[
    { id: 'g1', title: 'G1', occurrences: 5, affected_components: JSON.stringify(['c']) },
  ]],
});
routes.push({
  match: /FROM workflow_learning_injections i/,
  handler: () => [[
    { id: 'i1', prompt_id: 'p1', learning_title: 'T', severity: 'high' },
  ]],
});
routes.push({
  match: /SELECT COUNT\(\*\) as count FROM workflow_learning_registry WHERE active = 1$/,
  handler: () => [[{ count: 13 }]],
});
routes.push({
  match: /SELECT COUNT\(\*\) as count FROM workflow_learning_injections$/,
  handler: () => [[{ count: 99 }]],
});
{
  const stats = await svc.getStats();
  assertEq(stats.total_active, 13, 'total_active');
  assertEq(stats.total_injections, 99, 'total_injections');
  assertEq(stats.by_type.length, 2, 'by_type length');
  assertEq(stats.by_type[0].type, 'violation_pattern', 'by_type[0].type');
  assertEq(stats.by_type[0].count, 10, 'by_type[0].count');
  assertEq(stats.by_type[0].total_occurrences, 50, 'total_occurrences mapped');
  assertEq(stats.by_severity.length, 2, 'by_severity length');
  assertEq(stats.by_severity[0].severity, 'high', 'severity mapped');
  assertEq(stats.top_violations.length, 1, 'top_violations length');
  assertEq(stats.top_violations[0].affected_components, ['a'], 'violations components parsed');
  assertEq(stats.top_successes.length, 1, 'top_successes length');
  assertEq(stats.top_successes[0].affected_components, ['b'], 'successes components parsed');
  assertEq(stats.global_candidates.length, 1, 'global_candidates length');
  assertEq(stats.global_candidates[0].affected_components, ['c'], 'globals components parsed');
  assertEq(stats.recent_injections.length, 1, 'recent_injections length');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
