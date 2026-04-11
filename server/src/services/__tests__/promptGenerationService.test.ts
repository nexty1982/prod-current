#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptGenerationService.js (OMD-1118)
 *
 * Deterministic next-prompt generation with adaptive constraint injection.
 * One external dep: `../config/db.getAppPool`.
 *
 * Strategy: stub config/db via require.cache with fake pool using
 * Route[] dispatch. Test pure buildPromptText for each generation type,
 * DB-walking buildAdaptiveConstraints, then orchestrated generateNext/
 * releaseNext/getNext.
 *
 * Coverage:
 *   - DECISION_TABLE shape (8 entries)
 *   - buildPromptText:
 *       · continuation (partial + pass): remaining outcomes enumerated
 *       · continuation (complete + pass): no remaining → next-phase text
 *       · correction: violations + remaining listed
 *       · unblock: blockers enumerated
 *       · remediation: violations with context
 *       · adaptive constraints injected into PROHIBITIONS
 *       · changed_files context added when present
 *       · parsing tolerates string or already-parsed JSON
 *       · contains all 8 required sections
 *   - buildAdaptiveConstraints:
 *       · walks parent chain up to 5 levels
 *       · deduplicates by violation key
 *       · stops on missing row
 *       · returns prefixed "DO NOT repeat" strings
 *   - generateNext:
 *       · prompt not found → throws
 *       · wrong status (draft) → throws
 *       · not evaluated → throws
 *       · idempotent: existing next_prompt_id returns already_existed
 *       · stale reference: deleted child clears pointer and regenerates
 *       · no decision rule → throws
 *       · happy path: INSERT child, link parent, log
 *       · sequence_order increments from parent scope
 *   - releaseNext:
 *       · parent not found → throws
 *       · parent not verified → throws
 *       · parent not evaluated → throws
 *       · no next_prompt_id → throws
 *       · child not found → throws
 *       · child audit not passed → throws
 *       · happy path: released flag set + log
 *   - getNext:
 *       · parent not found → throws
 *       · no next_prompt_id → null
 *       · with next_prompt_id → returns full child row
 *       · stale pointer (missing child) → null
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

async function assertThrows(fn: () => Promise<any>, substring: string, message: string): Promise<void> {
  try {
    await fn();
    console.error(`  FAIL: ${message} (did not throw)`);
    failed++;
  } catch (e: any) {
    if (e.message && e.message.includes(substring)) {
      console.log(`  PASS: ${message}`); passed++;
    } else {
      console.error(`  FAIL: ${message}\n         expected error containing: ${substring}\n         got: ${e.message}`);
      failed++;
    }
  }
}

// ── Fake pool ───────────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
type Route = { match: RegExp; handler: (params: any[]) => any };

const queryCalls: QueryCall[] = [];
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryCalls.push({ sql, params });
    for (const route of routes) {
      if (route.match.test(sql)) return route.handler(params);
    }
    throw new Error(`No route matched SQL: ${sql.slice(0, 100)}`);
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

function resetAll() {
  queryCalls.length = 0;
  routes = [];
}

const {
  generateNext,
  releaseNext,
  getNext,
  DECISION_TABLE,
  buildPromptText,
  buildAdaptiveConstraints,
} = require('../promptGenerationService');

// Parent prompt fixture
const parentFixture = {
  id: 'parent-uuid',
  title: 'Build Login Form',
  purpose: 'Implement user authentication',
  component: 'LoginForm',
  sequence_order: 5,
};

