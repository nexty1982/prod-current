#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptGenerationService.js (OMD-1087)
 *
 * Deterministic prompt generator. External deps: uuid + config/db.
 * We stub both before requiring the SUT.
 *
 * Coverage:
 *   - DECISION_TABLE: all 8 keys present with correct type/label
 *   - buildPromptText: all 4 generation types (continuation with/without
 *     remaining, correction, unblock, remediation) + default case,
 *     includes METADATA + PROHIBITIONS + FINAL REQUIREMENT, injects
 *     adaptive constraints, handles changedFiles context
 *   - buildAdaptiveConstraints: single-level violations, parent chain
 *     walk, deduplication, 5-level depth cap, empty violations
 *   - generateNext: error cases (prompt missing, wrong status, not
 *     evaluated, unknown decision key) + idempotent (already has
 *     next_prompt_id) + regeneration when next prompt deleted +
 *     happy path + sequence order computation
 *   - releaseNext: error cases + happy path
 *   - getNext: error case + null next + resolved child
 *
 * Run: npx tsx server/src/services/__tests__/promptGenerationService.test.ts
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

// ── SQL-routed fake pool ────────────────────────────────────────────
type Route = { match: RegExp; respond: (params: any[], sql: string) => any };
type ExecuteCall = { sql: string; params: any[] };
const queryLog: ExecuteCall[] = [];
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        const result = r.respond(params, sql);
        return [result, []];
      }
    }
    // Default: empty rows for SELECT, affectedRows:1 for mutations
    if (/^\s*SELECT/i.test(sql)) return [[], []];
    return [{ affectedRows: 1, insertId: 1 }, []];
  },
};

// ── Stubs ───────────────────────────────────────────────────────────
function stubModule(relFromSrc: string, exports: any) {
  const absWithoutExt = pathMod.resolve(__dirname, '..', '..', relFromSrc);
  const resolved = require.resolve(absWithoutExt);
  require.cache[resolved] = {
    id: resolved, filename: resolved, loaded: true, exports,
  } as any;
}

stubModule('config/db', { getAppPool: () => fakePool });

// Stub uuid
let uuidCounter = 1000;
const uuidResolved = require.resolve('uuid');
require.cache[uuidResolved] = {
  id: uuidResolved,
  filename: uuidResolved,
  loaded: true,
  exports: { v4: () => `uuid-${uuidCounter++}` },
} as any;

function resetDb() {
  queryLog.length = 0;
  routes = [];
  uuidCounter = 1000;
}

const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

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

{
  const expected = [
    'complete:pass', 'partial:pass', 'partial:fail',
    'failed:pass', 'failed:fail', 'blocked:pass',
    'blocked:fail', 'complete:fail',
  ];
  for (const k of expected) {
    assert(k in DECISION_TABLE, `has key ${k}`);
  }
  assertEq(DECISION_TABLE['complete:pass'].type, 'continuation', 'complete:pass → continuation');
  assertEq(DECISION_TABLE['partial:pass'].type, 'continuation', 'partial:pass → continuation');
  assertEq(DECISION_TABLE['failed:pass'].type, 'correction', 'failed:pass → correction');
  assertEq(DECISION_TABLE['blocked:pass'].type, 'unblock', 'blocked:pass → unblock');
  assertEq(DECISION_TABLE['complete:fail'].type, 'remediation', 'complete:fail → remediation');
  assertEq(DECISION_TABLE['partial:fail'].type, 'remediation', 'partial:fail → remediation');
}

// ============================================================================
// buildPromptText
// ============================================================================
console.log('\n── buildPromptText: continuation (remaining) ─────────────');

