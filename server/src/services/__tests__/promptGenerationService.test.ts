#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptGenerationService.js (OMD-1072)
 *
 * Deterministic generator of follow-up prompts based on evaluation results.
 * Deps: uuid, ../config/db.getAppPool()
 *
 * Strategy: stub both via require.cache before loading SUT. Use a SQL-routed
 * fake pool with route-specific handlers. Deterministic uuid stub for stable
 * child IDs.
 *
 * Coverage:
 *   - DECISION_TABLE export shape
 *   - buildPromptText: all 4 generation types
 *       · continuation with remaining / without remaining
 *       · correction with violations + remaining
 *       · unblock with blockers + remaining
 *       · remediation with violations + remaining
 *       · adaptive constraints rendered
 *       · changed files context
 *       · base prohibitions always present
 *       · METADATA/TASK/REQUIREMENTS/OUTPUT REQUIREMENTS/PROHIBITIONS sections
 *   - buildAdaptiveConstraints:
 *       · walks up to 5 levels of parent chain
 *       · dedupes by violation key
 *       · tolerates broken JSON / missing rows
 *   - generateNext:
 *       · not found → throws
 *       · wrong status → throws
 *       · not evaluated → throws
 *       · idempotent: existing next → returns already_existed=true
 *       · stale next_prompt_id → clears + regenerates
 *       · no decision → throws
 *       · happy path: INSERT child + UPDATE parent + system_logs + final SELECT
 *   - releaseNext:
 *       · not found / wrong status / not evaluated / no next / next not found → throws
 *       · audit not pass → throws
 *       · happy path: UPDATE released + system_logs
 *   - getNext:
 *       · not found → throws
 *       · no next_prompt_id → returns null
 *       · next row present → returns next prompt
 *
 * Run: npx tsx server/src/services/__tests__/promptGenerationService.test.ts
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

// ── uuid stub ─────────────────────────────────────────────
let uuidSeq = 0;
const uuidStub = { v4: () => `uuid-${++uuidSeq}` };
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = { id: uuidPath, filename: uuidPath, loaded: true, exports: uuidStub } as any;

// ── db stub ───────────────────────────────────────────────
type Route = { match: RegExp; rows?: any[]; respond?: (params: any[]) => any };
let routes: Route[] = [];
type QueryCall = { sql: string; params: any[] };
const queryCalls: QueryCall[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryCalls.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        if (r.respond) {
          const out = r.respond(params);
          return [out, []];
        }
        return [r.rows || [], []];
      }
    }
    return [[], []];
  },
};

const dbStub = { getAppPool: () => fakePool };

const pathMod = require('path');
const dbBase = pathMod.resolve(__dirname, '../../config/db');
for (const ext of ['.js', '.ts']) {
  const full = dbBase + ext;
  require.cache[full] = { id: full, filename: full, loaded: true, exports: dbStub } as any;
}

function resetRoutes() {
  routes = [];
  queryCalls.length = 0;
  uuidSeq = 0;
}

// Silence
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const {
  generateNext,
  releaseNext,
  getNext,
  DECISION_TABLE,
  buildPromptText,
  buildAdaptiveConstraints,
} = require('../promptGenerationService');

