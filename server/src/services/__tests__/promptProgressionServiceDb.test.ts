#!/usr/bin/env npx tsx
/**
 * DB-path unit tests for services/promptProgressionService.js (OMD-1225)
 *
 * Existing promptProgression.test.js only covers the pure TRANSITION_RULES
 * map. This tsx suite exercises the DB-backed paths: advancePrompt,
 * advanceAll, advanceDownstream, and getPipelineSummary — with
 * ../config/db stubbed via require.cache.
 *
 * Coverage:
 *   - advancePrompt:
 *       · prompt not found → { advanced:false }
 *       · draft + auto_generated + guardrails → UPDATE status='audited'
 *         AND audit_status='pass', logs PROMPT_ADVANCED
 *       · draft ineligible (not auto_generated) → skipped
 *       · audited + pass → ready
 *       · audited + fail → skipped
 *       · ready + release_mode=auto_safe → approved
 *       · ready + release_mode=manual → skipped
 *       · approved + auto_safe → sets released_for_execution=1 (status stays)
 *       · approved + already released → skipped
 *       · concurrent modification (affectedRows=0) → skipped
 *       · unknown status → skipped
 *   - advanceAll:
 *       · lists candidates, advances each, logs cycle summary
 *       · one prompt errors → captured in errors[]
 *       · downstream pass runs after candidates (verified successors)
 *   - advanceDownstream:
 *       · not verified → advanced=0
 *       · no workflow_id → advanced=0
 *       · successors pending → UPDATE queue_status='ready'
 *   - getPipelineSummary: 4 SELECTs, returns blocked/pipeline buckets
 *
 * Run: npx tsx server/src/services/__tests__/promptProgressionServiceDb.test.ts
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

type Responder = { match: RegExp; respond: (params: any[]) => any };
let responders: Responder[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of responders) {
      if (r.match.test(sql)) return r.respond(params);
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };
const path = require('path');
const dbDir = path.resolve(__dirname, '..', '..', 'config');
for (const ext of ['.js', '.ts']) {
  const p = path.join(dbDir, 'db' + ext);
  require.cache[p] = { id: p, filename: p, loaded: true, exports: dbStub } as any;
}

function resetState() {
  queryLog.length = 0;
  responders = [];
}

// Silence logger noise
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

const {
  advancePrompt,
  advanceAll,
  advanceDownstream,
  getPipelineSummary,
} = require('../promptProgressionService');

// Common helpers
function promptRow(overrides: any = {}) {
  return {
    id: 'p1',
    status: 'draft',
    auto_generated: 1,
    guardrails_applied: 1,
    audit_status: 'pending',
    release_mode: 'auto_safe',
    released_for_execution: 0,
    workflow_id: 'wf-1',
    workflow_step_number: 1,
    title: 'Test Prompt',
    ...overrides,
  };
}

async function main() {

// ============================================================================
// advancePrompt — not found
// ============================================================================
console.log('\n── advancePrompt: not found ───────────────────────────────');

resetState();
responders = [{ match: /SELECT id, status/, respond: () => [[]] }];
{
  const r = await advancePrompt('missing');
  assertEq(r.advanced, false, 'not advanced');
  assert(r.reason.includes('not found'), 'not found reason');
}

// ============================================================================
// advancePrompt — draft → audited (happy)
// ============================================================================
console.log('\n── advancePrompt: draft → audited ─────────────────────────');

resetState();
responders = [
  { match: /SELECT id, status/, respond: () => [[promptRow({ status: 'draft' })]] },
  { match: /UPDATE om_prompt_registry SET status = \?, audit_status = 'pass'/, respond: () => [{ affectedRows: 1 }] },
  { match: /INSERT INTO system_logs/, respond: () => [{}] },
];
{
  const r = await advancePrompt('p1');
  assertEq(r.advanced, true, 'advanced');
  assertEq(r.from, 'draft', 'from=draft');
  assertEq(r.to, 'audited', 'to=audited');

  const updateCall = queryLog.find(q => /audit_status = 'pass'/.test(q.sql));
  assert(updateCall !== undefined, 'UPDATE with audit_status pass issued');
  assertEq(updateCall!.params[0], 'audited', 'target=audited');
  assertEq(updateCall!.params[1], 'p1', 'id param');
  assertEq(updateCall!.params[2], 'draft', 'fromStatus guard');

  const logCall = queryLog.find(q => /INSERT INTO system_logs/.test(q.sql));
  assert(logCall !== undefined, 'log row inserted');
  assert(logCall!.params[0].includes('PROMPT_ADVANCED'), 'log action PROMPT_ADVANCED');
}

// draft not auto_generated → skipped (no UPDATE)
resetState();
responders = [
  { match: /SELECT id, status/, respond: () => [[promptRow({ status: 'draft', auto_generated: 0 })]] },
];
{
  const r = await advancePrompt('p1');
  assertEq(r.advanced, false, 'not advanced');
  assert(r.reason.includes('Not auto-generated'), 'reason: not auto-generated');
  assertEq(
    queryLog.filter(q => /UPDATE/.test(q.sql)).length,
    0,
    'no UPDATE issued'
  );
}

// draft without guardrails → skipped
resetState();
responders = [
  { match: /SELECT id, status/, respond: () => [[promptRow({ status: 'draft', guardrails_applied: 0 })]] },
];
{
  const r = await advancePrompt('p1');
  assertEq(r.advanced, false, 'skipped');
  assert(r.reason.includes('Guardrails'), 'guardrails reason');
}

// ============================================================================
// advancePrompt — audited transitions
// ============================================================================
console.log('\n── advancePrompt: audited → ready ─────────────────────────');

resetState();
responders = [
  { match: /SELECT id, status/, respond: () => [[promptRow({ status: 'audited', audit_status: 'pass' })]] },
  { match: /UPDATE om_prompt_registry SET status = \? WHERE/, respond: () => [{ affectedRows: 1 }] },
  { match: /INSERT INTO system_logs/, respond: () => [{}] },
];
{
  const r = await advancePrompt('p1');
  assertEq(r.advanced, true, 'advanced');
  assertEq(r.to, 'ready', 'to=ready');
}

// audited + audit_status=fail → skipped
resetState();
responders = [
  { match: /SELECT id, status/, respond: () => [[promptRow({ status: 'audited', audit_status: 'fail' })]] },
];
{
  const r = await advancePrompt('p1');
  assertEq(r.advanced, false, 'blocked');
  assert(r.reason.includes('fail'), 'reason mentions fail');
}

// ============================================================================
// advancePrompt — ready → approved
// ============================================================================
console.log('\n── advancePrompt: ready → approved ────────────────────────');

resetState();
responders = [
  { match: /SELECT id, status/, respond: () => [[promptRow({ status: 'ready', release_mode: 'auto_safe' })]] },
  { match: /UPDATE om_prompt_registry SET status = \? WHERE/, respond: () => [{ affectedRows: 1 }] },
  { match: /INSERT INTO system_logs/, respond: () => [{}] },
];
{
  const r = await advancePrompt('p1');
  assertEq(r.advanced, true, 'advanced');
  assertEq(r.to, 'approved', 'to=approved');
}

// ready + manual → skipped
resetState();
responders = [
  { match: /SELECT id, status/, respond: () => [[promptRow({ status: 'ready', release_mode: 'manual' })]] },
];
{
  const r = await advancePrompt('p1');
  assertEq(r.advanced, false, 'blocked');
  assert(r.reason.includes('manual'), 'manual reason');
}

// ready + unknown release_mode → skipped
resetState();
responders = [
  { match: /SELECT id, status/, respond: () => [[promptRow({ status: 'ready', release_mode: 'bogus' })]] },
];
{
  const r = await advancePrompt('p1');
  assertEq(r.advanced, false, 'unknown mode skipped');
  assert(r.reason.includes('Unknown'), 'unknown reason');
}

// ============================================================================
// advancePrompt — approved → released
// ============================================================================
console.log('\n── advancePrompt: approved → released ─────────────────────');

resetState();
responders = [
  { match: /SELECT id, status/, respond: () => [[promptRow({ status: 'approved', release_mode: 'auto_safe' })]] },
  { match: /UPDATE om_prompt_registry SET released_for_execution = 1/, respond: () => [{ affectedRows: 1 }] },
  { match: /INSERT INTO system_logs/, respond: () => [{}] },
];
{
  const r = await advancePrompt('p1');
  assertEq(r.advanced, true, 'advanced');
  assertEq(r.to, 'approved+released', 'to=approved+released');

  const updateCall = queryLog.find(q => /released_for_execution = 1/.test(q.sql));
  assert(updateCall !== undefined, 'released UPDATE issued');
  assertEq(updateCall!.params[0], 'p1', 'id param');
  assertEq(updateCall!.params[1], 'approved', 'fromStatus guard');
}

// approved + already released → skipped
resetState();
responders = [
  { match: /SELECT id, status/, respond: () => [[promptRow({ status: 'approved', released_for_execution: 1 })]] },
];
{
  const r = await advancePrompt('p1');
  assertEq(r.advanced, false, 'already released');
  assert(r.reason.includes('Already released'), 'reason');
}

// approved + manual release_mode → skipped
resetState();
responders = [
  { match: /SELECT id, status/, respond: () => [[promptRow({ status: 'approved', release_mode: 'manual' })]] },
];
{
  const r = await advancePrompt('p1');
  assertEq(r.advanced, false, 'manual skipped');
  assert(r.reason.includes('manual'), 'manual reason');
}

// ============================================================================
// advancePrompt — concurrent modification (affectedRows=0)
// ============================================================================
console.log('\n── advancePrompt: concurrent modification ─────────────────');

resetState();
responders = [
  { match: /SELECT id, status/, respond: () => [[promptRow({ status: 'audited', audit_status: 'pass' })]] },
  { match: /UPDATE om_prompt_registry SET status/, respond: () => [{ affectedRows: 0 }] },
];
{
  const r = await advancePrompt('p1');
  assertEq(r.advanced, false, 'not advanced');
  assert(r.reason.includes('Concurrent'), 'concurrent reason');
}

// ============================================================================
// advancePrompt — unknown status
// ============================================================================
console.log('\n── advancePrompt: unknown status ──────────────────────────');

resetState();
responders = [
  { match: /SELECT id, status/, respond: () => [[promptRow({ status: 'executing' })]] },
];
{
  const r = await advancePrompt('p1');
  assertEq(r.advanced, false, 'no transition');
  assert(r.reason.includes('no auto-progression'), 'reason');
}

// ============================================================================
// advanceAll — happy path + downstream
// ============================================================================
console.log('\n── advanceAll ─────────────────────────────────────────────');

resetState();
let callIndex = 0;
responders = [
  // 1) candidate list
  {
    match: /SELECT id, status[\s\S]*WHERE status IN/,
    respond: () => [[
      promptRow({ id: 'p1', status: 'draft', title: 'P1' }),
      promptRow({ id: 'p2', status: 'audited', audit_status: 'fail', title: 'P2' }),
    ]],
  },
  // 2) inside _tryAdvance for each candidate — no separate SELECT; UPDATEs:
  { match: /UPDATE om_prompt_registry SET status = \?, audit_status = 'pass'/, respond: () => [{ affectedRows: 1 }] },
  { match: /UPDATE om_prompt_registry SET status = \? WHERE/, respond: () => [{ affectedRows: 1 }] },
  // 3) Downstream query: verified with pending successors
  {
    match: /SELECT p\.id FROM om_prompt_registry p[\s\S]*status = 'verified'/,
    respond: () => [[{ id: 'v1' }]],
  },
  // 4) advanceDownstream: get verified prompt
  {
    match: /SELECT id, workflow_id, workflow_step_number, title/,
    respond: () => [[{ id: 'v1', workflow_id: 'wf-1', workflow_step_number: 2, title: 'Verified' }]],
  },
  // 5) successor list
  {
    match: /SELECT p\.id, p\.title, p\.status, p\.queue_status/,
    respond: () => [[{ id: 's1', title: 'Succ1', status: 'draft', queue_status: 'pending' }]],
  },
  // 6) queue_status update
  { match: /UPDATE om_prompt_registry SET queue_status = 'ready'/, respond: () => [{ affectedRows: 1 }] },
  { match: /INSERT INTO system_logs/, respond: () => [{}] },
];

quiet();
{
  const r = await advanceAll();
  loud();
  assertEq(r.candidates, 2, '2 candidates');
  assertEq(r.advanced, 1, '1 advanced (P1 only)');
  assertEq(r.skipped, 1, '1 skipped (P2)');
  assertEq(r.errors.length, 0, 'no errors');
  assertEq(r.transitions.length, 1, '1 transition');
  assertEq(r.transitions[0].prompt_id, 'p1', 'P1 advanced');
  assertEq(r.transitions[0].from, 'draft', 'from=draft');
  assertEq(r.transitions[0].to, 'audited', 'to=audited');

  // Downstream handled
  assert(r.downstream !== undefined, 'downstream array set');
  assertEq(r.downstream!.length, 1, '1 downstream transition');

  // Cycle log written
  const logCalls = queryLog.filter(q => /INSERT INTO system_logs/.test(q.sql));
  assert(logCalls.length >= 1, 'at least one log row');
  assert(logCalls.some(c => c.params[0].includes('PROGRESSION_CYCLE')), 'cycle log row');
}

// ============================================================================
// advanceDownstream — not verified
// ============================================================================
console.log('\n── advanceDownstream: not verified ────────────────────────');

resetState();
responders = [
  { match: /SELECT id, workflow_id/, respond: () => [[]] },
];
{
  const r = await advanceDownstream('v1');
  assertEq(r.advanced, 0, '0 advanced');
}

// No workflow_id
resetState();
responders = [
  {
    match: /SELECT id, workflow_id/,
    respond: () => [[{ id: 'v1', workflow_id: null, workflow_step_number: 1, title: 'T' }]],
  },
];
{
  const r = await advanceDownstream('v1');
  assertEq(r.advanced, 0, 'no workflow_id → 0');
}

// Happy path
resetState();
responders = [
  {
    match: /SELECT id, workflow_id/,
    respond: () => [[{ id: 'v1', workflow_id: 'wf-1', workflow_step_number: 2, title: 'Parent' }]],
  },
  {
    match: /SELECT p\.id, p\.title, p\.status, p\.queue_status/,
    respond: () => [[
      { id: 's1', title: 'Child1', status: 'draft', queue_status: 'pending' },
      { id: 's2', title: 'Child2', status: 'draft', queue_status: 'pending' },
    ]],
  },
  { match: /UPDATE om_prompt_registry SET queue_status = 'ready'/, respond: () => [{ affectedRows: 1 }] },
  { match: /INSERT INTO system_logs/, respond: () => [{}] },
];
quiet();
{
  const r = await advanceDownstream('v1');
  loud();
  assertEq(r.advanced, 2, '2 successors advanced');
  assertEq(r.transitions.length, 2, '2 transitions');
  assertEq(r.transitions[0].queue_from, 'pending', 'from pending');
  assertEq(r.transitions[0].queue_to, 'ready', 'to ready');
}

// ============================================================================
// getPipelineSummary
// ============================================================================
console.log('\n── getPipelineSummary ─────────────────────────────────────');

resetState();
responders = [
  {
    match: /SELECT status, release_mode, COUNT/,
    respond: () => [[
      { status: 'draft', release_mode: 'auto_safe', count: 3 },
      { status: 'audited', release_mode: 'auto_safe', count: 2 },
      { status: 'ready', release_mode: 'manual', count: 1 },
    ]],
  },
  {
    match: /status = 'audited' AND audit_status != 'pass'/,
    respond: () => [[{ count: 4 }]],
  },
  {
    match: /status = 'ready' AND release_mode = 'manual'/,
    respond: () => [[{ count: 5 }]],
  },
  {
    match: /status = 'approved' AND released_for_execution = 0/,
    respond: () => [[{ count: 6 }]],
  },
];
{
  const summary = await getPipelineSummary();
  assert(Array.isArray(summary.pipeline), 'pipeline array');
  assertEq(summary.pipeline.length, 3, '3 pipeline buckets');
  assertEq(summary.blocked.by_audit, 4, 'by_audit=4');
  assertEq(summary.blocked.by_manual_approval, 5, 'by_manual_approval=5');
  assertEq(summary.blocked.pending_release, 6, 'pending_release=6');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main()

main().catch((e) => {
  loud();
  console.error('Unhandled:', e);
  process.exit(1);
});
