#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptProgressionService.js (OMD-1163)
 *
 * Deterministic state progression for auto-generated prompts:
 *   draft → audited → ready → approved → (released_for_execution=1)
 *
 * External dep: config/db.getAppPool(). Stub via require.cache so SUT uses
 * our fake pool exclusively. `advancePrompt(id, pool)` also accepts an
 * explicit pool which simplifies those tests.
 *
 * Coverage:
 *   - TRANSITION_RULES: all 4 rules, eligibility paths, reason strings
 *   - advancePrompt: not found, each status's next transition, ineligible
 *                    cases, default (unknown status), concurrent modification
 *                    (affectedRows=0)
 *   - advanceAll: candidate selection, skip/advance/error tallies, downstream
 *                 chain, PROGRESSION_CYCLE log, error path
 *   - advanceDownstream: non-verified → no-op, no workflow_id → no-op,
 *                        successor queue updates, DOWNSTREAM_ADVANCED log
 *   - getPipelineSummary: aggregates status counts + blocked counts
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

// ── Fake pool ────────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

// Dispatch table: array of { match, response } — first match wins
type Responder = any[] | ((params: any[]) => any[]);
let responders: Array<{ match: RegExp; response: Responder }> = [];

function resetResponders() {
  queryLog.length = 0;
  responders = [];
}

function on(match: RegExp, response: Responder) {
  responders.push({ match, response });
}

let queryThrowsOnPattern: RegExp | null = null;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (queryThrowsOnPattern && queryThrowsOnPattern.test(sql)) {
      throw new Error('fake db failure');
    }
    for (const r of responders) {
      if (r.match.test(sql)) {
        const resp = typeof r.response === 'function' ? r.response(params) : r.response;
        return resp;
      }
    }
    return [[]]; // Default: empty rows
  },
};

// Stub getAppPool BEFORE requiring SUT
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

const {
  advancePrompt,
  advanceAll,
  advanceDownstream,
  getPipelineSummary,
  TRANSITION_RULES,
} = require('../promptProgressionService');

// Silence
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

