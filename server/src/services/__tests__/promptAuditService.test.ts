#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptAuditService.js (OMD-1055)
 *
 * Mandatory prompt guardrail validator. Dep: ../config/db getAppPool.
 *
 * Coverage:
 *   - auditPromptText (pure):
 *       · empty text → all sections missing, pass=false
 *       · complete valid prompt → pass=true
 *       · each prohibited phrase individually detected
 *       · multiple prohibited phrases accumulated
 *       · OUTPUT REQUIREMENTS too-short content flagged
 *       · PROHIBITIONS too-short content flagged
 *       · TASK too-short content flagged
 *       · missing_sections list + section_count/total_required
 *       · notes include prohibited context
 *   - runAudit:
 *       · prompt not found → throws
 *       · verified prompt → throws (immutable)
 *       · passing audit updates row + transitions draft→audited
 *       · failing audit reverts audited→draft
 *       · guardrails_applied=false forces fail regardless of text
 *       · system_logs row inserted with SUCCESS/WARN level
 *       · returns { audit, audit_status, prompt }
 *   - getAuditResult:
 *       · not found → throws
 *       · parses audit_result JSON
 *       · null audit_result preserved
 *   - enforceAuditPass:
 *       · not found → throws
 *       · status pass → no-op
 *       · status pending → throws with "POST /api/prompts" hint
 *       · status fail → throws with "Fix the prompt" hint
 *   - resetAudit:
 *       · issues UPDATE setting all fields to NULL/pending
 *   - Constants:
 *       · REQUIRED_SECTIONS and PROHIBITED_PHRASES exported as string arrays
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

// ── SQL-routed fake pool ──────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Route = { match: RegExp; respond?: (params: any[]) => any; rows?: any };
let routes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of routes) {
      if (r.match.test(sql)) {
        const out = r.respond ? r.respond(params) : r.rows;
        return [out];
      }
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true, exports: dbStub,
} as any;

const svc = require('../promptAuditService');
const {
  auditPromptText,
  runAudit,
  getAuditResult,
  enforceAuditPass,
  resetAudit,
  REQUIRED_SECTIONS,
  PROHIBITED_PHRASES,
} = svc;

function reset() { queryLog.length = 0; routes = []; }

// A fully-valid prompt text with all required sections and sufficient content
const VALID_PROMPT = `
[METADATA]
prompt_id: test-001
author: test
version: 1.0

CRITICAL EXECUTION RULES:
You must follow these rules at all times.

SYSTEM PRIORITIES:
1. Correctness first
2. Clarity second

TASK:
Build a comprehensive module that handles all edge cases properly and ensures complete functionality for the end users of the system across every platform.

REQUIREMENTS:
- Must be tested
- Must be documented
- Must follow conventions

OUTPUT REQUIREMENTS:
- Produce a working implementation with full test coverage and documentation for all public interfaces exposed to consumers.

PROHIBITIONS:
- No shortcuts allowed
- No incomplete solutions ever accepted under any circumstances whatsoever please.

FINAL REQUIREMENT:
The solution must be complete, verified, and merged via PR review.
`.trim();

