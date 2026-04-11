#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptGenerationService.js (OMD-1242)
 *
 * Deterministic tests for the prompt generation service:
 *   - DECISION_TABLE routing
 *   - buildPromptText (pure): continuation, correction, unblock, remediation, default
 *     · with and without remaining outcomes / violations / blockers
 *     · adaptive constraints injection
 *     · changedFiles context
 *   - buildAdaptiveConstraints: parent chain walk, dedup on key, depth cap at 5
 *   - generateNext: happy path, idempotent on existing next_prompt_id,
 *     guards (not complete/verified, not evaluated, no decision key)
 *   - releaseNext: guards (parent not verified, no next, child audit not pass),
 *     happy path
 *   - getNext: with/without next link
 *
 * Strategy: stub ../config/db and uuid via require.cache with a scripted
 * fake pool using regex responders. Silence console noise.
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

// ─── Fake pool ──────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Responder = {
  match: RegExp;
  respond: (params: any[]) => any;
};
let responders: Responder[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of responders) {
      if (r.match.test(sql)) {
        return [r.respond(params)];
      }
    }
    return [[]];
  },
};

const dbStub = {
  getAppPool: () => fakePool,
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: dbStub,
} as any;

// Stub uuid with deterministic counter
let uuidCounter = 0;
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath,
  filename: uuidPath,
  loaded: true,
  exports: { v4: () => `uuid-${++uuidCounter}` },
} as any;

function resetState() {
  queryLog.length = 0;
  responders = [];
  uuidCounter = 0;
}

// Silence noise
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}
function loud() {
  console.log = origLog;
  console.warn = origWarn;
  console.error = origError;
}

const svc = require('../promptGenerationService');
const {
  generateNext,
  releaseNext,
  getNext,
  DECISION_TABLE,
  buildPromptText,
  buildAdaptiveConstraints,
} = svc;

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
assert(typeof DECISION_TABLE['complete:pass'].label === 'string', 'decision has label');

// ============================================================================
// buildPromptText — continuation with remaining outcomes
// ============================================================================
console.log('\n── buildPromptText: continuation (remaining) ─────────────');

{
  const parent = {
    id: 'p1',
    title: 'Parent Title',
    component: 'my-component',
    purpose: 'Do the thing',
    sequence_order: 3,
  };
  const evaluation = {
    remaining_outcomes: JSON.stringify([
      { source: 'req', requirement: 'req one' },
      { source: 'req', requirement: 'req two' },
    ]),
    completed_outcomes: JSON.stringify([{ source: 'req', requirement: 'done' }]),
    violations_found: null,
    blockers_found: null,
    issues_found: null,
    changed_files: JSON.stringify(['a.js', 'b.js']),
  };
  const text = buildPromptText({
    parentPrompt: parent,
    evaluation,
    generationType: 'continuation',
    decisionLabel: 'Continue',
    sequenceOrder: 4,
    adaptiveConstraints: [],
  });
  assert(text.includes('Continue implementation from "Parent Title"'), 'continuation task header');
  assert(text.includes('The prior prompt completed 1 outcomes'), 'completed count');
  assert(text.includes('following 2 outcomes remain'), 'remaining count');
  assert(text.includes('[req] req one'), 'remaining item 1');
  assert(text.includes('[req] req two'), 'remaining item 2');
  assert(text.includes('Files modified in prior execution'), 'changed files section');
  assert(text.includes('- a.js'), 'file a');
  assert(text.includes('- b.js'), 'file b');
  assert(text.includes('COMPONENT: my-component'), 'component in metadata');
  assert(text.includes('PARENT: p1'), 'parent id');
  assert(text.includes('GENERATION_TYPE: continuation'), 'generation type');
  assert(text.includes('PURPOSE: Continue'), 'decisionLabel as purpose');
  assert(text.includes('No fallback or workaround behavior'), 'base prohibition 1');
  assert(!text.includes('ADAPTIVE CONSTRAINTS'), 'no adaptive when empty');
  assert(!text.includes('LEARNED FROM PRIOR FAILURES'), 'no learned section when empty');
  assert(text.includes('TASK:'), 'TASK section present');
  assert(text.includes('REQUIREMENTS:'), 'REQUIREMENTS section present');
  assert(text.includes('OUTPUT REQUIREMENTS:'), 'OUTPUT section present');
  assert(text.includes('PROHIBITIONS:'), 'PROHIBITIONS section present');
  assert(text.includes('FINAL REQUIREMENT:'), 'FINAL REQUIREMENT section present');
}

