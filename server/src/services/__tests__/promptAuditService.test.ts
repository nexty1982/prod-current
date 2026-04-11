#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptAuditService.js (OMD-1115)
 *
 * Audit engine for OM prompt registry. Enforces structural + language rules.
 * One external dep: `../config/db.getAppPool`.
 *
 * Strategy: stub config/db via require.cache with a fake pool using
 * Route[] dispatch. Silence console. Test pure `auditPromptText` then
 * DB-orchestrated wrappers.
 *
 * Coverage:
 *   - REQUIRED_SECTIONS / PROHIBITED_PHRASES exports (string lists)
 *   - auditPromptText (pure):
 *       · all 8 sections present → pass (with adequate content)
 *       · missing sections → fail + note lists them
 *       · prohibited phrases → fail + phrase detection with context
 *       · OUTPUT REQUIREMENTS too short → fail
 *       · PROHIBITIONS too short → fail
 *       · TASK too short → fail
 *       · empty text → fail (all sections missing)
 *       · result shape: section_count, total_required, checked_at, etc.
 *   - runAudit:
 *       · prompt not found → throws
 *       · verified prompt → throws (immutable)
 *       · pass + draft → status becomes 'audited'
 *       · fail + audited → reverts to 'draft'
 *       · guardrails_applied=false → forces fail even if text passes
 *       · persists audit_result JSON, notes, SUCCESS/WARN log
 *   - getAuditResult:
 *       · not found → throws
 *       · found with JSON audit_result → parsed
 *       · null audit_result → returns null
 *   - enforceAuditPass:
 *       · not found → throws
 *       · audit_status=pending → throws with "Run POST" hint
 *       · audit_status=fail → throws with "Fix the prompt" hint
 *       · audit_status=pass → no-op
 *   - resetAudit:
 *       · clears audit columns
 *
 * Run: npx tsx server/src/services/__tests__/promptAuditService.test.ts
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

// ── Fake pool with route dispatch ───────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
type Route = { match: RegExp; handler: (params: any[]) => any };

const queryCalls: QueryCall[] = [];
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryCalls.push({ sql, params });
    for (const route of routes) {
      if (route.match.test(sql)) {
        return route.handler(params);
      }
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
  auditPromptText,
  runAudit,
  getAuditResult,
  enforceAuditPass,
  resetAudit,
  REQUIRED_SECTIONS,
  PROHIBITED_PHRASES,
} = require('../promptAuditService');

// Silence noisy logs
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

// ── Helper: valid prompt text (all required sections with adequate content)
const VALID_PROMPT = `
[METADATA]
id: test-001
author: ci

---

CRITICAL EXECUTION RULES
- Do exactly what is specified.
- No shortcuts.

---

SYSTEM PRIORITIES
- Correctness above all.
- Safety second.

---

TASK:
Build the login form component with email and password fields, validation, and a submit button that posts credentials to /api/auth/login.

---

REQUIREMENTS:
- React function component
- MUI TextField + Button
- react-hook-form for state

---

OUTPUT REQUIREMENTS:
A complete LoginForm.tsx file with typed props, error display, loading state, and calls to apiClient.post on submit.

---

PROHIBITIONS:
- No inline styles
- No class components
- No deprecated APIs

---

FINAL REQUIREMENT:
Component must render without console errors and pass the form submission test.
`;