async function main() {

// ============================================================================
// DECISION_TABLE
// ============================================================================
console.log('\n── DECISION_TABLE ────────────────────────────────────────');

assertEq(DECISION_TABLE['complete:pass'].type, 'continuation', 'complete:pass → continuation');
assertEq(DECISION_TABLE['partial:pass'].type, 'continuation', 'partial:pass → continuation');
assertEq(DECISION_TABLE['partial:fail'].type, 'remediation', 'partial:fail → remediation');
assertEq(DECISION_TABLE['failed:pass'].type, 'correction', 'failed:pass → correction');
assertEq(DECISION_TABLE['failed:fail'].type, 'correction', 'failed:fail → correction');
assertEq(DECISION_TABLE['blocked:pass'].type, 'unblock', 'blocked:pass → unblock');
assertEq(DECISION_TABLE['blocked:fail'].type, 'unblock', 'blocked:fail → unblock');
assertEq(DECISION_TABLE['complete:fail'].type, 'remediation', 'complete:fail → remediation');
assertEq(Object.keys(DECISION_TABLE).length, 8, '8 decision entries');

// Each entry has type + label
for (const [key, val] of Object.entries(DECISION_TABLE)) {
  assert((val as any).type && (val as any).label, `${key} has type + label`);
}

// ============================================================================
// buildPromptText — continuation with remaining outcomes
// ============================================================================
console.log('\n── buildPromptText: continuation + remaining ─────────────');

{
  const evaluation = {
    remaining_outcomes: JSON.stringify([
      { source: 'REQUIREMENTS', requirement: 'Add forgot password link' },
      { source: 'OUTPUT_REQUIREMENTS', requirement: 'Include accessibility labels' },
    ]),
    violations_found: '[]',
    blockers_found: '[]',
    issues_found: '[]',
    completed_outcomes: JSON.stringify([{ source: 'REQUIREMENTS', requirement: 'Done A' }]),
    changed_files: JSON.stringify(['LoginForm.tsx', 'auth.ts']),
  };
  const text = buildPromptText({
    parentPrompt: parentFixture,
    evaluation,
    generationType: 'continuation',
    decisionLabel: 'Continuation Prompt',
    sequenceOrder: 6,
    adaptiveConstraints: [],
  });
  // All 8 sections present
  assert(/\[METADATA\]/.test(text), 'METADATA section');
  assert(/CRITICAL EXECUTION RULES/.test(text), 'CRITICAL EXECUTION RULES');
  assert(/SYSTEM PRIORITIES/.test(text), 'SYSTEM PRIORITIES');
  assert(/TASK:/.test(text), 'TASK:');
  assert(/REQUIREMENTS:/.test(text), 'REQUIREMENTS:');
  assert(/OUTPUT REQUIREMENTS:/.test(text), 'OUTPUT REQUIREMENTS:');
  assert(/PROHIBITIONS:/.test(text), 'PROHIBITIONS:');
  assert(/FINAL REQUIREMENT:/.test(text), 'FINAL REQUIREMENT:');

  // Continuation-specific content
  assert(/Continue implementation from "Build Login Form"/.test(text), 'continuation language');
  assert(/Add forgot password link/.test(text), 'remaining item 1');
  assert(/Include accessibility labels/.test(text), 'remaining item 2');

  // Changed files context
  assert(/Files modified in prior execution/.test(text), 'changed files header');
  assert(/LoginForm\.tsx/.test(text), 'changed file listed');
  assert(/auth\.ts/.test(text), 'second changed file');

  // Metadata
  assert(/PARENT: parent-uuid/.test(text), 'parent metadata');
  assert(/COMPONENT: LoginForm/.test(text), 'component metadata');
  assert(/GENERATION_TYPE: continuation/.test(text), 'generation_type');
}

// ============================================================================
// buildPromptText — continuation with no remaining (complete + pass)
// ============================================================================
console.log('\n── buildPromptText: continuation + complete ──────────────');

{
  const evaluation = {
    remaining_outcomes: '[]',
    completed_outcomes: JSON.stringify([
      { source: 'REQUIREMENTS', requirement: 'All done' },
      { source: 'REQUIREMENTS', requirement: 'Also done' },
    ]),
    violations_found: '[]',
    blockers_found: '[]',
    issues_found: '[]',
    changed_files: '[]',
  };
  const text = buildPromptText({
    parentPrompt: parentFixture,
    evaluation,
    generationType: 'continuation',
    decisionLabel: 'Next Phase',
    sequenceOrder: 6,
    adaptiveConstraints: [],
  });
  assert(/Continue to the next phase/.test(text), 'next-phase language');
  assert(/next logical phase of the LoginForm/.test(text), 'mentions component');
  assert(/All 2 outcomes were met/.test(text), 'outcomes count');
  assert(!/Files modified in prior execution/.test(text), 'no files section when empty');
}

// ============================================================================
// buildPromptText — correction
// ============================================================================
console.log('\n── buildPromptText: correction ───────────────────────────');

{
  const evaluation = {
    remaining_outcomes: JSON.stringify([{ source: 'REQUIREMENTS', requirement: 'Fix the broken validation' }]),
    violations_found: JSON.stringify([
      { key: 'fallback_behavior', description: 'Used fallback workaround', matched: 'fallback', context: 'near fallback code' },
    ]),
    blockers_found: '[]',
    issues_found: '[]',
    completed_outcomes: '[]',
    changed_files: '[]',
  };
  const text = buildPromptText({
    parentPrompt: parentFixture,
    evaluation,
    generationType: 'correction',
    decisionLabel: 'Correction',
    sequenceOrder: 6,
    adaptiveConstraints: [],
  });
  assert(/Correct the failed implementation/.test(text), 'correction language');
  assert(/Used fallback workaround/.test(text), 'violation listed');
  assert(/Fix the broken validation/.test(text), 'remaining listed');
}

// ============================================================================
// buildPromptText — unblock
// ============================================================================
console.log('\n── buildPromptText: unblock ──────────────────────────────');

{
  const evaluation = {
    remaining_outcomes: '[]',
    violations_found: '[]',
    blockers_found: JSON.stringify([
      { type: 'dependency', matched: 'waiting on package X', context: 'needs package X' },
      { type: 'access', matched: 'permission denied', context: 'on /etc/config' },
    ]),
    issues_found: '[]',
    completed_outcomes: '[]',
    changed_files: '[]',
  };
  const text = buildPromptText({
    parentPrompt: parentFixture,
    evaluation,
    generationType: 'unblock',
    decisionLabel: 'Unblock',
    sequenceOrder: 6,
    adaptiveConstraints: [],
  });
  assert(/Resolve blockers preventing progress/.test(text), 'unblock language');
  assert(/\[dependency\]/.test(text), 'dependency type shown');
  assert(/\[access\]/.test(text), 'access type shown');
  assert(/waiting on package X/.test(text), 'blocker matched');
  assert(/permission denied/.test(text), 'second blocker');
}

// ============================================================================
// buildPromptText — remediation
// ============================================================================
console.log('\n── buildPromptText: remediation ──────────────────────────');

{
  const evaluation = {
    remaining_outcomes: '[]',
    violations_found: JSON.stringify([
      { key: 'partial_implementation', description: 'TODO found', matched: 'TODO', context: '...// TODO: add validation...' },
    ]),
    blockers_found: '[]',
    issues_found: '[]',
    completed_outcomes: '[]',
    changed_files: '[]',
  };
  const text = buildPromptText({
    parentPrompt: parentFixture,
    evaluation,
    generationType: 'remediation',
    decisionLabel: 'Remediation',
    sequenceOrder: 6,
    adaptiveConstraints: [],
  });
  assert(/Remediate violations/.test(text), 'remediation language');
  assert(/TODO found/.test(text), 'violation description');
  assert(/Context: \.\.\.\/\/ TODO: add validation\.\.\./.test(text), 'violation context shown');
  assert(/before\/after evidence/.test(text), 'output requires before/after');
}

// ============================================================================
// buildPromptText — adaptive constraints injection
// ============================================================================
console.log('\n── buildPromptText: adaptive constraints ─────────────────');

{
  const evaluation = {
    remaining_outcomes: '[]',
    violations_found: '[]',
    blockers_found: '[]',
    issues_found: '[]',
    completed_outcomes: '[]',
    changed_files: '[]',
  };
  const text = buildPromptText({
    parentPrompt: parentFixture,
    evaluation,
    generationType: 'continuation',
    decisionLabel: 'Cont',
    sequenceOrder: 6,
    adaptiveConstraints: [
      'DO NOT repeat: fallback usage',
      'DO NOT repeat: placeholder content',
    ],
  });
  assert(/ADAPTIVE CONSTRAINTS/.test(text), 'ADAPTIVE CONSTRAINTS section');
  assert(/DO NOT repeat: fallback usage/.test(text), 'constraint 1 listed');
  assert(/DO NOT repeat: placeholder content/.test(text), 'constraint 2 listed');
  assert(/LEARNED FROM PRIOR FAILURES/.test(text), 'learned-from section in CRITICAL RULES');
  // Base prohibitions still present
  assert(/No fallback or workaround behavior/.test(text), 'base prohibition 1');
  assert(/No placeholder content/.test(text), 'base prohibition 3');
}

// ============================================================================
// buildPromptText — tolerates already-parsed JSON (object instead of string)
// ============================================================================
console.log('\n── buildPromptText: parsed object tolerance ──────────────');

{
  const evaluation = {
    remaining_outcomes: [{ source: 'REQUIREMENTS', requirement: 'Inline object' }],  // not string
    violations_found: [],
    blockers_found: [],
    issues_found: [],
    completed_outcomes: [],
    changed_files: [],
  };
  const text = buildPromptText({
    parentPrompt: parentFixture,
    evaluation,
    generationType: 'continuation',
    decisionLabel: 'Cont',
    sequenceOrder: 6,
    adaptiveConstraints: [],
  });
  assert(/Inline object/.test(text), 'parsed object handled');
}

// Default fallback case for unknown generation type
{
  const text = buildPromptText({
    parentPrompt: parentFixture,
    evaluation: {
      remaining_outcomes: '[]', violations_found: '[]', blockers_found: '[]',
      issues_found: '[]', completed_outcomes: '[]', changed_files: '[]',
    },
    generationType: 'unknown_type' as any,
    decisionLabel: 'Unknown',
    sequenceOrder: 6,
    adaptiveConstraints: [],
  });
  assert(/Continue from "Build Login Form"/.test(text), 'default fallback task');
  assert(/Complete the next logical step/.test(text), 'default requirements');
}

// ============================================================================
// buildAdaptiveConstraints
// ============================================================================
console.log('\n── buildAdaptiveConstraints: single level ────────────────');

resetAll();
routes = [{
  match: /SELECT violations_found, parent_prompt_id/i,
  handler: () => [[{
    violations_found: JSON.stringify([
      { key: 'fallback_behavior', description: 'Fallback used' },
      { key: 'placeholder_content', description: 'Placeholder in code' },
    ]),
    parent_prompt_id: null,
  }]],
}];
{
  const constraints = await buildAdaptiveConstraints(fakePool, 'p1');
  assertEq(constraints.length, 2, '2 constraints');
  assert(constraints[0].includes('DO NOT repeat'), 'DO NOT repeat prefix');
  assert(constraints[0].includes('Fallback used'), 'description in constraint');
  assert(constraints[1].includes('Placeholder in code'), 'second description');
}

// Walk chain
console.log('\n── buildAdaptiveConstraints: multi-level chain ───────────');
resetAll();
let callCount = 0;
routes = [{
  match: /SELECT violations_found, parent_prompt_id/i,
  handler: (params) => {
    callCount++;
    if (params[0] === 'child') return [[{
      violations_found: JSON.stringify([{ key: 'v1', description: 'first' }]),
      parent_prompt_id: 'parent',
    }]];
    if (params[0] === 'parent') return [[{
      violations_found: JSON.stringify([
        { key: 'v1', description: 'first' },  // duplicate key
        { key: 'v2', description: 'second' },
      ]),
      parent_prompt_id: 'grandparent',
    }]];
    if (params[0] === 'grandparent') return [[{
      violations_found: null,
      parent_prompt_id: null,
    }]];
    return [[]];
  },
}];
{
  const constraints = await buildAdaptiveConstraints(fakePool, 'child');
  assertEq(constraints.length, 2, '2 unique constraints (v1 deduped)');
  assert(constraints[0].includes('first'), 'v1 included');
  assert(constraints[1].includes('second'), 'v2 included');
  assertEq(callCount, 3, '3 chain levels walked');
}

// Depth limit (5)
console.log('\n── buildAdaptiveConstraints: depth limit ─────────────────');
resetAll();
let depthCount = 0;
routes = [{
  match: /SELECT violations_found, parent_prompt_id/i,
  handler: () => {
    depthCount++;
    return [[{
      violations_found: JSON.stringify([{ key: `v${depthCount}`, description: `level${depthCount}` }]),
      parent_prompt_id: 'always-has-parent',  // would loop forever without depth limit
    }]];
  },
}];
{
  await buildAdaptiveConstraints(fakePool, 'start');
  assertEq(depthCount, 5, 'stops at depth 5');
}

// Missing row breaks walk
console.log('\n── buildAdaptiveConstraints: missing row ─────────────────');
resetAll();
routes = [{
  match: /SELECT violations_found, parent_prompt_id/i,
  handler: () => [[]],
}];
{
  const constraints = await buildAdaptiveConstraints(fakePool, 'missing');
  assertEq(constraints, [], 'empty on missing');
}

// ============================================================================
// generateNext — not found
// ============================================================================
console.log('\n── generateNext: not found ───────────────────────────────');

resetAll();
routes = [{ match: /SELECT \* FROM om_prompt_registry WHERE id/i, handler: () => [[]] }];
await assertThrows(
  () => generateNext('missing', 'actor'),
  'Prompt not found',
  'missing parent throws'
);

// ============================================================================
// generateNext — wrong status
// ============================================================================
console.log('\n── generateNext: wrong status ────────────────────────────');

resetAll();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id/i,
  handler: () => [[{ id: 'p1', status: 'draft' }]],
}];
await assertThrows(
  () => generateNext('p1', 'a'),
  'must be "complete" or "verified"',
  'draft status throws'
);