// ============================================================================
// buildPromptText — continuation with no remaining (all complete)
// ============================================================================
console.log('\n── buildPromptText: continuation (all complete) ─────────');

{
  const parent = {
    id: 'p1', title: 'T', component: 'comp', purpose: 'x', sequence_order: 1,
  };
  const evaluation = {
    remaining_outcomes: '[]',
    completed_outcomes: JSON.stringify([{}, {}, {}]),
    violations_found: null,
    blockers_found: null,
    issues_found: null,
    changed_files: null,
  };
  const text = buildPromptText({
    parentPrompt: parent,
    evaluation,
    generationType: 'continuation',
    decisionLabel: 'Continue next phase',
    sequenceOrder: 2,
    adaptiveConstraints: [],
  });
  assert(text.includes('Continue to the next phase'), 'next phase header');
  assert(text.includes('All 3 outcomes were met'), 'all 3 met');
  assert(!text.includes('Files modified'), 'no files context');
}

// ============================================================================
// buildPromptText — correction
// ============================================================================
console.log('\n── buildPromptText: correction ───────────────────────────');

{
  const parent = { id: 'p2', title: 'Failed Task', component: 'c', purpose: 'p', sequence_order: 5 };
  const evaluation = {
    violations_found: JSON.stringify([
      { key: 'v1', description: 'no fallback', matched: 'catch', context: '...' },
    ]),
    remaining_outcomes: JSON.stringify([{ source: 'r', requirement: 'finish feature' }]),
    completed_outcomes: null,
    blockers_found: null,
    issues_found: null,
    changed_files: null,
  };
  const text = buildPromptText({
    parentPrompt: parent,
    evaluation,
    generationType: 'correction',
    decisionLabel: 'Correct',
    sequenceOrder: 6,
    adaptiveConstraints: [],
  });
  assert(text.includes('Correct the failed implementation'), 'correction header');
  assert(text.includes('Violations:'), 'violations subsection');
  assert(text.includes('[v1] no fallback'), 'violation rendered');
  assert(text.includes('Unmet requirements:'), 'unmet subsection');
  assert(text.includes('finish feature'), 'remaining rendered');
  assert(text.includes('GENERATION_TYPE: correction'), 'metadata');
}

// ============================================================================
// buildPromptText — unblock
// ============================================================================
console.log('\n── buildPromptText: unblock ──────────────────────────────');

{
  const parent = { id: 'p3', title: 'Blocked Task', component: 'c', purpose: 'p', sequence_order: 7 };
  const evaluation = {
    blockers_found: JSON.stringify([
      { type: 'env', matched: 'API_KEY missing', context: 'in config' },
      { type: 'dep', matched: 'package not installed', context: 'pkg.json' },
    ]),
    remaining_outcomes: JSON.stringify([{ source: 'r', requirement: 'proceed' }]),
    violations_found: null,
    completed_outcomes: null,
    issues_found: null,
    changed_files: null,
  };
  const text = buildPromptText({
    parentPrompt: parent,
    evaluation,
    generationType: 'unblock',
    decisionLabel: 'Unblock',
    sequenceOrder: 8,
    adaptiveConstraints: [],
  });
  assert(text.includes('Resolve blockers preventing progress'), 'unblock header');
  assert(text.includes('[env] API_KEY missing'), 'blocker 1');
  assert(text.includes('[dep] package not installed'), 'blocker 2');
  assert(text.includes('After unblocking, complete'), 'post-unblock section');
  assert(text.includes('proceed'), 'remaining rendered');
}

// ============================================================================
// buildPromptText — remediation
// ============================================================================
console.log('\n── buildPromptText: remediation ──────────────────────────');