async function main() {

// ============================================================================
// Constants exports
// ============================================================================
console.log('\n── Constants exports ─────────────────────────────────────');

assert(Array.isArray(REQUIRED_SECTIONS), 'REQUIRED_SECTIONS is array');
assertEq(REQUIRED_SECTIONS.length, 8, '8 required sections');
assert(REQUIRED_SECTIONS.includes('METADATA'), 'includes METADATA');
assert(REQUIRED_SECTIONS.includes('CRITICAL EXECUTION RULES'), 'includes CRITICAL EXECUTION RULES');
assert(REQUIRED_SECTIONS.includes('FINAL REQUIREMENT'), 'includes FINAL REQUIREMENT');

assert(Array.isArray(PROHIBITED_PHRASES), 'PROHIBITED_PHRASES is array');
assert(PROHIBITED_PHRASES.length >= 10, '>=10 prohibited phrases');
assert(PROHIBITED_PHRASES.includes('fallback'), 'includes fallback');
assert(PROHIBITED_PHRASES.includes('workaround'), 'includes workaround');
assert(PROHIBITED_PHRASES.includes('hack'), 'includes hack');

// ============================================================================
// auditPromptText — happy path
// ============================================================================
console.log('\n── auditPromptText: happy path ───────────────────────────');

{
  const r = auditPromptText(VALID_PROMPT);
  assertEq(r.pass, true, 'pass=true');
  assertEq(r.missing_sections, [], 'no missing sections');
  assertEq(r.prohibited_language, [], 'no prohibited language');
  assertEq(r.section_count, 8, 'all 8 sections counted');
  assertEq(r.total_required, 8, 'total=8');
  assert(r.sections['METADATA'] === true, 'METADATA true');
  assert(r.sections['CRITICAL EXECUTION RULES'] === true, 'CRITICAL EXECUTION RULES true');
  assert(r.sections['SYSTEM PRIORITIES'] === true, 'SYSTEM PRIORITIES true');
  assert(r.sections['TASK'] === true, 'TASK true');
  assert(r.sections['REQUIREMENTS'] === true, 'REQUIREMENTS true');
  assert(r.sections['OUTPUT REQUIREMENTS'] === true, 'OUTPUT REQUIREMENTS true');
  assert(r.sections['PROHIBITIONS'] === true, 'PROHIBITIONS true');
  assert(r.sections['FINAL REQUIREMENT'] === true, 'FINAL REQUIREMENT true');
  assertEq(r.notes, [], 'no notes on pass');
  assert(typeof r.checked_at === 'string', 'checked_at timestamp');
}

// ============================================================================
// auditPromptText — missing sections
// ============================================================================
console.log('\n── auditPromptText: missing sections ─────────────────────');

{
  const r = auditPromptText('only a bare task description with some text');
  assertEq(r.pass, false, 'pass=false');
  assertEq(r.section_count, 0, '0 sections');
  assertEq(r.missing_sections.length, 8, 'all 8 missing');
  assert(r.notes.length > 0, 'has notes');
  assert(/MISSING REQUIRED SECTIONS/.test(r.notes[0]), 'note mentions missing sections');
}

// Missing just FINAL REQUIREMENT
{
  const text = VALID_PROMPT.replace(/FINAL REQUIREMENT:[\s\S]*/, '');
  const r = auditPromptText(text);
  assertEq(r.pass, false, 'missing FINAL → fail');
  assert(r.missing_sections.includes('FINAL REQUIREMENT'), 'FINAL REQUIREMENT in missing');
  assertEq(r.sections['FINAL REQUIREMENT'], false, 'FINAL false');
}

// Empty text
{
  const r = auditPromptText('');
  assertEq(r.pass, false, 'empty → fail');
  assertEq(r.missing_sections.length, 8, 'all missing on empty');
}

// ============================================================================
// auditPromptText — prohibited language
// ============================================================================
console.log('\n── auditPromptText: prohibited language ──────────────────');

{
  const text = VALID_PROMPT + '\n\nJust use a fallback for now if this fails, do X instead.';
  const r = auditPromptText(text);
  assertEq(r.pass, false, 'prohibited → fail');
  assert(r.prohibited_language.length >= 3, '>=3 prohibited phrases detected');
  const phrases = r.prohibited_language.map((p: any) => p.phrase);
  assert(phrases.includes('fallback'), 'fallback detected');
  assert(phrases.includes('for now'), 'for now detected');
  assert(phrases.includes('just use'), 'just use detected');
  assert(r.prohibited_language[0].context.length > 0, 'has context string');
  assert(typeof r.prohibited_language[0].index === 'number', 'has index');
  assert(r.notes.some((n: string) => /PROHIBITED LANGUAGE DETECTED/.test(n)), 'note mentions prohibited');
}

// Case-insensitive
{
  const r = auditPromptText(VALID_PROMPT + '\nThis is a HACK we need to remove.');
  assertEq(r.pass, false, 'uppercase HACK → fail');
  assert(r.prohibited_language.some((p: any) => p.phrase === 'hack'), 'hack detected case-insensitively');
}

// "placeholder" detection
{
  const r = auditPromptText(VALID_PROMPT + '\nThe placeholder will be replaced later.');
  assertEq(r.pass, false, 'placeholder → fail');
}

// ============================================================================
// auditPromptText — insufficient content checks
// ============================================================================
console.log('\n── auditPromptText: insufficient content ─────────────────');

// OUTPUT REQUIREMENTS too short
{
  const text = VALID_PROMPT.replace(
    /OUTPUT REQUIREMENTS:[\s\S]*?(?=\n---)/,
    'OUTPUT REQUIREMENTS:\nshort\n'
  );
  const r = auditPromptText(text);
  assertEq(r.pass, false, 'short OUTPUT REQUIREMENTS → fail');
  assert(
    r.notes.some((n: string) => /OUTPUT REQUIREMENTS.*insufficient content/.test(n)),
    'note mentions insufficient OUTPUT REQUIREMENTS'
  );
}

// PROHIBITIONS too short
{
  const text = VALID_PROMPT.replace(
    /PROHIBITIONS:[\s\S]*?(?=\n---)/,
    'PROHIBITIONS:\nnope\n'
  );
  const r = auditPromptText(text);
  assertEq(r.pass, false, 'short PROHIBITIONS → fail');
  assert(
    r.notes.some((n: string) => /PROHIBITIONS.*insufficient content/.test(n)),
    'note mentions insufficient PROHIBITIONS'
  );
}

// TASK too short
{
  const text = VALID_PROMPT.replace(
    /TASK:[\s\S]*?(?=\n---)/,
    'TASK:\ndo stuff\n'
  );
  const r = auditPromptText(text);
  assertEq(r.pass, false, 'short TASK → fail');
  assert(
    r.notes.some((n: string) => /TASK section is too brief/.test(n)),
    'note mentions brief TASK'
  );
}

// ============================================================================
// runAudit — prompt not found
// ============================================================================
console.log('\n── runAudit: not found ───────────────────────────────────');

resetAll();
routes = [{ match: /SELECT \* FROM om_prompt_registry/i, handler: () => [[]] }];
await assertThrows(
  () => runAudit('missing-id', 'actor'),
  'Prompt not found',
  'missing prompt throws'
);

// ============================================================================
// runAudit — verified prompt is immutable
// ============================================================================
console.log('\n── runAudit: verified immutable ──────────────────────────');

resetAll();
routes = [{
  match: /SELECT \* FROM om_prompt_registry/i,
  handler: () => [[{
    id: 'p1', prompt_text: VALID_PROMPT, status: 'verified', guardrails_applied: 1,
  }]],
}];
await assertThrows(
  () => runAudit('p1', 'actor'),
  'Cannot audit a verified prompt',
  'verified prompt throws'
);

// ============================================================================
// runAudit — happy path: draft passes → audited
// ============================================================================
console.log('\n── runAudit: draft → audited ─────────────────────────────');

resetAll();
let updatedStatus: string | null = null;
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id/i,
    handler: (params) => {
      // Two SELECTs: initial fetch and final re-fetch
      // Use updatedStatus if it's been set (second call)
      return [[{
        id: params[0],
        prompt_text: VALID_PROMPT,
        status: updatedStatus || 'draft',
        guardrails_applied: 1,
      }]];
    },
  },
  {
    match: /UPDATE om_prompt_registry SET\s+audit_status/i,
    handler: () => [{ affectedRows: 1 }],
  },
  {
    match: /UPDATE om_prompt_registry SET status = 'audited'/i,
    handler: () => { updatedStatus = 'audited'; return [{ affectedRows: 1 }]; },
  },
  {
    match: /INSERT INTO system_logs/i,
    handler: () => [{ insertId: 1 }],
  },
];
{
  const result = await runAudit('p2', 'nick');
  assertEq(result.audit_status, 'pass', 'audit_status=pass');
  assertEq(result.audit.pass, true, 'audit.pass=true');
  assertEq(result.prompt.status, 'audited', 'prompt status transitioned to audited');

  // Verify queries executed
  const sqls = queryCalls.map(c => c.sql);
  assert(sqls.some(s => /UPDATE om_prompt_registry SET\s+audit_status/.test(s)), 'audit UPDATE executed');
  assert(sqls.some(s => /UPDATE om_prompt_registry SET status = 'audited'/.test(s)), 'status UPDATE executed');
  assert(sqls.some(s => /INSERT INTO system_logs/.test(s)), 'system_logs INSERT executed');

  // Verify audit UPDATE has the expected params
  const auditUpdate = queryCalls.find(c => /UPDATE om_prompt_registry SET\s+audit_status/.test(c.sql))!;
  assertEq(auditUpdate.params[0], 'pass', 'audit_status param = pass');
  const storedResult = JSON.parse(auditUpdate.params[1]);
  assertEq(storedResult.pass, true, 'persisted audit_result.pass');
  assertEq(auditUpdate.params[3], 'nick', 'audited_by = actor');
  assertEq(auditUpdate.params[4], 'p2', 'prompt id in WHERE');

  // Verify system_logs uses SUCCESS level
  const logInsert = queryCalls.find(c => /INSERT INTO system_logs/.test(c.sql))!;
  assertEq(logInsert.params[0], 'SUCCESS', 'log level = SUCCESS on pass');
  assert(/AUDIT_PASS/.test(logInsert.params[1]), 'log message has AUDIT_PASS');
  assertEq(logInsert.params[3], 'nick', 'log user_email = actor');
}