{
  const parent = {
    id: 'P1', title: 'Build Widget', component: 'widgets',
    purpose: 'make widget', sequence_order: 5,
  };
  const evalData = {
    remaining_outcomes: JSON.stringify([
      { source: 'req', requirement: 'add save button' },
      { source: 'req', requirement: 'add cancel button' },
    ]),
    completed_outcomes: JSON.stringify([{ requirement: 'add form' }]),
  };
  const text = buildPromptText({
    parentPrompt: parent,
    evaluation: evalData,
    generationType: 'continuation',
    decisionLabel: 'Continuation',
    sequenceOrder: 6,
    adaptiveConstraints: [],
  });
  assert(text.includes('[METADATA]'), 'has METADATA header');
  assert(text.includes('COMPONENT: widgets'), 'has component');
  assert(text.includes('PARENT: P1'), 'has parent id');
  assert(text.includes('GENERATION_TYPE: continuation'), 'has generation type');
  assert(text.includes('TASK:'), 'has TASK section');
  assert(text.includes('REQUIREMENTS:'), 'has REQUIREMENTS section');
  assert(text.includes('OUTPUT REQUIREMENTS:'), 'has OUTPUT section');
  assert(text.includes('PROHIBITIONS:'), 'has PROHIBITIONS section');
  assert(text.includes('FINAL REQUIREMENT:'), 'has FINAL REQUIREMENT');
  assert(text.includes('add save button'), 'includes remaining requirement 1');
  assert(text.includes('add cancel button'), 'includes remaining requirement 2');
  assert(text.includes('2 outcomes remain'), 'mentions remaining count');
  assert(text.includes('1 outcomes'), 'mentions completed count');
  // Base prohibitions
  assert(text.includes('No fallback or workaround'), 'base prohibition 1');
  assert(text.includes('No partial implementations'), 'base prohibition 2');
  assert(text.includes('No error suppression'), 'base prohibition 7');
}

console.log('\n── buildPromptText: continuation (no remaining) ──────────');

{
  const parent = { id: 'P1', title: 'T', component: 'c', purpose: 'p', sequence_order: 1 };
  const evalData = {
    remaining_outcomes: JSON.stringify([]),
    completed_outcomes: JSON.stringify([{ r: 1 }, { r: 2 }]),
  };
  const text = buildPromptText({
    parentPrompt: parent, evaluation: evalData,
    generationType: 'continuation', decisionLabel: 'Cont',
    sequenceOrder: 2, adaptiveConstraints: [],
  });
  assert(text.includes('All 2 outcomes were met'), 'all outcomes met msg');
  assert(text.includes('next logical phase'), 'next phase msg');
  assert(text.includes('Build on the completed work'), 'requirements for no-remaining');
}

console.log('\n── buildPromptText: correction ───────────────────────────');

{
  const parent = { id: 'P2', title: 'Bugfix', component: 'core', purpose: 'fix', sequence_order: 3 };
  const evalData = {
    violations_found: JSON.stringify([
      { key: 'v1', description: 'used placeholder', matched: 'TODO', context: 'line 5' },
    ]),
    remaining_outcomes: JSON.stringify([
      { requirement: 'finish feature' },
    ]),
  };
  const text = buildPromptText({
    parentPrompt: parent, evaluation: evalData,
    generationType: 'correction', decisionLabel: 'Correct',
    sequenceOrder: 4, adaptiveConstraints: [],
  });
  assert(text.includes('Correct the failed implementation'), 'correction header');
  assert(text.includes('used placeholder'), 'includes violation desc');
  assert(text.includes('finish feature'), 'includes remaining req');
  assert(text.includes('Unmet requirements'), 'mentions unmet requirements');
}

console.log('\n── buildPromptText: unblock ──────────────────────────────');

{
  const parent = { id: 'P3', title: 'Import', component: 'import', purpose: '', sequence_order: 0 };
  const evalData = {
    blockers_found: JSON.stringify([
      { type: 'missing_dep', matched: 'lodash', context: 'import fails' },
    ]),
    remaining_outcomes: JSON.stringify([]),
  };
  const text = buildPromptText({
    parentPrompt: parent, evaluation: evalData,
    generationType: 'unblock', decisionLabel: 'Unblock',
    sequenceOrder: 1, adaptiveConstraints: [],
  });
  assert(text.includes('Resolve blockers'), 'unblock header');
  assert(text.includes('lodash'), 'includes blocker');
  assert(text.includes('missing_dep'), 'includes blocker type');
}