async function main() {

// ============================================================================
// DECISION_TABLE
// ============================================================================
console.log('\n── DECISION_TABLE ────────────────────────────────────────');

assertEq(typeof DECISION_TABLE, 'object', 'exported object');
assert(DECISION_TABLE['complete:pass'], 'complete:pass key');
assertEq(DECISION_TABLE['complete:pass'].type, 'continuation', 'complete:pass → continuation');
assertEq(DECISION_TABLE['partial:pass'].type, 'continuation', 'partial:pass → continuation');
assertEq(DECISION_TABLE['partial:fail'].type, 'remediation', 'partial:fail → remediation');
assertEq(DECISION_TABLE['failed:pass'].type, 'correction', 'failed:pass → correction');
assertEq(DECISION_TABLE['failed:fail'].type, 'correction', 'failed:fail → correction');
assertEq(DECISION_TABLE['blocked:pass'].type, 'unblock', 'blocked:pass → unblock');
assertEq(DECISION_TABLE['blocked:fail'].type, 'unblock', 'blocked:fail → unblock');
assertEq(DECISION_TABLE['complete:fail'].type, 'remediation', 'complete:fail → remediation');

// ============================================================================
// buildPromptText — continuation with remaining
// ============================================================================
console.log('\n── buildPromptText: continuation ─────────────────────────');

{
  const parent = {
    id: 'p-1',
    title: 'Initial Task',
    component: 'auth',
    purpose: 'Build auth',
    sequence_order: 5,
  };
  const evaluation = {
    remaining_outcomes: JSON.stringify([{ source: 'REQUIREMENTS', requirement: 'Add token refresh' }]),
    completed_outcomes: JSON.stringify([{ source: 'REQUIREMENTS', requirement: 'Add login' }]),
    violations_found: '[]',
    blockers_found: '[]',
    issues_found: '[]',
    changed_files: JSON.stringify(['auth.js', 'test.js']),
  };
  const text = buildPromptText({
    parentPrompt: parent,
    evaluation,
    generationType: 'continuation',
    decisionLabel: 'Continuation Prompt',
    sequenceOrder: 6,
    adaptiveConstraints: [],
  });

  assert(text.includes('[METADATA]'), 'METADATA section');
  assert(text.includes('COMPONENT: auth'), 'component');
  assert(text.includes('PARENT: p-1'), 'parent id');
  assert(text.includes('GENERATION_TYPE: continuation'), 'type');
  assert(text.includes('TASK:'), 'TASK section');
  assert(text.includes('Initial Task'), 'references parent title');
  assert(text.includes('Add token refresh'), 'remaining outcome shown');
  assert(text.includes('REQUIREMENTS:'), 'REQUIREMENTS section');
  assert(text.includes('OUTPUT REQUIREMENTS:'), 'OUTPUT section');
  assert(text.includes('PROHIBITIONS:'), 'PROHIBITIONS section');
  assert(text.includes('FINAL REQUIREMENT:'), 'FINAL REQUIREMENT section');
  assert(text.includes('Files modified in prior execution'), 'changed files context');
  assert(text.includes('- auth.js'), 'first file');
  assert(text.includes('- test.js'), 'second file');
  // Base prohibitions
  assert(text.includes('No fallback or workaround'), 'base prohibition 1');
  assert(text.includes('No partial implementations'), 'base prohibition 2');
  assert(text.includes('No placeholder'), 'base prohibition 3');
  assert(text.includes('No mock or fake data'), 'base prohibition mock');
  assert(text.includes('No simplified versions'), 'base prohibition simplified');
  assert(text.includes('No error suppression'), 'base prohibition errors');
}

// Continuation with no remaining
{
  const parent = { id: 'p-2', title: 'Task', component: 'api', purpose: 'x', sequence_order: 1 };
  const evaluation = {
    remaining_outcomes: '[]',
    completed_outcomes: JSON.stringify([
      { source: 'R', requirement: 'a' },
      { source: 'R', requirement: 'b' },
    ]),
    violations_found: '[]',
    blockers_found: '[]',
    issues_found: '[]',
    changed_files: '[]',
  };
  const text = buildPromptText({
    parentPrompt: parent,
    evaluation,
    generationType: 'continuation',
    decisionLabel: 'Next',
    sequenceOrder: 2,
    adaptiveConstraints: [],
  });
  assert(text.includes('next logical phase'), 'no-remaining branch');
  assert(text.includes('All 2 outcomes were met'), 'completed count');
  assert(!text.includes('Files modified'), 'no file context when empty');
}

// ============================================================================
// buildPromptText — correction
// ============================================================================
console.log('\n── buildPromptText: correction ───────────────────────────');

{
  const parent = { id: 'p-3', title: 'Broken', component: 'db', purpose: 'x', sequence_order: 1 };
  const evaluation = {
    remaining_outcomes: JSON.stringify([{ source: 'R', requirement: 'Do X properly' }]),
    completed_outcomes: '[]',
    violations_found: JSON.stringify([
      { key: 'partial_implementation', description: 'Partial impl marked complete', matched: 'partial', context: 'ctx' },
    ]),
    blockers_found: '[]',
    issues_found: '[]',
    changed_files: '[]',
  };
  const text = buildPromptText({
    parentPrompt: parent,
    evaluation,
    generationType: 'correction',
    decisionLabel: 'Correction',
    sequenceOrder: 2,
    adaptiveConstraints: [],
  });
  assert(text.includes('Correct the failed implementation'), 'correction task');
  assert(text.includes('Violations:'), 'violations listed');
  assert(text.includes('Partial impl marked complete'), 'violation desc');
  assert(text.includes('Unmet requirements:'), 'unmet requirements');
  assert(text.includes('Do X properly'), 'remaining req');
  assert(text.includes('No new failures introduced'), 'output rule');
}

// ============================================================================
// buildPromptText — unblock
// ============================================================================
console.log('\n── buildPromptText: unblock ──────────────────────────────');

{
  const parent = { id: 'p-4', title: 'Blocked', component: 'deploy', purpose: 'x', sequence_order: 1 };
  const evaluation = {
    remaining_outcomes: JSON.stringify([{ source: 'R', requirement: 'Complete deploy' }]),
    completed_outcomes: '[]',
    violations_found: '[]',
    blockers_found: JSON.stringify([
      { type: 'access', matched: 'permission denied', context: 'ctx' },
    ]),
    issues_found: '[]',
    changed_files: '[]',
  };
  const text = buildPromptText({
    parentPrompt: parent,
    evaluation,
    generationType: 'unblock',
    decisionLabel: 'Unblock',
    sequenceOrder: 2,
    adaptiveConstraints: [],
  });
  assert(text.includes('Resolve blockers'), 'unblock task');
  assert(text.includes('[access] permission denied'), 'blocker type+match');
  assert(text.includes('After unblocking, complete:'), 'after unblock section');
  assert(text.includes('Complete deploy'), 'remaining after blockers');
}

// ============================================================================
// buildPromptText — remediation with adaptive constraints
// ============================================================================
console.log('\n── buildPromptText: remediation ──────────────────────────');

{
  const parent = { id: 'p-5', title: 'Violating', component: 'app', purpose: 'x', sequence_order: 1 };
  const evaluation = {
    remaining_outcomes: '[]',
    completed_outcomes: '[]',
    violations_found: JSON.stringify([
      { key: 'mock_data', description: 'Used mocks', matched: 'mock', context: 'in code' },
    ]),
    blockers_found: '[]',
    issues_found: '[]',
    changed_files: '[]',
  };
  const text = buildPromptText({
    parentPrompt: parent,
    evaluation,
    generationType: 'remediation',
    decisionLabel: 'Remediate',
    sequenceOrder: 2,
    adaptiveConstraints: ['DO NOT repeat: Used mocks (detected in prior prompt chain)'],
  });
  assert(text.includes('Remediate violations'), 'remediation task');
  assert(text.includes('1 violation(s) that must be fixed'), 'count');
  assert(text.includes('[mock_data] Used mocks'), 'violation key');
  assert(text.includes('ADAPTIVE CONSTRAINTS'), 'adaptive section');
  assert(text.includes('LEARNED FROM PRIOR FAILURES'), 'learned header');
  assert(text.includes('DO NOT repeat: Used mocks'), 'constraint rendered');
  assert(text.includes('Verify the implementation is correct'), 'fallback after');
}

// ============================================================================
// buildPromptText — default branch (unknown type)
// ============================================================================
console.log('\n── buildPromptText: default branch ───────────────────────');

{
  const parent = { id: 'p-6', title: 'X', component: 'y', purpose: 'z', sequence_order: 1 };
  const text = buildPromptText({
    parentPrompt: parent,
    evaluation: {
      remaining_outcomes: '[]', completed_outcomes: '[]', violations_found: '[]',
      blockers_found: '[]', issues_found: '[]', changed_files: '[]',
    },
    generationType: 'bogus',
    decisionLabel: 'default',
    sequenceOrder: 2,
    adaptiveConstraints: [],
  });
  assert(text.includes('Continue from "X"'), 'default task text');
  assert(text.includes('Complete the next logical step'), 'default req');
}

// ============================================================================
// buildAdaptiveConstraints
// ============================================================================
console.log('\n── buildAdaptiveConstraints ──────────────────────────────');

// Single-level: violations found
resetRoutes();
routes = [{
  match: /SELECT violations_found, parent_prompt_id FROM om_prompt_registry/,
  respond: (params: any[]) => {
    if (params[0] === 'a') return [{
      violations_found: JSON.stringify([
        { key: 'mock_data', description: 'Used mocks' },
        { key: 'fallback_behavior', description: 'Used fallback' },
      ]),
      parent_prompt_id: null,
    }];
    return [];
  },
}];
{
  const constraints = await buildAdaptiveConstraints(fakePool, 'a');
  assertEq(constraints.length, 2, '2 constraints');
  assert(constraints[0].includes('Used mocks'), 'mocks included');
  assert(constraints[1].includes('Used fallback'), 'fallback included');
}

// Walks parent chain, dedupes by key
resetRoutes();
routes = [{
  match: /SELECT violations_found, parent_prompt_id FROM om_prompt_registry/,
  respond: (params: any[]) => {
    if (params[0] === 'c') return [{
      violations_found: JSON.stringify([{ key: 'mock_data', description: 'M' }]),
      parent_prompt_id: 'b',
    }];
    if (params[0] === 'b') return [{
      violations_found: JSON.stringify([
        { key: 'mock_data', description: 'M' },
        { key: 'fallback_behavior', description: 'F' },
      ]),
      parent_prompt_id: 'a',
    }];
    if (params[0] === 'a') return [{
      violations_found: JSON.stringify([{ key: 'placeholder_content', description: 'P' }]),
      parent_prompt_id: null,
    }];
    return [];
  },
}];
{
  const constraints = await buildAdaptiveConstraints(fakePool, 'c');
  assertEq(constraints.length, 3, '3 unique constraints');
  assert(constraints.some((c: string) => c.includes('M')), 'mock dedupe');
  assert(constraints.some((c: string) => c.includes('F')), 'fallback');
  assert(constraints.some((c: string) => c.includes('P')), 'placeholder');
}

// Empty violations
resetRoutes();
routes = [{
  match: /SELECT violations_found/,
  rows: [{ violations_found: null, parent_prompt_id: null }],
}];
{
  const c = await buildAdaptiveConstraints(fakePool, 'x');
  assertEq(c.length, 0, 'null violations → empty');
}

// Parent not found → stops
resetRoutes();
routes = [{ match: /SELECT violations_found/, rows: [] }];
{
  const c = await buildAdaptiveConstraints(fakePool, 'missing');
  assertEq(c.length, 0, 'missing → empty');
}

// ============================================================================
// generateNext — error paths
// ============================================================================
console.log('\n── generateNext: errors ──────────────────────────────────');

// Not found
resetRoutes();
routes = [{ match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [] }];
{
  let thrown: Error | null = null;
  try { await generateNext('missing', 'actor'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('not found'), 'not found throws');
}

// Wrong status
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  rows: [{ id: 'x', status: 'draft', evaluator_status: 'pass', completion_status: 'complete' }],
}];
{
  let thrown: Error | null = null;
  try { await generateNext('x', 'actor'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('must be'), 'wrong status throws');
}

// Not evaluated
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  rows: [{ id: 'x', status: 'complete', evaluator_status: null, completion_status: 'complete' }],
}];
{
  let thrown: Error | null = null;
  try { await generateNext('x', 'actor'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('not been evaluated'), 'not evaluated throws');
}

// No decision rule
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  rows: [{
    id: 'x', status: 'complete', evaluator_status: 'unknown', completion_status: 'unknown',
    title: 't', component: 'c', purpose: 'p', sequence_order: 1,
    next_prompt_id: null, parent_prompt_id: null,
  }],
}];
{
  let thrown: Error | null = null;
  try { await generateNext('x', 'actor'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('No generation rule'), 'no decision throws');
}

// Idempotent: next_prompt_id exists
resetRoutes();
let selectCallCount = 0;
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  respond: (params: any[]) => {
    selectCallCount++;
    if (params[0] === 'p-parent') {
      return [{
        id: 'p-parent', status: 'complete', evaluator_status: 'pass', completion_status: 'complete',
        next_prompt_id: 'existing-child', title: 't', component: 'c', purpose: 'p',
        sequence_order: 1, parent_prompt_id: null,
      }];
    }
    if (params[0] === 'existing-child') {
      return [{ id: 'existing-child', title: 'already there' }];
    }
    return [];
  },
}];
{
  const r = await generateNext('p-parent', 'actor');
  assertEq(r.already_existed, true, 'already_existed true');
  assertEq(r.prompt.id, 'existing-child', 'returns existing child');
}