async function main() {

// ============================================================================
// Constants
// ============================================================================
console.log('\n── Constants ─────────────────────────────────────────────');

assertEq(Array.isArray(REQUIRED_SECTIONS), true, 'REQUIRED_SECTIONS is array');
assertEq(REQUIRED_SECTIONS.length, 8, '8 required sections');
assert(REQUIRED_SECTIONS.includes('METADATA'), 'METADATA');
assert(REQUIRED_SECTIONS.includes('CRITICAL EXECUTION RULES'), 'CRITICAL EXECUTION RULES');
assert(REQUIRED_SECTIONS.includes('PROHIBITIONS'), 'PROHIBITIONS');

assertEq(Array.isArray(PROHIBITED_PHRASES), true, 'PROHIBITED_PHRASES is array');
assert(PROHIBITED_PHRASES.includes('fallback'), 'fallback listed');
assert(PROHIBITED_PHRASES.includes('hack'), 'hack listed');

// ============================================================================
// auditPromptText — empty / missing sections
// ============================================================================
console.log('\n── auditPromptText: empty input ──────────────────────────');

{
  const r = auditPromptText('');
  assertEq(r.pass, false, 'empty → fail');
  assertEq(r.missing_sections.length, 8, 'all 8 missing');
  assertEq(r.section_count, 0, 'section_count 0');
  assertEq(r.total_required, 8, 'total_required 8');
  assert(r.notes.some((n: string) => /MISSING REQUIRED SECTIONS/.test(n)), 'missing notes present');
  assertEq(r.prohibited_language, [], 'no prohibited');
  assert(typeof r.checked_at === 'string', 'checked_at string');
  assert(/^\d{4}-\d{2}-\d{2}T/.test(r.checked_at), 'ISO timestamp');
}

// ============================================================================
// auditPromptText — valid prompt passes
// ============================================================================
console.log('\n── auditPromptText: valid prompt ─────────────────────────');

{
  const r = auditPromptText(VALID_PROMPT);
  assertEq(r.pass, true, 'valid → pass');
  assertEq(r.missing_sections.length, 0, 'nothing missing');
  assertEq(r.section_count, 8, '8/8 found');
  assertEq(r.prohibited_language.length, 0, 'no prohibited');
  assertEq(r.notes, [], 'no notes');
  // All sections flagged true
  for (const key of REQUIRED_SECTIONS) {
    assertEq(r.sections[key], true, `section ${key}`);
  }
}

// ============================================================================
// auditPromptText — prohibited phrases
// ============================================================================
console.log('\n── auditPromptText: prohibited phrases ───────────────────');

// Each prohibited phrase individually
const prohibitedCases: Array<[string, string]> = [
  ['This is a fallback path', 'fallback'],
  ['Apply a temporary fix here', 'temporary fix'],
  ['Use a workaround to bypass', 'workaround'],
  ['just use the other module', 'just use'],
  ['if this fails, do the other thing', 'if this fails, do X instead'],
  ['skip validation for now', 'for now'],
  ['this is good enough', 'good enough'],
  ['accept partial implementation here', 'partial implementation'],
  ['mock it for now later', 'mock it for now'],
  ['use a simplified version instead', 'simplified version'],
  ['leave a placeholder here', 'placeholder'],
  ['skip for now please', 'skip for now'],
  ['This is a hack', 'hack'],
  ['just a quick fix needed', 'quick fix'],
];

for (const [text, phrase] of prohibitedCases) {
  const r = auditPromptText(text);
  assertEq(r.pass, false, `"${phrase}" → fail`);
  const found = r.prohibited_language.find((p: any) => p.phrase === phrase);
  assert(found !== undefined, `"${phrase}" detected`);
  assert(typeof found.context === 'string', `"${phrase}" has context`);
  assert(typeof found.index === 'number', `"${phrase}" has index`);
}

// Multiple prohibited phrases
{
  const r = auditPromptText('a fallback and a workaround and a hack');
  assertEq(r.pass, false, 'fail');
  assertEq(r.prohibited_language.length, 3, '3 prohibited phrases');
  const note = r.notes.find((n: string) => /PROHIBITED LANGUAGE DETECTED \(3\)/.test(n));
  assert(note !== undefined, 'notes show count');
}

// ============================================================================
// auditPromptText — content-length checks
// ============================================================================
console.log('\n── auditPromptText: content-length checks ────────────────');

// OUTPUT REQUIREMENTS exists but content < 20 chars → flagged
{
  const text = VALID_PROMPT.replace(
    /OUTPUT REQUIREMENTS:[\s\S]*?PROHIBITIONS/,
    'OUTPUT REQUIREMENTS:\ntoo short\nPROHIBITIONS'
  );
  const r = auditPromptText(text);
  assertEq(r.pass, false, 'short OUTPUT REQS → fail');
  const note = r.notes.find((n: string) => /OUTPUT REQUIREMENTS section exists but has insufficient content/.test(n));
  assert(note !== undefined, 'OUTPUT REQS note');
}

// PROHIBITIONS too short
{
  const text = VALID_PROMPT.replace(
    /PROHIBITIONS:[\s\S]*?FINAL REQUIREMENT/,
    'PROHIBITIONS:\nshort\nFINAL REQUIREMENT'
  );
  const r = auditPromptText(text);
  assertEq(r.pass, false, 'short PROHIBITIONS → fail');
  const note = r.notes.find((n: string) => /PROHIBITIONS section exists but has insufficient content/.test(n));
  assert(note !== undefined, 'PROHIBITIONS note');
}

// TASK too brief
{
  const text = VALID_PROMPT.replace(
    /TASK:[\s\S]*?REQUIREMENTS/,
    'TASK:\ndo stuff\nREQUIREMENTS'
  );
  const r = auditPromptText(text);
  assertEq(r.pass, false, 'brief TASK → fail');
  const note = r.notes.find((n: string) => /TASK section is too brief/.test(n));
  assert(note !== undefined, 'TASK note');
}

// ============================================================================
// runAudit — not found
// ============================================================================
console.log('\n── runAudit: not found ───────────────────────────────────');

{
  reset();
  routes.push({ match: /SELECT \* FROM om_prompt_registry/, rows: [] });
  let caught: any = null;
  try { await runAudit('nosuch', 'admin'); }
  catch (e) { caught = e; }
  assert(caught instanceof Error, 'throws');
  assert(/Prompt not found/.test(caught.message), 'message');
}

// ============================================================================
// runAudit — verified is immutable
// ============================================================================
console.log('\n── runAudit: verified immutable ──────────────────────────');

{
  reset();
  routes.push({
    match: /SELECT \* FROM om_prompt_registry/,
    rows: [{ id: 'p1', status: 'verified', prompt_text: VALID_PROMPT, guardrails_applied: 1 }],
  });
  let caught: any = null;
  try { await runAudit('p1', 'admin'); }
  catch (e) { caught = e; }
  assert(caught instanceof Error, 'throws');
  assert(/immutable/.test(caught.message), 'immutable message');
}

// ============================================================================
// runAudit — passing audit (draft → audited)
// ============================================================================
console.log('\n── runAudit: pass + draft → audited ──────────────────────');

{
  reset();
  let fetchCount = 0;
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: () => {
      fetchCount++;
      if (fetchCount === 1) {
        // Initial fetch: draft
        return [{ id: 'p1', status: 'draft', prompt_text: VALID_PROMPT, guardrails_applied: 1 }];
      }
      // Post-update fetch: audited
      return [{ id: 'p1', status: 'audited', prompt_text: VALID_PROMPT, audit_status: 'pass' }];
    },
  });
  routes.push({ match: /UPDATE om_prompt_registry SET\s+audit_status/, rows: {} });
  routes.push({ match: /UPDATE om_prompt_registry SET status = 'audited'/, rows: {} });
  routes.push({ match: /INSERT INTO system_logs/, rows: {} });

  const r = await runAudit('p1', 'admin');
  assertEq(r.audit_status, 'pass', 'pass');
  assertEq(r.audit.pass, true, 'audit.pass true');
  assertEq(r.prompt.status, 'audited', 'prompt now audited');

  // Verify queries issued
  const auditUpdate = queryLog.find(q => /UPDATE om_prompt_registry SET\s+audit_status/.test(q.sql));
  assert(auditUpdate !== undefined, 'audit UPDATE issued');
  assertEq(auditUpdate!.params[0], 'pass', 'audit_status param');
  assertEq(auditUpdate!.params[3], 'admin', 'audited_by param');
  assertEq(auditUpdate!.params[4], 'p1', 'id param');

  const transitionUpdate = queryLog.find(q => /UPDATE om_prompt_registry SET status = 'audited'/.test(q.sql));
  assert(transitionUpdate !== undefined, 'draft→audited transition fired');

  const logInsert = queryLog.find(q => /INSERT INTO system_logs/.test(q.sql));
  assert(logInsert !== undefined, 'system_logs row inserted');
  assertEq(logInsert!.params[0], 'SUCCESS', 'SUCCESS level');
  assert(/AUDIT_PASS/.test(logInsert!.params[1]), 'log message mentions AUDIT_PASS');
}