// ============================================================================
// runAudit — fail + audited → revert to draft
// ============================================================================
console.log('\n── runAudit: fail revert audited → draft ─────────────────');

resetAll();
let reverted = false;
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id/i,
    handler: () => [[{
      id: 'p3',
      prompt_text: 'bare text without sections',
      status: reverted ? 'draft' : 'audited',
      guardrails_applied: 1,
    }]],
  },
  {
    match: /UPDATE om_prompt_registry SET\s+audit_status/i,
    handler: () => [{ affectedRows: 1 }],
  },
  {
    match: /UPDATE om_prompt_registry SET status = 'draft'/i,
    handler: () => { reverted = true; return [{ affectedRows: 1 }]; },
  },
  {
    match: /INSERT INTO system_logs/i,
    handler: () => [{ insertId: 1 }],
  },
];
{
  const result = await runAudit('p3', 'nick');
  assertEq(result.audit_status, 'fail', 'audit_status=fail');
  assert(reverted, 'status reverted to draft');

  // WARN log level on fail
  const logInsert = queryCalls.find(c => /INSERT INTO system_logs/.test(c.sql))!;
  assertEq(logInsert.params[0], 'WARN', 'log level = WARN on fail');
  assert(/AUDIT_FAIL/.test(logInsert.params[1]), 'log message has AUDIT_FAIL');
}

