#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptGenerationService.js (OMD-1034)
 *
 * Generates the next prompt from evaluation results. DECISION_TABLE maps
 * (completion_status, evaluator_status) → generation type. buildPromptText
 * is a pure string builder. buildAdaptiveConstraints walks the parent chain
 * to collect violation history. generateNext / releaseNext / getNext are
 * DB-driven with deterministic validation gates.
 *
 * Test strategy: SQL-routed fake pool stubs `../config/db` via require.cache.
 * uuid is stubbed to return a predictable id.
 *
 * Coverage:
 *   - DECISION_TABLE:
 *       · all 8 (completion × evaluator) keys mapped
 *       · types restricted to {continuation, correction, unblock, remediation}
 *   - buildPromptText:
 *       · continuation with remaining outcomes
 *       · continuation with no remaining outcomes (all complete)
 *       · correction with violations + remaining
 *       · unblock with blockers
 *       · remediation with violations
 *       · default/unknown type fallback
 *       · adaptive constraints inject into PROHIBITIONS + CRITICAL
 *       · includes all 8 required sections
 *       · changed files block appears when non-empty
 *   - buildAdaptiveConstraints:
 *       · walks up parent chain (max 5 levels)
 *       · deduplicates by violation key
 *       · returns empty when no violations
 *       · handles null violations_found
 *       · stops at missing prompt
 *   - generateNext:
 *       · not found → throws
 *       · status not complete/verified → throws
 *       · no evaluator_status → throws
 *       · idempotent: returns existing next with already_existed=true
 *       · dangling next_prompt_id cleared + regenerated
 *       · unknown decision key → throws
 *       · happy path: INSERT + link + log + SELECT final
 *   - releaseNext:
 *       · parent not found → throws
 *       · parent not verified → throws
 *       · parent not evaluated → throws
 *       · no next_prompt_id → throws
 *       · child not found → throws
 *       · child audit not pass → throws
 *       · happy path: UPDATE released_for_execution + log + SELECT
 *   - getNext:
 *       · not found → throws
 *       · no next_prompt_id → returns { next_prompt: null }
 *       · happy path: returns linked prompt
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

// ── Stub uuid ────────────────────────────────────────────────────────
let uuidCounter = 0;
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath,
  filename: uuidPath,
  loaded: true,
  exports: {
    v4: () => `uuid-fake-${++uuidCounter}`,
  },
} as any;

// ── SQL-routed fake pool ────────────────────────────────────────────
type Route = { match: RegExp; rows?: any; throws?: Error; respond?: (params: any[]) => any };
type Call = { sql: string; params: any[] };

const callLog: Call[] = [];
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    callLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        if (r.throws) throw r.throws;
        if (r.respond) return [r.respond(params)];
        return [r.rows];
      }
    }
    return [[]];
  },
};

function resetRoutes() {
  callLog.length = 0;
  routes = [];
}

// ── Stub ../config/db via require.cache ─────────────────────────────
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    getAppPool: () => fakePool,
    promisePool: fakePool,
  },
} as any;

const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() { console.log = () => {}; console.warn = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.warn = origWarn; console.error = origError; }

const {
  generateNext,
  releaseNext,
  getNext,
  DECISION_TABLE,
  buildPromptText,
  buildAdaptiveConstraints,
} = require('../promptGenerationService');

// ── Helpers ──────────────────────────────────────────────────────────
function baseParent(overrides: any = {}): any {
  return {
    id: 'parent-1',
    title: 'Parent Task',
    component: 'backend',
    purpose: 'Do something',
    sequence_order: 3,
    parent_prompt_id: null,
    status: 'verified',
    evaluator_status: 'pass',
    completion_status: 'complete',
    next_prompt_id: null,
    remaining_outcomes: null,
    violations_found: null,
    blockers_found: null,
    issues_found: null,
    completed_outcomes: null,
    changed_files: null,
    ...overrides,
  };
}

