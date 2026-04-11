#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptAuditService.js (OMD-1007)
 *
 * Covers:
 *   - auditPromptText           pure function, all branches:
 *                                 · missing sections (lists them in notes)
 *                                 · prohibited language detection (with context)
 *                                 · short OUTPUT REQUIREMENTS section
 *                                 · short PROHIBITIONS section
 *                                 · short TASK section
 *                                 · happy path (all present, sufficient length)
 *                                 · return shape (sections, section_count, total_required,
 *                                   checked_at, prohibited_language with match details)
 *   - runAudit                  not-found, verified-locked, happy path persists UPDATE
 *                               + system_logs INSERT + returns { audit, audit_status, prompt },
 *                               draft → audited transition on pass,
 *                               audited → draft revert on fail,
 *                               guardrails_applied = false forces fail
 *   - getAuditResult            not-found, JSON.parse of audit_result, null audit_result
 *   - enforceAuditPass          not-found, status != pass throws, pass silent,
 *                               pending message vs fail message distinction
 *   - resetAudit                UPDATE with all fields nulled
 *   - REQUIRED_SECTIONS/PROHIBITED_PHRASES exports
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

// ── Stub config/db BEFORE requiring SUT ─────────────────────────────────
type Call = { sql: string; params: any[] };
const poolCalls: Call[] = [];
type Route = { match: RegExp; rows: any[]; result?: any; throws?: Error };
const poolRoutes: Route[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    poolCalls.push({ sql, params });
    for (const r of poolRoutes) {
      if (r.match.test(sql)) {
        if (r.throws) throw r.throws;
        return [r.rows, r.result ?? {}] as any;
      }
    }
    return [[], {}] as any;
  },
};

function resetPool() {
  poolCalls.length = 0;
  poolRoutes.length = 0;
}

const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
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

// Silence console
const origError = console.error;
const origWarn = console.warn;
function quiet() { console.error = () => {}; console.warn = () => {}; }
function loud() { console.error = origError; console.warn = origWarn; }

// Valid prompt template with all 8 required sections + sufficient content
const VALID_PROMPT = `[METADATA]
id: test-001
author: claude

---

CRITICAL EXECUTION RULES
- Always read files before editing
- Never bypass tests

---

SYSTEM PRIORITIES
1. Correctness
2. Security

---

TASK:
Build a new REST endpoint that returns the list of active churches, with filtering by diocese and pagination support. Must hit the platform database and respect role-based access.

---

REQUIREMENTS:
- Must return JSON with churches array and pagination metadata
- Must enforce auth middleware
- Must support query params: diocese, page, limit

---

OUTPUT REQUIREMENTS:
- All responses in JSON format with HTTP status codes
- Include pagination metadata (total, page, limit, has_more)
- Error responses must include error code and message

---

PROHIBITIONS:
- Do not use raw SQL string concatenation (injection risk)
- Do not return soft-deleted churches
- Do not expose internal IDs in responses

---

FINAL REQUIREMENT:
All tests must pass and audit must succeed before this can be merged.
`;

