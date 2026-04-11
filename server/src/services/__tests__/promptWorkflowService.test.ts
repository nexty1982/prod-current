#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptWorkflowService.js (OMD-1131)
 *
 * Manages prompt state machine with strict transitions, audit gates,
 * atomic TOCTOU-safe updates, and sequence enforcement.
 *
 * Stubs:
 *   - config/db via require.cache (route-dispatch fake pool)
 *   - promptAuditService via require.cache (enforceAuditPass/resetAudit)
 *
 * Coverage:
 *   - createPrompt: missing fields, invalid sequence_order, duplicate
 *     sequence_order, happy path
 *   - getAllPrompts: no filters, status filter, component filter,
 *     audit_status filter, parent_prompt_id null filter, parent_prompt_id
 *     value
 *   - getPromptById: not found throws
 *   - updatePrompt: not in draft/audited/rejected → throws, no fields,
 *     sequence uniqueness check, prompt_text reset audit, audited → draft
 *     on text change, happy path
 *   - markReady: wrong state, empty prompt_text, audit gate, happy
 *   - approvePrompt: wrong state, happy
 *   - rejectPrompt: from verified/draft (rejected), happy with reason
 *   - executePrompt: wrong state, sequence not met, happy
 *   - completeExecution: wrong state, happy
 *   - verifyPrompt: wrong state, failed checks, happy
 *   - resetToDraft: wrong state, happy
 *   - TOCTOU: atomic update returning 0 → conflict error
 *
 * Run: npx tsx server/src/services/__tests__/promptWorkflowService.test.ts
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

async function assertThrows(fn: () => Promise<any>, pattern: RegExp, message: string): Promise<void> {
  try {
    await fn();
    console.error(`  FAIL: ${message} — did not throw`);
    failed++;
  } catch (e: any) {
    if (pattern.test(e.message)) { console.log(`  PASS: ${message}`); passed++; }
    else { console.error(`  FAIL: ${message}\n         got: ${e.message}`); failed++; }
  }
}

// ── Route-dispatch fake pool ─────────────────────────────────────────
type Route = { match: RegExp; handler: (sql: string, params: any[]) => any };
const routes: Route[] = [];
const queryLog: { sql: string; params: any[] }[] = [];

function resetPool() { routes.length = 0; queryLog.length = 0; }

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) return r.handler(sql, params);
    }
    return [[]];
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

// ── Stub promptAuditService ──────────────────────────────────────────
let auditEnforceThrows = false;
const auditStub = {
  enforceAuditPass: async (id: string) => {
    if (auditEnforceThrows) throw new Error(`Audit gate failed for ${id}`);
  },
  resetAudit: async () => {},
};
const auditPath = require.resolve('../promptAuditService');
require.cache[auditPath] = {
  id: auditPath, filename: auditPath, loaded: true, exports: auditStub,
} as any;

const origError = console.error;
function quiet() { console.error = () => {}; }
function loud() { console.error = origError; }

const svc = require('../promptWorkflowService');

// Helper: full prompt row builder
function mkPrompt(overrides: any = {}) {
  return {
    id: 'p-1',
    created_by: 1,
    title: 'Test Prompt',
    purpose: 'test',
    component: 'comp',
    parent_prompt_id: null,
    sequence_order: 0,
    status: 'draft',
    prompt_text: 'do the thing',
    guardrails_applied: 1,
    audit_status: 'pending',
    execution_result: null,
    verification_result: null,
    ...overrides,
  };
}

