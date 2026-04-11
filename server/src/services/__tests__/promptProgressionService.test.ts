#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptProgressionService.js (OMD-981)
 *
 * Tests:
 *   - TRANSITION_RULES eligibility logic for all four transitions
 *   - advancePrompt status-machine: chooses correct rule per status,
 *     UPDATEs with optimistic WHERE status=?, handles concurrent
 *     modification, logs to system_logs, default catch-all
 *
 * Stubs `../config/db` getAppPool with a fake SQL-routed pool. Tests
 * inject the pool directly into advancePrompt to avoid the global
 * fallback path.
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
type Route = { match: RegExp; rows?: any[]; result?: any };

function makePool(routes: Route[]) {
  const calls: Array<{ sql: string; params: any[] }> = [];
  return {
    calls,
    query: async (sql: string, params: any[] = []) => {
      calls.push({ sql, params });
      for (const r of routes) {
        if (r.match.test(sql)) {
          if (r.result !== undefined) return [r.result];
          return [r.rows || []];
        }
      }
      return [[]];
    },
  };
}

// Stub config/db so module loading is safe
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => ({ query: async () => [[]] }) },
} as any;

const {
  advancePrompt,
  TRANSITION_RULES,
} = require('../promptProgressionService');

async function main() {

// ============================================================================
// TRANSITION_RULES.draft_to_audited
// ============================================================================
console.log('\n── draft_to_audited ───────────────────────────────────');

const dta = TRANSITION_RULES.draft_to_audited;

assertEq(
  dta({ auto_generated: true, guardrails_applied: true }).eligible,
  true, 'auto + guardrails → eligible'
);

const dta1 = dta({ auto_generated: false, guardrails_applied: true });
assertEq(dta1.eligible, false, 'manual → not eligible');
assert(dta1.reason.includes('Not auto-generated'), 'reason mentions manual');

const dta2 = dta({ auto_generated: true, guardrails_applied: false });
assertEq(dta2.eligible, false, 'no guardrails → not eligible');
assert(dta2.reason.includes('Guardrails'), 'reason mentions guardrails');

// ============================================================================
// TRANSITION_RULES.audited_to_ready
// ============================================================================
console.log('\n── audited_to_ready ───────────────────────────────────');

const atr = TRANSITION_RULES.audited_to_ready;

assertEq(atr({ audit_status: 'pass' }).eligible, true, 'audit pass → eligible');

const atr1 = atr({ audit_status: 'fail' });
assertEq(atr1.eligible, false, 'audit fail → not eligible');
assert(atr1.reason.includes('fail'), 'reason includes status');

const atr2 = atr({ audit_status: 'pending' });
assertEq(atr2.eligible, false, 'audit pending → not eligible');

// ============================================================================
// TRANSITION_RULES.ready_to_approved
// ============================================================================
console.log('\n── ready_to_approved ──────────────────────────────────');

const rta = TRANSITION_RULES.ready_to_approved;

assertEq(rta({ release_mode: 'auto_safe' }).eligible, true, 'auto_safe → eligible');
assertEq(rta({ release_mode: 'auto_full' }).eligible, true, 'auto_full → eligible');

const rta1 = rta({ release_mode: 'manual' });
assertEq(rta1.eligible, false, 'manual → not eligible');
assert(rta1.reason.includes('manual'), 'reason mentions manual');

const rta2 = rta({ release_mode: 'bogus' });
assertEq(rta2.eligible, false, 'unknown mode → not eligible');
assert(rta2.reason.includes('Unknown'), 'reason mentions unknown');

// ============================================================================
// TRANSITION_RULES.approved_to_released
// ============================================================================
console.log('\n── approved_to_released ───────────────────────────────');

const ar = TRANSITION_RULES.approved_to_released;

assertEq(
  ar({ released_for_execution: false, release_mode: 'auto_safe' }).eligible,
  true, 'not released + auto_safe → eligible'
);

const ar1 = ar({ released_for_execution: true, release_mode: 'auto_safe' });
assertEq(ar1.eligible, false, 'already released → not eligible');
assert(ar1.reason.includes('Already'), 'reason mentions already');

const ar2 = ar({ released_for_execution: false, release_mode: 'manual' });
assertEq(ar2.eligible, false, 'manual → not eligible');

// ============================================================================
// advancePrompt — prompt not found
// ============================================================================
console.log('\n── advancePrompt: not found ───────────────────────────');

let pool = makePool([
  { match: /SELECT id, status, auto_generated/i, rows: [] },
]);
const r1 = await advancePrompt(123, pool);
assertEq(r1.advanced, false, 'not found → not advanced');
assertEq(r1.reason, 'Prompt not found', 'reason');

// ============================================================================
// advancePrompt — draft → audited (success)
// ============================================================================
console.log('\n── advancePrompt: draft → audited ─────────────────────');

pool = makePool([
  {
    match: /SELECT id, status, auto_generated/i,
    rows: [{
      id: 1, status: 'draft', auto_generated: 1, guardrails_applied: 1,
      audit_status: null, release_mode: 'auto_safe',
      released_for_execution: 0, workflow_id: 5, workflow_step_number: 1,
      title: 'Test prompt',
    }],
  },
  { match: /UPDATE om_prompt_registry/i, result: { affectedRows: 1 } },
  { match: /INSERT INTO system_logs/i, result: { affectedRows: 1 } },
]);

const r2 = await advancePrompt(1, pool);
assertEq(r2.advanced, true, 'advanced');
assertEq(r2.from, 'draft', 'from draft');
assertEq(r2.to, 'audited', 'to audited');
// Verify UPDATE with audit_status set
const upd1 = pool.calls.find((c: any) => /UPDATE om_prompt_registry/i.test(c.sql));
assert(upd1 !== undefined, 'UPDATE called');
assert(upd1!.sql.includes("audit_status = 'pass'"), 'auto-passes audit');
assert(upd1!.sql.includes('WHERE id = ? AND status = ?'), 'optimistic WHERE');
assertEq(upd1!.params, ['audited', 1, 'draft'], 'UPDATE params');

// Verify log written
const log1 = pool.calls.find((c: any) => /INSERT INTO system_logs/i.test(c.sql));
assert(log1 !== undefined, 'logged');

// ============================================================================
// advancePrompt — draft → audited blocked (no guardrails)
// ============================================================================
console.log('\n── advancePrompt: draft blocked ───────────────────────');

pool = makePool([
  {
    match: /SELECT id, status, auto_generated/i,
    rows: [{
      id: 2, status: 'draft', auto_generated: 1, guardrails_applied: 0,
      release_mode: 'auto_safe', released_for_execution: 0,
    }],
  },
]);
const r3 = await advancePrompt(2, pool);
assertEq(r3.advanced, false, 'no guardrails → not advanced');
assert(r3.reason.includes('Guardrails'), 'reason mentions guardrails');
// Should NOT have called UPDATE
const noUpd = pool.calls.find((c: any) => /UPDATE/i.test(c.sql));
assertEq(noUpd, undefined, 'no UPDATE call');

// ============================================================================
// advancePrompt — audited → ready (success)
// ============================================================================
console.log('\n── advancePrompt: audited → ready ─────────────────────');

pool = makePool([
  {
    match: /SELECT id, status, auto_generated/i,
    rows: [{
      id: 3, status: 'audited', auto_generated: 1, guardrails_applied: 1,
      audit_status: 'pass', release_mode: 'auto_safe',
      released_for_execution: 0, workflow_id: 5, title: 'p3',
    }],
  },
  { match: /UPDATE om_prompt_registry/i, result: { affectedRows: 1 } },
  { match: /INSERT INTO system_logs/i, result: { affectedRows: 1 } },
]);

const r4 = await advancePrompt(3, pool);
assertEq(r4.advanced, true, 'advanced');
assertEq(r4.to, 'ready', 'to ready');
const upd2 = pool.calls.find((c: any) => /UPDATE om_prompt_registry/i.test(c.sql));
assertEq(upd2!.params, ['ready', 3, 'audited'], 'simple status update params');
assert(!upd2!.sql.includes('audit_status'), 'no extra updates');

// ============================================================================
// advancePrompt — audited blocked by audit fail
// ============================================================================
console.log('\n── advancePrompt: audited blocked ─────────────────────');

pool = makePool([
  {
    match: /SELECT id, status, auto_generated/i,
    rows: [{
      id: 4, status: 'audited', auto_generated: 1, guardrails_applied: 1,
      audit_status: 'fail', release_mode: 'auto_safe',
    }],
  },
]);
const r5 = await advancePrompt(4, pool);
assertEq(r5.advanced, false, 'audit fail → blocked');
assert(r5.reason.includes('fail'), 'reason mentions fail');

// ============================================================================
// advancePrompt — ready → approved
// ============================================================================
console.log('\n── advancePrompt: ready → approved ────────────────────');

pool = makePool([
  {
    match: /SELECT id, status, auto_generated/i,
    rows: [{
      id: 5, status: 'ready', auto_generated: 1, guardrails_applied: 1,
      audit_status: 'pass', release_mode: 'auto_full',
      released_for_execution: 0, workflow_id: 5, title: 'p5',
    }],
  },
  { match: /UPDATE om_prompt_registry/i, result: { affectedRows: 1 } },
  { match: /INSERT INTO system_logs/i, result: { affectedRows: 1 } },
]);

const r6 = await advancePrompt(5, pool);
assertEq(r6.advanced, true, 'advanced');
assertEq(r6.to, 'approved', 'to approved');
assert(r6.reason.includes('auto_full'), 'reason mentions release_mode');

// Manual blocks ready→approved
pool = makePool([
  {
    match: /SELECT id, status, auto_generated/i,
    rows: [{
      id: 6, status: 'ready', auto_generated: 1, guardrails_applied: 1,
      audit_status: 'pass', release_mode: 'manual',
    }],
  },
]);
const r7 = await advancePrompt(6, pool);
assertEq(r7.advanced, false, 'manual blocks');
assert(r7.reason.includes('manual'), 'reason mentions manual');

// ============================================================================
// advancePrompt — approved → released
// ============================================================================
console.log('\n── advancePrompt: approved → released ─────────────────');

pool = makePool([
  {
    match: /SELECT id, status, auto_generated/i,
    rows: [{
      id: 7, status: 'approved', auto_generated: 1, guardrails_applied: 1,
      audit_status: 'pass', release_mode: 'auto_safe',
      released_for_execution: 0, workflow_id: 5, title: 'p7',
    }],
  },
  { match: /UPDATE om_prompt_registry/i, result: { affectedRows: 1 } },
  { match: /INSERT INTO system_logs/i, result: { affectedRows: 1 } },
]);

const r8 = await advancePrompt(7, pool);
assertEq(r8.advanced, true, 'advanced');
assertEq(r8.from, 'approved', 'from approved');
assertEq(r8.to, 'approved+released', 'to approved+released');
const upd3 = pool.calls.find((c: any) => /UPDATE om_prompt_registry/i.test(c.sql));
assert(upd3!.sql.includes('released_for_execution = 1'), 'sets released flag');
assert(!upd3!.sql.includes('SET status'), 'does not change status');
assertEq(upd3!.params, [7, 'approved'], 'no targetStatus param, just id+status');

// Already released
pool = makePool([
  {
    match: /SELECT id, status, auto_generated/i,
    rows: [{
      id: 8, status: 'approved', auto_generated: 1, guardrails_applied: 1,
      audit_status: 'pass', release_mode: 'auto_safe',
      released_for_execution: 1,
    }],
  },
]);
const r9 = await advancePrompt(8, pool);
assertEq(r9.advanced, false, 'already released');
assert(r9.reason.includes('Already'), 'reason');

// ============================================================================
// advancePrompt — concurrent modification
// ============================================================================
console.log('\n── advancePrompt: concurrent modification ─────────────');

pool = makePool([
  {
    match: /SELECT id, status, auto_generated/i,
    rows: [{
      id: 9, status: 'draft', auto_generated: 1, guardrails_applied: 1,
      audit_status: null, release_mode: 'auto_safe',
      released_for_execution: 0, workflow_id: 5, title: 'p9',
    }],
  },
  { match: /UPDATE om_prompt_registry/i, result: { affectedRows: 0 } },
]);

const r10 = await advancePrompt(9, pool);
assertEq(r10.advanced, false, 'concurrent → not advanced');
assert(r10.reason.includes('Concurrent'), 'reason mentions concurrent');

// ============================================================================
// advancePrompt — unknown status
// ============================================================================
console.log('\n── advancePrompt: unknown status ──────────────────────');

pool = makePool([
  {
    match: /SELECT id, status, auto_generated/i,
    rows: [{
      id: 10, status: 'verified', auto_generated: 1, guardrails_applied: 1,
      release_mode: 'auto_safe',
    }],
  },
]);
const r11 = await advancePrompt(10, pool);
assertEq(r11.advanced, false, 'unknown status → not advanced');
assert(r11.reason.includes('verified'), 'reason mentions status');
assert(r11.reason.includes('no auto-progression'), 'reason explains');

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