// ============================================================================
// generateNext — not evaluated
// ============================================================================
console.log('\n── generateNext: not evaluated ───────────────────────────');

resetAll();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id/i,
  handler: () => [[{ id: 'p2', status: 'complete', evaluator_status: null }]],
}];
await assertThrows(
  () => generateNext('p2', 'a'),
  'has not been evaluated',
  'null evaluator_status throws'
);

// ============================================================================
// generateNext — idempotent (returns existing)
// ============================================================================
console.log('\n── generateNext: idempotent ──────────────────────────────');

resetAll();
let parentFetch = 0;
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id/i,
    handler: (params) => {
      parentFetch++;
      if (params[0] === 'p3') {
        return [[{
          id: 'p3', status: 'complete', evaluator_status: 'pass',
          completion_status: 'complete', next_prompt_id: 'existing-child',
        }]];
      }
      if (params[0] === 'existing-child') {
        return [[{ id: 'existing-child', title: 'Existing Child' }]];
      }
      return [[]];
    },
  },
];
{
  const result = await generateNext('p3', 'actor');
  assertEq(result.already_existed, true, 'already_existed flag');
  assertEq(result.prompt.id, 'existing-child', 'returns existing child');
  assertEq(parentFetch, 2, 'parent fetch + child fetch');
  // No INSERT
  const sqls = queryCalls.map(c => c.sql);
  assert(!sqls.some(s => /INSERT INTO om_prompt_registry/.test(s)), 'no INSERT when idempotent');
}