async function main() {

// ============================================================================
// DECISION_TABLE
// ============================================================================
console.log('\n── DECISION_TABLE ────────────────────────────────────────');

const expectedKeys = [
  'complete:pass', 'partial:pass', 'partial:fail',
  'failed:pass', 'failed:fail',
  'blocked:pass', 'blocked:fail',
  'complete:fail',
];
for (const k of expectedKeys) {
  assert(DECISION_TABLE[k] !== undefined, `has key ${k}`);
  assert(typeof DECISION_TABLE[k].type === 'string', `${k}: type is string`);
  assert(typeof DECISION_TABLE[k].label === 'string', `${k}: label is string`);
}

// Type constraints
const validTypes = new Set(['continuation', 'correction', 'unblock', 'remediation']);
for (const k of expectedKeys) {
  assert(validTypes.has(DECISION_TABLE[k].type), `${k}: valid type`);
}

// Specific mappings
assertEq(DECISION_TABLE['complete:pass'].type, 'continuation', 'complete:pass → continuation');
assertEq(DECISION_TABLE['partial:pass'].type, 'continuation', 'partial:pass → continuation');
assertEq(DECISION_TABLE['failed:pass'].type, 'correction', 'failed:pass → correction');
assertEq(DECISION_TABLE['blocked:pass'].type, 'unblock', 'blocked:pass → unblock');
assertEq(DECISION_TABLE['complete:fail'].type, 'remediation', 'complete:fail → remediation');

// ============================================================================
// buildPromptText — continuation with remaining
// ============================================================================
console.log('\n── buildPromptText: continuation w/ remaining ────────────');

{
  const text = buildPromptText({
    parentPrompt: baseParent(),
    evaluation: {
      remaining_outcomes: JSON.stringify([
        { source: 'REQ', requirement: 'Add endpoint X' },
        { source: 'REQ', requirement: 'Add endpoint Y' },
      ]),
      completed_outcomes: JSON.stringify([{ source: 'REQ', requirement: 'Setup' }]),
      violations_found: null,
      blockers_found: null,
      issues_found: null,
      changed_files: null,
    },
    generationType: 'continuation',
    decisionLabel: 'Continuation Prompt',
    sequenceOrder: 4,
    adaptiveConstraints: [],
  });
  assert(text.includes('[METADATA]'), 'METADATA section');
  assert(text.includes('CRITICAL EXECUTION RULES:'), 'CRITICAL section');
  assert(text.includes('SYSTEM PRIORITIES:'), 'SYSTEM PRIORITIES section');
  assert(text.includes('TASK:'), 'TASK section');
  assert(text.includes('REQUIREMENTS:'), 'REQUIREMENTS section');
  assert(text.includes('OUTPUT REQUIREMENTS:'), 'OUTPUT REQUIREMENTS section');
  assert(text.includes('PROHIBITIONS:'), 'PROHIBITIONS section');
  assert(text.includes('FINAL REQUIREMENT:'), 'FINAL REQUIREMENT section');
  assert(text.includes('Continue implementation'), 'continue language');
  assert(text.includes('Add endpoint X'), 'remaining 1 listed');
  assert(text.includes('Add endpoint Y'), 'remaining 2 listed');
  assert(text.includes('Parent Task'), 'parent title');
  assert(text.includes('COMPONENT: backend'), 'component');
  assert(text.includes('PARENT: parent-1'), 'parent id');
}

// ============================================================================
// buildPromptText — continuation with no remaining
// ============================================================================
console.log('\n── buildPromptText: continuation no remaining ────────────');

{
  const text = buildPromptText({
    parentPrompt: baseParent(),
    evaluation: {
      remaining_outcomes: null,
      completed_outcomes: JSON.stringify([
        { source: 'REQ', requirement: 'A' },
        { source: 'REQ', requirement: 'B' },
      ]),
      violations_found: null,
      blockers_found: null,
      issues_found: null,
      changed_files: null,
    },
    generationType: 'continuation',
    decisionLabel: 'Next Sequential',
    sequenceOrder: 5,
    adaptiveConstraints: [],
  });
  assert(text.includes('Continue to the next phase'), 'next phase language');
  assert(text.includes('All 2 outcomes were met'), 'completed count');
}

// ============================================================================
// buildPromptText — correction
// ============================================================================
console.log('\n── buildPromptText: correction ───────────────────────────');

{
  const text = buildPromptText({
    parentPrompt: baseParent(),
    evaluation: {
      remaining_outcomes: JSON.stringify([{ source: 'REQ', requirement: 'Unmet X' }]),
      violations_found: JSON.stringify([
        { key: 'V1', description: 'Used mock data', matched: 'mockData', context: 'test.ts:10' },
      ]),
      completed_outcomes: null,
      blockers_found: null,
      issues_found: null,
      changed_files: null,
    },
    generationType: 'correction',
    decisionLabel: 'Correction',
    sequenceOrder: 4,
    adaptiveConstraints: [],
  });
  assert(text.includes('Correct the failed implementation'), 'correction language');
  assert(text.includes('Used mock data'), 'violation listed');
  assert(text.includes('Unmet X'), 'unmet requirement listed');
}

// ============================================================================
// buildPromptText — unblock
// ============================================================================
console.log('\n── buildPromptText: unblock ──────────────────────────────');

{
  const text = buildPromptText({
    parentPrompt: baseParent(),
    evaluation: {
      remaining_outcomes: JSON.stringify([{ source: 'REQ', requirement: 'After unblock' }]),
      blockers_found: JSON.stringify([
        { type: 'dep', matched: 'missing-lib', context: 'install failed' },
      ]),
      violations_found: null,
      issues_found: null,
      completed_outcomes: null,
      changed_files: null,
    },
    generationType: 'unblock',
    decisionLabel: 'Unblock',
    sequenceOrder: 4,
    adaptiveConstraints: [],
  });
  assert(text.includes('Resolve blockers'), 'unblock language');
  assert(text.includes('missing-lib'), 'blocker listed');
  assert(text.includes('After unblock'), 'remaining after unblock');
}

// ============================================================================
// buildPromptText — remediation
// ============================================================================
console.log('\n── buildPromptText: remediation ──────────────────────────');

{
  const text = buildPromptText({
    parentPrompt: baseParent(),
    evaluation: {
      violations_found: JSON.stringify([
        { key: 'V1', description: 'Fallback used', matched: 'try/catch silent', context: 'api.ts' },
        { key: 'V2', description: 'Mock data in prod', matched: 'MOCK_ID', context: 'service.ts' },
      ]),
      remaining_outcomes: null,
      completed_outcomes: null,
      blockers_found: null,
      issues_found: null,
      changed_files: null,
    },
    generationType: 'remediation',
    decisionLabel: 'Remediate',
    sequenceOrder: 4,
    adaptiveConstraints: [],
  });
  assert(text.includes('Remediate violations'), 'remediation language');
  assert(text.includes('Fallback used'), 'violation 1');
  assert(text.includes('Mock data in prod'), 'violation 2');
  assert(text.includes('2 violation(s)'), 'count');
}

// ============================================================================
// buildPromptText — default fallback
// ============================================================================
console.log('\n── buildPromptText: default ──────────────────────────────');

{
  const text = buildPromptText({
    parentPrompt: baseParent(),
    evaluation: {
      remaining_outcomes: null,
      violations_found: null,
      blockers_found: null,
      issues_found: null,
      completed_outcomes: null,
      changed_files: null,
    },
    generationType: 'unknown-type',
    decisionLabel: 'Unknown',
    sequenceOrder: 4,
    adaptiveConstraints: [],
  });
  assert(text.includes('Continue from'), 'default task language');
  assert(text.includes('next logical step'), 'default req');
}

// ============================================================================
// buildPromptText — adaptive constraints
// ============================================================================
console.log('\n── buildPromptText: adaptive constraints ─────────────────');

{
  const text = buildPromptText({
    parentPrompt: baseParent(),
    evaluation: {
      remaining_outcomes: null,
      violations_found: null,
      blockers_found: null,
      issues_found: null,
      completed_outcomes: null,
      changed_files: null,
    },
    generationType: 'continuation',
    decisionLabel: 'Next',
    sequenceOrder: 4,
    adaptiveConstraints: [
      'DO NOT repeat: use mock data',
      'DO NOT repeat: skip validation',
    ],
  });
  assert(text.includes('ADAPTIVE CONSTRAINTS'), 'adaptive section in PROHIBITIONS');
  assert(text.includes('DO NOT repeat: use mock data'), 'constraint 1');
  assert(text.includes('DO NOT repeat: skip validation'), 'constraint 2');
  assert(text.includes('LEARNED FROM PRIOR FAILURES'), 'adaptive section in CRITICAL');
  // Base prohibitions still included
  assert(text.includes('No fallback or workaround'), 'base prohibition 1');
  assert(text.includes('No partial implementations'), 'base prohibition 2');
}

// ============================================================================
// buildPromptText — changed files context
// ============================================================================
console.log('\n── buildPromptText: changed files ────────────────────────');

{
  const text = buildPromptText({
    parentPrompt: baseParent(),
    evaluation: {
      remaining_outcomes: null,
      violations_found: null,
      blockers_found: null,
      issues_found: null,
      completed_outcomes: null,
      changed_files: JSON.stringify(['src/a.ts', 'src/b.ts']),
    },
    generationType: 'continuation',
    decisionLabel: 'Next',
    sequenceOrder: 4,
    adaptiveConstraints: [],
  });
  assert(text.includes('Files modified in prior execution'), 'files header');
  assert(text.includes('- src/a.ts'), 'file a');
  assert(text.includes('- src/b.ts'), 'file b');
}

// ============================================================================
// buildAdaptiveConstraints
// ============================================================================
console.log('\n── buildAdaptiveConstraints ──────────────────────────────');

// No violations → empty
resetRoutes();
routes = [{
  match: /SELECT violations_found, parent_prompt_id FROM om_prompt_registry/,
  respond: () => [{ violations_found: null, parent_prompt_id: null }],
}];
{
  const c = await buildAdaptiveConstraints(fakePool, 'p1');
  assertEq(c, [], 'no violations → empty');
}

// Single level with violations
resetRoutes();
routes = [{
  match: /SELECT violations_found, parent_prompt_id FROM om_prompt_registry/,
  respond: () => [{
    violations_found: JSON.stringify([
      { key: 'V1', description: 'Used mock' },
      { key: 'V2', description: 'Skipped test' },
    ]),
    parent_prompt_id: null,
  }],
}];
{
  const c = await buildAdaptiveConstraints(fakePool, 'p1');
  assertEq(c.length, 2, '2 constraints');
  assert(c[0].includes('Used mock'), 'constraint 1');
  assert(c[1].includes('Skipped test'), 'constraint 2');
  assert(c[0].includes('DO NOT repeat'), 'prefix');
}

// Parent chain walk with dedup
resetRoutes();
let callIdx = 0;
routes = [{
  match: /SELECT violations_found, parent_prompt_id FROM om_prompt_registry/,
  respond: (params: any[]) => {
    callIdx++;
    if (params[0] === 'p3') {
      return [{
        violations_found: JSON.stringify([{ key: 'V1', description: 'Bad thing' }]),
        parent_prompt_id: 'p2',
      }];
    }
    if (params[0] === 'p2') {
      return [{
        violations_found: JSON.stringify([
          { key: 'V1', description: 'Bad thing' }, // dup by key
          { key: 'V2', description: 'Other thing' },
        ]),
        parent_prompt_id: 'p1',
      }];
    }
    if (params[0] === 'p1') {
      return [{ violations_found: null, parent_prompt_id: null }];
    }
    return [];
  },
}];
{
  const c = await buildAdaptiveConstraints(fakePool, 'p3');
  assertEq(c.length, 2, 'deduped to 2 (V1 dup)');
  assert(c[0].includes('Bad thing'), 'V1 first seen');
  assert(c[1].includes('Other thing'), 'V2 second seen');
}

// Missing parent stops walk
resetRoutes();
routes = [{
  match: /SELECT violations_found, parent_prompt_id FROM om_prompt_registry/,
  respond: (params: any[]) => {
    if (params[0] === 'p1') {
      return [{
        violations_found: JSON.stringify([{ key: 'V1', description: 'X' }]),
        parent_prompt_id: 'missing',
      }];
    }
    return []; // missing → empty
  },
}];
{
  const c = await buildAdaptiveConstraints(fakePool, 'p1');
  assertEq(c.length, 1, '1 before chain ends');
}

// ============================================================================
// generateNext — not found
// ============================================================================
console.log('\n── generateNext: errors ──────────────────────────────────');

resetRoutes();
routes = [{ match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [] }];
{
  let caught: Error | null = null;
  try { await generateNext('missing', 'actor'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('not found'), 'not found → throws');
}

// Not complete/verified
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  rows: [baseParent({ status: 'draft' })],
}];
{
  let caught: Error | null = null;
  try { await generateNext('p1', 'actor'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Cannot generate'), 'draft → throws');
}

// Not evaluated
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  rows: [baseParent({ evaluator_status: null })],
}];
{
  let caught: Error | null = null;
  try { await generateNext('p1', 'actor'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('not been evaluated'), 'not evaluated → throws');
}

// Unknown decision key
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  rows: [baseParent({ completion_status: 'weird', evaluator_status: 'pass' })],
}];
{
  let caught: Error | null = null;
  try { await generateNext('p1', 'actor'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('No generation rule'), 'unknown key → throws');
}

// ============================================================================
// generateNext — idempotent
// ============================================================================
console.log('\n── generateNext: idempotent ──────────────────────────────');

resetRoutes();
let selectCount = 0;
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  respond: (params: any[]) => {
    selectCount++;
    if (selectCount === 1) {
      return [baseParent({ next_prompt_id: 'existing-next' })];
    }
    // second call → fetch the existing next
    return [{ id: 'existing-next', title: 'Existing', status: 'draft' }];
  },
}];
{
  const result = await generateNext('parent-1', 'actor');
  assertEq(result.already_existed, true, 'already_existed=true');
  assertEq(result.prompt.id, 'existing-next', 'returns existing');
}