console.log('\n── buildPromptText: remediation ──────────────────────────');

{
  const parent = { id: 'P4', title: 'Refactor', component: 'core', purpose: '', sequence_order: 0 };
  const evalData = {
    violations_found: JSON.stringify([
      { key: 'v1', description: 'fallback behavior', matched: 'try/catch', context: 'line 8' },
      { key: 'v2', description: 'silent error', matched: 'catch{}', context: 'line 12' },
    ]),
    remaining_outcomes: JSON.stringify([]),
  };
  const text = buildPromptText({
    parentPrompt: parent, evaluation: evalData,
    generationType: 'remediation', decisionLabel: 'Remediate',
    sequenceOrder: 1, adaptiveConstraints: [],
  });
  assert(text.includes('Remediate violations'), 'remediation header');
  assert(text.includes('2 violation'), '2 violations mentioned');
  assert(text.includes('fallback behavior'), 'violation 1');
  assert(text.includes('silent error'), 'violation 2');
  assert(text.includes('Verify the implementation'), 'final verify line');
}

console.log('\n── buildPromptText: adaptive constraints + files ────────');

{
  const parent = { id: 'P5', title: 'T', component: 'c', purpose: '', sequence_order: 0 };
  const evalData = {
    changed_files: JSON.stringify(['a.ts', 'b.ts']),
  };
  const text = buildPromptText({
    parentPrompt: parent, evaluation: evalData,
    generationType: 'continuation', decisionLabel: 'Cont',
    sequenceOrder: 1,
    adaptiveConstraints: [
      'DO NOT repeat: fallback behavior (detected in prior prompt chain)',
      'DO NOT repeat: silent error (detected in prior prompt chain)',
    ],
  });
  assert(text.includes('ADAPTIVE CONSTRAINTS'), 'adaptive constraints header');
  assert(text.includes('DO NOT repeat: fallback behavior'), 'constraint 1');
  assert(text.includes('DO NOT repeat: silent error'), 'constraint 2');
  assert(text.includes('LEARNED FROM PRIOR FAILURES'), 'learned from failures header');
  assert(text.includes('Files modified in prior execution'), 'changed files context');
  assert(text.includes('- a.ts'), 'file a.ts listed');
  assert(text.includes('- b.ts'), 'file b.ts listed');
}

console.log('\n── buildPromptText: default case ─────────────────────────');

{
  const parent = { id: 'P6', title: 'T', component: 'c', purpose: '', sequence_order: 1 };
  const text = buildPromptText({
    parentPrompt: parent, evaluation: {},
    generationType: 'unknown_type' as any, decisionLabel: 'Unknown',
    sequenceOrder: 2, adaptiveConstraints: [],
  });
  assert(text.includes('Continue from'), 'default task section');
  assert(text.includes('Complete the next logical step'), 'default requirements');
  assert(text.includes('Provide explicit output'), 'default output');
}

// ============================================================================
// buildAdaptiveConstraints
// ============================================================================
console.log('\n── buildAdaptiveConstraints ──────────────────────────────');

// Single-level
{
  resetDb();
  routes = [
    {
      match: /SELECT violations_found, parent_prompt_id/i,
      respond: (p) => p[0] === 'P1'
        ? [{
            violations_found: JSON.stringify([
              { key: 'v1', description: 'used fallback' },
              { key: 'v2', description: 'used mock' },
            ]),
            parent_prompt_id: null,
          }]
        : [],
    },
  ];
  const c = await buildAdaptiveConstraints(fakePool, 'P1');
  assertEq(c.length, 2, '2 constraints');
  assert(c[0].includes('used fallback'), 'has constraint 1');
  assert(c[1].includes('used mock'), 'has constraint 2');
}