async function main() {

// ============================================================================
// auditPromptText — happy path
// ============================================================================
console.log('\n── auditPromptText: valid prompt ─────────────────────────');

{
  const r = auditPromptText(VALID_PROMPT);
  assertEq(r.pass, true, 'valid prompt passes');
  assertEq(r.missing_sections.length, 0, 'no missing sections');
  assertEq(r.prohibited_language.length, 0, 'no prohibited language');
  assertEq(r.section_count, 8, 'all 8 sections present');
  assertEq(r.total_required, 8, 'total_required = 8');
  assertEq(r.notes.length, 0, 'no notes on clean prompt');
  assert(typeof r.checked_at === 'string', 'checked_at is ISO string');
  assert(!isNaN(Date.parse(r.checked_at)), 'checked_at is parseable');
  // Section keys
  assertEq(r.sections['METADATA'], true, 'METADATA found');
  assertEq(r.sections['CRITICAL EXECUTION RULES'], true, 'CRITICAL EXECUTION RULES');
  assertEq(r.sections['SYSTEM PRIORITIES'], true, 'SYSTEM PRIORITIES');
  assertEq(r.sections['TASK'], true, 'TASK');
  assertEq(r.sections['REQUIREMENTS'], true, 'REQUIREMENTS');
  assertEq(r.sections['OUTPUT REQUIREMENTS'], true, 'OUTPUT REQUIREMENTS');
  assertEq(r.sections['PROHIBITIONS'], true, 'PROHIBITIONS');
  assertEq(r.sections['FINAL REQUIREMENT'], true, 'FINAL REQUIREMENT');
}

// ============================================================================
// auditPromptText — missing sections
// ============================================================================
console.log('\n── auditPromptText: missing sections ─────────────────────');

{
  const r = auditPromptText('This prompt has nothing in it.');
  assertEq(r.pass, false, 'fails when everything missing');
  assertEq(r.missing_sections.length, 8, 'all 8 missing');
  assertEq(r.section_count, 0, 'section_count = 0');
  assert(
    r.notes.some((n: string) => /MISSING REQUIRED SECTIONS/i.test(n)),
    'missing-sections note present',
  );
  assert(
    r.notes[0].includes('METADATA') && r.notes[0].includes('TASK'),
    'note lists missing keys',
  );
}

// Partially missing — only TASK missing
{
  const prompt = VALID_PROMPT.replace(/TASK:[\s\S]*?REQUIREMENTS:/, 'REQUIREMENTS:');
  const r = auditPromptText(prompt);
  assertEq(r.sections['TASK'], false, 'TASK missing detected');
  assert(r.missing_sections.includes('TASK'), 'TASK in missing list');
  assertEq(r.pass, false, 'fails with any missing section');
}

// ============================================================================
// auditPromptText — prohibited language
// ============================================================================
console.log('\n── auditPromptText: prohibited language ──────────────────');

{
  // Inject 'fallback' into the valid prompt
  const prompt = VALID_PROMPT.replace(
    'Build a new REST endpoint',
    'Build a fallback REST endpoint',
  );
  const r = auditPromptText(prompt);
  assertEq(r.pass, false, 'fails with prohibited language');
  assertEq(r.prohibited_language.length, 1, '1 prohibited phrase found');
  assertEq(r.prohibited_language[0].phrase, 'fallback', 'phrase = fallback');
  assert(r.prohibited_language[0].context.length > 0, 'context captured');
  assert(typeof r.prohibited_language[0].index === 'number', 'index recorded');
  assert(
    r.notes.some((n: string) => /PROHIBITED LANGUAGE DETECTED/i.test(n)),
    'prohibited-language header note',
  );
  assert(
    r.notes.some((n: string) => /near:/i.test(n)),
    'context-line note',
  );
}

// Multiple prohibited phrases
{
  const prompt = VALID_PROMPT + '\nAlso: this is a quick fix and temporary fix.';
  const r = auditPromptText(prompt);
  assert(r.prohibited_language.length >= 2, 'multiple phrases detected');
  const phrases = r.prohibited_language.map((p: any) => p.phrase);
  assert(phrases.includes('quick fix'), 'quick fix detected');
  assert(phrases.includes('temporary fix'), 'temporary fix detected');
}

// Case insensitivity
{
  const prompt = VALID_PROMPT + '\nWORKAROUND: do X';
  const r = auditPromptText(prompt);
  assert(
    r.prohibited_language.some((p: any) => p.phrase === 'workaround'),
    'case-insensitive match',
  );
}

// ============================================================================
// auditPromptText — short section content
// ============================================================================
console.log('\n── auditPromptText: short sections ───────────────────────');

// Short OUTPUT REQUIREMENTS
{
  const prompt = VALID_PROMPT.replace(
    /OUTPUT REQUIREMENTS:[\s\S]*?---/,
    'OUTPUT REQUIREMENTS:\nshort\n\n---',
  );
  const r = auditPromptText(prompt);
  assertEq(r.pass, false, 'fails with short OUTPUT REQUIREMENTS');
  assert(
    r.notes.some((n: string) => /OUTPUT REQUIREMENTS.*insufficient/i.test(n)),
    'short OUTPUT note',
  );
}

// Short PROHIBITIONS
{
  const prompt = VALID_PROMPT.replace(
    /PROHIBITIONS:[\s\S]*?---/,
    'PROHIBITIONS:\nnope\n\n---',
  );
  const r = auditPromptText(prompt);
  assertEq(r.pass, false, 'fails with short PROHIBITIONS');
  assert(
    r.notes.some((n: string) => /PROHIBITIONS.*insufficient/i.test(n)),
    'short PROHIBITIONS note',
  );
}

// Short TASK
{
  const prompt = VALID_PROMPT.replace(
    /TASK:[\s\S]*?REQUIREMENTS:/,
    'TASK:\ndo X\n\n---\n\nREQUIREMENTS:',
  );
  const r = auditPromptText(prompt);
  assertEq(r.pass, false, 'fails with short TASK');
  assert(
    r.notes.some((n: string) => /TASK.*too brief/i.test(n)),
    'short TASK note',
  );
}

// ============================================================================
// runAudit — not found
// ============================================================================
console.log('\n── runAudit: not found ───────────────────────────────────');

resetPool();
poolRoutes.push({ match: /SELECT \* FROM om_prompt_registry/i, rows: [] });
{
  let caught: Error | null = null;
  try { await runAudit('missing-id', 'user1'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /Prompt not found/i.test(caught!.message), 'not-found throws');
}

// ============================================================================
// runAudit — verified is immutable
// ============================================================================
console.log('\n── runAudit: verified is immutable ───────────────────────');

resetPool();
poolRoutes.push({
  match: /SELECT \* FROM om_prompt_registry/i,
  rows: [{ id: 'p1', status: 'verified', prompt_text: VALID_PROMPT, guardrails_applied: 1 }],
});
{
  let caught: Error | null = null;
  try { await runAudit('p1', 'user1'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /verified.*immutable/i.test(caught!.message), 'verified → throws');
}

// ============================================================================
// runAudit — happy path, draft → audited
// ============================================================================
console.log('\n── runAudit: draft → audited ─────────────────────────────');

resetPool();
// SELECT prompt (first) — draft with valid text
poolRoutes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
  rows: [{ id: 'p1', status: 'draft', prompt_text: VALID_PROMPT, guardrails_applied: 1 }],
});
// UPDATE audit fields
poolRoutes.push({ match: /UPDATE om_prompt_registry SET\s+audit_status/i, rows: [] });
// UPDATE status → audited
poolRoutes.push({ match: /UPDATE om_prompt_registry SET status = 'audited'/i, rows: [] });
// INSERT system_logs
poolRoutes.push({ match: /INSERT INTO system_logs/i, rows: [] });
// Final SELECT updated prompt — use `.*audit_status` to disambiguate from 1st SELECT
// Actually, since routes are matched first-wins, and we use shift-style, the same
// SELECT regex will match twice. But we push routes, they persist. Both SELECTs
// hit the same regex. Let me use an order-sensitive approach: push a second
// SELECT route that only applies after the first is consumed.
// Simpler: return the same row for both SELECTs — the final SELECT just returns
// the "updated" prompt, and since our fake doesn't actually update, returning the
// draft row is fine for validation of return shape.

{
  const result = await runAudit('p1', 'user1');
  assertEq(result.audit_status, 'pass', 'audit_status = pass');
  assertEq(result.audit.pass, true, 'audit.pass = true');
  assert(result.prompt !== undefined, 'prompt returned');
  // Verify update-audit call
  const updateAuditCall = poolCalls.find(c => /SET\s+audit_status = \?/i.test(c.sql));
  assert(updateAuditCall !== undefined, 'audit update fired');
  assertEq(updateAuditCall!.params[0], 'pass', 'audit_status param');
  assert(typeof updateAuditCall!.params[1] === 'string', 'audit_result is JSON string');
  const parsed = JSON.parse(updateAuditCall!.params[1]);
  assertEq(parsed.pass, true, 'audit_result.pass = true');
  assertEq(updateAuditCall!.params[3], 'user1', 'audited_by = user1');
  assertEq(updateAuditCall!.params[4], 'p1', 'id param');
  // Verify status transition fired
  const transitionCall = poolCalls.find(c => /status = 'audited'/i.test(c.sql));
  assert(transitionCall !== undefined, 'status → audited fired');
  // Verify system_logs INSERT fired
  const logCall = poolCalls.find(c => /INSERT INTO system_logs/i.test(c.sql));
  assert(logCall !== undefined, 'system_logs INSERT fired');
  assertEq(logCall!.params[0], 'SUCCESS', 'log level = SUCCESS');
}

// ============================================================================
// runAudit — fail with audited → draft revert
// ============================================================================
console.log('\n── runAudit: audited → draft on fail ─────────────────────');

resetPool();
poolRoutes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
  rows: [{ id: 'p2', status: 'audited', prompt_text: 'broken', guardrails_applied: 1 }],
});
poolRoutes.push({ match: /UPDATE om_prompt_registry SET\s+audit_status/i, rows: [] });
poolRoutes.push({ match: /UPDATE om_prompt_registry SET status = 'draft'/i, rows: [] });
poolRoutes.push({ match: /INSERT INTO system_logs/i, rows: [] });