// ============================================================================
// runAudit — failing audit (audited → draft)
// ============================================================================
console.log('\n── runAudit: fail + audited → draft ──────────────────────');

{
  reset();
  let fetchCount = 0;
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: () => {
      fetchCount++;
      if (fetchCount === 1) {
        return [{
          id: 'p2', status: 'audited',
          prompt_text: 'invalid prompt with fallback',
          guardrails_applied: 1,
        }];
      }
      return [{ id: 'p2', status: 'draft' }];
    },
  });
  routes.push({ match: /UPDATE om_prompt_registry SET\s+audit_status/, rows: {} });
  routes.push({ match: /UPDATE om_prompt_registry SET status = 'draft'/, rows: {} });
  routes.push({ match: /INSERT INTO system_logs/, rows: {} });

  const r = await runAudit('p2', 'reviewer');
  assertEq(r.audit_status, 'fail', 'fail');
  assertEq(r.prompt.status, 'draft', 'reverted to draft');

  const revertUpdate = queryLog.find(q => /UPDATE om_prompt_registry SET status = 'draft'/.test(q.sql));
  assert(revertUpdate !== undefined, 'audited→draft revert fired');

  const logInsert = queryLog.find(q => /INSERT INTO system_logs/.test(q.sql));
  assertEq(logInsert!.params[0], 'WARN', 'WARN level for fail');
  assert(/AUDIT_FAIL/.test(logInsert!.params[1]), 'log mentions AUDIT_FAIL');
}

// ============================================================================
// runAudit — guardrails_applied=false forces fail
// ============================================================================
console.log('\n── runAudit: guardrails gate ─────────────────────────────');