// Parent chain + dedup
{
  resetDb();
  const chain: Record<string, any> = {
    P3: { violations_found: JSON.stringify([{ key: 'v1', description: 'fallback' }]), parent_prompt_id: 'P2' },
    P2: { violations_found: JSON.stringify([{ key: 'v1', description: 'fallback' }, { key: 'v2', description: 'mock' }]), parent_prompt_id: 'P1' },
    P1: { violations_found: JSON.stringify([{ key: 'v3', description: 'skip reqs' }]), parent_prompt_id: null },
  };
  routes = [
    {
      match: /SELECT violations_found, parent_prompt_id/i,
      respond: (p) => chain[p[0]] ? [chain[p[0]]] : [],
    },
  ];
  const c = await buildAdaptiveConstraints(fakePool, 'P3');
  assertEq(c.length, 3, '3 unique constraints (v1 deduped)');
  assert(c[0].includes('fallback'), 'v1 first');
  assert(c[1].includes('mock'), 'v2 second');
  assert(c[2].includes('skip reqs'), 'v3 third');
}

// 5-level depth cap
{
  resetDb();
  let hitCount = 0;
  routes = [
    {
      match: /SELECT violations_found, parent_prompt_id/i,
      respond: (p) => {
        hitCount++;
        // Return a unique violation at every level + a parent always set
        return [{
          violations_found: JSON.stringify([{ key: `v${hitCount}`, description: `viol${hitCount}` }]),
          parent_prompt_id: `parent${hitCount}`,
        }];
      },
    },
  ];
  const c = await buildAdaptiveConstraints(fakePool, 'start');
  assertEq(hitCount, 5, 'stopped at 5 levels');
  assertEq(c.length, 5, '5 constraints collected');
}

// Empty violations
{
  resetDb();
  routes = [
    {
      match: /SELECT violations_found, parent_prompt_id/i,
      respond: () => [{ violations_found: null, parent_prompt_id: null }],
    },
  ];
  const c = await buildAdaptiveConstraints(fakePool, 'X');
  assertEq(c.length, 0, 'no violations → empty');
}

// Unknown prompt short-circuits
{
  resetDb();
  routes = [
    {
      match: /SELECT violations_found, parent_prompt_id/i,
      respond: () => [],
    },
  ];
  const c = await buildAdaptiveConstraints(fakePool, 'missing');
  assertEq(c.length, 0, 'missing prompt → empty');
}

// ============================================================================
// generateNext — error paths
// ============================================================================
console.log('\n── generateNext: errors ──────────────────────────────────');

// Prompt not found
{
  resetDb();
  routes = [
    { match: /SELECT \* FROM om_prompt_registry WHERE id/i, respond: () => [] },
  ];
  let caught: Error | null = null;
  try { await generateNext('nope', 'alice'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'throws');
  assert(caught !== null && caught.message.includes('not found'), 'not found msg');
}

// Wrong status
{
  resetDb();
  routes = [
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id/i,
      respond: () => [{ id: 'P1', status: 'draft' }],
    },
  ];
  let caught: Error | null = null;
  try { await generateNext('P1', 'alice'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'wrong status throws');
  assert(caught !== null && caught.message.includes('must be'), 'must-be msg');
}

// Not evaluated
{
  resetDb();
  routes = [
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id/i,
      respond: () => [{ id: 'P1', status: 'complete', evaluator_status: null }],
    },
  ];
  let caught: Error | null = null;
  try { await generateNext('P1', 'alice'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'not evaluated throws');
  assert(caught !== null && caught.message.includes('not been evaluated'), 'msg');
}

// Unknown decision key
{
  resetDb();
  routes = [
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id/i,
      respond: () => [{
        id: 'P1', status: 'complete',
        completion_status: 'weird', evaluator_status: 'pass',
        next_prompt_id: null,
      }],
    },
  ];
  let caught: Error | null = null;
  try { await generateNext('P1', 'alice'); } catch (e: any) { caught = e; }
  assert(caught !== null, 'unknown decision throws');
  assert(caught !== null && caught.message.includes('No generation rule'), 'msg');
}

