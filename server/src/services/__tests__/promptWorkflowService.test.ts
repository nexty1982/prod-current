#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptWorkflowService.js (OMD-1037)
 *
 * Structured sequential prompt execution with:
 *   - state machine: draft → audited → ready → approved → executing → complete → verified
 *   - audit gate enforcement at ready/approved/executing
 *   - atomic UPDATE ... WHERE status = ? guards
 *   - sequence-order enforcement (prior siblings must be verified)
 *   - audit reset on prompt_text / guardrails_applied edits
 *
 * External deps stubbed via require.cache (installed BEFORE requiring the SUT):
 *   - ../config/db               → fake pool with SQL-routed responses
 *   - ./promptAuditService       → enforceAuditPass / resetAudit
 *   - uuid                       → deterministic v4
 *
 * Run from server/: npx tsx src/services/__tests__/promptWorkflowService.test.ts
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

async function assertThrows(fn: () => Promise<any>, msgFragment: string, label: string): Promise<void> {
  try {
    await fn();
    console.error(`  FAIL: ${label} — expected throw containing "${msgFragment}"`);
    failed++;
  } catch (e: any) {
    if (String(e.message || '').includes(msgFragment)) {
      console.log(`  PASS: ${label}`); passed++;
    } else {
      console.error(`  FAIL: ${label}\n         expected throw containing: ${msgFragment}\n         actual:                    ${e.message}`);
      failed++;
    }
  }
}

// ── uuid stub (deterministic) ───────────────────────────────────────────────
let uuidCounter = 0;
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = {
  id: uuidPath,
  filename: uuidPath,
  loaded: true,
  exports: { v4: () => `uuid-${++uuidCounter}` },
} as any;

// ── fake pool with SQL routing ─────────────────────────────────────────────
type Query = { sql: string; params: any[] };
const queryLog: Query[] = [];
type Route = { match: RegExp; rows?: any; respond?: (params: any[]) => any };
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        const payload = r.respond ? r.respond(params) : r.rows;
        // mysql2 returns [rows, fields] — wrap once
        return [payload];
      }
    }
    return [[]];
  },
};

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    getAppPool: () => fakePool,
  },
} as any;

// ── promptAuditService stub ────────────────────────────────────────────────
let auditPassById: Record<string, boolean> = {};
let auditThrowsWith: string | null = null;
const auditCalls: { fn: string; id: string }[] = [];

const promptAuditStub = {
  enforceAuditPass: async (id: string) => {
    auditCalls.push({ fn: 'enforceAuditPass', id });
    if (auditThrowsWith) {
      throw new Error(auditThrowsWith);
    }
    if (auditPassById[id] === false) {
      throw new Error(`Audit gate: prompt ${id} has audit_status != pass`);
    }
  },
  resetAudit: async (id: string) => {
    auditCalls.push({ fn: 'resetAudit', id });
  },
};

const auditPath = require.resolve('../promptAuditService');
require.cache[auditPath] = {
  id: auditPath,
  filename: auditPath,
  loaded: true,
  exports: promptAuditStub,
} as any;

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

function resetAll() {
  queryLog.length = 0;
  routes = [];
  auditCalls.length = 0;
  auditPassById = {};
  auditThrowsWith = null;
  uuidCounter = 0;
}

// Helper to find last query by pattern
function findQuery(pattern: RegExp): Query | undefined {
  return [...queryLog].reverse().find(q => pattern.test(q.sql));
}

// ── Now require the SUT ────────────────────────────────────────────────────
const svc = require('../promptWorkflowService');
const {
  createPrompt,
  getAllPrompts,
  getPromptById,
  updatePrompt,
  markReady,
  approvePrompt,
  rejectPrompt,
  executePrompt,
  completeExecution,
  verifyPrompt,
  resetToDraft,
  VALID_TRANSITIONS,
  STATUS_ORDER,
  AUDIT_GATED_STATES,
} = svc;