// Dangling next_prompt_id → cleared + regenerated
resetRoutes();
uuidCounter = 100;
let selectCount2 = 0;
routes = [
  {
    match: /^SELECT \* FROM om_prompt_registry WHERE id = \?$/,
    respond: (params: any[]) => {
      selectCount2++;
      if (selectCount2 === 1) {
        // Initial load: parent with dangling next_prompt_id
        return [baseParent({ next_prompt_id: 'dangling', completion_status: 'complete', evaluator_status: 'pass' })];
      }
      if (selectCount2 === 2) {
        // Check if 'dangling' exists → not found
        return [];
      }
      if (params[0] === 'uuid-fake-101') {
        // Final SELECT of newly created
        return [{ id: 'uuid-fake-101', title: 'Continue: Parent Task (seq 1)', status: 'draft' }];
      }
      return [];
    },
  },
  {
    match: /SELECT violations_found, parent_prompt_id FROM om_prompt_registry/,
    rows: [{ violations_found: null, parent_prompt_id: null }],
  },
  {
    match: /SELECT MAX\(sequence_order\) as max_seq/,
    rows: [{ max_seq: 0 }],
  },
  { match: /UPDATE om_prompt_registry SET next_prompt_id = NULL/, rows: { affectedRows: 1 } },
  { match: /INSERT INTO om_prompt_registry/, rows: { insertId: 1 } },
  { match: /UPDATE om_prompt_registry SET next_prompt_id = \?/, rows: { affectedRows: 1 } },
  { match: /INSERT INTO system_logs/, rows: { insertId: 1 } },
];
quiet();
{
  const result = await generateNext('parent-1', 'actor@x.com');
  loud();
  assertEq(result.already_existed, false, 'already_existed=false');
  assertEq(result.prompt.id, 'uuid-fake-101', 'new uuid');
  // Verify UPDATE NULL was called
  const clearCall = callLog.find(c => /SET next_prompt_id = NULL/.test(c.sql));
  assert(clearCall !== undefined, 'dangling cleared');
}