{
  const parent = { id: 'p4', title: 'Dirty Task', component: 'c', purpose: 'p', sequence_order: 9 };
  const evaluation = {
    violations_found: JSON.stringify([
      { key: 'v1', description: 'no placeholder', matched: 'TODO', context: 'file.ts' },
      { key: 'v2', description: 'no workaround', matched: 'hack', context: 'other.ts' },
    ]),
    remaining_outcomes: '[]',
    completed_outcomes: null,
    blockers_found: null,
    issues_found: null,
    changed_files: null,
  };
  const text = buildPromptText({
    parentPrompt: parent,
    evaluation,
    generationType: 'remediation',
    decisionLabel: 'Remediate',
    sequenceOrder: 10,
    adaptiveConstraints: [],
  });
  assert(text.includes('Remediate violations'), 'remediation header');
  assert(text.includes('2 violation(s)'), 'violation count');
  assert(text.includes('[v1] no placeholder'), 'violation v1');
  assert(text.includes('[v2] no workaround'), 'violation v2');
  assert(text.includes('Verify the implementation is correct'), 'verify fallback when no remaining');
}

// ============================================================================
// buildPromptText — default (unknown type)
// ============================================================================
console.log('\n── buildPromptText: default ──────────────────────────────');

{
  const parent = { id: 'p5', title: 'Any', component: 'c', purpose: 'p', sequence_order: 1 };
  const evaluation = {
    violations_found: null,
    remaining_outcomes: null,
    completed_outcomes: null,
    blockers_found: null,
    issues_found: null,
    changed_files: null,
  };
  const text = buildPromptText({
    parentPrompt: parent,
    evaluation,
    generationType: 'unknown-type',
    decisionLabel: 'Something',
    sequenceOrder: 2,
    adaptiveConstraints: [],
  });
  assert(text.includes('Continue from "Any"'), 'default task');
  assert(text.includes('Complete the next logical step'), 'default requirements');
}

// ============================================================================
// buildPromptText — adaptive constraints injection
// ============================================================================
console.log('\n── buildPromptText: adaptive constraints ─────────────────');

{
  const parent = { id: 'p6', title: 'T', component: 'c', purpose: 'p', sequence_order: 1 };
  const evaluation = {
    violations_found: null,
    remaining_outcomes: '[]',
    completed_outcomes: JSON.stringify([{}]),
    blockers_found: null,
    issues_found: null,
    changed_files: null,
  };
  const constraints = [
    'DO NOT repeat: X',
    'DO NOT repeat: Y',
  ];
  const text = buildPromptText({
    parentPrompt: parent,
    evaluation,
    generationType: 'continuation',
    decisionLabel: 'Continue',
    sequenceOrder: 2,
    adaptiveConstraints: constraints,
  });
  assert(text.includes('ADAPTIVE CONSTRAINTS (from prior evaluation failures)'), 'adaptive header');
  assert(text.includes('8. DO NOT repeat: X'), 'constraint 1 numbered 8');
  assert(text.includes('9. DO NOT repeat: Y'), 'constraint 2 numbered 9');
  assert(text.includes('LEARNED FROM PRIOR FAILURES'), 'learned section');
  assert(text.includes('- DO NOT repeat: X'), 'learned bullet 1');
  assert(text.includes('- DO NOT repeat: Y'), 'learned bullet 2');
}

// ============================================================================
// buildPromptText — parseJson tolerance
// ============================================================================
console.log('\n── buildPromptText: parseJson tolerance ──────────────────');

{
  // Pass already-parsed objects (not strings)
  const parent = { id: 'p7', title: 'T', component: 'c', purpose: 'p', sequence_order: 1 };
  const evaluation = {
    remaining_outcomes: [{ source: 'r', requirement: 'already an array' }],
    completed_outcomes: [],
    violations_found: null,
    blockers_found: null,
    issues_found: null,
    changed_files: null,
  };
  const text = buildPromptText({
    parentPrompt: parent,
    evaluation,
    generationType: 'continuation',
    decisionLabel: 'X',
    sequenceOrder: 2,
    adaptiveConstraints: [],
  });
  assert(text.includes('already an array'), 'accepts object/array directly');
}

{
  // Malformed JSON string should be treated as null (no crash)
  const parent = { id: 'p8', title: 'T', component: 'c', purpose: 'p', sequence_order: 1 };
  const evaluation = {
    remaining_outcomes: '{not json',
    completed_outcomes: null,
    violations_found: null,
    blockers_found: null,
    issues_found: null,
    changed_files: null,
  };
  let threw = false;
  try {
    buildPromptText({
      parentPrompt: parent,
      evaluation,
      generationType: 'continuation',
      decisionLabel: 'X',
      sequenceOrder: 2,
      adaptiveConstraints: [],
    });
  } catch {
    threw = true;
  }
  assert(!threw, 'malformed JSON does not crash');
}

