#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptProgressionService.js (OMD-1104)
 *
 * State machine for prompt pipeline:
 *   draft → audited → ready → approved → ready_for_release
 *
 * Deps stubbed via require.cache:
 *   - ../config/db → fake pool with SQL-routed query()
 *
 * Coverage:
 *   - TRANSITION_RULES (pure): each of the 4 rules with happy + all
 *     failure reasons
 *   - advancePrompt:
 *       · prompt not found
 *       · unknown status → no progression
 *       · each happy transition: draft→audited, audited→ready,
 *         ready→approved, approved→released
 *       · concurrent modification (affectedRows=0)
 *       · SQL shape verification (UPDATE with correct params)
 *       · log written post-transition
 *       · custom pool argument
 *   - advanceAll:
 *       · candidates loaded, each advances one step
 *       · tallies advanced/skipped/errors
 *       · downstream check: verified prompt with pending successors
 *       · PROGRESSION_CYCLE log on advance
 *   - advanceDownstream:
 *       · verified not found → { advanced: 0 }
 *       · no workflow_id → { advanced: 0 }
 *       · advances successors, logs
 *   - getPipelineSummary: aggregates 4 queries
 *
 * Run: npx tsx server/src/services/__tests__/promptProgressionService.test.ts
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

// ── Stub helper ─────────────────────────────────────────────────────
function stubModule(fromPath: string, relPath: string, exports: any): void {
  const { createRequire } = require('module');
  const path = require('path');
  const fromFile = require.resolve(fromPath);
  const fromDir = path.dirname(fromFile);
  const scopedRequire = createRequire(path.join(fromDir, 'noop.js'));
  try {
    const resolved = scopedRequire.resolve(relPath);
    require.cache[resolved] = {
      id: resolved,
      filename: resolved,
      loaded: true,
      exports,
    } as any;
  } catch {}
}

// ── Fake pool ───────────────────────────────────────────────────────
type Row = Record<string, any>;
type Call = { sql: string; params: any[] };

const poolCalls: Call[] = [];
// Scriptable responses keyed by regex — first match wins
type Route = { pattern: RegExp; result: any; once?: boolean; consumed?: boolean };
let routes: Route[] = [];

function normalize(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}

function addRoute(pattern: RegExp, result: any, opts: { once?: boolean } = {}) {
  routes.push({ pattern, result, once: opts.once });
}

async function poolQuery(sql: string, params: any[] = []): Promise<any> {
  poolCalls.push({ sql: normalize(sql), params });
  for (const r of routes) {
    if (r.consumed) continue;
    if (r.pattern.test(sql)) {
      if (r.once) r.consumed = true;
      return r.result;
    }
  }
  // Defaults
  if (/^\s*UPDATE/i.test(sql)) return [{ affectedRows: 1 }];
  if (/^\s*INSERT/i.test(sql)) return [{ insertId: 0, affectedRows: 1 }];
  if (/^\s*SELECT/i.test(sql)) return [[]];
  return [[]];
}

const fakePool = { query: poolQuery };

function resetState() {
  poolCalls.length = 0;
  routes = [];
}

stubModule('../promptProgressionService', '../config/db', { getAppPool: () => fakePool });

// Silence
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const {
  advancePrompt,
  advanceAll,
  advanceDownstream,
  getPipelineSummary,
  TRANSITION_RULES,
} = require('../promptProgressionService');