// Stale next_prompt_id → clears + regenerates
resetRoutes();
uuidSeq = 0;
let selCount = 0;
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: (params: any[]) => {
      selCount++;
      if (params[0] === 'p-parent') {
        // On first call: return parent with stale next_prompt_id.
        // After clear, this path isn't hit again — parent is not re-queried.
        return [{
          id: 'p-parent',
          status: 'complete',
          evaluator_status: 'pass',
          completion_status: 'complete',
          next_prompt_id: 'stale-child',
          title: 't',
          component: 'c',
          purpose: 'p',
          sequence_order: 1,
          parent_prompt_id: null,
          remaining_outcomes: '[]',
          completed_outcomes: '[]',
          violations_found: '[]',
          blockers_found: '[]',
          issues_found: '[]',
          changed_files: '[]',
        }];
      }
      if (params[0] === 'stale-child') {
        return []; // stale — not found
      }
      if (params[0] === 'uuid-1') {
        // The newly created child when SELECT at end
        return [{ id: 'uuid-1', title: 'new' }];
      }
      return [];
    },
  },
  { match: /UPDATE om_prompt_registry SET next_prompt_id = NULL/, rows: [] },
  {
    match: /SELECT violations_found, parent_prompt_id FROM om_prompt_registry/,
    rows: [{ violations_found: '[]', parent_prompt_id: null }],
  },
  {
    match: /SELECT MAX\(sequence_order\)/,
    rows: [{ max_seq: 4 }],
  },
  { match: /INSERT INTO om_prompt_registry/, rows: [] },
  { match: /UPDATE om_prompt_registry SET next_prompt_id = \? WHERE id = \?/, rows: [] },
  { match: /INSERT INTO system_logs/, rows: [] },
];
{
  const r = await generateNext('p-parent', 'actor');
  assertEq(r.already_existed, false, 'already_existed false');
  assertEq(r.prompt.id, 'uuid-1', 'new uuid used');
  assert(
    queryCalls.some(q => /UPDATE.*next_prompt_id = NULL/.test(q.sql)),
    'stale link cleared'
  );
  assert(
    queryCalls.some(q => /INSERT INTO om_prompt_registry/.test(q.sql)),
    'INSERT called'
  );
  assert(
    queryCalls.some(q => /INSERT INTO system_logs/.test(q.sql)),
    'log insert'
  );
}