// ============================================================================
// buildAdaptiveConstraints
// ============================================================================
console.log('\n── buildAdaptiveConstraints ──────────────────────────────');

// Chain: A (violation v1) → parent B (violation v2) → parent C (violation v1 dup) → parent null
resetState();
{
  const chain: Record<string, any> = {
    A: {
      violations_found: JSON.stringify([{ key: 'v1', description: 'no fallback' }]),
      parent_prompt_id: 'B',
    },
    B: {
      violations_found: JSON.stringify([{ key: 'v2', description: 'no placeholder' }]),
      parent_prompt_id: 'C',
    },
    C: {
      violations_found: JSON.stringify([{ key: 'v1', description: 'no fallback dup' }]),
      parent_prompt_id: null,
    },
  };
  responders.push({
    match: /FROM om_prompt_registry WHERE id = \?/,
    respond: (params: any[]) => {
      const id = params[0];
      return chain[id] ? [chain[id]] : [];
    },
  });
  const out = await buildAdaptiveConstraints(fakePool, 'A');
  assertEq(out.length, 2, '2 unique constraints (v1 deduped)');
  assert(out[0].includes('no fallback'), 'first: v1 from A');
  assert(out[1].includes('no placeholder'), 'second: v2 from B');
  assert(!out.some((c: string) => c.includes('no fallback dup')), 'v1 dup from C filtered');
}

// Depth cap at 5: infinite chain
resetState();
{
  let callCount = 0;
  responders.push({
    match: /FROM om_prompt_registry WHERE id = \?/,
    respond: () => {
      callCount++;
      return [{
        violations_found: JSON.stringify([{ key: `k${callCount}`, description: `d${callCount}` }]),
        parent_prompt_id: 'next',
      }];
    },
  });
  const out = await buildAdaptiveConstraints(fakePool, 'seed');
  assertEq(out.length, 5, 'depth cap at 5');
}

// Missing prompt → terminates cleanly
resetState();
{
  responders.push({
    match: /FROM om_prompt_registry WHERE id = \?/,
    respond: () => [],
  });
  const out = await buildAdaptiveConstraints(fakePool, 'ghost');
  assertEq(out.length, 0, 'missing prompt → empty');
}

// ============================================================================
// generateNext — happy path (complete + pass)
// ============================================================================
console.log('\n── generateNext: happy path ──────────────────────────────');

resetState();
{
  const parent = {
    id: 'parent-1',
    title: 'Parent',
    component: 'comp',
    purpose: 'do',
    sequence_order: 2,
    status: 'complete',
    evaluator_status: 'pass',
    completion_status: 'complete',
    parent_prompt_id: null,
    next_prompt_id: null,
    violations_found: '[]',
    remaining_outcomes: '[]',
    completed_outcomes: JSON.stringify([{ r: 1 }]),
    blockers_found: null,
    issues_found: null,
    changed_files: null,
  };

  let insertedRows: Record<string, any> = { 'parent-1': parent };

  responders.push({
    match: /^SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: (params: any[]) => {
      const id = params[0];
      return insertedRows[id] ? [insertedRows[id]] : [];
    },
  });
  responders.push({
    match: /SELECT violations_found, parent_prompt_id FROM om_prompt_registry WHERE id = \?/,
    respond: (params: any[]) => {
      const row = insertedRows[params[0]];
      return row ? [{ violations_found: row.violations_found, parent_prompt_id: row.parent_prompt_id }] : [];
    },
  });
  responders.push({
    match: /SELECT MAX\(sequence_order\)/,
    respond: () => [{ max_seq: 2 }],
  });
  responders.push({
    match: /^INSERT INTO om_prompt_registry/,
    respond: (params: any[]) => {
      insertedRows[params[0]] = {
        id: params[0],
        created_by: params[1],
        title: params[2],
        purpose: params[3],
        component: params[4],
        parent_prompt_id: params[5],
        sequence_order: params[6],
        status: 'draft',
        prompt_text: params[7],
        guardrails_applied: 1,
        audit_status: 'pending',
        auto_generated: 1,
        generated_from_evaluation: 1,
        released_for_execution: 0,
      };
      return { affectedRows: 1 };
    },
  });
  responders.push({
    match: /UPDATE om_prompt_registry SET next_prompt_id = \? WHERE id = \?/,
    respond: (params: any[]) => {
      if (insertedRows[params[1]]) insertedRows[params[1]].next_prompt_id = params[0];
      return { affectedRows: 1 };
    },
  });
  responders.push({
    match: /INSERT INTO system_logs/,
    respond: () => ({ affectedRows: 1 }),
  });

  const result = await generateNext('parent-1', 'actor-a');
  assertEq(result.already_existed, false, 'freshly generated');
  assertEq(result.prompt.id, 'uuid-1', 'new prompt id from uuid stub');
  assertEq(result.prompt.sequence_order, 3, 'next seq = max+1');
  assertEq(result.prompt.status, 'draft', 'draft status');
  assertEq(result.prompt.audit_status, 'pending', 'audit pending');
  assertEq(result.prompt.released_for_execution, 0, 'not released');
  assert(result.prompt.title.startsWith('Continue:'), 'title prefix for continuation');
  assert(result.prompt.prompt_text.includes('GENERATION_TYPE: continuation'), 'text has type');
  // Verify parent was linked
  assertEq(insertedRows['parent-1'].next_prompt_id, 'uuid-1', 'parent linked to child');
  // Verify system_logs insert happened
  assert(
    queryLog.some(q => /INSERT INTO system_logs/.test(q.sql)),
    'generation logged'
  );
}