// ============================================================================
// generateNext — idempotent
// ============================================================================
console.log('\n── generateNext: idempotent ──────────────────────────────');

// Existing next_prompt_id still present
{
  resetDb();
  let selectCount = 0;
  routes = [
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id/i,
      respond: () => {
        selectCount++;
        if (selectCount === 1) {
          return [{
            id: 'P1', status: 'complete',
            completion_status: 'complete', evaluator_status: 'pass',
            next_prompt_id: 'CHILD1',
          }];
        }
        return [{ id: 'CHILD1', title: 'existing child' }];
      },
    },
  ];
  const r = await generateNext('P1', 'alice');
  assertEq(r.already_existed, true, 'already_existed flag');
  assertEq(r.prompt.id, 'CHILD1', 'returns existing child');
}

// Regeneration when the referenced child is gone
{
  resetDb();
  uuidCounter = 5000;
  let selectCount = 0;
  routes = [
    // Parent load (1st), missing child (2nd) → regenerate
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id = \?$/i,
      respond: (p) => {
        selectCount++;
        if (selectCount === 1) {
          // Parent
          return [{
            id: 'P1', title: 'Parent', component: 'cmp', purpose: 'pp',
            sequence_order: 5, status: 'complete',
            completion_status: 'complete', evaluator_status: 'pass',
            next_prompt_id: 'GONE', parent_prompt_id: null,
          }];
        }
        if (selectCount === 2) {
          // Looking up GONE — empty
          return [];
        }
        // Return the newly-inserted child
        return [{ id: 'uuid-5000', title: 'new child', status: 'draft' }];
      },
    },
    {
      match: /UPDATE om_prompt_registry SET next_prompt_id = NULL/i,
      respond: () => ({ affectedRows: 1 }),
    },
    {
      match: /SELECT violations_found, parent_prompt_id/i,
      respond: () => [{ violations_found: null, parent_prompt_id: null }],
    },
    {
      match: /SELECT MAX\(sequence_order\)/i,
      respond: () => [{ max_seq: 5 }],
    },
    {
      match: /INSERT INTO om_prompt_registry/i,
      respond: () => ({ affectedRows: 1 }),
    },
    {
      match: /UPDATE om_prompt_registry SET next_prompt_id = \?/i,
      respond: () => ({ affectedRows: 1 }),
    },
    {
      match: /INSERT INTO system_logs/i,
      respond: () => ({ affectedRows: 1 }),
    },
  ];
  const r = await generateNext('P1', 'alice');
  assertEq(r.already_existed, false, 'regenerated (not already_existed)');
  assertEq(r.prompt.id, 'uuid-5000', 'returns new uuid');
}

// ============================================================================
// generateNext — happy path (continuation)
// ============================================================================
console.log('\n── generateNext: happy path ──────────────────────────────');