// ============================================================================
// generateNext — stale next_prompt_id (child deleted) → regenerates
// ============================================================================
console.log('\n── generateNext: stale reference ─────────────────────────');

resetAll();
let stalePhase = 0;
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id/i,
    handler: (params) => {
      if (params[0] === 'p4') {
        // First fetch: has stale next_prompt_id; after clear & insert, final fetch
        if (stalePhase === 0) {
          stalePhase = 1;
          return [[{
            id: 'p4', status: 'complete', evaluator_status: 'pass',
            completion_status: 'complete', next_prompt_id: 'deleted-child',
            parent_prompt_id: null,
            title: 'Parent', purpose: 'P', component: 'C', sequence_order: 1,
            remaining_outcomes: '[]', violations_found: '[]', blockers_found: '[]',
            issues_found: '[]', completed_outcomes: '[]', changed_files: '[]',
          }]];
        }
      }
      if (params[0] === 'deleted-child') return [[]];  // missing
      // Final fetch for newly-created child (random UUID)
      return [[{ id: params[0], title: 'New Child', status: 'draft' }]];
    },
  },
  {
    match: /UPDATE om_prompt_registry SET next_prompt_id = NULL/i,
    handler: () => [{ affectedRows: 1 }],
  },
  {
    match: /SELECT MAX\(sequence_order\)/i,
    handler: () => [[{ max_seq: 2 }]],
  },
  {
    match: /SELECT violations_found, parent_prompt_id/i,
    handler: () => [[{ violations_found: '[]', parent_prompt_id: null }]],
  },
  {
    match: /INSERT INTO om_prompt_registry/i,
    handler: () => [{ affectedRows: 1 }],
  },
  {
    match: /UPDATE om_prompt_registry SET next_prompt_id = \?/i,
    handler: () => [{ affectedRows: 1 }],
  },
  {
    match: /INSERT INTO system_logs/i,
    handler: () => [{ insertId: 1 }],
  },
];
{
  const result = await generateNext('p4', 'actor');
  assertEq(result.already_existed, false, 'not already_existed (regenerated)');
  // Verify NULL clear + new INSERT
  const sqls = queryCalls.map(c => c.sql);
  assert(sqls.some(s => /SET next_prompt_id = NULL/.test(s)), 'cleared stale ref');
  assert(sqls.some(s => /INSERT INTO om_prompt_registry/.test(s)), 'inserted new child');
}

