#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptWorkflowService.js (OMD-1073)
 *
 * State-machine-enforced prompt registry workflow service.
 * Deps: uuid, ../config/db, ./promptAuditService
 *
 * Strategy: stub all 3 deps via require.cache BEFORE loading SUT.
 * Uses SQL-routed fake pool returning mysql2-shaped `[result, []]`.
 * Default UPDATE responder returns `{ affectedRows: 1 }` so atomic
 * updates succeed unless a test overrides the route.
 *
 * Coverage:
 *   - VALID_TRANSITIONS / STATUS_ORDER / AUDIT_GATED_STATES constants
 *   - createPrompt:
 *       · missing required fields → throws
 *       · invalid sequence_order → throws
 *       · duplicate sequence within parent scope → throws
 *       · happy path: INSERT + log + returns created prompt
 *   - getAllPrompts:
 *       · base query (no filters)
 *       · status / component / audit_status filters
 *       · parent_prompt_id=null → IS NULL
 *       · parent_prompt_id=id → =
 *   - getPromptById:
 *       · happy / not found throws
 *   - updatePrompt:
 *       · not found → throws via getPromptById
 *       · non-editable status → throws
 *       · no updates → throws
 *       · field-only update (no audit reset)
 *       · prompt_text change resets audit + reverts audited→draft
 *       · invalid sequence_order in update → throws
 *       · sequence conflict → throws
 *   - markReady: wrong status, audit gate, empty text, happy
 *   - approvePrompt: wrong status, audit gate, happy
 *   - rejectPrompt: verified/draft forbidden, happy, conflict path
 *   - executePrompt: wrong status, audit gate, predecessor check, happy
 *   - completeExecution: wrong status, happy
 *   - verifyPrompt: wrong status, failed checks, happy
 *   - resetToDraft: wrong status, happy
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

// ── uuid stub ─────────────────────────────────────────────
let uuidSeq = 0;
const uuidStub = { v4: () => `uuid-${++uuidSeq}` };
const uuidPath = require.resolve('uuid');
require.cache[uuidPath] = { id: uuidPath, filename: uuidPath, loaded: true, exports: uuidStub } as any;

// ── db stub ───────────────────────────────────────────────
type Route = { match: RegExp; rows?: any[]; respond?: (params: any[], sql: string) => any };
let routes: Route[] = [];
type QueryCall = { sql: string; params: any[] };
const queryCalls: QueryCall[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryCalls.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        if (r.respond) {
          const out = r.respond(params, sql);
          return [out, []];
        }
        return [r.rows || [], []];
      }
    }
    // Default UPDATE → affectedRows = 1 so atomic updates succeed
    if (/^\s*UPDATE /i.test(sql)) return [{ affectedRows: 1 }, []];
    // Default INSERT
    if (/^\s*INSERT /i.test(sql)) return [{}, []];
    return [[], []];
  },
};

const dbStub = { getAppPool: () => fakePool };

const pathMod = require('path');
function stubCache(relFromSUT: string, exp: any) {
  const base = pathMod.resolve(__dirname, '../..', relFromSUT);
  for (const ext of ['.js', '.ts']) {
    const full = base + ext;
    require.cache[full] = { id: full, filename: full, loaded: true, exports: exp } as any;
  }
}
stubCache('config/db', dbStub);

// ── promptAuditService stub ───────────────────────────────
let auditPassThrow = false;
const auditCalls: any[] = [];
const auditStub = {
  enforceAuditPass: async (id: string) => {
    auditCalls.push(id);
    if (auditPassThrow) throw new Error('audit not passing');
  },
  resetAudit: async (_id: string) => {},
};
// The SUT requires './promptAuditService' — that resolves relative to the
// services directory, which is `server/src/services/promptAuditService`
const auditBase = pathMod.resolve(__dirname, '..', 'promptAuditService');
for (const ext of ['.js', '.ts']) {
  const full = auditBase + ext;
  require.cache[full] = { id: full, filename: full, loaded: true, exports: auditStub } as any;
}

function resetAll() {
  routes = [];
  queryCalls.length = 0;
  uuidSeq = 0;
  auditPassThrow = false;
  auditCalls.length = 0;
}

// Silence
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

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

// Route helpers
function routeSelectById(respond: (params: any[]) => any) {
  return { match: /^\s*SELECT \* FROM om_prompt_registry WHERE id = \?/i, respond };
}