{
  resetDb();
  uuidCounter = 7000;
  let selectCount = 0;
  routes = [
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id = \?$/i,
      respond: (p) => {
        selectCount++;
        if (selectCount === 1) {
          // Parent load
          return [{
            id: 'P1', title: 'Parent', component: 'cmp', purpose: 'pp',
            sequence_order: 5, status: 'complete',
            completion_status: 'complete', evaluator_status: 'pass',
            next_prompt_id: null, parent_prompt_id: null,
            remaining_outcomes: JSON.stringify([{ source: 'req', requirement: 'do X' }]),
            completed_outcomes: JSON.stringify([{ r: 1 }]),
            violations_found: null, blockers_found: null,
            issues_found: null, changed_files: null,
          }];
        }
        // SELECT after INSERT to return created
        return [{ id: 'uuid-7000', title: 'Continue: Parent (seq 6)' }];
      },
    },
    {
      match: /SELECT violations_found, parent_prompt_id/i,
      respond: () => [{ violations_found: null, parent_prompt_id: null }],
    },
    {
      match: /SELECT MAX\(sequence_order\)/i,
      respond: () => [{ max_seq: 5 }],
    },
    {
      match: /INSERT INTO om_prompt_registry/i,
      respond: () => ({ affectedRows: 1 }),
    },
    {
      match: /UPDATE om_prompt_registry SET next_prompt_id = \?/i,
      respond: () => ({ affectedRows: 1 }),
    },
    {
      match: /INSERT INTO system_logs/i,
      respond: () => ({ affectedRows: 1 }),
    },
  ];
  const r = await generateNext('P1', 'alice');
  assertEq(r.already_existed, false, 'new generation');
  assertEq(r.prompt.id, 'uuid-7000', 'returns new child');

  // Check INSERT params
  const insert = queryLog.find(q => /INSERT INTO om_prompt_registry/.test(q.sql));
  assert(!!insert, 'INSERT issued');
  if (insert) {
    assertEq(insert.params[0], 'uuid-7000', 'inserted id');
    assertEq(insert.params[1], 'alice', 'actor');
    assert(typeof insert.params[2] === 'string' && insert.params[2].includes('Continue'), 'title prefix');
    assertEq(insert.params[5], null, 'parentScope null');
    assertEq(insert.params[6], 6, 'sequence order = max + 1');
  }

  // Check update link
  const update = queryLog.find(q => /SET next_prompt_id = \?/.test(q.sql));
  assert(!!update, 'link update issued');
  if (update) {
    assertEq(update.params, ['uuid-7000', 'P1'], 'link params');
  }

  // system_logs entry
  const log = queryLog.find(q => /INSERT INTO system_logs/.test(q.sql));
  assert(!!log, 'system_logs logged');
}

// max_seq null → nextSeq = 0
{
  resetDb();
  uuidCounter = 8000;
  let sc = 0;
  routes = [
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id = \?$/i,
      respond: () => {
        sc++;
        if (sc === 1) {
          return [{
            id: 'P1', title: 'P', component: 'c', purpose: '',
            sequence_order: 0, status: 'verified',
            completion_status: 'failed', evaluator_status: 'pass',
            next_prompt_id: null, parent_prompt_id: null,
          }];
        }
        return [{ id: 'uuid-8000' }];
      },
    },
    { match: /SELECT violations_found, parent_prompt_id/i,
      respond: () => [{ violations_found: null, parent_prompt_id: null }] },
    { match: /SELECT MAX\(sequence_order\)/i, respond: () => [{ max_seq: null }] },
    { match: /INSERT INTO om_prompt_registry/i, respond: () => ({ affectedRows: 1 }) },
    { match: /UPDATE om_prompt_registry SET next_prompt_id = \?/i, respond: () => ({ affectedRows: 1 }) },
    { match: /INSERT INTO system_logs/i, respond: () => ({ affectedRows: 1 }) },
  ];
  await generateNext('P1', 'bob');
  const insert = queryLog.find(q => /INSERT INTO om_prompt_registry/.test(q.sql));
  assertEq(insert?.params[6], 0, 'null max_seq → seq 0');
}

// ============================================================================
// releaseNext
// ============================================================================
console.log('\n── releaseNext ───────────────────────────────────────────');

// Missing parent
{
  resetDb();
  routes = [{ match: /SELECT \* FROM om_prompt_registry WHERE id/i, respond: () => [] }];
  let caught: Error | null = null;
  try { await releaseNext('P1', 'a'); } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('not found'), 'not found');
}

// Parent not verified
{
  resetDb();
  routes = [
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id/i,
      respond: () => [{ id: 'P1', status: 'complete', evaluator_status: 'pass', next_prompt_id: 'C1' }],
    },
  ];
  let caught: Error | null = null;
  try { await releaseNext('P1', 'a'); } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('verified'), 'needs verified');
}

// Parent not evaluated
{
  resetDb();
  routes = [
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id/i,
      respond: () => [{ id: 'P1', status: 'verified', evaluator_status: null, next_prompt_id: 'C1' }],
    },
  ];
  let caught: Error | null = null;
  try { await releaseNext('P1', 'a'); } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('not been evaluated'), 'needs evaluation');
}