// ============================================================================
// generateNext — no decision rule → throws
// ============================================================================
console.log('\n── generateNext: no decision rule ────────────────────────');

resetAll();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id/i,
  handler: () => [[{
    id: 'p5', status: 'complete', evaluator_status: 'pass',
    completion_status: 'weird_status', next_prompt_id: null,
    parent_prompt_id: null,
  }]],
}];
await assertThrows(
  () => generateNext('p5', 'a'),
  'No generation rule',
  'unknown combination throws'
);

// ============================================================================
// generateNext — happy path
// ============================================================================
console.log('\n── generateNext: happy path ──────────────────────────────');

resetAll();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id/i,
    handler: (params) => {
      // Return parent on first call, generated child on final call
      if (params[0] === 'p6') {
        return [[{
          id: 'p6', status: 'complete', evaluator_status: 'pass',
          completion_status: 'partial', next_prompt_id: null,
          parent_prompt_id: null,
          title: 'Parent Task', purpose: 'Purpose here', component: 'Foo', sequence_order: 3,
          remaining_outcomes: JSON.stringify([{ source: 'REQUIREMENTS', requirement: 'Finish this item' }]),
          violations_found: '[]', blockers_found: '[]', issues_found: '[]',
          completed_outcomes: '[]', changed_files: '[]',
        }]];
      }
      // Newly created child — return a plausible row
      return [[{ id: params[0], title: 'Continue: Parent Task (seq 4)', status: 'draft' }]];
    },
  },
  {
    match: /SELECT MAX\(sequence_order\)/i,
    handler: () => [[{ max_seq: 3 }]],
  },
  {
    match: /SELECT violations_found, parent_prompt_id/i,
    handler: () => [[{ violations_found: '[]', parent_prompt_id: null }]],
  },
  {
    match: /INSERT INTO om_prompt_registry/i,
    handler: () => [{ affectedRows: 1 }],
  },
  {
    match: /UPDATE om_prompt_registry SET next_prompt_id = \?/i,
    handler: () => [{ affectedRows: 1 }],
  },
  {
    match: /INSERT INTO system_logs/i,
    handler: () => [{ insertId: 1 }],
  },
];
{
  const result = await generateNext('p6', 'nick');
  assertEq(result.already_existed, false, 'newly generated');
  assert(/Continue:/.test(result.prompt.title), 'title uses Continue: prefix');

  // Verify child INSERT
  const insert = queryCalls.find(c => /INSERT INTO om_prompt_registry/.test(c.sql))!;
  // Params: [nextId, actor, title, decision.label, component, parentScope, nextSeq, promptText]
  assertEq(insert.params[1], 'nick', 'actor');
  assert(/Continue/.test(insert.params[2]), 'title has Continue');
  assertEq(insert.params[4], 'Foo', 'component');
  assertEq(insert.params[5], null, 'parent_prompt_id scope');
  assertEq(insert.params[6], 4, 'nextSeq = max_seq+1');
  assert(/\[METADATA\]/.test(insert.params[7]), 'prompt_text has METADATA');

  // Verify link UPDATE
  const link = queryCalls.find(c => /UPDATE om_prompt_registry SET next_prompt_id = \?/.test(c.sql))!;
  assertEq(link.params[1], 'p6', 'parent id in WHERE');

  // Verify log
  const log = queryCalls.find(c => /INSERT INTO system_logs/.test(c.sql))!;
  assert(/\[GENERATED\]/.test(log.params[0]), 'log message has GENERATED');
  assertEq(log.params[2], 'nick', 'log user_email');
}