// ============================================================================
// generateNext — happy path
// ============================================================================
console.log('\n── generateNext: happy path ──────────────────────────────');

resetRoutes();
uuidCounter = 200;
let hpSelectCount = 0;
routes = [
  {
    match: /^SELECT \* FROM om_prompt_registry WHERE id = \?$/,
    respond: (params: any[]) => {
      hpSelectCount++;
      if (hpSelectCount === 1) {
        return [baseParent({
          id: 'parent-1',
          next_prompt_id: null,
          completion_status: 'complete',
          evaluator_status: 'pass',
        })];
      }
      // Final SELECT of inserted row
      return [{ id: 'uuid-fake-201', title: 'Continue: Parent Task (seq 1)', status: 'draft' }];
    },
  },
  {
    match: /SELECT violations_found, parent_prompt_id FROM om_prompt_registry/,
    rows: [{ violations_found: null, parent_prompt_id: null }],
  },
  { match: /SELECT MAX\(sequence_order\) as max_seq/, rows: [{ max_seq: 0 }] },
  { match: /INSERT INTO om_prompt_registry/, rows: { insertId: 1 } },
  { match: /UPDATE om_prompt_registry SET next_prompt_id = \?/, rows: { affectedRows: 1 } },
  { match: /INSERT INTO system_logs/, rows: { insertId: 1 } },
];
quiet();
{
  const result = await generateNext('parent-1', 'actor@x.com');
  loud();
  assertEq(result.already_existed, false, 'fresh generation');
  assertEq(result.prompt.id, 'uuid-fake-201', 'new uuid');
  // Verify INSERT
  const insertCall = callLog.find(c => /INSERT INTO om_prompt_registry/.test(c.sql));
  assert(insertCall !== undefined, 'insert executed');
  assertEq(insertCall!.params[0], 'uuid-fake-201', 'uuid as id');
  assertEq(insertCall!.params[1], 'actor@x.com', 'created_by actor');
  assertEq(insertCall!.params[2], 'Continue: Parent Task (seq 1)', 'title format');
  assertEq(insertCall!.params[4], 'backend', 'component');
  assertEq(insertCall!.params[6], 1, 'sequence_order 1');
  // Verify LINK update
  const linkCall = callLog.find(c =>
    /UPDATE om_prompt_registry SET next_prompt_id = \?/.test(c.sql) &&
    c.params[0] === 'uuid-fake-201'
  );
  assert(linkCall !== undefined, 'link update executed');
  assertEq(linkCall!.params[1], 'parent-1', 'linked to parent');
  // Verify system log
  const logCall = callLog.find(c => /INSERT INTO system_logs/.test(c.sql));
  assert(logCall !== undefined, 'log inserted');
  assertEq(logCall!.params[2], 'actor@x.com', 'actor logged');
}