{
  reset();
  let fetchCount = 0;
  routes.push({
    match: /SELECT \* FROM om_prompt_registry WHERE id = \?/,
    respond: () => {
      fetchCount++;
      if (fetchCount === 1) {
        return [{ id: 'p3', status: 'draft', prompt_text: VALID_PROMPT, guardrails_applied: 0 }];
      }
      return [{ id: 'p3', status: 'draft' }];
    },
  });
  routes.push({ match: /UPDATE om_prompt_registry SET\s+audit_status/, rows: {} });
  routes.push({ match: /INSERT INTO system_logs/, rows: {} });

  const r = await runAudit('p3', 'admin');
  assertEq(r.audit_status, 'fail', 'fails due to guardrails');
  assertEq(r.audit.pass, false, 'audit.pass false');
  assert(r.audit.notes.some((n: string) => /GUARDRAILS NOT APPLIED/.test(n)), 'guardrails note');
  // No draft→audited transition should have fired
  const transition = queryLog.find(q => /SET status = 'audited'/.test(q.sql));
  assert(transition === undefined, 'no audited transition');
}

// ============================================================================
// getAuditResult
// ============================================================================
console.log('\n── getAuditResult ────────────────────────────────────────');

{
  reset();
  routes.push({
    match: /SELECT id, audit_status, audit_result/,
    rows: [{
      id: 'p1',
      audit_status: 'pass',
      audit_result: JSON.stringify({ pass: true, sections: {}, notes: [] }),
      audit_notes: 'ok',
      audited_at: '2026-04-10T00:00:00Z',
      audited_by: 'admin',
    }],
  });
  const r = await getAuditResult('p1');
  assertEq(r.prompt_id, 'p1', 'prompt_id');
  assertEq(r.audit_status, 'pass', 'status');
  assertEq(r.audit_result, { pass: true, sections: {}, notes: [] }, 'parsed JSON');
  assertEq(r.audit_notes, 'ok', 'notes');
  assertEq(r.audited_by, 'admin', 'audited_by');
}

// Null audit_result preserved
{
  reset();
  routes.push({
    match: /SELECT id, audit_status, audit_result/,
    rows: [{ id: 'p1', audit_status: 'pending', audit_result: null, audit_notes: null, audited_at: null, audited_by: null }],
  });
  const r = await getAuditResult('p1');
  assertEq(r.audit_result, null, 'null preserved');
}

// Not found
{
  reset();
  routes.push({ match: /SELECT id, audit_status, audit_result/, rows: [] });
  let caught: any = null;
  try { await getAuditResult('none'); }
  catch (e) { caught = e; }
  assert(/Prompt not found/.test(caught.message), 'throws not found');
}

// ============================================================================
// enforceAuditPass
// ============================================================================
console.log('\n── enforceAuditPass ──────────────────────────────────────');

// Not found
{
  reset();
  routes.push({ match: /SELECT audit_status FROM om_prompt_registry/, rows: [] });
  let caught: any = null;
  try { await enforceAuditPass('none'); }
  catch (e) { caught = e; }
  assert(/Prompt not found/.test(caught.message), 'not found throws');
}

// pass → no-op
{
  reset();
  routes.push({
    match: /SELECT audit_status FROM om_prompt_registry/,
    rows: [{ audit_status: 'pass' }],
  });
  let caught: any = null;
  try { await enforceAuditPass('p1'); }
  catch (e) { caught = e; }
  assertEq(caught, null, 'pass → no throw');
}

// pending → throws with specific hint
{
  reset();
  routes.push({
    match: /SELECT audit_status FROM om_prompt_registry/,
    rows: [{ audit_status: 'pending' }],
  });
  let caught: any = null;
  try { await enforceAuditPass('p1'); }
  catch (e) { caught = e; }
  assert(caught instanceof Error, 'pending throws');
  assert(/Audit gate blocked/.test(caught.message), 'gate blocked message');
  assert(/POST \/api\/prompts/.test(caught.message), 'pending hint');
}

// fail → throws with fix hint
{
  reset();
  routes.push({
    match: /SELECT audit_status FROM om_prompt_registry/,
    rows: [{ audit_status: 'fail' }],
  });
  let caught: any = null;
  try { await enforceAuditPass('p1'); }
  catch (e) { caught = e; }
  assert(caught instanceof Error, 'fail throws');
  assert(/Fix the prompt/.test(caught.message), 'fix hint');
}

// ============================================================================
// resetAudit
// ============================================================================
console.log('\n── resetAudit ────────────────────────────────────────────');

{
  reset();
  routes.push({ match: /UPDATE om_prompt_registry SET/, rows: {} });
  await resetAudit('p1');
  const q = queryLog[0];
  assert(/audit_status = 'pending'/.test(q.sql), 'status → pending');
  assert(/audit_result = NULL/.test(q.sql), 'audit_result nulled');
  assert(/audit_notes = NULL/.test(q.sql), 'audit_notes nulled');
  assertEq(q.params[0], 'p1', 'prompt id');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main()

main().catch((e) => { console.error('Unhandled:', e); process.exit(1); });