async function main() {

// ============================================================================
// Constants export shape
// ============================================================================
console.log('\n── constants ─────────────────────────────────────────────');

assertEq(STATUS_ORDER, ['draft', 'audited', 'ready', 'approved', 'executing', 'complete', 'verified'], 'STATUS_ORDER');
assertEq(AUDIT_GATED_STATES, ['ready', 'approved', 'executing'], 'AUDIT_GATED_STATES');
assertEq(VALID_TRANSITIONS.draft, ['audited'], 'draft→audited');
assertEq(VALID_TRANSITIONS.audited, ['ready', 'rejected'], 'audited→ready/rejected');
assertEq(VALID_TRANSITIONS.ready, ['approved', 'rejected'], 'ready→approved/rejected');
assertEq(VALID_TRANSITIONS.approved, ['executing', 'rejected'], 'approved→executing/rejected');
assertEq(VALID_TRANSITIONS.executing, ['complete', 'rejected'], 'executing→complete/rejected');
assertEq(VALID_TRANSITIONS.complete, ['verified', 'rejected'], 'complete→verified/rejected');
assertEq(VALID_TRANSITIONS.verified, [], 'verified is terminal');
assertEq(VALID_TRANSITIONS.rejected, ['draft'], 'rejected→draft');

// ============================================================================
// createPrompt — validation
// ============================================================================
console.log('\n── createPrompt: validation ──────────────────────────────');

resetAll();
quiet();
await assertThrows(
  () => createPrompt({ created_by: null, title: 't', purpose: 'p', component: 'c', prompt_text: 'x', sequence_order: 0 }),
  'Missing required fields',
  'missing created_by → throws'
);
await assertThrows(
  () => createPrompt({ created_by: 'u', title: '  ', purpose: 'p', component: 'c', prompt_text: 'x', sequence_order: 0 }),
  'Missing required fields',
  'whitespace title → throws'
);
await assertThrows(
  () => createPrompt({ created_by: 'u', title: 't', purpose: 'p', component: 'c', prompt_text: 'x', sequence_order: -1 }),
  'sequence_order',
  'negative sequence → throws'
);
await assertThrows(
  () => createPrompt({ created_by: 'u', title: 't', purpose: 'p', component: 'c', prompt_text: 'x', sequence_order: 1.5 }),
  'sequence_order',
  'non-integer sequence → throws'
);
await assertThrows(
  () => createPrompt({ created_by: 'u', title: 't', purpose: 'p', component: 'c', prompt_text: 'x', sequence_order: null }),
  'sequence_order',
  'null sequence → throws'
);
loud();

// ============================================================================
// createPrompt — duplicate sequence_order
// ============================================================================
console.log('\n── createPrompt: duplicate sequence ──────────────────────');

resetAll();
routes = [
  // Duplicate sequence check returns a row
  { match: /WHERE parent_prompt_id <=> \? AND sequence_order = \?/i, rows: [{ id: 'existing' }] },
];
quiet();
await assertThrows(
  () => createPrompt({ created_by: 'u', title: 't', purpose: 'p', component: 'c', prompt_text: 'x', sequence_order: 0 }),
  'already exists',
  'duplicate sequence → throws'
);
loud();

// ============================================================================
// createPrompt — happy path
// ============================================================================
console.log('\n── createPrompt: happy path ──────────────────────────────');

resetAll();
const createdRow: any = {
  id: 'uuid-1',
  created_by: 'alice',
  title: 'Test',
  purpose: 'Purpose',
  component: 'om-backend',
  parent_prompt_id: null,
  sequence_order: 0,
  status: 'draft',
  audit_status: 'pending',
  prompt_text: 'Do the thing',
  guardrails_applied: 1,
};
routes = [
  // duplicate check: empty
  { match: /SELECT id FROM om_prompt_registry\s+WHERE parent_prompt_id <=> \?/i, rows: [] },
  // INSERT INTO
  { match: /INSERT INTO om_prompt_registry/i, rows: { insertId: 1 } },
  // logAction insert
  { match: /INSERT INTO system_logs/i, rows: { insertId: 1 } },
  // getPromptById
  { match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i, rows: [createdRow] },
];
{
  const result = await createPrompt({
    created_by: 'alice',
    title: '  Test  ',
    purpose: '  Purpose  ',
    component: '  om-backend  ',
    prompt_text: 'Do the thing',
    guardrails_applied: true,
    sequence_order: 0,
    parent_prompt_id: null,
  });
  assertEq(result.id, 'uuid-1', 'returns created row');
  const insertQ = findQuery(/INSERT INTO om_prompt_registry/);
  assert(insertQ !== undefined, 'INSERT issued');
  // params: [id, created_by, title, purpose, component, parent, seq_order, prompt_text, guardrails]
  assertEq(insertQ!.params[0], 'uuid-1', 'uuid param');
  assertEq(insertQ!.params[2], 'Test', 'trimmed title');
  assertEq(insertQ!.params[3], 'Purpose', 'trimmed purpose');
  assertEq(insertQ!.params[4], 'om-backend', 'trimmed component');
  assertEq(insertQ!.params[8], 1, 'guardrails → 1');
  const logQ = findQuery(/INSERT INTO system_logs/);
  assert(logQ !== undefined, 'CREATED logged');
  assert(/\[CREATED\]/.test(logQ!.params[0]), 'log contains [CREATED]');
}

// ============================================================================
// getAllPrompts — filter combinations
// ============================================================================
console.log('\n── getAllPrompts: filters ────────────────────────────────');

resetAll();
routes = [
  { match: /SELECT \* FROM om_prompt_registry/i, rows: [{ id: 'a' }, { id: 'b' }] },
];
{
  const r = await getAllPrompts({ status: 'draft', component: 'om-backend', audit_status: 'pending', parent_prompt_id: null });
  assertEq(r.length, 2, 'returns all rows');
  const q = findQuery(/SELECT \* FROM om_prompt_registry/);
  assert(/AND status = \?/.test(q!.sql), 'status filter');
  assert(/AND component = \?/.test(q!.sql), 'component filter');
  assert(/AND audit_status = \?/.test(q!.sql), 'audit_status filter');
  assert(/parent_prompt_id IS NULL/.test(q!.sql), 'null parent → IS NULL');
  assert(q!.params.includes('draft'), 'status param');
  assert(q!.params.includes('om-backend'), 'component param');
}

resetAll();
routes = [{ match: /SELECT \*/i, rows: [] }];
{
  await getAllPrompts({ parent_prompt_id: 'abc-123' });
  const q = findQuery(/SELECT \*/);
  assert(/parent_prompt_id = \?/.test(q!.sql), 'non-null parent → equals');
  assert(q!.params.includes('abc-123'), 'parent param');
}

// ============================================================================
// getPromptById — not found
// ============================================================================
console.log('\n── getPromptById ─────────────────────────────────────────');

resetAll();
routes = [{ match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i, rows: [] }];
quiet();
await assertThrows(() => getPromptById('missing'), 'Prompt not found', 'not found → throws');
loud();

resetAll();
routes = [{ match: /SELECT \*/i, rows: [{ id: 'x', title: 'T' }] }];
{
  const r = await getPromptById('x');
  assertEq(r.id, 'x', 'returns single row');
}

// ============================================================================
// updatePrompt — status guard
// ============================================================================
console.log('\n── updatePrompt: status guard ────────────────────────────');

resetAll();
routes = [
  { match: /SELECT \*/i, rows: [{ id: 'p1', status: 'approved', prompt_text: 'x', parent_prompt_id: null }] },
];
quiet();
await assertThrows(
  () => updatePrompt('p1', { title: 'new' }, 'actor'),
  'Cannot update prompt fields',
  'approved → cannot update'
);
loud();

// No valid fields
resetAll();
routes = [{ match: /SELECT \*/i, rows: [{ id: 'p1', status: 'draft' }] }];
quiet();
await assertThrows(
  () => updatePrompt('p1', { bogus: 'x' }, 'actor'),
  'No valid fields',
  'no valid fields → throws'
);
loud();

// ============================================================================
// updatePrompt — prompt_text change resets audit
// ============================================================================
console.log('\n── updatePrompt: audit reset ─────────────────────────────');

resetAll();
let getCallCount = 0;
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => {
      getCallCount++;
      // first call = the pre-update load (status=audited), second = the post-update load
      if (getCallCount === 1) {
        return [{ id: 'p1', status: 'audited', prompt_text: 'old', parent_prompt_id: null }];
      }
      return [{ id: 'p1', status: 'draft', prompt_text: 'new', audit_status: 'pending' }];
    },
  },
  { match: /UPDATE om_prompt_registry SET/i, rows: { affectedRows: 1 } },
  { match: /INSERT INTO system_logs/i, rows: { insertId: 1 } },
];
{
  const r = await updatePrompt('p1', { prompt_text: 'new' }, 'actor');
  const updQ = findQuery(/UPDATE om_prompt_registry SET/);
  assert(/audit_status = 'pending'/.test(updQ!.sql), 'audit_status reset');
  assert(/audit_result = NULL/.test(updQ!.sql), 'audit_result nulled');
  assert(/status = 'draft'/.test(updQ!.sql), 'audited → draft on edit');
  assertEq(r.status, 'draft', 'returns updated prompt');
}