async function main() {

// ============================================================================
// TRANSITION_RULES (pure)
// ============================================================================
console.log('\n── TRANSITION_RULES ──────────────────────────────────────');

// draft_to_audited
{
  const r1 = TRANSITION_RULES.draft_to_audited({ auto_generated: false, guardrails_applied: true });
  assertEq(r1.eligible, false, 'draft→audited: not auto_generated');
  assert(/Not auto-generated/.test(r1.reason), 'reason mentions auto-generated');

  const r2 = TRANSITION_RULES.draft_to_audited({ auto_generated: true, guardrails_applied: false });
  assertEq(r2.eligible, false, 'draft→audited: no guardrails');
  assert(/Guardrails/.test(r2.reason), 'reason mentions guardrails');

  const r3 = TRANSITION_RULES.draft_to_audited({ auto_generated: true, guardrails_applied: true });
  assertEq(r3.eligible, true, 'draft→audited: eligible');
}

// audited_to_ready
{
  assertEq(
    TRANSITION_RULES.audited_to_ready({ audit_status: 'pass' }).eligible,
    true,
    'audited→ready: pass'
  );
  const r = TRANSITION_RULES.audited_to_ready({ audit_status: 'fail' });
  assertEq(r.eligible, false, 'audited→ready: fail');
  assert(/"fail"/.test(r.reason), 'reason includes actual status');
  assertEq(
    TRANSITION_RULES.audited_to_ready({ audit_status: 'pending' }).eligible,
    false,
    'audited→ready: pending'
  );
}

// ready_to_approved
{
  const r1 = TRANSITION_RULES.ready_to_approved({ release_mode: 'manual' });
  assertEq(r1.eligible, false, 'ready→approved: manual');
  assert(/manual/.test(r1.reason), 'reason mentions manual');

  const r2 = TRANSITION_RULES.ready_to_approved({ release_mode: 'auto_safe' });
  assertEq(r2.eligible, true, 'ready→approved: auto_safe');

  const r3 = TRANSITION_RULES.ready_to_approved({ release_mode: 'auto_full' });
  assertEq(r3.eligible, true, 'ready→approved: auto_full');

  const r4 = TRANSITION_RULES.ready_to_approved({ release_mode: 'bogus' });
  assertEq(r4.eligible, false, 'ready→approved: unknown mode');
  assert(/Unknown/.test(r4.reason), 'reason mentions unknown');
}

// approved_to_released
{
  const r1 = TRANSITION_RULES.approved_to_released({
    released_for_execution: true, release_mode: 'auto_safe',
  });
  assertEq(r1.eligible, false, 'approved→released: already released');
  assert(/Already released/.test(r1.reason), 'reason mentions already');

  const r2 = TRANSITION_RULES.approved_to_released({
    released_for_execution: false, release_mode: 'manual',
  });
  assertEq(r2.eligible, false, 'approved→released: manual');

  const r3 = TRANSITION_RULES.approved_to_released({
    released_for_execution: false, release_mode: 'auto_safe',
  });
  assertEq(r3.eligible, true, 'approved→released: auto_safe');
}

// ============================================================================
// advancePrompt — not found
// ============================================================================
console.log('\n── advancePrompt: not found ──────────────────────────────');

resetResponders();
on(/SELECT [\s\S]* FROM om_prompt_registry[\s\S]*WHERE id = \?/i, [[]]);
{
  const r = await advancePrompt(999, fakePool);
  assertEq(r.advanced, false, 'not found → not advanced');
  assertEq(r.reason, 'Prompt not found', 'reason');
}

// ============================================================================
// advancePrompt — draft → audited (happy path)
// ============================================================================
console.log('\n── advancePrompt: draft → audited ────────────────────────');

resetResponders();
on(/SELECT [\s\S]* FROM om_prompt_registry[\s\S]*WHERE id = \?/i, [[
  {
    id: 1, status: 'draft', auto_generated: 1, guardrails_applied: 1,
    audit_status: null, release_mode: 'auto_safe', released_for_execution: 0,
    workflow_id: 10, workflow_step_number: 1, title: 'Test',
  },
]]);
on(/^UPDATE om_prompt_registry/i, [{ affectedRows: 1 }]);
on(/INSERT INTO system_logs/i, [{}]);
{
  const r = await advancePrompt(1, fakePool);
  assertEq(r.advanced, true, 'advanced');
  assertEq(r.from, 'draft', 'from draft');
  assertEq(r.to, 'audited', 'to audited');
  // Verify UPDATE includes audit_status = 'pass'
  const updates = queryLog.filter(q => /^UPDATE/.test(q.sql));
  assertEq(updates.length, 1, '1 update');
  assert(/audit_status = 'pass'/.test(updates[0].sql), 'audit_status set to pass');
  // Log written
  const logs = queryLog.filter(q => /INSERT INTO system_logs/.test(q.sql));
  assertEq(logs.length, 1, 'log written');
  const meta = JSON.parse(logs[0].params[1]);
  assertEq(meta.prompt_id, 1, 'log meta has prompt_id');
}

// ============================================================================
// advancePrompt — draft ineligible (not auto-generated)
// ============================================================================
console.log('\n── advancePrompt: draft ineligible ───────────────────────');

resetResponders();
on(/SELECT [\s\S]* FROM om_prompt_registry[\s\S]*WHERE id = \?/i, [[
  { id: 2, status: 'draft', auto_generated: 0, guardrails_applied: 1, title: 'X' },
]]);
{
  const r = await advancePrompt(2, fakePool);
  assertEq(r.advanced, false, 'not advanced');
  assert(/Not auto-generated/.test(r.reason), 'ineligible reason');
  // No UPDATE, no log
  const updates = queryLog.filter(q => /^UPDATE/.test(q.sql));
  assertEq(updates.length, 0, 'no update');
}

// ============================================================================
// advancePrompt — audited → ready
// ============================================================================
console.log('\n── advancePrompt: audited → ready ────────────────────────');

resetResponders();
on(/SELECT [\s\S]* FROM om_prompt_registry[\s\S]*WHERE id = \?/i, [[
  {
    id: 3, status: 'audited', auto_generated: 1, guardrails_applied: 1,
    audit_status: 'pass', release_mode: 'auto_safe', released_for_execution: 0,
    workflow_id: null, workflow_step_number: null, title: 'Audited',
  },
]]);
on(/^UPDATE om_prompt_registry/i, [{ affectedRows: 1 }]);
on(/INSERT INTO system_logs/i, [{}]);
{
  const r = await advancePrompt(3, fakePool);
  assertEq(r.advanced, true, 'advanced');
  assertEq(r.to, 'ready', 'to ready');
  const updates = queryLog.filter(q => /^UPDATE/.test(q.sql));
  // Should NOT include extraUpdates for audited→ready
  assert(!/audit_status/.test(updates[0].sql), 'no extra updates for audited→ready');
}

// audited but audit_status=fail
resetResponders();
on(/SELECT [\s\S]* FROM om_prompt_registry[\s\S]*WHERE id = \?/i, [[
  { id: 4, status: 'audited', auto_generated: 1, audit_status: 'fail', title: 'F' },
]]);
{
  const r = await advancePrompt(4, fakePool);
  assertEq(r.advanced, false, 'audit fail → not advanced');
  assert(/"fail"/.test(r.reason), 'reason includes fail');
}

// ============================================================================
// advancePrompt — ready → approved
// ============================================================================
console.log('\n── advancePrompt: ready → approved ───────────────────────');

resetResponders();
on(/SELECT [\s\S]* FROM om_prompt_registry[\s\S]*WHERE id = \?/i, [[
  {
    id: 5, status: 'ready', auto_generated: 1, guardrails_applied: 1,
    audit_status: 'pass', release_mode: 'auto_full', released_for_execution: 0,
    title: 'Ready',
  },
]]);
on(/^UPDATE om_prompt_registry/i, [{ affectedRows: 1 }]);
on(/INSERT INTO system_logs/i, [{}]);
{
  const r = await advancePrompt(5, fakePool);
  assertEq(r.advanced, true, 'advanced');
  assertEq(r.to, 'approved', 'to approved');
}

// ready with manual release_mode
resetResponders();
on(/SELECT [\s\S]* FROM om_prompt_registry[\s\S]*WHERE id = \?/i, [[
  {
    id: 6, status: 'ready', auto_generated: 1,
    audit_status: 'pass', release_mode: 'manual', title: 'M',
  },
]]);
{
  const r = await advancePrompt(6, fakePool);
  assertEq(r.advanced, false, 'manual → not advanced');
  assert(/manual/.test(r.reason), 'reason mentions manual');
}

// ============================================================================
// advancePrompt — approved → released (status stays approved)
// ============================================================================
console.log('\n── advancePrompt: approved → released ────────────────────');

resetResponders();
on(/SELECT [\s\S]* FROM om_prompt_registry[\s\S]*WHERE id = \?/i, [[
  {
    id: 7, status: 'approved', auto_generated: 1,
    release_mode: 'auto_safe', released_for_execution: 0, title: 'Approve',
  },
]]);
on(/^UPDATE om_prompt_registry/i, [{ affectedRows: 1 }]);
on(/INSERT INTO system_logs/i, [{}]);
{
  const r = await advancePrompt(7, fakePool);
  assertEq(r.advanced, true, 'advanced');
  assertEq(r.from, 'approved', 'from approved');
  assertEq(r.to, 'approved+released', 'to approved+released');
  const updates = queryLog.filter(q => /^UPDATE/.test(q.sql));
  assert(/released_for_execution = 1/.test(updates[0].sql), 'sets released flag');
  // SET clause has no `status = ?`, though WHERE still has `status = ?` guard
  assert(!/SET status = \?/.test(updates[0].sql), 'no status in SET clause');
}

// already released
resetResponders();
on(/SELECT [\s\S]* FROM om_prompt_registry[\s\S]*WHERE id = \?/i, [[
  { id: 8, status: 'approved', released_for_execution: 1, release_mode: 'auto_safe', title: 'R' },
]]);
{
  const r = await advancePrompt(8, fakePool);
  assertEq(r.advanced, false, 'already released → not advanced');
}

// ============================================================================
// advancePrompt — unknown status
// ============================================================================
console.log('\n── advancePrompt: unknown status ─────────────────────────');

resetResponders();
on(/SELECT [\s\S]* FROM om_prompt_registry[\s\S]*WHERE id = \?/i, [[
  { id: 9, status: 'complete', title: 'C' },
]]);
{
  const r = await advancePrompt(9, fakePool);
  assertEq(r.advanced, false, 'unknown status → not advanced');
  assert(/no auto-progression/.test(r.reason), 'reason mentions no auto');
}

// ============================================================================
// advancePrompt — concurrent modification (affectedRows=0)
// ============================================================================
console.log('\n── advancePrompt: concurrent modification ────────────────');

resetResponders();
on(/SELECT [\s\S]* FROM om_prompt_registry[\s\S]*WHERE id = \?/i, [[
  {
    id: 10, status: 'draft', auto_generated: 1, guardrails_applied: 1,
    release_mode: 'auto_safe', released_for_execution: 0, title: 'X',
  },
]]);
on(/^UPDATE om_prompt_registry/i, [{ affectedRows: 0 }]);
{
  const r = await advancePrompt(10, fakePool);
  assertEq(r.advanced, false, 'affectedRows=0 → not advanced');
  assert(/Concurrent modification/.test(r.reason), 'reason mentions concurrent');
}

// ============================================================================
// advanceAll — mixed batch
// ============================================================================
console.log('\n── advanceAll: mixed batch ───────────────────────────────');

resetResponders();
// Candidate SELECT
on(
  /SELECT [\s\S]*FROM om_prompt_registry[\s\S]*WHERE status IN/i,
  [[
    { id: 100, status: 'draft', auto_generated: 1, guardrails_applied: 1, audit_status: null, release_mode: 'auto_safe', released_for_execution: 0, workflow_id: 1, workflow_step_number: 1, title: 'P1' },
    { id: 101, status: 'draft', auto_generated: 1, guardrails_applied: 0, audit_status: null, release_mode: 'auto_safe', released_for_execution: 0, workflow_id: 1, workflow_step_number: 2, title: 'P2' },
  ]]
);
// _tryAdvance calls SELECT (by id) — but actually looking at _tryAdvance,
// it uses the prompt object passed in directly. No per-id SELECT in the loop.
// Verified prompts query for downstream
on(/SELECT p\.id FROM om_prompt_registry p[\s\S]*WHERE p\.status = 'verified'/i, [[]]);
on(/^UPDATE om_prompt_registry/i, [{ affectedRows: 1 }]);
on(/INSERT INTO system_logs/i, [{}]);
{
  const r = await advanceAll();
  assertEq(r.candidates, 2, '2 candidates');
  assertEq(r.advanced, 1, '1 advanced (P1)');
  assertEq(r.skipped, 1, '1 skipped (P2, no guardrails)');
  assertEq(r.errors.length, 0, 'no errors');
  assertEq(r.transitions.length, 1, '1 transition');
  assertEq(r.transitions[0].from, 'draft', 'from draft');
  assertEq(r.transitions[0].to, 'audited', 'to audited');
  // PROGRESSION_CYCLE log written
  const logs = queryLog.filter(q => /INSERT INTO system_logs/.test(q.sql));
  const cycleLog = logs.find(l => /PROGRESSION_CYCLE/.test(l.params[0]));
  assert(cycleLog !== undefined, 'PROGRESSION_CYCLE log written');
}

// ============================================================================
// advanceAll — with downstream chain
// ============================================================================
console.log('\n── advanceAll: downstream chain ──────────────────────────');

resetResponders();
on(
  /SELECT [\s\S]*FROM om_prompt_registry[\s\S]*WHERE status IN/i,
  [[]]  // No candidates to advance
);
// Verified prompts with pending successors
on(/SELECT p\.id FROM om_prompt_registry p[\s\S]*WHERE p\.status = 'verified'/i, [[
  { id: 200 },
]]);
// advanceDownstream: look up verified prompt
on(
  /SELECT id, workflow_id[\s\S]*WHERE id = \? AND status = 'verified'/i,
  [[{ id: 200, workflow_id: 50, workflow_step_number: 3, title: 'Verified' }]]
);
// Successors
on(
  /SELECT p\.id, p\.title, p\.status, p\.queue_status, p\.depends_on_prompt_id/i,
  [[
    { id: 201, title: 'Succ1', status: 'ready', queue_status: 'pending', depends_on_prompt_id: 200 },
    { id: 202, title: 'Succ2', status: 'ready', queue_status: 'pending', depends_on_prompt_id: 200 },
  ]]
);
on(/UPDATE om_prompt_registry SET queue_status = 'ready'/i, [{ affectedRows: 1 }]);
on(/INSERT INTO system_logs/i, [{}]);
{
  const r = await advanceAll();
  assertEq(r.candidates, 0, '0 main candidates');
  assertEq(r.downstream?.length, 2, '2 downstream transitions');
  assertEq(r.downstream[0].queue_from, 'pending', 'queue from');
  assertEq(r.downstream[0].queue_to, 'ready', 'queue to');
}

// ============================================================================
// advanceAll — downstream error captured
// ============================================================================
console.log('\n── advanceAll: downstream error ──────────────────────────');

resetResponders();
on(/SELECT [\s\S]*FROM om_prompt_registry[\s\S]*WHERE status IN/i, [[]]);
queryThrowsOnPattern = /SELECT p\.id FROM om_prompt_registry p[\s\S]*WHERE p\.status = 'verified'/;
{
  const r = await advanceAll();
  assertEq(r.candidates, 0, '0 candidates');
  assert(typeof r.downstream_error === 'string', 'downstream_error captured');
  assert(/fake db failure/.test(r.downstream_error), 'error message preserved');
}
queryThrowsOnPattern = null;

// ============================================================================
// advanceDownstream — not verified
// ============================================================================
console.log('\n── advanceDownstream: not verified ───────────────────────');

resetResponders();
on(/WHERE id = \? AND status = 'verified'/i, [[]]);
{
  const r = await advanceDownstream(999);
  assertEq(r.advanced, 0, 'not verified → advanced=0');
}

// ============================================================================
// advanceDownstream — no workflow_id
// ============================================================================
console.log('\n── advanceDownstream: no workflow_id ─────────────────────');

resetResponders();
on(
  /WHERE id = \? AND status = 'verified'/i,
  [[{ id: 300, workflow_id: null, workflow_step_number: null, title: 'Solo' }]]
);
{
  const r = await advanceDownstream(300);
  assertEq(r.advanced, 0, 'no workflow → advanced=0');
}

// ============================================================================
// advanceDownstream — successors advanced
// ============================================================================
console.log('\n── advanceDownstream: successors advanced ────────────────');

resetResponders();
on(
  /WHERE id = \? AND status = 'verified'/i,
  [[{ id: 400, workflow_id: 60, workflow_step_number: 2, title: 'Verified' }]]
);
on(
  /SELECT p\.id, p\.title, p\.status, p\.queue_status, p\.depends_on_prompt_id/i,
  [[
    { id: 401, title: 'S1', queue_status: 'pending', depends_on_prompt_id: 400 },
  ]]
);
on(/UPDATE om_prompt_registry SET queue_status = 'ready'/i, [{ affectedRows: 1 }]);
on(/INSERT INTO system_logs/i, [{}]);
{
  const r = await advanceDownstream(400);
  assertEq(r.advanced, 1, '1 advanced');
  assertEq(r.transitions.length, 1, '1 transition');
  assertEq(r.transitions[0].prompt_id, 401, 'successor id');
  // Log written
  const logs = queryLog.filter(q => /INSERT INTO system_logs/.test(q.sql));
  const dsLog = logs.find(l => /DOWNSTREAM_ADVANCED/.test(l.params[0]));
  assert(dsLog !== undefined, 'DOWNSTREAM_ADVANCED log');
}

// successor update racing — affectedRows=0
resetResponders();
on(
  /WHERE id = \? AND status = 'verified'/i,
  [[{ id: 500, workflow_id: 70, workflow_step_number: 1, title: 'V' }]]
);
on(
  /SELECT p\.id, p\.title, p\.status, p\.queue_status/i,
  [[{ id: 501, title: 'S', queue_status: 'pending' }]]
);
on(/UPDATE om_prompt_registry SET queue_status = 'ready'/i, [{ affectedRows: 0 }]);
{
  const r = await advanceDownstream(500);
  assertEq(r.advanced, 0, 'racing update → 0');
  assertEq(r.transitions.length, 0, 'no transitions');
}

// ============================================================================
// getPipelineSummary
// ============================================================================
console.log('\n── getPipelineSummary ────────────────────────────────────');

resetResponders();
on(/SELECT status, release_mode, COUNT/i, [[
  { status: 'draft', release_mode: 'auto_safe', count: 5 },
  { status: 'ready', release_mode: 'manual', count: 2 },
]]);
// First blocked query: audited && audit_status != 'pass'
on(/WHERE status = 'audited' AND audit_status != 'pass'/i, [[{ count: 3 }]]);
// Second blocked: ready && manual
on(/WHERE status = 'ready' AND release_mode = 'manual'/i, [[{ count: 7 }]]);
// Third: pending release
on(/WHERE status = 'approved' AND released_for_execution = 0/i, [[{ count: 4 }]]);
{
  const r = await getPipelineSummary();
  assertEq(r.pipeline.length, 2, '2 pipeline rows');
  assertEq(r.blocked.by_audit, 3, 'blocked by audit');
  assertEq(r.blocked.by_manual_approval, 7, 'blocked by manual');
  assertEq(r.blocked.pending_release, 4, 'pending release');
}

// ============================================================================
// logProgression — failure swallowed
// ============================================================================
console.log('\n── logProgression: failure swallowed ─────────────────────');

resetResponders();
on(/SELECT [\s\S]* FROM om_prompt_registry[\s\S]*WHERE id = \?/i, [[
  {
    id: 600, status: 'draft', auto_generated: 1, guardrails_applied: 1,
    audit_status: null, release_mode: 'auto_safe', released_for_execution: 0,
    title: 'LogFail',
  },
]]);
on(/^UPDATE om_prompt_registry/i, [{ affectedRows: 1 }]);
queryThrowsOnPattern = /INSERT INTO system_logs/;
quiet();
{
  // Should NOT throw even if log fails
  const r = await advancePrompt(600, fakePool);
  loud();
  assertEq(r.advanced, true, 'advanced despite log failure');
}
queryThrowsOnPattern = null;

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