async function main() {

// ============================================================================
// createPrompt: validation
// ============================================================================
console.log('\n── createPrompt: validation ──────────────────────────────');

resetPool();
// Missing required field
await assertThrows(
  async () => await svc.createPrompt({}),
  /Missing required fields/,
  'missing fields throws'
);

resetPool();
await assertThrows(
  async () => await svc.createPrompt({
    created_by: 1, title: 'x', purpose: 'p', component: 'c', prompt_text: 'txt',
    sequence_order: -1,
  }),
  /non-negative integer/,
  'negative sequence throws'
);

resetPool();
await assertThrows(
  async () => await svc.createPrompt({
    created_by: 1, title: 'x', purpose: 'p', component: 'c', prompt_text: 'txt',
    sequence_order: 1.5,
  }),
  /non-negative integer/,
  'non-integer sequence throws'
);

// Whitespace-only title rejected
resetPool();
await assertThrows(
  async () => await svc.createPrompt({
    created_by: 1, title: '   ', purpose: 'p', component: 'c', prompt_text: 'txt',
    sequence_order: 0,
  }),
  /Missing required/,
  'whitespace title rejected'
);

// Duplicate sequence_order
resetPool();
routes.push({
  match: /parent_prompt_id <=> \? AND sequence_order/i,
  handler: () => [[{ id: 'existing' }]],
});
await assertThrows(
  async () => await svc.createPrompt({
    created_by: 1, title: 'x', purpose: 'p', component: 'c', prompt_text: 'txt',
    sequence_order: 0,
  }),
  /already exists/,
  'duplicate sequence throws'
);

// Happy path
resetPool();
let createdRow: any = null;
routes.push({
  match: /parent_prompt_id <=> \? AND sequence_order/i,
  handler: () => [[]], // no conflict
});
routes.push({
  match: /INSERT INTO om_prompt_registry/i,
  handler: (_sql, params) => {
    createdRow = mkPrompt({ id: params[0], title: params[2], sequence_order: params[6] });
    return [{ affectedRows: 1 }];
  },
});
routes.push({ match: /INSERT INTO system_logs/i, handler: () => [{}] });
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
  handler: () => [[createdRow]],
});
{
  const r = await svc.createPrompt({
    created_by: 1, title: 'My Prompt', purpose: 'do something',
    component: 'auth', prompt_text: 'Build the thing', sequence_order: 0,
    guardrails_applied: true,
  });
  assertEq(r.title, 'My Prompt', 'returns created prompt');
  // Insert had trimmed values
  const insert = queryLog.find((q) => /INSERT INTO om_prompt_registry/i.test(q.sql))!;
  assertEq(insert.params[2], 'My Prompt', 'trimmed title');
  assertEq(insert.params[7], 'Build the thing', 'prompt_text');
  assertEq(insert.params[8], 1, 'guardrails = 1');
}

// ============================================================================
// getAllPrompts: filters
// ============================================================================
console.log('\n── getAllPrompts ─────────────────────────────────────────');

resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE/i,
  handler: () => [[mkPrompt(), mkPrompt({ id: 'p-2' })]],
});
{
  const r = await svc.getAllPrompts();
  assertEq(r.length, 2, 'returns 2');
  const q = queryLog[0];
  assert(/1=1/.test(q.sql), 'base WHERE 1=1');
  assertEq(q.params.length, 0, 'no params');
}

// status filter
resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE/i,
  handler: () => [[]],
});
await svc.getAllPrompts({ status: 'ready' });
{
  const q = queryLog[0];
  assert(/status = \?/.test(q.sql), 'status filter');
  assertEq(q.params[0], 'ready', 'status param');
}

// component filter
resetPool();
routes.push({ match: /SELECT \* FROM om_prompt_registry WHERE/i, handler: () => [[]] });
await svc.getAllPrompts({ component: 'auth' });
{
  const q = queryLog[0];
  assert(/component = \?/.test(q.sql), 'component filter');
  assertEq(q.params[0], 'auth', 'component param');
}

// audit_status filter
resetPool();
routes.push({ match: /SELECT \* FROM om_prompt_registry WHERE/i, handler: () => [[]] });
await svc.getAllPrompts({ audit_status: 'pass' });
{
  const q = queryLog[0];
  assert(/audit_status = \?/.test(q.sql), 'audit filter');
}