// ============================================================================
// releaseNext — parent not found
// ============================================================================
console.log('\n── releaseNext: parent not found ─────────────────────────');

resetAll();
routes = [{ match: /SELECT \* FROM om_prompt_registry WHERE id/i, handler: () => [[]] }];
await assertThrows(
  () => releaseNext('missing', 'a'),
  'Prompt not found',
  'missing parent throws'
);

// Parent not verified
console.log('\n── releaseNext: parent not verified ──────────────────────');
resetAll();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id/i,
  handler: () => [[{ id: 'p7', status: 'complete', evaluator_status: 'pass', next_prompt_id: 'c1' }]],
}];
await assertThrows(
  () => releaseNext('p7', 'a'),
  'must be "verified"',
  'non-verified parent throws'
);

// Parent not evaluated
console.log('\n── releaseNext: parent not evaluated ─────────────────────');
resetAll();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id/i,
  handler: () => [[{ id: 'p8', status: 'verified', evaluator_status: null, next_prompt_id: 'c1' }]],
}];
await assertThrows(
  () => releaseNext('p8', 'a'),
  'has not been evaluated',
  'not evaluated throws'
);

// No next_prompt_id
console.log('\n── releaseNext: no next_prompt_id ────────────────────────');
resetAll();
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id/i,
  handler: () => [[{ id: 'p9', status: 'verified', evaluator_status: 'pass', next_prompt_id: null }]],
}];
await assertThrows(
  () => releaseNext('p9', 'a'),
  'no next prompt has been generated',
  'missing next_prompt_id throws'
);

