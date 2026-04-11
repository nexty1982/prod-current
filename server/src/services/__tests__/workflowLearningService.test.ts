#!/usr/bin/env npx tsx
/**
 * Unit tests for services/workflowLearningService.js (OMD-983)
 *
 * Cross-workflow learning engine — capture violation/success/structural
 * patterns, aggregate, promote to global, inject constraints.
 *
 * Stubs `../config/db` (getAppPool) and `uuid` via require.cache BEFORE
 * requiring the SUT.
 *
 * Coverage:
 *   - Constants: VALID_LEARNING_TYPES, VALID_SEVERITIES, GLOBAL_THRESHOLD,
 *                SEVERITY_ESCALATION, VIOLATION/SUCCESS/STRUCTURAL_CATEGORIES
 *   - buildSignature: prefix stripping, qualifier optional
 *   - recordViolation: unknown category throws; new + existing pattern path
 *   - recordSuccess / recordStructural: category validation
 *   - _recordPattern (via public API):
 *       · new INSERT with occurrences=1, severity_source='category_default'
 *       · existing UPDATE increments, merges components/wf_ids/prompt_ids deduped
 *       · severity escalation at threshold
 *       · severity_source='manual_override' prevents escalation
 *       · global_candidate promotion at GLOBAL_THRESHOLD (3)
 *   - aggregatePatterns: promoted + escalated counts per-severity loop
 *   - getConstraints: critical/high always, medium match-or-global, low direct only
 *   - disableLearning / enableLearning: affectedRows=0 → throws
 *   - setSeverity: invalid severity throws; records previous in audit trail
 *
 * Run: npx tsx server/src/services/__tests__/workflowLearningService.test.ts
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

// ── Fake mysql pool with SQL routing ─────────────────────────────────────
type Route = { match: RegExp; rows?: any[]; result?: any };
type PoolCall = { sql: string; params: any[] };

function makePool(routes: Route[]) {
  const calls: PoolCall[] = [];
  const pool = {
    query: async (sql: string, params: any[] = []) => {
      calls.push({ sql, params });
      for (const r of routes) {
        if (r.match.test(sql)) {
          if (r.rows !== undefined) return [r.rows, []];
          if (r.result !== undefined) return [r.result, []];
          return [[], []];
        }
      }
      return [[], []];
    },
  };
  return { pool, calls };
}

// ── Stub uuid ────────────────────────────────────────────────────────────
let uuidCounter = 0;
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath,
  filename: uuidPath,
  loaded: true,
  exports: { v4: () => `uuid-${++uuidCounter}` },
} as any;

// ── Stub ../config/db ────────────────────────────────────────────────────
let currentPool: any = { query: async () => [[], []] };
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => currentPool },
} as any;

const svc = require('../workflowLearningService');

async function main() {

// ============================================================================
// Constants exports
// ============================================================================
console.log('\n── Constants ─────────────────────────────────────────────');

assertEq(svc.VALID_LEARNING_TYPES, ['violation_pattern', 'success_pattern', 'structural_pattern'], 'VALID_LEARNING_TYPES');
assertEq(svc.VALID_SEVERITIES, ['low', 'medium', 'high', 'critical'], 'VALID_SEVERITIES');
assertEq(svc.GLOBAL_THRESHOLD, 3, 'GLOBAL_THRESHOLD=3');
assertEq(svc.SEVERITY_ESCALATION.low.threshold, 5, 'low → medium at 5');
assertEq(svc.SEVERITY_ESCALATION.low.escalate_to, 'medium', 'low escalates to medium');
assertEq(svc.SEVERITY_ESCALATION.medium.threshold, 8, 'medium → high at 8');
assertEq(svc.SEVERITY_ESCALATION.high.threshold, 12, 'high → critical at 12');
assertEq(svc.SEVERITY_ESCALATION.critical, null, 'critical cannot escalate');

// VIOLATION_CATEGORIES coverage
const violKeys = Object.keys(svc.VIOLATION_CATEGORIES);
assert(violKeys.includes('wrong_api_client'), 'has wrong_api_client');
assert(violKeys.includes('missing_auth_guard'), 'has missing_auth_guard');
assert(violKeys.includes('duplicate_api_logic'), 'has duplicate_api_logic');
assertEq(svc.VIOLATION_CATEGORIES.missing_auth_guard.severity, 'critical', 'missing_auth_guard=critical');
assertEq(svc.VIOLATION_CATEGORIES.wrong_api_client.severity, 'high', 'wrong_api_client=high');
assertEq(svc.VIOLATION_CATEGORIES.inconsistent_naming.severity, 'low', 'inconsistent_naming=low');
assert(violKeys.length >= 10, 'at least 10 violation categories');

// SUCCESS_CATEGORIES
const sucKeys = Object.keys(svc.SUCCESS_CATEGORIES);
assert(sucKeys.includes('complete_execution'), 'success has complete_execution');
assert(sucKeys.includes('clean_first_pass'), 'success has clean_first_pass');
assertEq(svc.SUCCESS_CATEGORIES.complete_execution.severity, 'low', 'success severity=low');

// STRUCTURAL_CATEGORIES
const strucKeys = Object.keys(svc.STRUCTURAL_CATEGORIES);
assert(strucKeys.includes('effective_step_sequence'), 'structural has effective_step_sequence');
assert(strucKeys.includes('optimal_component_split'), 'structural has optimal_component_split');

// ============================================================================
// buildSignature
// ============================================================================
console.log('\n── buildSignature ────────────────────────────────────────');

assertEq(
  svc.buildSignature('violation_pattern', 'wrong_api_client'),
  'violation:wrong_api_client',
  'violation no qualifier'
);
assertEq(
  svc.buildSignature('violation_pattern', 'wrong_api_client', 'backend'),
  'violation:wrong_api_client:backend',
  'violation with qualifier'
);
assertEq(
  svc.buildSignature('success_pattern', 'complete_execution'),
  'success:complete_execution',
  'success no qualifier'
);
assertEq(
  svc.buildSignature('structural_pattern', 'effective_step_sequence', 'ocr'),
  'structural:effective_step_sequence:ocr',
  'structural with qualifier'
);
// null qualifier is falsy → not appended
assertEq(
  svc.buildSignature('violation_pattern', 'foo', null),
  'violation:foo',
  'null qualifier treated as absent'
);

// ============================================================================
// recordViolation: unknown category throws
// ============================================================================
console.log('\n── recordViolation: validation ───────────────────────────');

currentPool = makePool([]).pool;
let caught: any = null;
try {
  await svc.recordViolation({ category: 'not_a_real_category' });
} catch (e) { caught = e; }
assert(caught !== null, 'unknown violation category throws');
assert(caught.message.includes('not_a_real_category'), 'error names the bad category');
assert(caught.message.includes('Valid:'), 'error lists valid categories');

// recordSuccess unknown
caught = null;
try { await svc.recordSuccess({ category: 'foo' }); } catch (e) { caught = e; }
assert(caught !== null, 'unknown success category throws');
assert(caught.message.includes('foo'), 'success error names bad category');

// recordStructural unknown
caught = null;
try { await svc.recordStructural({ category: 'bar' }); } catch (e) { caught = e; }
assert(caught !== null, 'unknown structural category throws');

// ============================================================================
// recordViolation: new pattern (INSERT path)
// ============================================================================
console.log('\n── recordViolation: new pattern ──────────────────────────');

{
  uuidCounter = 100;
  const { pool, calls } = makePool([
    { match: /^SELECT \* FROM workflow_learning_registry WHERE pattern_signature/, rows: [] },
    { match: /^INSERT INTO workflow_learning_registry/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;

  const result = await svc.recordViolation({
    category: 'wrong_api_client',
    component: 'backend',
    description: 'Used fetch directly',
    workflow_id: 'wf-1',
    prompt_id: 'p-1',
  });

  assertEq(result.is_new, true, 'is_new=true for new pattern');
  assertEq(result.occurrences, 1, 'occurrences=1 for new');
  assertEq(result.severity, 'high', 'severity from category default');
  assertEq(result.severity_source, 'category_default', 'source=category_default');
  assertEq(result.base_severity, 'high', 'base_severity=category default');
  assertEq(result.global_candidate, false, 'global_candidate=false initially');
  assertEq(result.learning_id, 'uuid-101', 'learning_id from uuid');

  // Verify SELECT then INSERT
  assertEq(calls.length, 2, '2 queries: SELECT + INSERT');
  assert(/SELECT/.test(calls[0].sql), 'first is SELECT');
  assertEq(calls[0].params[0], 'violation:wrong_api_client:backend', 'signature includes component');
  assert(/INSERT/.test(calls[1].sql), 'second is INSERT');

  // Verify INSERT params:
  // [id, learning_type, signature, title, description, constraint_text,
  //  default_severity (for severity), default_severity (for base), components, wfIds, pIds]
  const p = calls[1].params;
  assertEq(p[0], 'uuid-101', 'id');
  assertEq(p[1], 'violation_pattern', 'learning_type');
  assertEq(p[2], 'violation:wrong_api_client:backend', 'pattern_signature');
  assertEq(p[3], 'Wrong API Client Used', 'title from category');
  assertEq(p[4], 'Used fetch directly', 'description provided');
  assert(p[5].includes('omApi'), 'constraint_text from category');
  assertEq(p[6], 'high', 'severity = default');
  assertEq(p[7], 'high', 'base_severity = default');
  assertEq(p[8], '["backend"]', 'components as JSON array');
  assertEq(p[9], '["wf-1"]', 'wfIds as JSON array');
  assertEq(p[10], '["p-1"]', 'pIds as JSON array');
}

// New pattern without component/workflow_id/prompt_id → empty arrays
{
  uuidCounter = 200;
  const { pool, calls } = makePool([
    { match: /^SELECT \* FROM workflow_learning_registry WHERE pattern_signature/, rows: [] },
    { match: /^INSERT INTO workflow_learning_registry/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;

  await svc.recordViolation({ category: 'missing_auth_guard' });
  const p = calls[1].params;
  assertEq(p[6], 'critical', 'missing_auth_guard severity=critical');
  assertEq(p[8], '[]', 'no component → empty components');
  assertEq(p[9], '[]', 'no workflow_id → empty wfIds');
  assertEq(p[10], '[]', 'no prompt_id → empty pIds');
  assertEq(calls[0].params[0], 'violation:missing_auth_guard', 'no qualifier in signature');
}

// ============================================================================
// recordViolation: existing pattern (UPDATE path) — no escalation
// ============================================================================
console.log('\n── recordViolation: existing pattern ─────────────────────');

{
  const existing = {
    id: 'existing-id-1',
    occurrences: 2,
    severity: 'high',
    severity_source: 'category_default',
    base_severity: 'high',
    global_candidate: 0,
    affected_components: '["backend"]',
    source_workflow_ids: '["wf-old"]',
    source_prompt_ids: '["p-old"]',
  };
  const { pool, calls } = makePool([
    { match: /^SELECT \* FROM workflow_learning_registry/, rows: [existing] },
    { match: /^UPDATE workflow_learning_registry/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;

  const result = await svc.recordViolation({
    category: 'wrong_api_client',
    component: 'frontend', // new component
    workflow_id: 'wf-new',
    prompt_id: 'p-new',
  });

  assertEq(result.is_new, false, 'is_new=false for existing');
  assertEq(result.occurrences, 3, 'occurrences incremented to 3');
  assertEq(result.severity, 'high', 'severity unchanged (below threshold 12)');
  assertEq(result.severity_source, 'category_default', 'source unchanged');
  assertEq(result.global_candidate, true, 'promoted to global at 3 = GLOBAL_THRESHOLD');
  assertEq(result.learning_id, 'existing-id-1', 'returns existing id');

  // UPDATE params: [newOccurrences, newSeverity, newSeveritySource, isGlobal,
  //                 components, wfIds, pIds, id]
  const p = calls[1].params;
  assertEq(p[0], 3, 'param[0]=newOccurrences');
  assertEq(p[1], 'high', 'param[1]=severity');
  assertEq(p[2], 'category_default', 'param[2]=severity_source');
  assertEq(p[3], 1, 'param[3]=isGlobal=1');
  assertEq(JSON.parse(p[4]), ['backend', 'frontend'], 'components merged + deduped');
  assertEq(JSON.parse(p[5]), ['wf-old', 'wf-new'], 'wfIds merged');
  assertEq(JSON.parse(p[6]), ['p-old', 'p-new'], 'pIds merged');
  assertEq(p[7], 'existing-id-1', 'param[7]=id');
}

// Dedup: same component/wf/prompt → not added twice
{
  const existing = {
    id: 'dedup-id',
    occurrences: 1,
    severity: 'medium',
    severity_source: 'category_default',
    base_severity: 'medium',
    global_candidate: 0,
    affected_components: '["backend"]',
    source_workflow_ids: '["wf-1"]',
    source_prompt_ids: '["p-1"]',
  };
  const { pool, calls } = makePool([
    { match: /^SELECT \* FROM workflow_learning_registry/, rows: [existing] },
    { match: /^UPDATE/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;

  await svc.recordViolation({
    category: 'duplicate_api_logic',
    component: 'backend', // same
    workflow_id: 'wf-1',  // same
    prompt_id: 'p-1',     // same
  });
  const p = calls[1].params;
  assertEq(JSON.parse(p[4]), ['backend'], 'components deduped');
  assertEq(JSON.parse(p[5]), ['wf-1'], 'wfIds deduped');
  assertEq(JSON.parse(p[6]), ['p-1'], 'pIds deduped');
}

// global_candidate stays 1 if already 1 (not reset)
{
  const existing = {
    id: 'gc-id',
    occurrences: 5,
    severity: 'medium',
    severity_source: 'category_default',
    base_severity: 'medium',
    global_candidate: 1,
    affected_components: '[]',
    source_workflow_ids: '[]',
    source_prompt_ids: '[]',
  };
  const { pool, calls } = makePool([
    { match: /^SELECT \* FROM workflow_learning_registry/, rows: [existing] },
    { match: /^UPDATE/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;

  const result = await svc.recordViolation({ category: 'src_dist_mismatch' });
  assertEq(result.global_candidate, true, 'global_candidate stays true');
  assertEq(calls[1].params[3], 1, 'isGlobal param stays 1');
}

// ============================================================================
// Severity escalation
// ============================================================================
console.log('\n── Severity escalation ───────────────────────────────────');

// low → medium at 5
{
  const existing = {
    id: 'esc-low',
    occurrences: 4, // will become 5 → threshold met
    severity: 'low',
    severity_source: 'category_default',
    base_severity: 'low',
    global_candidate: 1,
    affected_components: '[]',
    source_workflow_ids: '[]',
    source_prompt_ids: '[]',
  };
  const { pool, calls } = makePool([
    { match: /^SELECT/, rows: [existing] },
    { match: /^UPDATE/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;

  const result = await svc.recordViolation({ category: 'inconsistent_naming' });
  assertEq(result.occurrences, 5, '4+1=5');
  assertEq(result.severity, 'medium', 'low escalated to medium');
  assertEq(result.severity_source, 'threshold_escalated', 'source=threshold_escalated');
  assertEq(calls[1].params[1], 'medium', 'UPDATE sets severity=medium');
  assertEq(calls[1].params[2], 'threshold_escalated', 'UPDATE sets source=threshold_escalated');
}

// high → critical at 12
{
  const existing = {
    id: 'esc-high',
    occurrences: 11, // → 12
    severity: 'high',
    severity_source: 'category_default',
    base_severity: 'high',
    global_candidate: 1,
    affected_components: '[]',
    source_workflow_ids: '[]',
    source_prompt_ids: '[]',
  };
  const { pool, calls } = makePool([
    { match: /^SELECT/, rows: [existing] },
    { match: /^UPDATE/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;

  const result = await svc.recordViolation({ category: 'wrong_api_client' });
  assertEq(result.severity, 'critical', 'high escalated to critical at 12');
}

// manual_override prevents escalation
{
  const existing = {
    id: 'manual',
    occurrences: 4,
    severity: 'low',
    severity_source: 'manual_override', // locked
    base_severity: 'high', // originally high, manually set to low
    global_candidate: 1,
    affected_components: '[]',
    source_workflow_ids: '[]',
    source_prompt_ids: '[]',
  };
  const { pool, calls } = makePool([
    { match: /^SELECT/, rows: [existing] },
    { match: /^UPDATE/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;

  const result = await svc.recordViolation({ category: 'inconsistent_naming' });
  assertEq(result.occurrences, 5, 'still increments occurrences');
  assertEq(result.severity, 'low', 'manual override not escalated');
  assertEq(result.severity_source, 'manual_override', 'source stays manual_override');
  assertEq(result.base_severity, 'high', 'base_severity preserved');
  assertEq(calls[1].params[1], 'low', 'UPDATE keeps low');
  assertEq(calls[1].params[2], 'manual_override', 'UPDATE keeps manual_override');
}

// Critical cannot escalate further (no rule)
{
  const existing = {
    id: 'crit',
    occurrences: 50,
    severity: 'critical',
    severity_source: 'category_default',
    base_severity: 'critical',
    global_candidate: 1,
    affected_components: '[]',
    source_workflow_ids: '[]',
    source_prompt_ids: '[]',
  };
  const { pool } = makePool([
    { match: /^SELECT/, rows: [existing] },
    { match: /^UPDATE/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;

  const result = await svc.recordViolation({ category: 'missing_auth_guard' });
  assertEq(result.severity, 'critical', 'critical stays critical');
}

// Malformed JSON in existing.affected_components → treated as empty, new component added
{
  const existing = {
    id: 'malformed',
    occurrences: 1,
    severity: 'medium',
    severity_source: 'category_default',
    base_severity: 'medium',
    global_candidate: 0,
    affected_components: 'not-json',
    source_workflow_ids: 'also-bad',
    source_prompt_ids: '[also bad',
  };
  const { pool, calls } = makePool([
    { match: /^SELECT/, rows: [existing] },
    { match: /^UPDATE/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;

  await svc.recordViolation({
    category: 'src_dist_mismatch',
    component: 'backend',
    workflow_id: 'wf-x',
    prompt_id: 'p-x',
  });
  const p = calls[1].params;
  assertEq(JSON.parse(p[4]), ['backend'], 'malformed JSON → fresh array with new component');
  assertEq(JSON.parse(p[5]), ['wf-x'], 'malformed wfIds → fresh');
  assertEq(JSON.parse(p[6]), ['p-x'], 'malformed pIds → fresh');
}

// ============================================================================
// recordSuccess + recordStructural delegation
// ============================================================================
console.log('\n── recordSuccess / recordStructural ──────────────────────');

{
  uuidCounter = 300;
  const { pool, calls } = makePool([
    { match: /^SELECT/, rows: [] },
    { match: /^INSERT/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;

  const result = await svc.recordSuccess({
    category: 'clean_first_pass',
    component: 'ocr',
  });
  assertEq(result.is_new, true, 'success new');
  assertEq(result.severity, 'low', 'success severity=low');
  assertEq(calls[0].params[0], 'success:clean_first_pass:ocr', 'success signature prefix');
  const p = calls[1].params;
  assertEq(p[1], 'success_pattern', 'learning_type=success_pattern');
  assertEq(p[5], null, 'success constraint_text=null');
}

{
  uuidCounter = 400;
  const { pool, calls } = makePool([
    { match: /^SELECT/, rows: [] },
    { match: /^INSERT/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;

  await svc.recordStructural({
    category: 'effective_step_sequence',
    component: 'records',
    constraint_text: 'Plan → Implement → Verify',
  });
  assertEq(calls[0].params[0], 'structural:effective_step_sequence:records', 'structural signature prefix');
  const p = calls[1].params;
  assertEq(p[1], 'structural_pattern', 'learning_type=structural_pattern');
  assertEq(p[5], 'Plan → Implement → Verify', 'structural constraint_text passed');
}

// ============================================================================
// aggregatePatterns
// ============================================================================
console.log('\n── aggregatePatterns ─────────────────────────────────────');

{
  const updates: number[] = [7, 3, 2, 1]; // promote=7, low→med=3, med→high=2, high→crit=1
  let idx = 0;
  const { pool, calls } = makePool([]);
  currentPool = {
    query: async (sql: string, params: any[] = []) => {
      calls.push({ sql, params });
      return [{ affectedRows: updates[idx++] }, []];
    },
  };

  const result = await svc.aggregatePatterns();
  assertEq(result.promoted, 7, 'promoted count');
  assertEq(result.escalated, 3 + 2 + 1, 'escalated sum across severities');
  assertEq(calls.length, 4, '1 promote + 3 escalate queries');
  assert(/global_candidate = 1/.test(calls[0].sql), 'first query promotes globals');
  assertEq(calls[0].params[0], 3, 'uses GLOBAL_THRESHOLD=3');
  // Each escalate query skips manual_override
  for (let i = 1; i < 4; i++) {
    assert(/severity_source != 'manual_override'/.test(calls[i].sql), `escalate ${i} skips manual_override`);
  }
}

// ============================================================================
// getConstraints: priority rules
// ============================================================================
console.log('\n── getConstraints ────────────────────────────────────────');

const sampleRows = [
  { id: 'c1', title: 'Crit', severity: 'critical', base_severity: 'critical', severity_source: 'category_default',
    constraint_text: 'crit rule', occurrences: 10, affected_components: '[]', global_candidate: 0,
    pattern_signature: 'sig1' },
  { id: 'h1', title: 'High', severity: 'high', base_severity: 'high', severity_source: 'category_default',
    constraint_text: 'high rule', occurrences: 5, affected_components: '["backend"]', global_candidate: 1,
    pattern_signature: 'sig2' },
  { id: 'm1', title: 'Med-global', severity: 'medium', base_severity: 'medium', severity_source: 'category_default',
    constraint_text: 'med global', occurrences: 4, affected_components: '[]', global_candidate: 1,
    pattern_signature: 'sig3' },
  { id: 'm2', title: 'Med-match', severity: 'medium', base_severity: 'medium', severity_source: 'category_default',
    constraint_text: 'med match', occurrences: 3, affected_components: '["frontend"]', global_candidate: 0,
    pattern_signature: 'sig4' },
  { id: 'm3', title: 'Med-no-match', severity: 'medium', base_severity: 'medium', severity_source: 'category_default',
    constraint_text: 'med no match', occurrences: 2, affected_components: '["other"]', global_candidate: 0,
    pattern_signature: 'sig5' },
  { id: 'l1', title: 'Low-match', severity: 'low', base_severity: 'low', severity_source: 'category_default',
    constraint_text: 'low match', occurrences: 1, affected_components: '["frontend"]', global_candidate: 0,
    pattern_signature: 'sig6' },
  { id: 'l2', title: 'Low-no-match', severity: 'low', base_severity: 'low', severity_source: 'category_default',
    constraint_text: 'low no match', occurrences: 1, affected_components: '[]', global_candidate: 1,
    pattern_signature: 'sig7' },
];

{
  const { pool } = makePool([{ match: /^SELECT id, learning_type/, rows: sampleRows }]);
  currentPool = pool;

  const res = await svc.getConstraints('frontend');
  const ids = res.map((r: any) => r.learning_id);
  assert(ids.includes('c1'), 'critical included');
  assert(ids.includes('h1'), 'high always included');
  assert(ids.includes('m1'), 'medium global included');
  assert(ids.includes('m2'), 'medium with component match included');
  assert(!ids.includes('m3'), 'medium without match or global excluded');
  assert(ids.includes('l1'), 'low with direct match included');
  assert(!ids.includes('l2'), 'low without match excluded (global_candidate does not count)');

  // Verify injection_reason formatting
  const h = res.find((r: any) => r.learning_id === 'h1');
  assert(h.injection_reason.includes('high severity'), 'high reason includes severity');
  assert(h.injection_reason.includes('category default'), 'reason uses readable source label');
  assert(h.injection_reason.includes('5 occurrences'), 'reason includes occurrences');

  const m1 = res.find((r: any) => r.learning_id === 'm1');
  assert(m1.injection_reason.includes('global candidate'), 'medium-global reason');
  const m2 = res.find((r: any) => r.learning_id === 'm2');
  assert(m2.injection_reason.includes('component match'), 'medium-match reason');

  assertEq(m1.global_candidate, true, 'returned global_candidate as boolean');
  assertEq(res.find((r: any) => r.learning_id === 'l1').severity, 'low', 'low severity surfaced');
}

// includeAll=true returns everything with constraint_text
{
  const { pool } = makePool([{ match: /^SELECT id, learning_type/, rows: sampleRows }]);
  currentPool = pool;

  const res = await svc.getConstraints(null, { includeAll: true });
  assertEq(res.length, 7, 'includeAll returns all 7');
  assert(res.every((r: any) => r.injection_reason.includes('Active pattern')), 'includeAll reason prefix');
}

// No component arg: only critical/high/medium-global
{
  const { pool } = makePool([{ match: /^SELECT/, rows: sampleRows }]);
  currentPool = pool;
  const res = await svc.getConstraints();
  const ids = res.map((r: any) => r.learning_id).sort();
  assertEq(ids, ['c1', 'h1', 'm1'], 'no component → crit + high + medium-global only');
}

// ============================================================================
// disableLearning / enableLearning / resolveLearning
// ============================================================================
console.log('\n── disable/enable/resolve ────────────────────────────────');

{
  const { pool, calls } = makePool([
    { match: /^UPDATE workflow_learning_registry SET active = 0 WHERE id/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;
  const result = await svc.disableLearning('some-id');
  assertEq(result.success, true, 'disable returns success');
  assertEq(calls[0].params[0], 'some-id', 'id passed');
}

{
  const { pool } = makePool([
    { match: /^UPDATE/, result: { affectedRows: 0 } },
  ]);
  currentPool = pool;
  let err: any = null;
  try { await svc.disableLearning('missing'); } catch (e) { err = e; }
  assert(err !== null, 'disable throws on not found');
  assert(err.message.includes('not found'), 'error message');
}

{
  const { pool } = makePool([
    { match: /^UPDATE workflow_learning_registry SET active = 1/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;
  const result = await svc.enableLearning('x');
  assertEq(result.success, true, 'enable success');
}

{
  const { pool, calls } = makePool([
    { match: /^UPDATE.*resolved_at = NOW\(\)/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;
  const result = await svc.resolveLearning('x', 'admin@test');
  assertEq(result.success, true, 'resolve success');
  assertEq(calls[0].params[0], 'admin@test', 'resolvedBy passed');
  assertEq(calls[0].params[1], 'x', 'id passed');
}

// ============================================================================
// setSeverity: validation + audit trail
// ============================================================================
console.log('\n── setSeverity ───────────────────────────────────────────');

// Invalid severity throws
{
  currentPool = makePool([]).pool;
  let err: any = null;
  try { await svc.setSeverity('x', 'bogus', 'admin'); } catch (e) { err = e; }
  assert(err !== null, 'invalid severity throws');
  assert(err.message.includes('bogus'), 'error names bad severity');
}

// Not found throws
{
  const { pool } = makePool([
    { match: /^SELECT severity/, rows: [] },
  ]);
  currentPool = pool;
  let err: any = null;
  try { await svc.setSeverity('missing', 'high', 'admin'); } catch (e) { err = e; }
  assert(err !== null, 'not found throws');
  assert(err.message.includes('not found'), 'error message');
}

// Happy path
{
  const { pool, calls } = makePool([
    { match: /^SELECT severity/, rows: [{ severity: 'medium' }] },
    { match: /^UPDATE.*manual_override/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;

  const result = await svc.setSeverity('x', 'critical', 'admin@test');
  assertEq(result.success, true, 'success');
  assertEq(result.previous_severity, 'medium', 'previous captured');
  assertEq(result.new_severity, 'critical', 'new severity');
  assertEq(result.severity_source, 'manual_override', 'source=manual_override');
  assertEq(result.override_by, 'admin@test', 'override_by');

  // UPDATE params: [severity, actor, previousSeverity, id]
  const p = calls[1].params;
  assertEq(p[0], 'critical', 'UPDATE severity');
  assertEq(p[1], 'admin@test', 'UPDATE actor');
  assertEq(p[2], 'medium', 'UPDATE previous severity');
  assertEq(p[3], 'x', 'UPDATE id');
}

// Missing actor defaults to 'unknown'
{
  const { pool, calls } = makePool([
    { match: /^SELECT severity/, rows: [{ severity: 'low' }] },
    { match: /^UPDATE/, result: { affectedRows: 1 } },
  ]);
  currentPool = pool;

  const result = await svc.setSeverity('x', 'high', null);
  assertEq(result.override_by, 'unknown', 'null actor → "unknown"');
  assertEq(calls[1].params[1], 'unknown', 'UPDATE uses "unknown"');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main()

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