// Full happy path
resetRoutes();
uuidSeq = 0;
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: (params: any[]) => {
      if (params[0] === 'p-happy') {
        return [{
          id: 'p-happy',
          status: 'verified',
          evaluator_status: 'pass',
          completion_status: 'partial',
          next_prompt_id: null,
          title: 'happy task',
          component: 'comp',
          purpose: 'do things',
          sequence_order: 3,
          parent_prompt_id: null,
          remaining_outcomes: JSON.stringify([{ source: 'R', requirement: 'do rest' }]),
          completed_outcomes: JSON.stringify([{ source: 'R', requirement: 'did this' }]),
          violations_found: '[]',
          blockers_found: '[]',
          issues_found: '[]',
          changed_files: '[]',
        }];
      }
      if (params[0] === 'uuid-1') {
        return [{ id: 'uuid-1', title: 'Continue: happy task (seq 5)' }];
      }
      return [];
    },
  },
  {
    match: /SELECT violations_found, parent_prompt_id FROM om_prompt_registry/,
    rows: [{ violations_found: '[]', parent_prompt_id: null }],
  },
  { match: /SELECT MAX\(sequence_order\)/, rows: [{ max_seq: 4 }] },
  { match: /INSERT INTO om_prompt_registry/, rows: [] },
  { match: /UPDATE om_prompt_registry SET next_prompt_id/, rows: [] },
  { match: /INSERT INTO system_logs/, rows: [] },
];
{
  const r = await generateNext('p-happy', 'actor');
  assertEq(r.prompt.id, 'uuid-1', 'new uuid');
  assertEq(r.already_existed, false, 'not already existed');
  const insertCall = queryCalls.find(q => /INSERT INTO om_prompt_registry/.test(q.sql))!;
  assertEq(insertCall.params[0], 'uuid-1', 'uuid in INSERT');
  assertEq(insertCall.params[1], 'actor', 'actor in INSERT');
  assert(insertCall.params[2].startsWith('Continue:'), 'title prefix');
  assert(insertCall.params[2].includes('seq 5'), 'sequence in title');
  assertEq(insertCall.params[4], 'comp', 'component');
  assertEq(insertCall.params[6], 5, 'sequence_order = max+1');
}