// Child not found
console.log('\n── releaseNext: child not found ──────────────────────────');
resetAll();
let callSeq = 0;
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id/i,
  handler: (params) => {
    callSeq++;
    if (callSeq === 1) return [[{
      id: 'p10', status: 'verified', evaluator_status: 'pass', next_prompt_id: 'missing-child',
    }]];
    return [[]];  // child not found
  },
}];
await assertThrows(
  () => releaseNext('p10', 'a'),
  'Next prompt not found',
  'missing child throws'
);

// Child audit not passed
console.log('\n── releaseNext: child audit not passed ───────────────────');
resetAll();
callSeq = 0;
routes = [{
  match: /SELECT \* FROM om_prompt_registry WHERE id/i,
  handler: (params) => {
    callSeq++;
    if (callSeq === 1) return [[{
      id: 'p11', status: 'verified', evaluator_status: 'pass', next_prompt_id: 'c1',
    }]];
    return [[{ id: 'c1', audit_status: 'pending' }]];
  },
}];
await assertThrows(
  () => releaseNext('p11', 'a'),
  'audit_status is "pending"',
  'pending audit throws'
);

// Happy path
console.log('\n── releaseNext: happy path ───────────────────────────────');
resetAll();
let rCallSeq = 0;
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id/i,
    handler: (params) => {
      rCallSeq++;
      if (rCallSeq === 1) return [[{
        id: 'p12', status: 'verified', evaluator_status: 'pass', next_prompt_id: 'c2',
      }]];
      if (rCallSeq === 2) return [[{ id: 'c2', audit_status: 'pass' }]];
      return [[{ id: 'c2', audit_status: 'pass', released_for_execution: 1 }]];
    },
  },
  {
    match: /UPDATE om_prompt_registry SET released_for_execution = 1/i,
    handler: () => [{ affectedRows: 1 }],
  },
  {
    match: /INSERT INTO system_logs/i,
    handler: () => [{ insertId: 1 }],
  },
];
{
  const result = await releaseNext('p12', 'nick');
  assertEq(result.prompt.released_for_execution, 1, 'released flag set');
  const sqls = queryCalls.map(c => c.sql);
  assert(sqls.some(s => /UPDATE om_prompt_registry SET released_for_execution = 1/.test(s)), 'released flag UPDATE');
  const log = queryCalls.find(c => /INSERT INTO system_logs/.test(c.sql))!;
  assert(/\[RELEASED\]/.test(log.params[0]), 'log has RELEASED');
  assertEq(log.params[2], 'nick', 'log user');
}