// parent_prompt_id = null
resetPool();
routes.push({ match: /SELECT \* FROM om_prompt_registry WHERE/i, handler: () => [[]] });
await svc.getAllPrompts({ parent_prompt_id: null });
{
  const q = queryLog[0];
  assert(/parent_prompt_id IS NULL/i.test(q.sql), 'null parent filter');
}

// parent_prompt_id value
resetPool();
routes.push({ match: /SELECT \* FROM om_prompt_registry WHERE/i, handler: () => [[]] });
await svc.getAllPrompts({ parent_prompt_id: 'parent-1' });
{
  const q = queryLog[0];
  assert(/parent_prompt_id = \?/.test(q.sql), 'parent filter');
  assertEq(q.params[0], 'parent-1', 'parent param');
}

// ============================================================================
// getPromptById
// ============================================================================
console.log('\n── getPromptById ─────────────────────────────────────────');

resetPool();
routes.push({ match: /WHERE id = \?/, handler: () => [[]] });
await assertThrows(
  async () => await svc.getPromptById('missing'),
  /not found/,
  'not found throws'
);

resetPool();
routes.push({ match: /WHERE id = \?/, handler: () => [[mkPrompt()]] });
{
  const r = await svc.getPromptById('p-1');
  assertEq(r.id, 'p-1', 'returns row');
}

// ============================================================================
// updatePrompt
// ============================================================================
console.log('\n── updatePrompt ──────────────────────────────────────────');

// Not in draft/audited/rejected
resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({ status: 'approved' })]],
});
await assertThrows(
  async () => await svc.updatePrompt('p-1', { title: 'new' }, 'actor'),
  /Cannot update.*approved/,
  'wrong status blocks update'
);

// No fields
resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({ status: 'draft' })]],
});
await assertThrows(
  async () => await svc.updatePrompt('p-1', {}, 'actor'),
  /No valid fields/,
  'empty updates throws'
);

// Invalid sequence_order in update
resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({ status: 'draft' })]],
});
await assertThrows(
  async () => await svc.updatePrompt('p-1', { sequence_order: -5 }, 'actor'),
  /non-negative integer/,
  'negative sequence blocked'
);

// Sequence conflict during update
resetPool();
let readCount = 0;
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({ status: 'draft' })]],
});
routes.push({
  match: /parent_prompt_id <=> \?.*id != \?/is,
  handler: () => [[{ id: 'other' }]],
});
await assertThrows(
  async () => await svc.updatePrompt('p-1', { sequence_order: 2 }, 'actor'),
  /already exists/,
  'update sequence conflict throws'
);

// Happy path — plain title update (no audit reset)
resetPool();
let promptRow = mkPrompt({ status: 'draft' });
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[promptRow]],
});
routes.push({
  match: /UPDATE om_prompt_registry SET/i,
  handler: (sql) => {
    if (/audit_status = 'pending'/.test(sql)) { /* audit reset */ }
    return [{ affectedRows: 1 }];
  },
});
routes.push({ match: /INSERT INTO system_logs/i, handler: () => [{}] });
{
  const r = await svc.updatePrompt('p-1', { title: 'new title' }, 'actor');
  assert(r !== undefined, 'returns row');
  const upd = queryLog.find((q) => /UPDATE om_prompt_registry SET/i.test(q.sql))!;
  assert(!/audit_status = 'pending'/.test(upd.sql), 'no audit reset for title-only');
}

// Update prompt_text → audit reset
resetPool();
promptRow = mkPrompt({ status: 'draft' });
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[promptRow]],
});
routes.push({
  match: /UPDATE om_prompt_registry SET/i,
  handler: () => [{ affectedRows: 1 }],
});
routes.push({ match: /INSERT INTO system_logs/i, handler: () => [{}] });
await svc.updatePrompt('p-1', { prompt_text: 'new text' }, 'actor');
{
  const upd = queryLog.find((q) => /UPDATE om_prompt_registry SET/i.test(q.sql))!;
  assert(/audit_status = 'pending'/.test(upd.sql), 'prompt_text change resets audit');
  assert(/audit_result = NULL/.test(upd.sql), 'audit_result cleared');
}