// updating title only on a draft → no audit reset, no status change
resetAll();
routes = [
  { match: /SELECT \*/i, rows: [{ id: 'p1', status: 'draft', prompt_text: 'old', parent_prompt_id: null }] },
  { match: /UPDATE om_prompt_registry SET/i, rows: { affectedRows: 1 } },
  { match: /INSERT INTO system_logs/i, rows: { insertId: 1 } },
];
{
  await updatePrompt('p1', { title: 'new title' }, 'actor');
  const updQ = findQuery(/UPDATE om_prompt_registry SET/);
  assert(!/audit_status = 'pending'/.test(updQ!.sql), 'no audit reset on title-only edit');
  assert(/title = \?/.test(updQ!.sql), 'title updated');
}

// sequence_order conflict
resetAll();
let seqCallCount = 0;
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    rows: [{ id: 'p1', status: 'draft', prompt_text: 'x', parent_prompt_id: null }],
  },
  {
    match: /SELECT id FROM om_prompt_registry\s+WHERE parent_prompt_id <=> \?/i,
    respond: () => {
      seqCallCount++;
      return [{ id: 'other' }];
    },
  },
];
quiet();
await assertThrows(
  () => updatePrompt('p1', { sequence_order: 5 }, 'actor'),
  'already exists',
  'sequence conflict → throws'
);
loud();