async function main() {

// ============================================================================
// TRANSITION_RULES — pure
// ============================================================================
console.log('\n── TRANSITION_RULES: draft_to_audited ────────────────────');

{
  const r1 = TRANSITION_RULES.draft_to_audited({ auto_generated: 0 });
  assertEq(r1.eligible, false, 'not auto-generated');
  assert(/Not auto-generated/i.test(r1.reason), 'reason');

  const r2 = TRANSITION_RULES.draft_to_audited({ auto_generated: 1, guardrails_applied: 0 });
  assertEq(r2.eligible, false, 'no guardrails');
  assert(/Guardrails/i.test(r2.reason), 'reason');

  const r3 = TRANSITION_RULES.draft_to_audited({ auto_generated: 1, guardrails_applied: 1 });
  assertEq(r3.eligible, true, 'ok');
}

console.log('\n── TRANSITION_RULES: audited_to_ready ────────────────────');

{
  const r1 = TRANSITION_RULES.audited_to_ready({ audit_status: 'fail' });
  assertEq(r1.eligible, false, 'fail');
  assert(/must be "pass"/i.test(r1.reason), 'reason');

  const r2 = TRANSITION_RULES.audited_to_ready({ audit_status: 'pending' });
  assertEq(r2.eligible, false, 'pending');

  const r3 = TRANSITION_RULES.audited_to_ready({ audit_status: 'pass' });
  assertEq(r3.eligible, true, 'pass');
}

console.log('\n── TRANSITION_RULES: ready_to_approved ───────────────────');

{
  const r1 = TRANSITION_RULES.ready_to_approved({ release_mode: 'manual' });
  assertEq(r1.eligible, false, 'manual');
  assert(/requires human/i.test(r1.reason), 'reason');

  const r2 = TRANSITION_RULES.ready_to_approved({ release_mode: 'bogus' });
  assertEq(r2.eligible, false, 'unknown mode');
  assert(/Unknown release_mode/i.test(r2.reason), 'reason');

  const r3 = TRANSITION_RULES.ready_to_approved({ release_mode: 'auto_safe' });
  assertEq(r3.eligible, true, 'auto_safe');

  const r4 = TRANSITION_RULES.ready_to_approved({ release_mode: 'auto_full' });
  assertEq(r4.eligible, true, 'auto_full');
}

console.log('\n── TRANSITION_RULES: approved_to_released ────────────────');

{
  const r1 = TRANSITION_RULES.approved_to_released({ released_for_execution: 1 });
  assertEq(r1.eligible, false, 'already released');

  const r2 = TRANSITION_RULES.approved_to_released({ released_for_execution: 0, release_mode: 'manual' });
  assertEq(r2.eligible, false, 'manual');

  const r3 = TRANSITION_RULES.approved_to_released({ released_for_execution: 0, release_mode: 'auto_safe' });
  assertEq(r3.eligible, true, 'auto_safe');
}

// ============================================================================
// advancePrompt: not found
// ============================================================================
console.log('\n── advancePrompt: not found ──────────────────────────────');

resetState();
// Leave no rows → default SELECT returns []
{
  const r = await advancePrompt('missing');
  assertEq(r.advanced, false, 'not advanced');
  assert(/not found/i.test(r.reason), 'reason');
}

// ============================================================================
// advancePrompt: unknown status
// ============================================================================
console.log('\n── advancePrompt: unknown status ─────────────────────────');

resetState();
addRoute(/FROM om_prompt_registry WHERE id = \?/i, [[{
  id: 'p1', status: 'executing', auto_generated: 1, guardrails_applied: 1,
  audit_status: 'pass', release_mode: 'auto_safe', released_for_execution: 0,
  workflow_id: 'wf1', workflow_step_number: 1, title: 'T',
}]]);
{
  const r = await advancePrompt('p1');
  assertEq(r.advanced, false, 'no progression');
  assert(/no auto-progression/i.test(r.reason), 'reason');
}

// ============================================================================
// advancePrompt: draft → audited happy path
// ============================================================================
console.log('\n── advancePrompt: draft → audited ────────────────────────');

resetState();
addRoute(/FROM om_prompt_registry WHERE id = \?/i, [[{
  id: 'p1', status: 'draft', auto_generated: 1, guardrails_applied: 1,
  audit_status: 'pending', release_mode: 'auto_safe', released_for_execution: 0,
  workflow_id: 'wf1', workflow_step_number: 1, title: 'Plan',
}]]);
{
  const r = await advancePrompt('p1');
  assertEq(r.advanced, true, 'advanced');
  assertEq(r.from, 'draft', 'from');
  assertEq(r.to, 'audited', 'to');
  // SQL: UPDATE with status = audited + audit_status = 'pass'
  const upd = poolCalls.find(c => /^UPDATE om_prompt_registry/i.test(c.sql));
  assert(upd !== undefined, 'update called');
  if (upd) {
    assert(upd.sql.includes("audit_status = 'pass'"), 'sets audit_status');
    assertEq(upd.params, ['audited', 'p1', 'draft'], 'params');
  }
  // Log
  const log = poolCalls.find(c => /INSERT INTO system_logs/i.test(c.sql));
  assert(log !== undefined, 'logged');
  if (log) assert(log.params[0].includes('PROMPT_ADVANCED'), 'PROMPT_ADVANCED action');
}

console.log('\n── advancePrompt: draft ineligible (no guardrails) ──────');

resetState();
addRoute(/FROM om_prompt_registry WHERE id = \?/i, [[{
  id: 'p2', status: 'draft', auto_generated: 1, guardrails_applied: 0,
  audit_status: 'pending', release_mode: 'auto_safe', released_for_execution: 0,
  title: 'T',
}]]);
{
  const r = await advancePrompt('p2');
  assertEq(r.advanced, false, 'not advanced');
  assert(/Guardrails/i.test(r.reason), 'reason');
  // No UPDATE
  assertEq(poolCalls.filter(c => /^UPDATE/i.test(c.sql)).length, 0, 'no UPDATE');
}

// ============================================================================
// advancePrompt: audited → ready
// ============================================================================
console.log('\n── advancePrompt: audited → ready ────────────────────────');

resetState();
addRoute(/FROM om_prompt_registry WHERE id = \?/i, [[{
  id: 'p3', status: 'audited', auto_generated: 1, guardrails_applied: 1,
  audit_status: 'pass', release_mode: 'auto_safe', released_for_execution: 0,
  title: 'T',
}]]);
{
  const r = await advancePrompt('p3');
  assertEq(r.advanced, true, 'advanced');
  assertEq(r.to, 'ready', 'to ready');
  const upd = poolCalls.find(c => /^UPDATE om_prompt_registry/i.test(c.sql));
  if (upd) assertEq(upd.params, ['ready', 'p3', 'audited'], 'params');
}

console.log('\n── advancePrompt: audited fail → not advanced ───────────');

resetState();
addRoute(/FROM om_prompt_registry WHERE id = \?/i, [[{
  id: 'p4', status: 'audited', auto_generated: 1, guardrails_applied: 1,
  audit_status: 'fail', release_mode: 'auto_safe', released_for_execution: 0,
  title: 'T',
}]]);
{
  const r = await advancePrompt('p4');
  assertEq(r.advanced, false, 'not advanced');
  assert(/Audit status/i.test(r.reason), 'reason');
}

// ============================================================================
// advancePrompt: ready → approved
// ============================================================================
console.log('\n── advancePrompt: ready → approved ───────────────────────');

resetState();
addRoute(/FROM om_prompt_registry WHERE id = \?/i, [[{
  id: 'p5', status: 'ready', auto_generated: 1, guardrails_applied: 1,
  audit_status: 'pass', release_mode: 'auto_safe', released_for_execution: 0,
  title: 'T',
}]]);
{
  const r = await advancePrompt('p5');
  assertEq(r.advanced, true, 'advanced');
  assertEq(r.to, 'approved', 'to approved');
}

console.log('\n── advancePrompt: ready manual → blocked ─────────────────');

resetState();
addRoute(/FROM om_prompt_registry WHERE id = \?/i, [[{
  id: 'p6', status: 'ready', auto_generated: 1, guardrails_applied: 1,
  audit_status: 'pass', release_mode: 'manual', released_for_execution: 0,
  title: 'T',
}]]);
{
  const r = await advancePrompt('p6');
  assertEq(r.advanced, false, 'manual blocks');
}

// ============================================================================
// advancePrompt: approved → released (no status change)
// ============================================================================
console.log('\n── advancePrompt: approved → released ────────────────────');

resetState();
addRoute(/FROM om_prompt_registry WHERE id = \?/i, [[{
  id: 'p7', status: 'approved', auto_generated: 1, guardrails_applied: 1,
  audit_status: 'pass', release_mode: 'auto_full', released_for_execution: 0,
  title: 'T',
}]]);
{
  const r = await advancePrompt('p7');
  assertEq(r.advanced, true, 'advanced');
  assertEq(r.to, 'approved+released', 'released flag');
  const upd = poolCalls.find(c => /^UPDATE om_prompt_registry/i.test(c.sql));
  if (upd) {
    assert(upd.sql.includes('released_for_execution = 1'), 'sets flag');
    assertEq(upd.params, ['p7', 'approved'], 'params: id + from_status');
  }
}

console.log('\n── advancePrompt: approved already released → blocked ───');

resetState();
addRoute(/FROM om_prompt_registry WHERE id = \?/i, [[{
  id: 'p8', status: 'approved', auto_generated: 1, guardrails_applied: 1,
  audit_status: 'pass', release_mode: 'auto_full', released_for_execution: 1,
  title: 'T',
}]]);
{
  const r = await advancePrompt('p8');
  assertEq(r.advanced, false, 'already released');
}

// ============================================================================
// advancePrompt: concurrent modification
// ============================================================================
console.log('\n── advancePrompt: concurrent modification ────────────────');

resetState();
addRoute(/FROM om_prompt_registry WHERE id = \?/i, [[{
  id: 'p9', status: 'draft', auto_generated: 1, guardrails_applied: 1,
  audit_status: 'pending', release_mode: 'auto_safe', released_for_execution: 0,
  title: 'T',
}]]);
addRoute(/^\s*UPDATE om_prompt_registry/i, [{ affectedRows: 0 }]);
{
  const r = await advancePrompt('p9');
  assertEq(r.advanced, false, 'not advanced');
  assert(/Concurrent/i.test(r.reason), 'reason');
}

// ============================================================================
// advancePrompt: custom pool argument
// ============================================================================
console.log('\n── advancePrompt: custom pool ────────────────────────────');

{
  const calls: Call[] = [];
  const customPool = {
    query: async (sql: string, params: any[]) => {
      calls.push({ sql: normalize(sql), params });
      if (/FROM om_prompt_registry WHERE id = \?/i.test(sql)) {
        return [[{ id: 'px', status: 'draft', auto_generated: 1, guardrails_applied: 1,
          audit_status: 'pending', release_mode: 'auto_safe', title: 'T' }]];
      }
      if (/^UPDATE/i.test(sql)) return [{ affectedRows: 1 }];
      return [[]];
    },
  };
  const r = await advancePrompt('px', customPool);
  assertEq(r.advanced, true, 'advanced');
  assert(calls.length >= 2, 'used custom pool');
}

// ============================================================================
// advanceAll
// ============================================================================
console.log('\n── advanceAll: no candidates ─────────────────────────────');

resetState();
addRoute(/FROM om_prompt_registry WHERE status IN/i, [[]]);
addRoute(/p.status = 'verified'/i, [[]]);
{
  const r = await advanceAll();
  assertEq(r.candidates, 0, 'no candidates');
  assertEq(r.advanced, 0, 'none advanced');
  assertEq(r.skipped, 0, 'none skipped');
  assertEq(r.errors, [], 'no errors');
}

console.log('\n── advanceAll: 3 candidates, mix of outcomes ────────────');

resetState();
// Candidates: p1 (advances draft→audited), p2 (blocked: manual ready),
// p3 (advances ready→approved)
addRoute(/FROM om_prompt_registry\s+WHERE status IN/i, [[
  {
    id: 'p1', status: 'draft', auto_generated: 1, guardrails_applied: 1,
    audit_status: 'pending', release_mode: 'auto_safe', released_for_execution: 0,
    workflow_id: 'wf1', workflow_step_number: 1, title: 'P1',
  },
  {
    id: 'p2', status: 'ready', auto_generated: 1, guardrails_applied: 1,
    audit_status: 'pass', release_mode: 'manual', released_for_execution: 0,
    workflow_id: 'wf1', workflow_step_number: 2, title: 'P2',
  },
  {
    id: 'p3', status: 'ready', auto_generated: 1, guardrails_applied: 1,
    audit_status: 'pass', release_mode: 'auto_safe', released_for_execution: 0,
    workflow_id: 'wf1', workflow_step_number: 3, title: 'P3',
  },
]]);
addRoute(/p.status = 'verified'/i, [[]]);
{
  const r = await advanceAll();
  assertEq(r.candidates, 3, '3 candidates');
  assertEq(r.advanced, 2, '2 advanced (p1, p3)');
  assertEq(r.skipped, 1, '1 skipped (p2)');
  assertEq(r.errors, [], 'no errors');
  assertEq(r.transitions.length, 2, '2 transitions');
  assertEq(r.transitions[0].prompt_id, 'p1', 'first transition p1');
  assertEq(r.transitions[0].from, 'draft', 'p1 from');
  assertEq(r.transitions[0].to, 'audited', 'p1 to');
  assertEq(r.transitions[1].prompt_id, 'p3', 'second p3');
  assertEq(r.transitions[1].from, 'ready', 'p3 from');
  assertEq(r.transitions[1].to, 'approved', 'p3 to');

  // PROGRESSION_CYCLE log written
  const logs = poolCalls.filter(c => /INSERT INTO system_logs/i.test(c.sql));
  const cycleLog = logs.find(l => l.params[0].includes('PROGRESSION_CYCLE'));
  assert(cycleLog !== undefined, 'cycle logged');
}

console.log('\n── advanceAll: _tryAdvance error captured ────────────────');

resetState();
addRoute(/FROM om_prompt_registry\s+WHERE status IN/i, [[
  {
    id: 'pbad', status: 'draft', auto_generated: 1, guardrails_applied: 1,
    audit_status: 'pending', release_mode: 'auto_safe', released_for_execution: 0,
    title: 'Bad',
  },
]]);
addRoute(/^\s*UPDATE om_prompt_registry/i, new Error('db boom'));
addRoute(/p.status = 'verified'/i, [[]]);
// Need to patch poolQuery temporarily to throw on update
const origQuery = fakePool.query;
fakePool.query = async (sql: string, params: any[]) => {
  poolCalls.push({ sql: normalize(sql), params });
  if (/^\s*UPDATE om_prompt_registry/i.test(sql)) throw new Error('db boom');
  for (const r of routes) {
    if (r.consumed) continue;
    if (r.pattern.test(sql)) {
      if (r.once) r.consumed = true;
      if (r.result instanceof Error) throw r.result;
      return r.result;
    }
  }
  if (/^\s*INSERT/i.test(sql)) return [{ insertId: 0, affectedRows: 1 }];
  if (/^\s*SELECT/i.test(sql)) return [[]];
  return [[]];
};
quiet();
{
  const r = await advanceAll();
  loud();
  assertEq(r.errors.length, 1, 'one error');
  assertEq(r.errors[0].prompt_id, 'pbad', 'error prompt id');
  assert(/db boom/i.test(r.errors[0].error), 'error msg');
}
fakePool.query = origQuery;

console.log('\n── advanceAll: downstream advancement ────────────────────');

resetState();
// No main candidates
addRoute(/FROM om_prompt_registry\s+WHERE status IN/i, [[]]);
// verified prompts query
addRoute(/p.status = 'verified'/i, [[{ id: 'verified-1' }]], { once: true });
// advanceDownstream internally calls:
//   SELECT ... WHERE id = ? AND status = 'verified'
addRoute(/WHERE id = \? AND status = 'verified'/i, [[
  { id: 'verified-1', workflow_id: 'wf1', workflow_step_number: 1, title: 'V1' },
]], { once: true });
// successors query
addRoute(/WHERE p.depends_on_prompt_id = \?/i, [[
  { id: 'succ-1', title: 'S1', status: 'draft', queue_status: 'pending', depends_on_prompt_id: 'verified-1' },
]], { once: true });
// queue_status UPDATE
addRoute(/SET queue_status = 'ready'/i, [{ affectedRows: 1 }], { once: true });
{
  const r = await advanceAll();
  assert(Array.isArray(r.downstream) && r.downstream.length === 1, 'downstream array populated');
  if (r.downstream) {
    assertEq(r.downstream[0].prompt_id, 'succ-1', 'successor id');
    assertEq(r.downstream[0].queue_to, 'ready', 'queue moved');
  }
}

console.log('\n── advanceAll: downstream error captured ─────────────────');

resetState();
addRoute(/FROM om_prompt_registry\s+WHERE status IN/i, [[]]);
// Error during verified query
{
  const origQ = fakePool.query;
  fakePool.query = async (sql: string, params: any[]) => {
    poolCalls.push({ sql: normalize(sql), params });
    if (/p.status = 'verified'/i.test(sql)) throw new Error('downstream fail');
    for (const r of routes) {
      if (r.consumed) continue;
      if (r.pattern.test(sql)) {
        if (r.once) r.consumed = true;
        return r.result;
      }
    }
    if (/^\s*SELECT/i.test(sql)) return [[]];
    return [[]];
  };
  const r = await advanceAll();
  fakePool.query = origQ;
  assertEq(r.downstream_error, 'downstream fail', 'downstream error');
}

// ============================================================================
// advanceDownstream
// ============================================================================
console.log('\n── advanceDownstream: not verified ───────────────────────');

resetState();
addRoute(/WHERE id = \? AND status = 'verified'/i, [[]]);
{
  const r = await advanceDownstream('x');
  assertEq(r.advanced, 0, 'not found → 0');
}

console.log('\n── advanceDownstream: no workflow_id ─────────────────────');

resetState();
addRoute(/WHERE id = \? AND status = 'verified'/i, [[
  { id: 'v1', workflow_id: null, workflow_step_number: null, title: 'T' },
]]);
{
  const r = await advanceDownstream('v1');
  assertEq(r.advanced, 0, 'no workflow → 0');
}

console.log('\n── advanceDownstream: advances successors ────────────────');

resetState();
addRoute(/WHERE id = \? AND status = 'verified'/i, [[
  { id: 'v1', workflow_id: 'wf1', workflow_step_number: 1, title: 'V1' },
]]);
addRoute(/WHERE p.depends_on_prompt_id = \?/i, [[
  { id: 's1', title: 'S1' },
  { id: 's2', title: 'S2' },
]]);
addRoute(/SET queue_status = 'ready'/i, [{ affectedRows: 1 }]);
{
  const r = await advanceDownstream('v1');
  assertEq(r.advanced, 2, '2 advanced');
  assertEq(r.transitions.length, 2, '2 transitions');
  assertEq(r.transitions[0].prompt_id, 's1', 's1');
  assertEq(r.transitions[1].prompt_id, 's2', 's2');
  // Log written
  const log = poolCalls.find(c => /INSERT INTO system_logs/i.test(c.sql));
  assert(log !== undefined, 'logged');
  if (log) assert(log.params[0].includes('DOWNSTREAM_ADVANCED'), 'action');
}

console.log('\n── advanceDownstream: affectedRows=0 skips ───────────────');

resetState();
addRoute(/WHERE id = \? AND status = 'verified'/i, [[
  { id: 'v1', workflow_id: 'wf1', workflow_step_number: 1, title: 'V1' },
]]);
addRoute(/WHERE p.depends_on_prompt_id = \?/i, [[
  { id: 's1', title: 'S1' },
]]);
addRoute(/SET queue_status = 'ready'/i, [{ affectedRows: 0 }]);
{
  const r = await advanceDownstream('v1');
  assertEq(r.advanced, 0, 'not advanced when 0 rows');
}

// ============================================================================
// getPipelineSummary
// ============================================================================
console.log('\n── getPipelineSummary ────────────────────────────────────');

resetState();
addRoute(/GROUP BY status, release_mode/i, [[
  { status: 'draft', release_mode: 'auto_safe', count: 5 },
  { status: 'ready', release_mode: 'manual', count: 2 },
]]);
addRoute(/audit_status != 'pass'/i, [[{ count: 1 }]]);
addRoute(/release_mode = 'manual' AND auto_generated/i, [[{ count: 2 }]]);
addRoute(/released_for_execution = 0/i, [[{ count: 3 }]]);
{
  const r = await getPipelineSummary();
  assertEq(r.pipeline.length, 2, '2 pipeline groups');
  assertEq(r.pipeline[0].status, 'draft', 'first group');
  assertEq(r.blocked.by_audit, 1, 'blocked by audit');
  assertEq(r.blocked.by_manual_approval, 2, 'blocked by manual');
  assertEq(r.blocked.pending_release, 3, 'pending release');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