// Update prompt_text from 'audited' → should revert to draft
resetPool();
promptRow = mkPrompt({ status: 'audited' });
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[promptRow]],
});
routes.push({
  match: /UPDATE om_prompt_registry SET/i,
  handler: () => [{ affectedRows: 1 }],
});
routes.push({ match: /INSERT INTO system_logs/i, handler: () => [{}] });
await svc.updatePrompt('p-1', { prompt_text: 'changed' }, 'actor');
{
  const upd = queryLog.find((q) => /UPDATE om_prompt_registry SET/i.test(q.sql))!;
  assert(/status = 'draft'/.test(upd.sql), 'audited→draft on text change');
}

// ============================================================================
// markReady
// ============================================================================
console.log('\n── markReady ─────────────────────────────────────────────');

// Wrong state
resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({ status: 'draft' })]],
});
await assertThrows(
  async () => await svc.markReady('p-1', 'actor'),
  /must be "audited"/,
  'not audited → throws'
);

// Empty prompt_text
resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({ status: 'audited', prompt_text: '' })]],
});
await assertThrows(
  async () => await svc.markReady('p-1', 'actor'),
  /prompt_text is empty/,
  'empty prompt_text blocks'
);

// Audit gate fails
resetPool();
auditEnforceThrows = true;
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({ status: 'audited' })]],
});
await assertThrows(
  async () => await svc.markReady('p-1', 'actor'),
  /Audit gate failed/,
  'audit gate blocks'
);
auditEnforceThrows = false;

// Happy
resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({ status: 'audited' })]],
});
routes.push({
  match: /UPDATE om_prompt_registry SET status/i,
  handler: () => [{ affectedRows: 1 }],
});
routes.push({ match: /INSERT INTO system_logs/i, handler: () => [{}] });
{
  const r = await svc.markReady('p-1', 'actor');
  assert(r !== undefined, 'returns row');
  const upd = queryLog.find((q) => /UPDATE om_prompt_registry SET status/i.test(q.sql))!;
  assertEq(upd.params[0], 'ready', 'target status ready');
  assertEq(upd.params[1], 'audited', 'expected audited');
}

// TOCTOU conflict on markReady
resetPool();
let rowStatus = 'audited';
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({ status: rowStatus })]],
});
routes.push({
  match: /UPDATE om_prompt_registry SET status/i,
  handler: () => { rowStatus = 'rejected'; return [{ affectedRows: 0 }]; },
});
await assertThrows(
  async () => await svc.markReady('p-1', 'actor'),
  /conflict/,
  'TOCTOU → conflict error'
);

// ============================================================================
// approvePrompt
// ============================================================================
console.log('\n── approvePrompt ─────────────────────────────────────────');

// Wrong state
resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({ status: 'draft' })]],
});
await assertThrows(
  async () => await svc.approvePrompt('p-1', 'actor'),
  /must be "ready"/,
  'wrong state blocks approve'
);

// Happy
resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({ status: 'ready' })]],
});
routes.push({
  match: /UPDATE om_prompt_registry SET status/i,
  handler: () => [{ affectedRows: 1 }],
});
routes.push({ match: /INSERT INTO system_logs/i, handler: () => [{}] });
{
  await svc.approvePrompt('p-1', 'actor');
  const upd = queryLog.find((q) => /UPDATE om_prompt_registry SET status/i.test(q.sql))!;
  assertEq(upd.params[0], 'approved', 'target approved');
}

// ============================================================================
// rejectPrompt
// ============================================================================
console.log('\n── rejectPrompt ──────────────────────────────────────────');

// From verified → blocked
resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({ status: 'verified' })]],
});
await assertThrows(
  async () => await svc.rejectPrompt('p-1', 'actor', 'why'),
  /Cannot reject a verified/,
  'verified cannot be rejected'
);