// invalid sequence_order
resetAll();
routes = [{ match: /SELECT \*/i, rows: [{ id: 'p1', status: 'draft', prompt_text: 'x' }] }];
quiet();
await assertThrows(
  () => updatePrompt('p1', { sequence_order: -1 }, 'actor'),
  'non-negative integer',
  'negative seq → throws'
);
loud();

// ============================================================================
// markReady — status + audit enforcement
// ============================================================================
console.log('\n── markReady ─────────────────────────────────────────────');

resetAll();
routes = [{ match: /SELECT \*/i, rows: [{ id: 'p1', status: 'draft', prompt_text: 'x' }] }];
quiet();
await assertThrows(() => markReady('p1', 'actor'), 'must be "audited"', 'draft → cannot mark ready');
loud();

// Empty prompt_text
resetAll();
routes = [{ match: /SELECT \*/i, rows: [{ id: 'p1', status: 'audited', prompt_text: '   ' }] }];
quiet();
await assertThrows(() => markReady('p1', 'actor'), 'prompt_text is empty', 'empty prompt_text → throws');
loud();

// Audit gate fails
resetAll();
auditPassById = { p1: false };
routes = [{ match: /SELECT \*/i, rows: [{ id: 'p1', status: 'audited', prompt_text: 'text' }] }];
quiet();
await assertThrows(() => markReady('p1', 'actor'), 'Audit gate', 'failed audit gate → throws');
loud();
assert(auditCalls.some(c => c.fn === 'enforceAuditPass' && c.id === 'p1'), 'enforceAuditPass called');

// Happy path
resetAll();
let mrCallCount = 0;
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => {
      mrCallCount++;
      if (mrCallCount === 1) return [{ id: 'p1', status: 'audited', prompt_text: 'text', audit_status: 'pass' }];
      return [{ id: 'p1', status: 'ready', prompt_text: 'text', audit_status: 'pass' }];
    },
  },
  { match: /UPDATE om_prompt_registry SET status/i, rows: { affectedRows: 1 } },
  { match: /INSERT INTO system_logs/i, rows: { insertId: 1 } },
];
{
  const r = await markReady('p1', 'actor');
  assertEq(r.status, 'ready', 'returns ready');
  const upd = findQuery(/UPDATE om_prompt_registry SET status/);
  assert(/status = \?.*WHERE status = \?/.test(upd!.sql), 'atomic UPDATE ... WHERE status');
  // atomicStatusUpdate params: [newStatus, ...extraParams, expectedStatus, id]
  assertEq(upd!.params[0], 'ready', 'new status param');
  assertEq(upd!.params[1], 'audited', 'expected status param');
  assertEq(upd!.params[2], 'p1', 'id param');
}