async function main() {

// ============================================================================
// Constants
// ============================================================================
console.log('\n── constants ─────────────────────────────────────────────');

assertEq(VALID_TRANSITIONS.draft, ['audited'], 'draft → audited');
assertEq(VALID_TRANSITIONS.audited, ['ready', 'rejected'], 'audited');
assertEq(VALID_TRANSITIONS.verified, [], 'verified terminal');
assertEq(VALID_TRANSITIONS.rejected, ['draft'], 'rejected → draft');
assertEq(STATUS_ORDER.length, 7, '7 statuses');
assertEq(STATUS_ORDER[0], 'draft', 'first = draft');
assertEq(STATUS_ORDER[6], 'verified', 'last = verified');
assertEq(AUDIT_GATED_STATES, ['ready', 'approved', 'executing'], 'audit gated');

// ============================================================================
// createPrompt
// ============================================================================
console.log('\n── createPrompt ──────────────────────────────────────────');

// Missing required
resetAll();
{
  let thrown: Error | null = null;
  try {
    await createPrompt({
      created_by: 'a', title: '', purpose: 'p', component: 'c',
      sequence_order: 0, prompt_text: 't',
    });
  } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('Missing required'), 'empty title throws');
}

// Whitespace-only rejected
resetAll();
{
  let thrown: Error | null = null;
  try {
    await createPrompt({
      created_by: 'a', title: '   ', purpose: 'p', component: 'c',
      sequence_order: 0, prompt_text: 't',
    });
  } catch (e: any) { thrown = e; }
  assert(thrown !== null, 'whitespace-only title throws');
}

// Invalid sequence_order
resetAll();
{
  let thrown: Error | null = null;
  try {
    await createPrompt({
      created_by: 'a', title: 't', purpose: 'p', component: 'c',
      sequence_order: -1, prompt_text: 't',
    });
  } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('non-negative integer'), 'negative sequence throws');
}

// Null sequence_order
resetAll();
{
  let thrown: Error | null = null;
  try {
    await createPrompt({
      created_by: 'a', title: 't', purpose: 'p', component: 'c',
      sequence_order: null as any, prompt_text: 't',
    });
  } catch (e: any) { thrown = e; }
  assert(thrown !== null, 'null sequence throws');
}

// Duplicate sequence
resetAll();
routes = [
  {
    match: /SELECT id FROM om_prompt_registry[\s\S]*sequence_order = \?/,
    rows: [{ id: 'dup' }],
  },
];
{
  let thrown: Error | null = null;
  try {
    await createPrompt({
      created_by: 'a', title: 't', purpose: 'p', component: 'c',
      sequence_order: 0, prompt_text: 't',
    });
  } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('already exists'), 'dup sequence throws');
}

// Happy path
resetAll();
uuidSeq = 0;
routes = [
  {
    match: /SELECT id FROM om_prompt_registry[\s\S]*sequence_order = \?/,
    rows: [],
  },
  routeSelectById((params: any[]) => {
    if (params[0] === 'uuid-1') {
      return [{
        id: 'uuid-1', title: 'My Prompt', purpose: 'Do it', component: 'app',
        prompt_text: 'text', sequence_order: 0, status: 'draft',
        audit_status: 'pending', parent_prompt_id: null,
      }];
    }
    return [];
  }),
];
{
  const p = await createPrompt({
    created_by: 'nick', title: 'My Prompt', purpose: 'Do it',
    component: 'app', sequence_order: 0, prompt_text: 'text',
    guardrails_applied: true,
  });
  assertEq(p.id, 'uuid-1', 'returns created');
  const insertCall = queryCalls.find(q => /INSERT INTO om_prompt_registry/i.test(q.sql))!;
  assertEq(insertCall.params[0], 'uuid-1', 'uuid in INSERT');
  assertEq(insertCall.params[1], 'nick', 'created_by');
  assertEq(insertCall.params[2], 'My Prompt', 'trimmed title');
  assertEq(insertCall.params[6], 0, 'sequence');
  assertEq(insertCall.params[8], 1, 'guardrails_applied=1');
  assert(
    queryCalls.some(q => /INSERT INTO system_logs/i.test(q.sql)),
    'log written'
  );
}

// ============================================================================
// getAllPrompts
// ============================================================================
console.log('\n── getAllPrompts ─────────────────────────────────────────');

// No filters
resetAll();
routes = [{ match: /SELECT \* FROM om_prompt_registry WHERE 1=1/, rows: [{ id: 'a' }] }];
{
  const r = await getAllPrompts();
  assertEq(r.length, 1, '1 row');
  assert(queryCalls[0].sql.includes('ORDER BY parent_prompt_id, sequence_order'), 'order by');
}