// From draft → blocked
resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({ status: 'draft' })]],
});
await assertThrows(
  async () => await svc.rejectPrompt('p-1', 'actor', 'why'),
  /Cannot reject a draft/,
  'draft cannot be rejected'
);

// Happy with reason
resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({ status: 'ready' })]],
});
routes.push({
  match: /UPDATE om_prompt_registry SET status/i,
  handler: () => [{ affectedRows: 1 }],
});
routes.push({ match: /INSERT INTO system_logs/i, handler: () => [{}] });
{
  await svc.rejectPrompt('p-1', 'actor', 'not needed');
  const upd = queryLog.find((q) => /UPDATE om_prompt_registry SET status/i.test(q.sql))!;
  assertEq(upd.params[0], 'rejected', 'target rejected');
  // verification_result should be JSON with reason
  const vr = JSON.parse(upd.params[1]);
  assertEq(vr.rejected, true, 'rejected flag');
  assertEq(vr.reason, 'not needed', 'reason stored');
}

// ============================================================================
// executePrompt
// ============================================================================
console.log('\n── executePrompt ─────────────────────────────────────────');

// Wrong state
resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({ status: 'ready' })]],
});
await assertThrows(
  async () => await svc.executePrompt('p-1', 'actor'),
  /must be "approved"/,
  'wrong state blocks execute'
);

// Sequence not met (predecessor not verified)
resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({ status: 'approved', sequence_order: 1 })]],
});
routes.push({
  match: /sequence_order < \?/,
  handler: () => [[
    { id: 'prev', sequence_order: 0, status: 'approved' },
  ]],
});
await assertThrows(
  async () => await svc.executePrompt('p-1', 'actor'),
  /predecessor/,
  'unverified predecessor blocks'
);

// Happy
resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({ status: 'approved', sequence_order: 0 })]],
});
routes.push({
  match: /sequence_order < \?/,
  handler: () => [[]], // no predecessors
});
routes.push({
  match: /UPDATE om_prompt_registry SET status/i,
  handler: () => [{ affectedRows: 1 }],
});
routes.push({ match: /INSERT INTO system_logs/i, handler: () => [{}] });
{
  await svc.executePrompt('p-1', 'actor');
  const upd = queryLog.find((q) => /UPDATE om_prompt_registry SET status/i.test(q.sql))!;
  assertEq(upd.params[0], 'executing', 'target executing');
}

// ============================================================================
// completeExecution
// ============================================================================
console.log('\n── completeExecution ─────────────────────────────────────');

// Wrong state
resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({ status: 'approved' })]],
});
await assertThrows(
  async () => await svc.completeExecution('p-1', 'actor', {}),
  /must be "executing"/,
  'wrong state blocks'
);

// Happy
resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({ status: 'executing' })]],
});
routes.push({
  match: /UPDATE om_prompt_registry SET status/i,
  handler: () => [{ affectedRows: 1 }],
});
routes.push({ match: /INSERT INTO system_logs/i, handler: () => [{}] });
{
  await svc.completeExecution('p-1', 'actor', { stdout: 'done' });
  const upd = queryLog.find((q) => /UPDATE om_prompt_registry SET status/i.test(q.sql))!;
  assertEq(upd.params[0], 'complete', 'target complete');
  assert(upd.params[1].includes('done'), 'execution_result serialized');
}

// ============================================================================
// verifyPrompt
// ============================================================================
console.log('\n── verifyPrompt ──────────────────────────────────────────');

// Wrong state
resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({ status: 'executing' })]],
});
await assertThrows(
  async () => await svc.verifyPrompt('p-1', 'actor', {}),
  /must be "complete"/,
  'wrong state blocks verify'
);

// Failed checks: no execution_result + audit pending
resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({
    status: 'complete',
    execution_result: null,
    audit_status: 'pending',
  })]],
});
await assertThrows(
  async () => await svc.verifyPrompt('p-1', 'actor', { guardrails_followed: true, system_state_modified: true }),
  /Verification failed/,
  'failed checks throws'
);