// Transition conflict (affectedRows=0)
resetAll();
routes = [
  { match: /SELECT \*/i, rows: [{ id: 'p1', status: 'audited', prompt_text: 'text', audit_status: 'pass' }] },
  { match: /UPDATE om_prompt_registry SET status/i, rows: { affectedRows: 0 } },
];
quiet();
await assertThrows(() => markReady('p1', 'actor'), 'Transition conflict', 'race → throws');
loud();

// ============================================================================
// approvePrompt
// ============================================================================
console.log('\n── approvePrompt ─────────────────────────────────────────');

resetAll();
routes = [{ match: /SELECT \*/i, rows: [{ id: 'p1', status: 'audited' }] }];
quiet();
await assertThrows(() => approvePrompt('p1', 'actor'), 'must be "ready"', 'wrong status → throws');
loud();

resetAll();
let apCount = 0;
routes = [
  {
    match: /SELECT \*/i,
    respond: () => {
      apCount++;
      if (apCount === 1) return [{ id: 'p1', status: 'ready', audit_status: 'pass' }];
      return [{ id: 'p1', status: 'approved', audit_status: 'pass' }];
    },
  },
  { match: /UPDATE om_prompt_registry SET status/i, rows: { affectedRows: 1 } },
  { match: /INSERT INTO system_logs/i, rows: { insertId: 1 } },
];
{
  const r = await approvePrompt('p1', 'actor');
  assertEq(r.status, 'approved', 'approved');
  const logQ = findQuery(/INSERT INTO system_logs/);
  assert(/STATUS_APPROVED/.test(logQ!.params[0]), 'STATUS_APPROVED logged');
}

// ============================================================================
// rejectPrompt
// ============================================================================
console.log('\n── rejectPrompt ──────────────────────────────────────────');

// Cannot reject verified
resetAll();
routes = [{ match: /SELECT \*/i, rows: [{ id: 'p1', status: 'verified' }] }];
quiet();
await assertThrows(() => rejectPrompt('p1', 'actor', 'nope'), 'Cannot reject a verified', 'reject verified → throws');
loud();

// Cannot reject draft
resetAll();
routes = [{ match: /SELECT \*/i, rows: [{ id: 'p1', status: 'draft' }] }];
quiet();
await assertThrows(() => rejectPrompt('p1', 'actor', 'nope'), 'Cannot reject a draft', 'reject draft → throws');
loud();

// Reject ready with reason
resetAll();
let rjCount = 0;
routes = [
  {
    match: /SELECT \*/i,
    respond: () => {
      rjCount++;
      if (rjCount === 1) return [{ id: 'p1', status: 'ready' }];
      return [{ id: 'p1', status: 'rejected' }];
    },
  },
  { match: /UPDATE om_prompt_registry SET status/i, rows: { affectedRows: 1 } },
  { match: /INSERT INTO system_logs/i, rows: { insertId: 1 } },
];
{
  const r = await rejectPrompt('p1', 'actor', 'wrong approach');
  assertEq(r.status, 'rejected', 'rejected');
  const upd = findQuery(/UPDATE om_prompt_registry SET status.*verification_result/i);
  assert(upd !== undefined, 'UPDATE includes verification_result');
  const parsed = JSON.parse(upd!.params[1]);
  assertEq(parsed.rejected, true, 'verification_result.rejected');
  assertEq(parsed.reason, 'wrong approach', 'verification_result.reason');
  assertEq(parsed.actor, 'actor', 'verification_result.actor');
}

// ============================================================================
// executePrompt
// ============================================================================
console.log('\n── executePrompt ─────────────────────────────────────────');