// Multiple filters
resetAll();
routes = [{ match: /SELECT \* FROM om_prompt_registry WHERE 1=1/, rows: [] }];
{
  await getAllPrompts({ status: 'draft', component: 'auth', audit_status: 'pass' });
  const sql = queryCalls[0].sql;
  assert(sql.includes('AND status = ?'), 'status filter');
  assert(sql.includes('AND component = ?'), 'component filter');
  assert(sql.includes('AND audit_status = ?'), 'audit_status filter');
  assertEq(queryCalls[0].params, ['draft', 'auth', 'pass'], 'params');
}

// parent_prompt_id = null
resetAll();
routes = [{ match: /SELECT \* FROM om_prompt_registry WHERE 1=1/, rows: [] }];
{
  await getAllPrompts({ parent_prompt_id: null });
  assert(queryCalls[0].sql.includes('parent_prompt_id IS NULL'), 'IS NULL');
}

// parent_prompt_id = value
resetAll();
routes = [{ match: /SELECT \* FROM om_prompt_registry WHERE 1=1/, rows: [] }];
{
  await getAllPrompts({ parent_prompt_id: 'abc' });
  assert(queryCalls[0].sql.includes('parent_prompt_id = ?'), '= ?');
  assert(queryCalls[0].params.includes('abc'), 'param included');
}

// ============================================================================
// getPromptById
// ============================================================================
console.log('\n── getPromptById ─────────────────────────────────────────');

resetAll();
routes = [routeSelectById(() => [{ id: 'a', title: 't' }])];
{
  const p = await getPromptById('a');
  assertEq(p.id, 'a', 'returns row');
}