// ============================================================================
// getNext
// ============================================================================
console.log('\n── getNext ───────────────────────────────────────────────');

// Parent not found
resetAll();
routes = [{ match: /SELECT next_prompt_id FROM om_prompt_registry/i, handler: () => [[]] }];
await assertThrows(
  () => getNext('missing'),
  'Prompt not found',
  'missing parent throws'
);

// No next
resetAll();
routes = [{
  match: /SELECT next_prompt_id FROM om_prompt_registry/i,
  handler: () => [[{ next_prompt_id: null }]],
}];
{
  const r = await getNext('p13');
  assertEq(r.next_prompt, null, 'null when no next');
}

// With next
resetAll();
routes = [
  {
    match: /SELECT next_prompt_id FROM om_prompt_registry/i,
    handler: () => [[{ next_prompt_id: 'c3' }]],
  },
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id/i,
    handler: () => [[{ id: 'c3', title: 'Child 3' }]],
  },
];
{
  const r = await getNext('p14');
  assertEq(r.next_prompt.id, 'c3', 'returns child');
  assertEq(r.next_prompt.title, 'Child 3', 'child title');
}

// Stale pointer (child was deleted)
resetAll();
routes = [
  {
    match: /SELECT next_prompt_id FROM om_prompt_registry/i,
    handler: () => [[{ next_prompt_id: 'c-gone' }]],
  },
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id/i,
    handler: () => [[]],
  },
];
{
  const r = await getNext('p15');
  assertEq(r.next_prompt, null, 'stale pointer → null');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main()

main().catch((e) => {
  console.error('Unhandled:', e);
  process.exit(1);
});