// Wrong status
resetAll();
routes = [{ match: /SELECT \*/i, rows: [{ id: 'p1', status: 'ready' }] }];
quiet();
await assertThrows(() => executePrompt('p1', 'actor'), 'must be "approved"', 'not approved → throws');
loud();

// Sequence violation
resetAll();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    rows: [{ id: 'p1', status: 'approved', audit_status: 'pass', sequence_order: 2, parent_prompt_id: 'parent1' }],
  },
  {
    match: /SELECT id, sequence_order, status FROM om_prompt_registry/i,
    rows: [
      { id: 'prior', sequence_order: 1, status: 'complete' }, // not verified
    ],
  },
];
quiet();
await assertThrows(
  () => executePrompt('p1', 'actor'),
  'must be "verified"',
  'unverified predecessor → throws'
);
loud();

// Happy path
resetAll();
let exCount = 0;
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
    respond: () => {
      exCount++;
      if (exCount === 1) {
        return [{ id: 'p1', status: 'approved', audit_status: 'pass', sequence_order: 0, parent_prompt_id: null }];
      }
      return [{ id: 'p1', status: 'executing', audit_status: 'pass' }];
    },
  },
  // predecessors: none
  { match: /SELECT id, sequence_order, status FROM om_prompt_registry/i, rows: [] },
  { match: /UPDATE om_prompt_registry SET status/i, rows: { affectedRows: 1 } },
  { match: /INSERT INTO system_logs/i, rows: { insertId: 1 } },
];
{
  const r = await executePrompt('p1', 'actor');
  assertEq(r.status, 'executing', 'executing');
  const logQ = findQuery(/INSERT INTO system_logs/);
  assert(/EXECUTION_STARTED/.test(logQ!.params[0]), 'EXECUTION_STARTED logged');
}

// ============================================================================
// completeExecution
// ============================================================================
console.log('\n── completeExecution ─────────────────────────────────────');

resetAll();
routes = [{ match: /SELECT \*/i, rows: [{ id: 'p1', status: 'approved' }] }];
quiet();
await assertThrows(() => completeExecution('p1', 'actor', {}), 'must be "executing"', 'wrong status → throws');
loud();

resetAll();
let ceCount = 0;
routes = [
  {
    match: /SELECT \*/i,
    respond: () => {
      ceCount++;
      if (ceCount === 1) return [{ id: 'p1', status: 'executing' }];
      return [{ id: 'p1', status: 'complete', execution_result: '{"ok":true}' }];
    },
  },
  { match: /UPDATE om_prompt_registry SET status/i, rows: { affectedRows: 1 } },
  { match: /INSERT INTO system_logs/i, rows: { insertId: 1 } },
];
{
  const r = await completeExecution('p1', 'actor', { ok: true, files: ['x.js'] });
  assertEq(r.status, 'complete', 'complete');
  const upd = findQuery(/UPDATE om_prompt_registry SET status.*execution_result/i);
  assert(upd !== undefined, 'UPDATE includes execution_result');
  const parsed = JSON.parse(upd!.params[1]);
  assertEq(parsed.ok, true, 'execution_result serialized');
}

// ============================================================================
// verifyPrompt
// ============================================================================
console.log('\n── verifyPrompt ──────────────────────────────────────────');

// Wrong status
resetAll();
routes = [{ match: /SELECT \*/i, rows: [{ id: 'p1', status: 'executing' }] }];
quiet();
await assertThrows(() => verifyPrompt('p1', 'actor', {}), 'must be "complete"', 'wrong status → throws');
loud();

// Guardrails-applied prompt without guardrails_followed → fail
resetAll();
routes = [{
  match: /SELECT \*/i,
  rows: [{
    id: 'p1',
    status: 'complete',
    execution_result: '{"ok":true}',
    guardrails_applied: 1,
    audit_status: 'pass',
  }],
}];
quiet();
await assertThrows(
  () => verifyPrompt('p1', 'actor', { system_state_modified: true }),
  'Verification failed',
  'missing guardrails_followed → fail'
);
loud();