{
  const result = await runAudit('p2', 'user2');
  assertEq(result.audit_status, 'fail', 'audit_status = fail');
  // Verify revert fired
  const revertCall = poolCalls.find(c => /status = 'draft'/i.test(c.sql));
  assert(revertCall !== undefined, 'revert to draft fired');
  // Log level WARN
  const logCall = poolCalls.find(c => /INSERT INTO system_logs/i.test(c.sql));
  assertEq(logCall!.params[0], 'WARN', 'log level = WARN');
}

// ============================================================================
// runAudit — guardrails_applied = false forces fail
// ============================================================================
console.log('\n── runAudit: guardrails not applied ──────────────────────');

resetPool();
poolRoutes.push({
  match: /SELECT \* FROM om_prompt_registry WHERE id = \?/i,
  // Valid prompt text but guardrails flag is false
  rows: [{ id: 'p3', status: 'draft', prompt_text: VALID_PROMPT, guardrails_applied: 0 }],
});
poolRoutes.push({ match: /UPDATE om_prompt_registry SET\s+audit_status/i, rows: [] });
poolRoutes.push({ match: /INSERT INTO system_logs/i, rows: [] });

{
  const result = await runAudit('p3', 'user3');
  assertEq(result.audit_status, 'fail', 'guardrails false → fail');
  assert(
    result.audit.notes.some((n: string) => /GUARDRAILS NOT APPLIED/i.test(n)),
    'guardrails note added',
  );
}