// ============================================================================
// runAudit — guardrails_applied=false forces fail
// ============================================================================
console.log('\n── runAudit: guardrails false forces fail ────────────────');

resetAll();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id/i,
    handler: () => [[{
      id: 'p4',
      prompt_text: VALID_PROMPT,  // text audit would pass
      status: 'draft',
      guardrails_applied: 0,       // but guardrails not applied
    }]],
  },
  {
    match: /UPDATE om_prompt_registry SET\s+audit_status/i,
    handler: () => [{ affectedRows: 1 }],
  },
  {
    match: /INSERT INTO system_logs/i,
    handler: () => [{ insertId: 1 }],
  },
];
{
  const result = await runAudit('p4', 'nick');
  assertEq(result.audit_status, 'fail', 'forced fail');
  assert(
    result.audit.notes.some((n: string) => /GUARDRAILS NOT APPLIED/.test(n)),
    'note mentions guardrails'
  );
  // draft status NOT transitioned on failure
  const sqls = queryCalls.map(c => c.sql);
  assert(!sqls.some(s => /SET status = 'audited'/.test(s)), 'no transition to audited');
}

// ============================================================================
// runAudit — draft that fails stays draft (no status update)
// ============================================================================
console.log('\n── runAudit: draft + fail stays draft ────────────────────');