// No next_prompt_id
{
  resetDb();
  routes = [
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id/i,
      respond: () => [{ id: 'P1', status: 'verified', evaluator_status: 'pass', next_prompt_id: null }],
    },
  ];
  let caught: Error | null = null;
  try { await releaseNext('P1', 'a'); } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('no next prompt'), 'no next');
}

// Child not found
{
  resetDb();
  let sc = 0;
  routes = [
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id/i,
      respond: () => {
        sc++;
        if (sc === 1) return [{ id: 'P1', status: 'verified', evaluator_status: 'pass', next_prompt_id: 'C1' }];
        return [];
      },
    },
  ];
  let caught: Error | null = null;
  try { await releaseNext('P1', 'a'); } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('Next prompt not found'), 'child missing');
}

// Child audit not pass
{
  resetDb();
  let sc = 0;
  routes = [
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id/i,
      respond: () => {
        sc++;
        if (sc === 1) return [{ id: 'P1', status: 'verified', evaluator_status: 'pass', next_prompt_id: 'C1' }];
        return [{ id: 'C1', audit_status: 'fail' }];
      },
    },
  ];
  let caught: Error | null = null;
  try { await releaseNext('P1', 'a'); } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('audit_status'), 'audit required');
}

// Happy path
{
  resetDb();
  let sc = 0;
  routes = [
    {
      match: /SELECT \* FROM om_prompt_registry WHERE id/i,
      respond: () => {
        sc++;
        if (sc === 1) return [{ id: 'P1', status: 'verified', evaluator_status: 'pass', next_prompt_id: 'C1' }];
        if (sc === 2) return [{ id: 'C1', audit_status: 'pass' }];
        return [{ id: 'C1', audit_status: 'pass', released_for_execution: 1 }];
      },
    },
    { match: /UPDATE om_prompt_registry SET released_for_execution/i, respond: () => ({ affectedRows: 1 }) },
    { match: /INSERT INTO system_logs/i, respond: () => ({ affectedRows: 1 }) },
  ];
  const r = await releaseNext('P1', 'alice');
  assertEq(r.prompt.id, 'C1', 'returns child');
  assertEq(r.prompt.released_for_execution, 1, 'released flag set');
  const upd = queryLog.find(q => /released_for_execution = 1/.test(q.sql));
  assert(!!upd, 'release UPDATE issued');
  if (upd) assertEq(upd.params, ['C1'], 'update params');
}

// ============================================================================
// getNext
// ============================================================================
console.log('\n── getNext ───────────────────────────────────────────────');

// Parent not found
{
  resetDb();
  routes = [{ match: /SELECT next_prompt_id/i, respond: () => [] }];
  let caught: Error | null = null;
  try { await getNext('P1'); } catch (e: any) { caught = e; }
  assert(caught !== null && caught.message.includes('not found'), 'not found');
}

// No next
{
  resetDb();
  routes = [{ match: /SELECT next_prompt_id/i, respond: () => [{ next_prompt_id: null }] }];
  const r = await getNext('P1');
  assertEq(r.next_prompt, null, 'no next → null');
}

// Resolved child
{
  resetDb();
  routes = [
    { match: /SELECT next_prompt_id/i, respond: () => [{ next_prompt_id: 'C1' }] },
    { match: /SELECT \* FROM om_prompt_registry WHERE id/i, respond: () => [{ id: 'C1', title: 'child' }] },
  ];
  const r = await getNext('P1');
  assertEq(r.next_prompt.id, 'C1', 'child id');
}

// Orphan next_prompt_id (child deleted)
{
  resetDb();
  routes = [
    { match: /SELECT next_prompt_id/i, respond: () => [{ next_prompt_id: 'C1' }] },
    { match: /SELECT \* FROM om_prompt_registry WHERE id/i, respond: () => [] },
  ];
  const r = await getNext('P1');
  assertEq(r.next_prompt, null, 'orphan → null');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