// ============================================================================
// getAuditResult
// ============================================================================
console.log('\n── getAuditResult ────────────────────────────────────────');

// Not found
resetPool();
poolRoutes.push({ match: /SELECT id, audit_status/i, rows: [] });
{
  let caught: Error | null = null;
  try { await getAuditResult('missing'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /Prompt not found/i.test(caught!.message), 'not found throws');
}

// Happy path with JSON audit_result
resetPool();
poolRoutes.push({
  match: /SELECT id, audit_status/i,
  rows: [{
    id: 'p1',
    audit_status: 'pass',
    audit_result: JSON.stringify({ pass: true, section_count: 8 }),
    audit_notes: 'all good',
    audited_at: '2026-01-01',
    audited_by: 'u1',
  }],
});
{
  const r = await getAuditResult('p1');
  assertEq(r.prompt_id, 'p1', 'prompt_id');
  assertEq(r.audit_status, 'pass', 'status');
  assertEq(r.audit_result.pass, true, 'parsed audit_result.pass');
  assertEq(r.audit_result.section_count, 8, 'parsed section_count');
  assertEq(r.audit_notes, 'all good', 'notes');
  assertEq(r.audited_by, 'u1', 'audited_by');
}

// Null audit_result
resetPool();
poolRoutes.push({
  match: /SELECT id, audit_status/i,
  rows: [{
    id: 'p1', audit_status: 'pending', audit_result: null,
    audit_notes: null, audited_at: null, audited_by: null,
  }],
});
{
  const r = await getAuditResult('p1');
  assertEq(r.audit_result, null, 'null audit_result → null');
}

// ============================================================================
// enforceAuditPass
// ============================================================================
console.log('\n── enforceAuditPass ──────────────────────────────────────');

// Not found
resetPool();
poolRoutes.push({ match: /SELECT audit_status FROM om_prompt_registry/i, rows: [] });
{
  let caught: Error | null = null;
  try { await enforceAuditPass('nope'); }
  catch (e: any) { caught = e; }
  assert(caught !== null && /Prompt not found/i.test(caught!.message), 'not found');
}

// Pass — silent
resetPool();
poolRoutes.push({
  match: /SELECT audit_status/i,
  rows: [{ audit_status: 'pass' }],
});
{
  let threw = false;
  try { await enforceAuditPass('p1'); }
  catch { threw = true; }
  assertEq(threw, false, 'pass silent');
}

// Pending — specific message
resetPool();
poolRoutes.push({
  match: /SELECT audit_status/i,
  rows: [{ audit_status: 'pending' }],
});
{
  let caught: Error | null = null;
  try { await enforceAuditPass('p1'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'pending throws');
  assert(
    /Run POST \/api\/prompts.*audit first/i.test(caught!.message),
    'pending → "run audit first" hint',
  );
}

// Fail — fix-and-rerun message
resetPool();
poolRoutes.push({
  match: /SELECT audit_status/i,
  rows: [{ audit_status: 'fail' }],
});
{
  let caught: Error | null = null;
  try { await enforceAuditPass('p1'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'fail throws');
  assert(
    /Fix the prompt and re-run audit/i.test(caught!.message),
    'fail → fix-and-rerun hint',
  );
}

// ============================================================================
// resetAudit
// ============================================================================
console.log('\n── resetAudit ────────────────────────────────────────────');

resetPool();
poolRoutes.push({ match: /UPDATE om_prompt_registry SET/i, rows: [] });
{
  await resetAudit('p1');
  assertEq(poolCalls.length, 1, '1 query fired');
  assert(/audit_status = 'pending'/i.test(poolCalls[0].sql), 'sets pending');
  assert(/audit_result = NULL/i.test(poolCalls[0].sql), 'nulls result');
  assert(/audit_notes = NULL/i.test(poolCalls[0].sql), 'nulls notes');
  assert(/audited_at = NULL/i.test(poolCalls[0].sql), 'nulls audited_at');
  assert(/audited_by = NULL/i.test(poolCalls[0].sql), 'nulls audited_by');
  assertEq(poolCalls[0].params, ['p1'], 'id param');
}

// ============================================================================
// Exports sanity
// ============================================================================
console.log('\n── exports sanity ────────────────────────────────────────');

assert(Array.isArray(REQUIRED_SECTIONS) && REQUIRED_SECTIONS.length === 8, 'REQUIRED_SECTIONS = 8 keys');
assert(REQUIRED_SECTIONS.includes('METADATA'), 'includes METADATA');
assert(REQUIRED_SECTIONS.includes('FINAL REQUIREMENT'), 'includes FINAL REQUIREMENT');
assert(Array.isArray(PROHIBITED_PHRASES) && PROHIBITED_PHRASES.length >= 10, 'PROHIBITED_PHRASES >= 10');
assert(PROHIBITED_PHRASES.includes('fallback'), 'includes fallback');
assert(PROHIBITED_PHRASES.includes('hack'), 'includes hack');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main()

main().catch((e) => {
  loud();
  console.error('Unhandled test error:', e);
  process.exit(1);
});