// ============================================================================
// generateNext — idempotent (next already exists)
// ============================================================================
console.log('\n── generateNext: idempotent ──────────────────────────────');

resetState();
{
  const parent = {
    id: 'p-idem',
    title: 'P', component: 'c', purpose: 'x', sequence_order: 1,
    status: 'verified',
    evaluator_status: 'pass',
    completion_status: 'complete',
    parent_prompt_id: null,
    next_prompt_id: 'already-here',
  };
  const existing = { id: 'already-here', title: 'Already', status: 'draft' };
  const rows: Record<string, any> = { 'p-idem': parent, 'already-here': existing };

  responders.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: (params: any[]) => (rows[params[0]] ? [rows[params[0]]] : []),
  });

  const result = await generateNext('p-idem', 'actor');
  assertEq(result.already_existed, true, 'already_existed flag');
  assertEq(result.prompt.id, 'already-here', 'returns existing');
  // No INSERT should have happened
  assert(
    !queryLog.some(q => /^INSERT INTO om_prompt_registry/.test(q.sql)),
    'no insert on idempotent path'
  );
}

// ============================================================================
// generateNext — guards
// ============================================================================
console.log('\n── generateNext: guards ──────────────────────────────────');

// Missing prompt
resetState();
{
  responders.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: () => [],
  });
  let caught: Error | null = null;
  try {
    await generateNext('ghost', 'actor');
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Prompt not found'), 'throws on missing');
}

// Not complete/verified
resetState();
{
  responders.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: () => [{
      id: 'x', status: 'draft', evaluator_status: 'pass', completion_status: 'complete',
    }],
  });
  let caught: Error | null = null;
  try {
    await generateNext('x', 'actor');
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('must be "complete" or "verified"'), 'rejects draft');
}

// Not evaluated
resetState();
{
  responders.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: () => [{
      id: 'x', status: 'complete', evaluator_status: null, completion_status: 'complete',
    }],
  });
  let caught: Error | null = null;
  try {
    await generateNext('x', 'actor');
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('has not been evaluated'), 'rejects unevaluated');
}

// No decision rule
resetState();
{
  responders.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: () => [{
      id: 'x', status: 'complete', evaluator_status: 'weird', completion_status: 'weird',
      next_prompt_id: null,
    }],
  });
  let caught: Error | null = null;
  try {
    await generateNext('x', 'actor');
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('No generation rule'), 'rejects unknown status combo');
}

// ============================================================================
// releaseNext
// ============================================================================
console.log('\n── releaseNext ───────────────────────────────────────────');