// Happy
resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({
    status: 'complete',
    execution_result: '{"ok":true}',
    audit_status: 'pass',
    guardrails_applied: 1,
  })]],
});
routes.push({
  match: /UPDATE om_prompt_registry SET status/i,
  handler: () => [{ affectedRows: 1 }],
});
routes.push({ match: /INSERT INTO system_logs/i, handler: () => [{}] });
{
  await svc.verifyPrompt('p-1', 'actor', {
    system_state_modified: true,
    guardrails_followed: true,
    notes: 'all good',
  });
  const upd = queryLog.find((q) => /UPDATE om_prompt_registry SET status/i.test(q.sql))!;
  assertEq(upd.params[0], 'verified', 'target verified');
  const vr = JSON.parse(upd.params[1]);
  assertEq(vr.verified_by, 'actor', 'verified_by');
  assertEq(vr.checks.execution_completed, true, 'execution check');
  assertEq(vr.checks.audit_passed, true, 'audit check');
  assertEq(vr.notes, 'all good', 'notes');
}

// Guardrails not applied → check is auto-true
resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({
    status: 'complete',
    execution_result: '{"ok":true}',
    audit_status: 'pass',
    guardrails_applied: 0,
  })]],
});
routes.push({
  match: /UPDATE om_prompt_registry SET status/i,
  handler: () => [{ affectedRows: 1 }],
});
routes.push({ match: /INSERT INTO system_logs/i, handler: () => [{}] });
{
  // Does not pass guardrails_followed — should still verify
  await svc.verifyPrompt('p-1', 'actor', { system_state_modified: true });
  const upd = queryLog.find((q) => /UPDATE om_prompt_registry SET status/i.test(q.sql))!;
  const vr = JSON.parse(upd.params[1]);
  assertEq(vr.checks.guardrails_followed, true, 'guardrails not applied → true');
}

// ============================================================================
// resetToDraft
// ============================================================================
console.log('\n── resetToDraft ──────────────────────────────────────────');

// Wrong state
resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({ status: 'draft' })]],
});
await assertThrows(
  async () => await svc.resetToDraft('p-1', 'actor'),
  /must be "rejected"/,
  'wrong state blocks reset'
);

// Happy
resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({ status: 'rejected' })]],
});
routes.push({
  match: /UPDATE om_prompt_registry SET status/i,
  handler: () => [{ affectedRows: 1 }],
});
routes.push({ match: /INSERT INTO system_logs/i, handler: () => [{}] });
{
  await svc.resetToDraft('p-1', 'actor');
  const upd = queryLog.find((q) => /UPDATE om_prompt_registry SET status/i.test(q.sql))!;
  assertEq(upd.params[0], 'draft', 'target draft');
  assert(/audit_status = 'pending'/.test(upd.sql), 'audit reset');
}

// Reset conflict (TOCTOU)
resetPool();
routes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
  handler: () => [[mkPrompt({ status: 'rejected' })]],
});
routes.push({
  match: /UPDATE om_prompt_registry SET status/i,
  handler: () => [{ affectedRows: 0 }],
});
await assertThrows(
  async () => await svc.resetToDraft('p-1', 'actor'),
  /conflict/,
  'reset TOCTOU conflict'
);

// ============================================================================
// Constants exports
// ============================================================================
console.log('\n── constants ─────────────────────────────────────────────');

assert(svc.VALID_TRANSITIONS.draft.includes('audited'), 'draft → audited');
assert(svc.VALID_TRANSITIONS.verified.length === 0, 'verified is terminal');
assert(svc.STATUS_ORDER.length === 7, '7 statuses');
assert(svc.AUDIT_GATED_STATES.includes('ready'), 'ready is gated');
assert(svc.AUDIT_GATED_STATES.includes('approved'), 'approved is gated');
assert(svc.AUDIT_GATED_STATES.includes('executing'), 'executing is gated');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main()

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