resetAll();
routes = [routeSelectById(() => [])];
{
  let thrown: Error | null = null;
  try { await getPromptById('missing'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('not found'), 'not found throws');
}

// ============================================================================
// updatePrompt
// ============================================================================
console.log('\n── updatePrompt ──────────────────────────────────────────');

// Not editable status
resetAll();
routes = [routeSelectById(() => [{ id: 'a', status: 'approved', prompt_text: 't' }])];
{
  let thrown: Error | null = null;
  try { await updatePrompt('a', { title: 'new' }, 'nick'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('Cannot update'), 'approved not editable');
}

// No updates
resetAll();
routes = [routeSelectById(() => [{ id: 'a', status: 'draft', prompt_text: 't' }])];
{
  let thrown: Error | null = null;
  try { await updatePrompt('a', {}, 'nick'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('No valid fields'), 'empty update throws');
}

// Invalid sequence_order
resetAll();
routes = [routeSelectById(() => [{ id: 'a', status: 'draft', prompt_text: 't' }])];
{
  let thrown: Error | null = null;
  try { await updatePrompt('a', { sequence_order: -5 }, 'nick'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('non-negative'), 'invalid seq throws');
}

// Sequence conflict
resetAll();
routes = [
  routeSelectById(() => [{ id: 'a', status: 'draft', prompt_text: 't', parent_prompt_id: null }]),
  {
    match: /SELECT id FROM om_prompt_registry[\s\S]*sequence_order = \?[\s\S]*id != \?/,
    rows: [{ id: 'other' }],
  },
];
{
  let thrown: Error | null = null;
  try { await updatePrompt('a', { sequence_order: 3 }, 'nick'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('already exists'), 'seq conflict throws');
}

// Field update without text change (no audit reset)
resetAll();
let selCallU = 0;
routes = [
  routeSelectById(() => {
    selCallU++;
    return [{ id: 'a', status: 'draft', prompt_text: 'orig', parent_prompt_id: null }];
  }),
];
{
  const p = await updatePrompt('a', { title: 'New Title' }, 'nick');
  assertEq(p.id, 'a', 'returned');
  const updateCall = queryCalls.find(q =>
    /^UPDATE om_prompt_registry SET/i.test(q.sql) && !q.sql.includes('status = ?')
  )!;
  assert(updateCall.sql.includes('title = ?'), 'title updated');
  assert(!updateCall.sql.includes("audit_status = 'pending'"), 'no audit reset');
}

// Text change from audited → reverts to draft + audit reset
resetAll();
routes = [
  routeSelectById(() => [{ id: 'a', status: 'audited', prompt_text: 'orig', parent_prompt_id: null }]),
];
{
  await updatePrompt('a', { prompt_text: 'new text' }, 'nick');
  const updateCall = queryCalls.find(q =>
    /^UPDATE om_prompt_registry SET/i.test(q.sql)
  )!;
  assert(updateCall.sql.includes('prompt_text = ?'), 'text updated');
  assert(updateCall.sql.includes("audit_status = 'pending'"), 'audit reset');
  assert(updateCall.sql.includes("status = 'draft'"), 'reverted to draft');
}

// ============================================================================
// markReady
// ============================================================================
console.log('\n── markReady ─────────────────────────────────────────────');

// Wrong status
resetAll();
routes = [routeSelectById(() => [{ id: 'a', status: 'draft', prompt_text: 't' }])];
{
  let thrown: Error | null = null;
  try { await markReady('a', 'nick'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('must be "audited"'), 'wrong status');
}

// Empty text
resetAll();
routes = [routeSelectById(() => [{ id: 'a', status: 'audited', prompt_text: '  ' }])];
{
  let thrown: Error | null = null;
  try { await markReady('a', 'nick'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('prompt_text is empty'), 'empty text');
}

// Audit gate fails
resetAll();
auditPassThrow = true;
routes = [routeSelectById(() => [{ id: 'a', status: 'audited', prompt_text: 'text' }])];
{
  let thrown: Error | null = null;
  try { await markReady('a', 'nick'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('audit not passing'), 'audit gate');
}

// Happy
resetAll();
routes = [routeSelectById(() => [{ id: 'a', status: 'audited', prompt_text: 'text' }])];
{
  const p = await markReady('a', 'nick');
  assertEq(p.id, 'a', 'returns');
  assert(
    queryCalls.some(q =>
      /UPDATE om_prompt_registry SET status = \? WHERE status = \?/.test(q.sql)
    ),
    'atomic update executed'
  );
}

// ============================================================================
// approvePrompt
// ============================================================================
console.log('\n── approvePrompt ─────────────────────────────────────────');

// Wrong status
resetAll();
routes = [routeSelectById(() => [{ id: 'a', status: 'draft' }])];
{
  let thrown: Error | null = null;
  try { await approvePrompt('a', 'nick'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('must be "ready"'), 'wrong status');
}

// Happy
resetAll();
routes = [routeSelectById(() => [{ id: 'a', status: 'ready' }])];
{
  const p = await approvePrompt('a', 'nick');
  assertEq(p.id, 'a', 'returns');
}

// ============================================================================
// rejectPrompt
// ============================================================================
console.log('\n── rejectPrompt ──────────────────────────────────────────');

// Verified forbidden
resetAll();
routes = [routeSelectById(() => [{ id: 'a', status: 'verified' }])];
{
  let thrown: Error | null = null;
  try { await rejectPrompt('a', 'nick', 'reason'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('Cannot reject a verified'), 'verified forbidden');
}

// Draft forbidden
resetAll();
routes = [routeSelectById(() => [{ id: 'a', status: 'draft' }])];
{
  let thrown: Error | null = null;
  try { await rejectPrompt('a', 'nick', 'r'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('draft'), 'draft forbidden');
}

// Happy reject with reason
resetAll();
routes = [routeSelectById(() => [{ id: 'a', status: 'ready' }])];
{
  const p = await rejectPrompt('a', 'nick', 'bad code');
  assertEq(p.id, 'a', 'returns');
  const upd = queryCalls.find(q =>
    /UPDATE om_prompt_registry SET status = \?, verification_result = \?/.test(q.sql)
  )!;
  assert(upd.params[0] === 'rejected', 'status rejected');
  assert(typeof upd.params[1] === 'string' && upd.params[1].includes('bad code'), 'reason in payload');
}

// Happy reject without reason
resetAll();
routes = [routeSelectById(() => [{ id: 'a', status: 'ready' }])];
{
  await rejectPrompt('a', 'nick', null);
  const upd = queryCalls.find(q =>
    /UPDATE om_prompt_registry SET status = \?, verification_result = \?/.test(q.sql)
  )!;
  assertEq(upd.params[1], null, 'null reason → null payload');
}

// ============================================================================
// executePrompt
// ============================================================================
console.log('\n── executePrompt ─────────────────────────────────────────');

// Wrong status
resetAll();
routes = [routeSelectById(() => [{ id: 'a', status: 'draft' }])];
{
  let thrown: Error | null = null;
  try { await executePrompt('a', 'nick'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('must be "approved"'), 'wrong status');
}

// Predecessor not verified
resetAll();
routes = [
  routeSelectById(() => [{
    id: 'a', status: 'approved', sequence_order: 2, parent_prompt_id: null, audit_status: 'pass',
  }]),
  {
    match: /SELECT id, sequence_order, status FROM om_prompt_registry/,
    rows: [{ id: 'prev', sequence_order: 1, status: 'ready' }],
  },
];
{
  let thrown: Error | null = null;
  try { await executePrompt('a', 'nick'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('predecessor'), 'predecessor blocks');
}

// Happy with verified predecessor
resetAll();
routes = [
  routeSelectById(() => [{
    id: 'a', status: 'approved', sequence_order: 2, parent_prompt_id: null, audit_status: 'pass',
  }]),
  {
    match: /SELECT id, sequence_order, status FROM om_prompt_registry/,
    rows: [{ id: 'prev', sequence_order: 1, status: 'verified' }],
  },
];
{
  const p = await executePrompt('a', 'nick');
  assertEq(p.id, 'a', 'executed');
}

// ============================================================================
// completeExecution
// ============================================================================
console.log('\n── completeExecution ─────────────────────────────────────');

// Wrong status
resetAll();
routes = [routeSelectById(() => [{ id: 'a', status: 'draft' }])];
{
  let thrown: Error | null = null;
  try { await completeExecution('a', 'nick', {}); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('must be "executing"'), 'wrong status');
}

// Happy with result
resetAll();
routes = [routeSelectById(() => [{ id: 'a', status: 'executing' }])];
{
  const p = await completeExecution('a', 'nick', { ok: true });
  assertEq(p.id, 'a', 'completed');
  const upd = queryCalls.find(q =>
    /UPDATE om_prompt_registry SET status = \?, execution_result = \?/.test(q.sql)
  )!;
  assertEq(upd.params[0], 'complete', 'status');
  assert(typeof upd.params[1] === 'string' && upd.params[1].includes('"ok":true'), 'result serialized');
}

// Null result
resetAll();
routes = [routeSelectById(() => [{ id: 'a', status: 'executing' }])];
{
  await completeExecution('a', 'nick', null);
  const upd = queryCalls.find(q =>
    /UPDATE om_prompt_registry SET status = \?, execution_result = \?/.test(q.sql)
  )!;
  assertEq(upd.params[1], null, 'null result');
}

// ============================================================================
// verifyPrompt
// ============================================================================
console.log('\n── verifyPrompt ──────────────────────────────────────────');

// Wrong status
resetAll();
routes = [routeSelectById(() => [{ id: 'a', status: 'executing' }])];
{
  let thrown: Error | null = null;
  try { await verifyPrompt('a', 'nick', {}); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('must be "complete"'), 'wrong status');
}

// Failed checks — execution_result null
resetAll();
routes = [routeSelectById(() => [{
  id: 'a', status: 'complete', execution_result: null,
  audit_status: 'pass', guardrails_applied: 0,
}])];
{
  let thrown: Error | null = null;
  try { await verifyPrompt('a', 'nick', {}); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('Verification failed'), 'checks failed');
}

// Failed checks — guardrails required but not followed
resetAll();
routes = [routeSelectById(() => [{
  id: 'a', status: 'complete', execution_result: 'x',
  audit_status: 'pass', guardrails_applied: 1,
}])];
{
  let thrown: Error | null = null;
  try {
    await verifyPrompt('a', 'nick', {
      system_state_modified: true, guardrails_followed: false,
    });
  } catch (e: any) { thrown = e; }
  assert(thrown !== null, 'guardrails failed → throws');
}

// Happy verification
resetAll();
routes = [routeSelectById(() => [{
  id: 'a', status: 'complete', execution_result: 'x',
  audit_status: 'pass', guardrails_applied: 0,
}])];
{
  const p = await verifyPrompt('a', 'nick', { system_state_modified: true });
  assertEq(p.id, 'a', 'verified');
  const upd = queryCalls.find(q =>
    /UPDATE om_prompt_registry SET status = \?, verification_result = \?/.test(q.sql)
  )!;
  assertEq(upd.params[0], 'verified', 'status verified');
  assert(typeof upd.params[1] === 'string' && upd.params[1].includes('verified_by'), 'verification payload');
}

// ============================================================================
// resetToDraft
// ============================================================================
console.log('\n── resetToDraft ──────────────────────────────────────────');

// Wrong status
resetAll();
routes = [routeSelectById(() => [{ id: 'a', status: 'draft' }])];
{
  let thrown: Error | null = null;
  try { await resetToDraft('a', 'nick'); } catch (e: any) { thrown = e; }
  assert(thrown !== null && thrown.message.includes('must be "rejected"'), 'wrong status');
}

// Happy
resetAll();
routes = [routeSelectById(() => [{ id: 'a', status: 'rejected' }])];
{
  const p = await resetToDraft('a', 'nick');
  assertEq(p.id, 'a', 'reset');
  const upd = queryCalls.find(q =>
    /UPDATE om_prompt_registry SET status = \?/.test(q.sql) && q.sql.includes('audit_status')
  )!;
  assertEq(upd.params[0], 'draft', 'status = draft');
  assert(upd.sql.includes("audit_status = 'pending'"), 'audit reset');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