// ============================================================================
// releaseNext
// ============================================================================
console.log('\n── releaseNext ───────────────────────────────────────────');

// Not found
resetRoutes();
routes = [{ match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [] }];
{
  let caught: Error | null = null;
  try { await releaseNext('missing', 'actor'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('not found'), 'parent not found');
}

// Parent not verified
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  rows: [baseParent({ status: 'complete' })],
}];
{
  let caught: Error | null = null;
  try { await releaseNext('p1', 'actor'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('must be "verified"'), 'not verified');
}

// Parent not evaluated
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  rows: [baseParent({ evaluator_status: null })],
}];
{
  let caught: Error | null = null;
  try { await releaseNext('p1', 'actor'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('not been evaluated'), 'not evaluated');
}

// No next_prompt_id
resetRoutes();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  rows: [baseParent({ next_prompt_id: null })],
}];
{
  let caught: Error | null = null;
  try { await releaseNext('p1', 'actor'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('no next prompt'), 'no next');
}

// Child not found
resetRoutes();
let rnSelect = 0;
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  respond: () => {
    rnSelect++;
    if (rnSelect === 1) return [baseParent({ next_prompt_id: 'child-1' })];
    return []; // child lookup → empty
  },
}];
{
  let caught: Error | null = null;
  try { await releaseNext('p1', 'actor'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Next prompt not found'), 'child not found');
}

// Child audit not pass
resetRoutes();
let rnSelect2 = 0;
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  respond: () => {
    rnSelect2++;
    if (rnSelect2 === 1) return [baseParent({ next_prompt_id: 'child-1' })];
    return [{ id: 'child-1', audit_status: 'pending' }];
  },
}];
{
  let caught: Error | null = null;
  try { await releaseNext('p1', 'actor'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('audit_status'), 'audit not pass');
}

// Happy path
resetRoutes();
let rnHpSelect = 0;
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: () => {
      rnHpSelect++;
      if (rnHpSelect === 1) return [baseParent({ next_prompt_id: 'child-1' })];
      if (rnHpSelect === 2) return [{ id: 'child-1', audit_status: 'pass' }];
      // Final SELECT
      return [{ id: 'child-1', audit_status: 'pass', released_for_execution: 1 }];
    },
  },
  { match: /UPDATE om_prompt_registry SET released_for_execution/, rows: { affectedRows: 1 } },
  { match: /INSERT INTO system_logs/, rows: { insertId: 1 } },
];
quiet();
{
  const result = await releaseNext('p1', 'admin@x.com');
  loud();
  assertEq(result.prompt.id, 'child-1', 'returns child');
  assertEq(result.prompt.released_for_execution, 1, 'released flag');
  // Verify UPDATE call
  const updateCall = callLog.find(c => /SET released_for_execution = 1/.test(c.sql));
  assert(updateCall !== undefined, 'released flag set');
  assertEq(updateCall!.params[0], 'child-1', 'child id');
  // Verify log
  const logCall = callLog.find(c => /INSERT INTO system_logs/.test(c.sql));
  assert(logCall !== undefined, 'log inserted');
  assertEq(logCall!.params[2], 'admin@x.com', 'actor logged');
}