// ============================================================================
// releaseNext
// ============================================================================
console.log('\n── releaseNext ───────────────────────────────────────────');

// Not found
resetRoutes();
routes = [{ match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [] }];
{
  let thrown: Error | null = null;
  try { await releaseNext('x', 'actor'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('not found'), 'not found');
}

// Wrong status
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry/,
  rows: [{ id: 'x', status: 'complete', evaluator_status: 'pass', next_prompt_id: 'c' }],
}];
{
  let thrown: Error | null = null;
  try { await releaseNext('x', 'actor'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('must be "verified"'), 'wrong status');
}

// Not evaluated
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry/,
  rows: [{ id: 'x', status: 'verified', evaluator_status: null, next_prompt_id: 'c' }],
}];
{
  let thrown: Error | null = null;
  try { await releaseNext('x', 'actor'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('not been evaluated'), 'not evaluated');
}

// No next
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry/,
  rows: [{ id: 'x', status: 'verified', evaluator_status: 'pass', next_prompt_id: null }],
}];
{
  let thrown: Error | null = null;
  try { await releaseNext('x', 'actor'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('no next prompt'), 'no next');
}

// Child not found
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  respond: (params: any[]) => {
    if (params[0] === 'x') return [{ id: 'x', status: 'verified', evaluator_status: 'pass', next_prompt_id: 'c' }];
    if (params[0] === 'c') return [];
    return [];
  },
}];
{
  let thrown: Error | null = null;
  try { await releaseNext('x', 'actor'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('Next prompt not found'), 'child missing');
}

// Audit not passing
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  respond: (params: any[]) => {
    if (params[0] === 'x') return [{ id: 'x', status: 'verified', evaluator_status: 'pass', next_prompt_id: 'c' }];
    if (params[0] === 'c') return [{ id: 'c', audit_status: 'pending' }];
    return [];
  },
}];
{
  let thrown: Error | null = null;
  try { await releaseNext('x', 'actor'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('audit_status'), 'audit not pass');
}

// Happy release
resetRoutes();
let relCount = 0;
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: (params: any[]) => {
      relCount++;
      if (params[0] === 'x') return [{ id: 'x', status: 'verified', evaluator_status: 'pass', next_prompt_id: 'c' }];
      if (params[0] === 'c') return [{ id: 'c', audit_status: 'pass', released_for_execution: 0 }];
      return [];
    },
  },
  { match: /UPDATE om_prompt_registry SET released_for_execution/, rows: [] },
  { match: /INSERT INTO system_logs/, rows: [] },
];
{
  const r = await releaseNext('x', 'actor');
  assert(r.prompt, 'returns prompt');
  assert(
    queryCalls.some(q => /UPDATE.*released_for_execution = 1/.test(q.sql)),
    'released flag set'
  );
  assert(
    queryCalls.some(q => /INSERT INTO system_logs/.test(q.sql)),
    'log written'
  );
}

// ============================================================================
// getNext
// ============================================================================
console.log('\n── getNext ───────────────────────────────────────────────');

// Not found
resetRoutes();
routes = [{ match: /SELECT next_prompt_id FROM om_prompt_registry/, rows: [] }];
{
  let thrown: Error | null = null;
  try { await getNext('x'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('not found'), 'not found');
}

// No next
resetRoutes();
routes = [{ match: /SELECT next_prompt_id FROM om_prompt_registry/, rows: [{ next_prompt_id: null }] }];
{
  const r = await getNext('x');
  assertEq(r.next_prompt, null, 'null next');
}

// Next present
resetRoutes();
routes = [
  { match: /SELECT next_prompt_id FROM om_prompt_registry/, rows: [{ next_prompt_id: 'child' }] },
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: (params: any[]) => params[0] === 'child' ? [{ id: 'child', title: 'next one' }] : [],
  },
];
{
  const r = await getNext('x');
  assertEq(r.next_prompt.id, 'child', 'returns child');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