resetAll();
routes = [
  {
    match: /SELECT \* FROM om_prompt_registry WHERE id/i,
    handler: () => [[{
      id: 'p5',
      prompt_text: 'nothing',
      status: 'draft',
      guardrails_applied: 1,
    }]],
  },
  {
    match: /UPDATE om_prompt_registry SET\s+audit_status/i,
    handler: () => [{ affectedRows: 1 }],
  },
  {
    match: /INSERT INTO system_logs/i,
    handler: () => [{ insertId: 1 }],
  },
];
{
  await runAudit('p5', 'nick');
  const sqls = queryCalls.map(c => c.sql);
  assert(!sqls.some(s => /SET status = 'audited'/.test(s)), 'no audited transition on fail');
  assert(!sqls.some(s => /SET status = 'draft'/.test(s)), 'no draft revert (already draft)');
}

// ============================================================================
// getAuditResult
// ============================================================================
console.log('\n── getAuditResult ────────────────────────────────────────');

// Not found
resetAll();
routes = [{ match: /SELECT id, audit_status/i, handler: () => [[]] }];
await assertThrows(
  () => getAuditResult('missing'),
  'Prompt not found',
  'missing throws'
);

// Found with JSON result
resetAll();
routes = [{
  match: /SELECT id, audit_status/i,
  handler: (params) => [[{
    id: params[0],
    audit_status: 'pass',
    audit_result: JSON.stringify({ pass: true, section_count: 8 }),
    audit_notes: 'ok',
    audited_at: '2026-04-10T10:00:00Z',
    audited_by: 'nick',
  }]],
}];
{
  const r = await getAuditResult('p6');
  assertEq(r.prompt_id, 'p6', 'prompt_id');
  assertEq(r.audit_status, 'pass', 'audit_status');
  assertEq(r.audit_result, { pass: true, section_count: 8 }, 'audit_result parsed');
  assertEq(r.audit_notes, 'ok', 'audit_notes');
  assertEq(r.audited_by, 'nick', 'audited_by');
}

// Found with null audit_result
resetAll();
routes = [{
  match: /SELECT id, audit_status/i,
  handler: () => [[{
    id: 'p7',
    audit_status: 'pending',
    audit_result: null,
    audit_notes: null,
    audited_at: null,
    audited_by: null,
  }]],
}];
{
  const r = await getAuditResult('p7');
  assertEq(r.audit_status, 'pending', 'pending status');
  assertEq(r.audit_result, null, 'null audit_result');
}

// ============================================================================
// enforceAuditPass
// ============================================================================
console.log('\n── enforceAuditPass ──────────────────────────────────────');

// Not found
resetAll();
routes = [{ match: /SELECT audit_status/i, handler: () => [[]] }];
await assertThrows(
  () => enforceAuditPass('missing'),
  'Prompt not found',
  'missing throws'
);

// Pending → throws with hint
resetAll();
routes = [{ match: /SELECT audit_status/i, handler: () => [[{ audit_status: 'pending' }]] }];
await assertThrows(
  () => enforceAuditPass('p8'),
  'Run POST /api/prompts/:id/audit first',
  'pending throws with run-audit hint'
);

// Fail → throws with fix hint
resetAll();
routes = [{ match: /SELECT audit_status/i, handler: () => [[{ audit_status: 'fail' }]] }];
await assertThrows(
  () => enforceAuditPass('p9'),
  'Fix the prompt',
  'fail throws with fix hint'
);

// Pass → no-op
resetAll();
routes = [{ match: /SELECT audit_status/i, handler: () => [[{ audit_status: 'pass' }]] }];
{
  const result = await enforceAuditPass('p10');
  assertEq(result, undefined, 'pass returns undefined (no-op)');
}

// ============================================================================
// resetAudit
// ============================================================================
console.log('\n── resetAudit ────────────────────────────────────────────');

resetAll();
routes = [{
  match: /UPDATE om_prompt_registry SET\s+audit_status = 'pending'/i,
  handler: () => [{ affectedRows: 1 }],
}];
{
  await resetAudit('p11');
  assertEq(queryCalls.length, 1, 'one query');
  assertEq(queryCalls[0].params, ['p11'], 'id param');
  assert(/audit_result = NULL/.test(queryCalls[0].sql), 'nulls audit_result');
  assert(/audit_notes = NULL/.test(queryCalls[0].sql), 'nulls audit_notes');
  assert(/audited_at = NULL/.test(queryCalls[0].sql), 'nulls audited_at');
  assert(/audited_by = NULL/.test(queryCalls[0].sql), 'nulls audited_by');
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
