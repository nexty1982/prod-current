#!/usr/bin/env npx tsx
/**
 * Unit tests for services/promptAuditService.js (OMD-1098)
 *
 * Guardrail enforcement layer. Only dep is `../config/db` (getAppPool).
 * We stub that via require.cache with a SQL-routed fake pool.
 *
 * Coverage:
 *   - Exports: REQUIRED_SECTIONS (string[]), PROHIBITED_PHRASES (string[])
 *   - auditPromptText (pure):
 *       · all sections present + no prohibited → pass
 *       · missing sections → fail + notes populated
 *       · prohibited phrases detected → fail + per-phrase notes
 *       · OUTPUT REQUIREMENTS body too short → fail
 *       · PROHIBITIONS body too short → fail
 *       · TASK body too short → fail
 *       · section_count / total_required computed
 *       · checked_at ISO timestamp set
 *   - runAudit:
 *       · prompt not found → throws
 *       · verified status → throws (immutable)
 *       · pass path: UPDATE audit fields, transition draft → audited,
 *         system_logs write, return shape
 *       · fail path: UPDATE with audit_status=fail, previously-audited
 *         prompt reverts to draft
 *       · guardrails_applied=false → auto-fail
 *   - getAuditResult:
 *       · not found → throws
 *       · null audit_result → null in response
 *       · string audit_result → JSON-parsed
 *   - enforceAuditPass:
 *       · not found → throws
 *       · status != 'pass' → throws (with pending-specific message)
 *       · status = 'pass' → no throw
 *   - resetAudit: UPDATE sets all audit fields to null/pending
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

// ── SQL-routed fake pool ────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

type Handler = (sql: string, params: any[]) => any;
let handler: Handler | null = null;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (handler) {
      const result = handler(sql, params);
      return [result, []];
    }
    return [[], []];
  },
};

function resetDb() {
  queryLog.length = 0;
  handler = null;
}

// Stub config/db BEFORE requiring the SUT
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { getAppPool: () => fakePool },
} as any;

const {
  auditPromptText,
  runAudit,
  getAuditResult,
  enforceAuditPass,
  resetAudit,
  REQUIRED_SECTIONS,
  PROHIBITED_PHRASES,
} = require('../promptAuditService');

// ── Fixtures ────────────────────────────────────────────────────────
const VALID_PROMPT = `
[METADATA]
id: p-1
purpose: testing

CRITICAL EXECUTION RULES:
- Follow all rules deterministically

SYSTEM PRIORITIES:
- correctness first

TASK:
Build a comprehensive feature that covers all requested behaviors and
edge cases with explicit tests and measurable outputs.

REQUIREMENTS:
- Handle all expected inputs
- Produce deterministic results

OUTPUT REQUIREMENTS:
Return a JSON object containing pass/fail status, list of failures,
and counts of passed / total rules for downstream consumers.

PROHIBITIONS:
Do not use any of the shortcut patterns listed in the guardrails
documentation; strict mode only.

FINAL REQUIREMENT:
Deliver the complete implementation with tests.
`;

// Silence noisy logs
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

async function main() {

// ============================================================================
// Exports
// ============================================================================
console.log('\n── exports ───────────────────────────────────────────────');

assert(Array.isArray(REQUIRED_SECTIONS), 'REQUIRED_SECTIONS is array');
assertEq(REQUIRED_SECTIONS.length, 8, '8 required sections');
assert(REQUIRED_SECTIONS.includes('METADATA'), 'contains METADATA');
assert(REQUIRED_SECTIONS.includes('TASK'), 'contains TASK');
assert(REQUIRED_SECTIONS.includes('FINAL REQUIREMENT'), 'contains FINAL REQUIREMENT');

assert(Array.isArray(PROHIBITED_PHRASES), 'PROHIBITED_PHRASES is array');
assert(PROHIBITED_PHRASES.length > 0, 'phrases populated');
assert(PROHIBITED_PHRASES.includes('fallback'), 'contains fallback');
assert(PROHIBITED_PHRASES.includes('workaround'), 'contains workaround');

// ============================================================================
// auditPromptText — pass
// ============================================================================
console.log('\n── auditPromptText: happy path ───────────────────────────');

{
  const r = auditPromptText(VALID_PROMPT);
  assertEq(r.pass, true, 'valid prompt → pass');
  assertEq(r.missing_sections, [], 'no missing sections');
  assertEq(r.prohibited_language, [], 'no prohibited language');
  assertEq(r.section_count, 8, 'all 8 sections found');
  assertEq(r.total_required, 8, 'total_required=8');
  assert(typeof r.checked_at === 'string', 'checked_at ISO');
  assertEq(r.sections.METADATA, true, 'METADATA found');
  assertEq(r.sections.TASK, true, 'TASK found');
}

// ============================================================================
// auditPromptText — missing sections
// ============================================================================
console.log('\n── auditPromptText: missing sections ─────────────────────');

{
  const r = auditPromptText('Just some text with nothing structured.');
  assertEq(r.pass, false, 'empty prompt fails');
  assert(r.missing_sections.length > 0, 'missing sections reported');
  assertEq(r.sections.METADATA, false, 'METADATA not found');
  assert(r.notes.some((n: string) => n.includes('MISSING REQUIRED SECTIONS')), 'notes mention missing');
}

// Partial: only METADATA
{
  const r = auditPromptText('[METADATA]\nid: p');
  assertEq(r.pass, false, 'metadata-only fails');
  assertEq(r.sections.METADATA, true, 'METADATA found');
  assertEq(r.sections.TASK, false, 'TASK not found');
  assertEq(r.missing_sections.length, 7, '7 sections missing');
}

// ============================================================================
// auditPromptText — prohibited language
// ============================================================================
console.log('\n── auditPromptText: prohibited language ──────────────────');

// "fallback"
{
  const r = auditPromptText(VALID_PROMPT + '\nfallback: use mock service if DB is down');
  assertEq(r.pass, false, 'fallback detected → fail');
  assert(r.prohibited_language.length > 0, 'prohibited entries present');
  const hit = r.prohibited_language.find((p: any) => p.phrase === 'fallback');
  assert(hit !== undefined, 'fallback matched');
  assert(typeof hit.index === 'number', 'match index recorded');
  assert(typeof hit.context === 'string', 'context captured');
  assert(r.notes.some((n: string) => n.includes('PROHIBITED LANGUAGE')), 'notes mention prohibited');
}

// Multiple phrases
{
  const r = auditPromptText(VALID_PROMPT + '\nThis is a temporary fix and workaround for now.');
  assertEq(r.pass, false, 'multiple prohibited → fail');
  const phrases = r.prohibited_language.map((p: any) => p.phrase);
  assert(phrases.includes('temporary fix'), 'temporary fix matched');
  assert(phrases.includes('workaround'), 'workaround matched');
  assert(phrases.includes('for now'), 'for now matched');
}

// Case insensitive
{
  const r = auditPromptText(VALID_PROMPT + '\nWORKAROUND required');
  const hit = r.prohibited_language.find((p: any) => p.phrase === 'workaround');
  assert(hit !== undefined, 'case insensitive match');
}

// Word boundary — "placeholder" word matches but inside hacksaw doesn't match "hack"
{
  const r = auditPromptText(VALID_PROMPT + '\nhacksaw is a tool');
  // "hack" pattern is \bhack\b — "hacksaw" does NOT match
  const hackHit = r.prohibited_language.find((p: any) => p.phrase === 'hack');
  assertEq(hackHit, undefined, 'hacksaw does not match \\bhack\\b');
}

// ============================================================================
// auditPromptText — section content checks
// ============================================================================
console.log('\n── auditPromptText: section content checks ───────────────');

// OUTPUT REQUIREMENTS too short
{
  const promptShortOutput = `
[METADATA]
meta

CRITICAL EXECUTION RULES:
Follow rules.

SYSTEM PRIORITIES:
Be correct.

TASK:
Build a feature that does specific things described here in depth.

REQUIREMENTS:
Work correctly.

OUTPUT REQUIREMENTS:
tiny

PROHIBITIONS:
Do not use shortcuts in any circumstance ever.

FINAL REQUIREMENT:
Ship it.
`;
  const r = auditPromptText(promptShortOutput);
  assertEq(r.pass, false, 'short OUTPUT REQUIREMENTS → fail');
  assert(r.notes.some((n: string) => n.includes('OUTPUT REQUIREMENTS section exists')), 'output notes');
}

// PROHIBITIONS too short
{
  const promptShortProhib = `
[METADATA]
meta

CRITICAL EXECUTION RULES:
Follow rules.

SYSTEM PRIORITIES:
Be correct.

TASK:
Build a feature that does specific things described here in depth.

REQUIREMENTS:
Work correctly.

OUTPUT REQUIREMENTS:
Must return structured data with full field specifications and types.

PROHIBITIONS:
none

FINAL REQUIREMENT:
Ship it.
`;
  const r = auditPromptText(promptShortProhib);
  assertEq(r.pass, false, 'short PROHIBITIONS → fail');
  assert(r.notes.some((n: string) => n.includes('PROHIBITIONS section exists')), 'prohibitions notes');
}

// TASK too short
{
  const promptShortTask = `
[METADATA]
meta

CRITICAL EXECUTION RULES:
Follow rules.

SYSTEM PRIORITIES:
Be correct.

TASK:
build it

REQUIREMENTS:
Work correctly.

OUTPUT REQUIREMENTS:
Must return structured data with full field specifications and types.

PROHIBITIONS:
Do not use shortcuts in any circumstance ever.

FINAL REQUIREMENT:
Ship it.
`;
  const r = auditPromptText(promptShortTask);
  assertEq(r.pass, false, 'short TASK → fail');
  assert(r.notes.some((n: string) => n.includes('TASK section is too brief')), 'task notes');
}

// ============================================================================
// runAudit — not found
// ============================================================================
console.log('\n── runAudit: not found ───────────────────────────────────');

resetDb();
handler = () => [];
{
  let caught: Error | null = null;
  try { await runAudit('missing-id', 'alice'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when prompt missing');
  assert(caught !== null && caught.message.includes('not found'), 'error mentions not found');
}

// ============================================================================
// runAudit — verified is immutable
// ============================================================================
console.log('\n── runAudit: verified prompt is immutable ────────────────');

resetDb();
handler = (sql: string) => {
  if (/SELECT \* FROM om_prompt_registry/.test(sql)) {
    return [{ id: 'p1', prompt_text: VALID_PROMPT, status: 'verified', guardrails_applied: 1 }];
  }
  return [];
};
{
  let caught: Error | null = null;
  try { await runAudit('p1', 'alice'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'throws on verified');
  assert(caught !== null && caught.message.includes('immutable'), 'immutable message');
}

// ============================================================================
// runAudit — pass path
// ============================================================================
console.log('\n── runAudit: pass path ───────────────────────────────────');

{
  let readCount = 0;
  resetDb();
  handler = (sql: string, params: any[]) => {
    if (/SELECT \* FROM om_prompt_registry/.test(sql)) {
      readCount++;
      if (readCount === 1) {
        return [{
          id: 'p1',
          prompt_text: VALID_PROMPT,
          status: 'draft',
          guardrails_applied: 1,
        }];
      }
      // Post-update read
      return [{ id: 'p1', status: 'audited', audit_status: 'pass' }];
    }
    return [];
  };
  const r = await runAudit('p1', 'alice');
  assertEq(r.audit_status, 'pass', 'status=pass');
  assertEq(r.audit.pass, true, 'audit.pass=true');
  assertEq(r.prompt.status, 'audited', 'prompt transitioned to audited');

  // Inspect queries
  const updates = queryLog.filter(c => /UPDATE om_prompt_registry/.test(c.sql));
  assert(updates.length >= 2, 'at least 2 UPDATEs (audit fields + status)');
  // First UPDATE writes audit fields
  const auditUpdate = updates[0];
  assert(/audit_status = \?/.test(auditUpdate.sql), 'updates audit_status');
  assertEq(auditUpdate.params[0], 'pass', 'status param=pass');
  assertEq(auditUpdate.params[3], 'alice', 'actor param');
  assertEq(auditUpdate.params[4], 'p1', 'id param');
  // Second UPDATE transitions draft → audited
  const statusUpdate = updates.find((u: any) => /status = 'audited'/.test(u.sql));
  assert(statusUpdate !== undefined, 'status transition to audited');
  // system_logs insert
  const logInsert = queryLog.find(c => /INSERT INTO system_logs/.test(c.sql));
  assert(logInsert !== undefined, 'system_logs write');
  assertEq(logInsert.params[0], 'SUCCESS', 'log level SUCCESS');
  assert(logInsert.params[1].includes('AUDIT_PASS'), 'log message AUDIT_PASS');
}

// ============================================================================
// runAudit — fail path (previously audited reverts to draft)
// ============================================================================
console.log('\n── runAudit: fail path ───────────────────────────────────');

{
  let readCount = 0;
  resetDb();
  handler = (sql: string) => {
    if (/SELECT \* FROM om_prompt_registry/.test(sql)) {
      readCount++;
      if (readCount === 1) {
        return [{
          id: 'p1',
          prompt_text: 'bad prompt with fallback language',  // missing sections + prohibited
          status: 'audited',
          guardrails_applied: 1,
        }];
      }
      return [{ id: 'p1', status: 'draft', audit_status: 'fail' }];
    }
    return [];
  };
  const r = await runAudit('p1', 'bob');
  assertEq(r.audit_status, 'fail', 'status=fail');
  assertEq(r.audit.pass, false, 'audit.pass=false');
  // Revert to draft
  const revertUpdate = queryLog.find(c => /UPDATE om_prompt_registry/.test(c.sql) && /status = 'draft'/.test(c.sql));
  assert(revertUpdate !== undefined, 'reverts audited → draft on fail');
  // system_logs WARN
  const logInsert = queryLog.find(c => /INSERT INTO system_logs/.test(c.sql));
  assertEq(logInsert.params[0], 'WARN', 'log level WARN on fail');
  assert(logInsert.params[1].includes('AUDIT_FAIL'), 'log message AUDIT_FAIL');
}

// ============================================================================
// runAudit — guardrails flag enforcement
// ============================================================================
console.log('\n── runAudit: guardrails flag ─────────────────────────────');

{
  let readCount = 0;
  resetDb();
  handler = (sql: string) => {
    if (/SELECT \* FROM om_prompt_registry/.test(sql)) {
      readCount++;
      if (readCount === 1) {
        return [{
          id: 'p1',
          prompt_text: VALID_PROMPT,  // otherwise valid
          status: 'draft',
          guardrails_applied: 0,  // BUT guardrails not applied
        }];
      }
      return [{ id: 'p1', status: 'draft' }];
    }
    return [];
  };
  const r = await runAudit('p1', 'alice');
  assertEq(r.audit.pass, false, 'guardrails=false → fail');
  assert(r.audit.notes.some((n: string) => n.includes('GUARDRAILS NOT APPLIED')), 'note mentions guardrails');
}

// ============================================================================
// getAuditResult
// ============================================================================
console.log('\n── getAuditResult ────────────────────────────────────────');

// Not found
resetDb();
handler = () => [];
{
  let caught: Error | null = null;
  try { await getAuditResult('missing'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'throws not found');
}

// Null audit_result
resetDb();
handler = () => [{
  id: 'p1',
  audit_status: 'pending',
  audit_result: null,
  audit_notes: null,
  audited_at: null,
  audited_by: null,
}];
{
  const r = await getAuditResult('p1');
  assertEq(r.prompt_id, 'p1', 'prompt_id');
  assertEq(r.audit_status, 'pending', 'status');
  assertEq(r.audit_result, null, 'null audit_result');
}

// JSON-string audit_result
resetDb();
handler = () => [{
  id: 'p2',
  audit_status: 'pass',
  audit_result: '{"pass":true,"section_count":8}',
  audit_notes: 'ok',
  audited_at: '2026-04-11T00:00:00Z',
  audited_by: 'alice',
}];
{
  const r = await getAuditResult('p2');
  assertEq(r.audit_result, { pass: true, section_count: 8 }, 'JSON parsed');
  assertEq(r.audit_notes, 'ok', 'notes');
  assertEq(r.audited_by, 'alice', 'audited_by');
}

// ============================================================================
// enforceAuditPass
// ============================================================================
console.log('\n── enforceAuditPass ──────────────────────────────────────');

// Not found
resetDb();
handler = () => [];
{
  let caught: Error | null = null;
  try { await enforceAuditPass('missing'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'throws not found');
  assert(caught !== null && caught.message.includes('not found'), 'error not found');
}

// Status != pass → throws
resetDb();
handler = () => [{ audit_status: 'fail' }];
{
  let caught: Error | null = null;
  try { await enforceAuditPass('p1'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'throws when status != pass');
  assert(caught !== null && caught.message.includes('fail'), 'error mentions fail status');
}

// Pending → pending-specific message
resetDb();
handler = () => [{ audit_status: 'pending' }];
{
  let caught: Error | null = null;
  try { await enforceAuditPass('p1'); }
  catch (e: any) { caught = e; }
  assert(caught !== null, 'pending throws');
  assert(caught !== null && caught.message.includes('POST /api/prompts/'), 'pending message mentions audit endpoint');
}

// Pass → no throw
resetDb();
handler = () => [{ audit_status: 'pass' }];
{
  let threw = false;
  try { await enforceAuditPass('p1'); } catch { threw = true; }
  assertEq(threw, false, 'pass → no throw');
}

// ============================================================================
// resetAudit
// ============================================================================
console.log('\n── resetAudit ────────────────────────────────────────────');

resetDb();
handler = () => ({});
{
  await resetAudit('p1');
  assertEq(queryLog.length, 1, '1 query');
  assert(/UPDATE om_prompt_registry/.test(queryLog[0].sql), 'UPDATE');
  assert(/audit_status = 'pending'/.test(queryLog[0].sql), 'resets to pending');
  assert(/audit_result = NULL/.test(queryLog[0].sql), 'nulls audit_result');
  assert(/audit_notes = NULL/.test(queryLog[0].sql), 'nulls audit_notes');
  assert(/audited_at = NULL/.test(queryLog[0].sql), 'nulls audited_at');
  assert(/audited_by = NULL/.test(queryLog[0].sql), 'nulls audited_by');
  assertEq(queryLog[0].params[0], 'p1', 'id param');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