// Happy path
resetState();
{
  const parent = {
    id: 'rel-p', status: 'verified', evaluator_status: 'pass',
    next_prompt_id: 'rel-c',
  };
  const child: any = {
    id: 'rel-c', audit_status: 'pass', released_for_execution: 0,
  };
  const rows: Record<string, any> = { 'rel-p': parent, 'rel-c': child };

  responders.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: (params: any[]) => (rows[params[0]] ? [rows[params[0]]] : []),
  });
  responders.push({
    match: /UPDATE om_prompt_registry SET released_for_execution = 1/,
    respond: (params: any[]) => {
      if (rows[params[0]]) rows[params[0]].released_for_execution = 1;
      return { affectedRows: 1 };
    },
  });
  responders.push({
    match: /INSERT INTO system_logs/,
    respond: () => ({ affectedRows: 1 }),
  });

  const result = await releaseNext('rel-p', 'actor');
  assertEq(result.prompt.id, 'rel-c', 'returns child');
  assertEq(child.released_for_execution, 1, 'child marked released');
  assert(
    queryLog.some(q => /INSERT INTO system_logs/.test(q.sql)),
    'release logged'
  );
}

// Parent not verified
resetState();
{
  responders.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: () => [{ id: 'x', status: 'complete', evaluator_status: 'pass', next_prompt_id: 'y' }],
  });
  let caught: Error | null = null;
  try {
    await releaseNext('x', 'actor');
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('must be "verified"'), 'rejects non-verified parent');
}

// No next prompt generated
resetState();
{
  responders.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: () => [{ id: 'x', status: 'verified', evaluator_status: 'pass', next_prompt_id: null }],
  });
  let caught: Error | null = null;
  try {
    await releaseNext('x', 'actor');
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('no next prompt has been generated'), 'rejects missing next');
}

// Child audit not pass
resetState();
{
  const rows: Record<string, any> = {
    'p': { id: 'p', status: 'verified', evaluator_status: 'pass', next_prompt_id: 'c' },
    'c': { id: 'c', audit_status: 'fail' },
  };
  responders.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: (params: any[]) => (rows[params[0]] ? [rows[params[0]]] : []),
  });
  let caught: Error | null = null;
  try {
    await releaseNext('p', 'actor');
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('must be "pass"'), 'rejects non-pass audit');
}

// Parent not evaluated
resetState();
{
  responders.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: () => [{ id: 'x', status: 'verified', evaluator_status: null, next_prompt_id: 'y' }],
  });
  let caught: Error | null = null;
  try {
    await releaseNext('x', 'actor');
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('has not been evaluated'), 'rejects unevaluated parent');
}

// Missing parent
resetState();
{
  responders.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: () => [],
  });
  let caught: Error | null = null;
  try {
    await releaseNext('ghost', 'actor');
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Prompt not found'), 'rejects missing parent');
}

// ============================================================================
// getNext
// ============================================================================
console.log('\n── getNext ───────────────────────────────────────────────');

// With next
resetState();
{
  const rows: Record<string, any> = {
    'p': { next_prompt_id: 'n' },
    'n': { id: 'n', title: 'Next One' },
  };
  responders.push({
    match: /SELECT next_prompt_id FROM om_prompt_registry WHERE id = \?/,
    respond: (params: any[]) => (rows[params[0]] ? [rows[params[0]]] : []),
  });
  responders.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: (params: any[]) => (rows[params[0]] ? [rows[params[0]]] : []),
  });

  const result = await getNext('p');
  assertEq(result.next_prompt.id, 'n', 'returns next prompt');
}

// Without next
resetState();
{
  responders.push({
    match: /SELECT next_prompt_id FROM om_prompt_registry WHERE id = \?/,
    respond: () => [{ next_prompt_id: null }],
  });
  const result = await getNext('p');
  assertEq(result.next_prompt, null, 'null when no next');
}

// Parent missing
resetState();
{
  responders.push({
    match: /SELECT next_prompt_id FROM om_prompt_registry WHERE id = \?/,
    respond: () => [],
  });
  let caught: Error | null = null;
  try {
    await getNext('ghost');
  } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Prompt not found'), 'throws on missing');
}

// Next link exists but child missing
resetState();
{
  const rows: Record<string, any> = {
    'p': { next_prompt_id: 'gone' },
  };
  responders.push({
    match: /SELECT next_prompt_id FROM om_prompt_registry WHERE id = \?/,
    respond: (params: any[]) => (rows[params[0]] ? [rows[params[0]]] : []),
  });
  responders.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: () => [],
  });
  const result = await getNext('p');
  assertEq(result.next_prompt, null, 'null when child deleted');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