// Audit not pass → fail
resetAll();
routes = [{
  match: /SELECT \*/i,
  rows: [{
    id: 'p1',
    status: 'complete',
    execution_result: '{"ok":true}',
    guardrails_applied: 0,
    audit_status: 'pending',
  }],
}];
quiet();
await assertThrows(
  () => verifyPrompt('p1', 'actor', { system_state_modified: true, guardrails_followed: true }),
  'Verification failed',
  'audit not pass → fail'
);
loud();

// Happy path — all checks pass
resetAll();
let vrCount = 0;
routes = [
  {
    match: /SELECT \*/i,
    respond: () => {
      vrCount++;
      if (vrCount === 1) {
        return [{
          id: 'p1',
          status: 'complete',
          execution_result: '{"ok":true}',
          guardrails_applied: 1,
          audit_status: 'pass',
        }];
      }
      return [{ id: 'p1', status: 'verified' }];
    },
  },
  { match: /UPDATE om_prompt_registry SET status/i, rows: { affectedRows: 1 } },
  { match: /INSERT INTO system_logs/i, rows: { insertId: 1 } },
];
{
  const r = await verifyPrompt('p1', 'actor', {
    system_state_modified: true,
    guardrails_followed: true,
    notes: 'all good',
  });
  assertEq(r.status, 'verified', 'verified');
  const upd = findQuery(/UPDATE om_prompt_registry SET status.*verification_result/i);
  const parsed = JSON.parse(upd!.params[1]);
  assertEq(parsed.verified_by, 'actor', 'verified_by');
  assertEq(parsed.notes, 'all good', 'notes');
  assertEq(parsed.checks.audit_passed, true, 'audit check pass');
  assertEq(parsed.checks.guardrails_followed, true, 'guardrails check pass');
}

// ============================================================================
// resetToDraft
// ============================================================================
console.log('\n── resetToDraft ──────────────────────────────────────────');

resetAll();
routes = [{ match: /SELECT \*/i, rows: [{ id: 'p1', status: 'draft' }] }];
quiet();
await assertThrows(() => resetToDraft('p1', 'actor'), 'must be "rejected"', 'non-rejected → throws');
loud();

resetAll();
let rdCount = 0;
routes = [
  {
    match: /SELECT \*/i,
    respond: () => {
      rdCount++;
      if (rdCount === 1) return [{ id: 'p1', status: 'rejected' }];
      return [{ id: 'p1', status: 'draft', audit_status: 'pending' }];
    },
  },
  { match: /UPDATE om_prompt_registry SET status/i, rows: { affectedRows: 1 } },
  { match: /INSERT INTO system_logs/i, rows: { insertId: 1 } },
];
{
  const r = await resetToDraft('p1', 'actor');
  assertEq(r.status, 'draft', 'back to draft');
  const upd = findQuery(/UPDATE om_prompt_registry SET status/);
  assert(/audit_status = 'pending'/.test(upd!.sql), 'audit reset');
  assert(/audit_result = NULL/.test(upd!.sql), 'audit_result nulled');
}

// Race on reset
resetAll();
routes = [
  { match: /SELECT \*/i, rows: [{ id: 'p1', status: 'rejected' }] },
  { match: /UPDATE om_prompt_registry SET status/i, rows: { affectedRows: 0 } },
];
quiet();
await assertThrows(() => resetToDraft('p1', 'actor'), 'Reset conflict', 'race → throws');
loud();

// ============================================================================
// logAction resilience — swallows log errors
// ============================================================================
console.log('\n── logAction error swallowing ────────────────────────────');

resetAll();
let lgCount = 0;
routes = [
  {
    match: /SELECT \*/i,
    respond: () => {
      lgCount++;
      if (lgCount === 1) return [{ id: 'p1', status: 'audited', prompt_text: 'text', audit_status: 'pass' }];
      return [{ id: 'p1', status: 'ready' }];
    },
  },
  { match: /UPDATE om_prompt_registry SET status/i, rows: { affectedRows: 1 } },
  {
    match: /INSERT INTO system_logs/i,
    respond: () => { throw new Error('log table offline'); },
  },
];
quiet();
{
  // Should still succeed even though the log insert throws
  const r = await markReady('p1', 'actor');
  loud();
  assertEq(r.status, 'ready', 'transition succeeded despite log failure');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main()

main().catch((e) => {
  loud();
  console.error('Unhandled test error:', e);
  process.exit(1);
});