// ============================================================================
// getNext
// ============================================================================
console.log('\n── getNext ───────────────────────────────────────────────');

// Not found
resetRoutes();
routes = [{ match: /SELECT next_prompt_id FROM om_prompt_registry/, rows: [] }];
{
  let caught: Error | null = null;
  try { await getNext('missing'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('not found'), 'not found');
}

// No next
resetRoutes();
routes = [{
  match: /SELECT next_prompt_id FROM om_prompt_registry/,
  rows: [{ next_prompt_id: null }],
}];
{
  const r = await getNext('p1');
  assertEq(r.next_prompt, null, 'null next');
}

// Happy path
resetRoutes();
routes = [
  { match: /SELECT next_prompt_id FROM om_prompt_registry/, rows: [{ next_prompt_id: 'child-1' }] },
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [{ id: 'child-1', title: 'Child' }] },
];
{
  const r = await getNext('p1');
  assertEq(r.next_prompt.id, 'child-1', 'returns child');
  assertEq(r.next_prompt.title, 'Child', 'child title');
}

// Next referenced but missing
resetRoutes();
routes = [
  { match: /SELECT next_prompt_id FROM om_prompt_registry/, rows: [{ next_prompt_id: 'child-1' }] },
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/, rows: [] },
];
{
  const r = await getNext('p1');
  assertEq(r.next_prompt, null, 'null when child missing');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
